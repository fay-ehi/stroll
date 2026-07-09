/**
 * Stroll — Experience Detail Hooks
 * src/hooks/useExperienceDetail.ts
 *
 * The Experience Details screen's public API — same layering rule as
 * useDiscoverFeed.ts (UI screens → hooks → stores → services → Supabase).
 * No new store here either: everything below is server state owned by
 * TanStack Query.
 *
 * Exposes:
 *   useExperienceDetail()       — the experience itself (header, gallery,
 *                                 description, metadata, location).
 *   useRelatedExperiences()     — the horizontal "related" rail.
 *   useCreatorExperienceCount() — the Creator section's optional stat,
 *                                 fetched separately so it can never block
 *                                 the rest of the page (see CreatorDetail's
 *                                 doc in types/experience.ts).
 *   useExperienceDetailPage()   — screen-level composition of all three,
 *                                 what app/(app)/experience/[id].tsx calls.
 */

import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryKeys';
import { logError, type StrollError } from '@/lib/errors';
import { recordExperienceView } from '@/lib/recentlyViewed';
import {
  fetchExperienceById,
  fetchRelatedExperiences,
  fetchCreatorExperienceCount,
} from '@/services/experiencesService';
import {
  toExperienceDetailModel,
  toExperienceCardModel,
  type ExperienceDetailModel,
  type ExperienceCardModel,
  type ExperienceFeedRow,
} from '@/types/experience';
import type { PlaceCategoryId } from '@/constants/places';

const STALE_TIMES = {
  detail: 5 * 60 * 1000,
  related: 10 * 60 * 1000,
  creatorCount: 10 * 60 * 1000,
} as const;

function isRetryableStrollError(failureCount: number, error: StrollError): boolean {
  return error.isRetryable && failureCount < 2;
}

function mapRowsToCards(rows: ExperienceFeedRow[], context: string): ExperienceCardModel[] {
  const cards: ExperienceCardModel[] = [];
  for (const row of rows) {
    const card = toExperienceCardModel(row);
    if (card) {
      cards.push(card);
    } else {
      logError(
        context,
        new Error(`Experience ${row.id} is missing its creator or place — dropped.`),
      );
    }
  }
  return cards;
}

// ─── useExperienceDetail ─────────────────────────────────────────────────────────

export interface UseExperienceDetailResult {
  experience: ExperienceDetailModel | null;
  isLoading: boolean;
  isRefetching: boolean;
  isError: boolean;
  error: StrollError | null;
  refetch: () => void;
}

/**
 * Fetches fresh data for a single experience by id — this screen is
 * navigated to with only the id (see ExperienceCard's onPress), never a
 * passed-through object, so this is always the actual source of the
 * data it renders, not a fallback for a cache miss.
 */
export function useExperienceDetail(id: string): UseExperienceDetailResult {
  const query = useQuery<ExperienceDetailModel | null, StrollError>({
    queryKey: queryKeys.experiences.detail(id),
    queryFn: async () => {
      const result = await fetchExperienceById(id);
      if (!result.ok) throw result.error;
      return toExperienceDetailModel(result.data);
    },
    staleTime: STALE_TIMES.detail,
    retry: isRetryableStrollError,
  });

  // Sprint 2 Prompt 3 — feeds the "Recently viewed categories"
  // personalization signal (lib/recentlyViewed.ts) and Continue
  // Exploring's seed category. Keyed on the experience's own id, not on
  // `query.data` by reference, so a background refetch of the SAME
  // experience (staleTime expiring, pull-to-refresh) doesn't re-record a
  // view that already happened — only a genuinely different experience
  // resolving does.
  const experienceId = query.data?.id;
  useEffect(() => {
    if (!experienceId || !query.data) return;
    void recordExperienceView({
      experienceId,
      categoryId: query.data.category?.id ?? null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally keyed on experienceId only, see comment above
  }, [experienceId]);

  return {
    experience: query.data ?? null,
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    isError: query.isError,
    error: query.error,
    refetch: () => {
      void query.refetch();
    },
  };
}

/**
 * Invalidates a single experience's detail query — e.g. after a future
 * edit/save/like mutation. Not called anywhere yet in this sprint (no
 * mutations exist), but every domain's read hooks file establishes this
 * so mutations added later don't have to.
 */
export function useInvalidateExperienceDetail(): (id: string) => Promise<void> {
  const queryClient = useQueryClient();
  return (id: string) =>
    queryClient.invalidateQueries({ queryKey: queryKeys.experiences.detail(id) });
}

// ─── useRelatedExperiences ────────────────────────────────────────────────────────

export interface UseRelatedExperiencesResult {
  experiences: ExperienceCardModel[];
  isLoading: boolean;
  isError: boolean;
  error: StrollError | null;
  refetch: () => void;
}

export interface UseRelatedExperiencesParams {
  experienceId: string;
  /** Place category to match on — pass `experience.place.category?.id`. Query is disabled while this is null (e.g. before the main detail query resolves). */
  category: PlaceCategoryId | null;
  city: string | null;
  limit?: number;
}

export function useRelatedExperiences(
  params: UseRelatedExperiencesParams,
): UseRelatedExperiencesResult {
  const { experienceId, category, city, limit } = params;
  const enabled = !!category && !!city;

  const query = useQuery<ExperienceCardModel[], StrollError>({
    queryKey: queryKeys.experiences.related(experienceId),
    queryFn: async () => {
      // `enabled` guarantees these are non-null whenever queryFn actually runs.
      const result = await fetchRelatedExperiences({
        experienceId,
        category: category as PlaceCategoryId,
        city: city as string,
        limit,
      });
      if (!result.ok) throw result.error;
      return mapRowsToCards(result.data, 'useRelatedExperiences');
    },
    enabled,
    staleTime: STALE_TIMES.related,
    retry: isRetryableStrollError,
  });

  return {
    experiences: query.data ?? [],
    isLoading: enabled && query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: () => {
      void query.refetch();
    },
  };
}

// ─── useCreatorExperienceCount ───────────────────────────────────────────────────

export interface UseCreatorExperienceCountResult {
  /** undefined until the query resolves — the Creator section renders nothing for this stat in that case, not a placeholder. */
  totalExperiences: number | undefined;
}

export function useCreatorExperienceCount(userId: string | null): UseCreatorExperienceCountResult {
  const query = useQuery<number, StrollError>({
    queryKey: queryKeys.experiences.creatorExperienceCount(userId ?? ''),
    queryFn: async () => {
      const result = await fetchCreatorExperienceCount(userId as string);
      if (!result.ok) throw result.error;
      return result.data;
    },
    enabled: !!userId,
    staleTime: STALE_TIMES.creatorCount,
    // A missing "N experiences" stat is genuinely not worth retrying hard
    // or surfacing an error for — it just stays absent.
    retry: false,
  });

  return { totalExperiences: query.data };
}

// ─── useExperienceDetailPage ──────────────────────────────────────────────────────
// Screen-level composition — what app/(app)/experience/[id].tsx calls.

export interface UseExperienceDetailPageResult {
  detail: UseExperienceDetailResult;
  related: UseRelatedExperiencesResult;
  creatorExperienceCount: number | undefined;
}

export function useExperienceDetailPage(id: string): UseExperienceDetailPageResult {
  const detail = useExperienceDetail(id);

  const categoryId = detail.experience?.place.category?.id ?? null;
  const city = detail.experience?.place.city ?? null;

  const related = useRelatedExperiences({
    experienceId: id,
    category: categoryId,
    city,
  });

  const { totalExperiences } = useCreatorExperienceCount(detail.experience?.creator.id ?? null);

  // Merge the count into the creator object once it resolves, so
  // components only ever read from `experience.creator` — no second prop
  // to thread through the header/creator-section tree.
  const experience = useMemo(() => {
    if (!detail.experience) return null;
    if (totalExperiences === undefined) return detail.experience;
    return { ...detail.experience, creator: { ...detail.experience.creator, totalExperiences } };
  }, [detail.experience, totalExperiences]);

  return {
    detail: { ...detail, experience },
    related,
    creatorExperienceCount: totalExperiences,
  };
}
