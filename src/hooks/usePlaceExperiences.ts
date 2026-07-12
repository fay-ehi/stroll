/**
 * Stroll — Place Experiences & Place Detail Page Hooks
 * src/hooks/usePlaceExperiences.ts
 *
 * Sprint 4 Prompt 1 — Place Detail screen's public API. Same layering
 * rule as every other domain's hooks file (UI screens → hooks → stores →
 * services → Supabase).
 *
 * Deliberately its own file rather than folded into usePlaces.ts:
 * usePlaces.ts owns the Place *record* (usePlace, useFeaturedPlaces,
 * etc.); this owns a paginated *list* of a different domain's rows
 * (experiences) filtered by a place id — the same "own file per domain,
 * hooks compose across them" shape useUserGallery.ts already establishes
 * as a sibling to useProfile.ts.
 *
 * Exposes:
 *   usePlaceExperiences()  — the paginated "Community Experiences" list.
 *   usePlaceDetailPage()   — screen-level composition of usePlace() (see
 *                            usePlaces.ts) + usePlaceExperiences(), what
 *                            app/(app)/place/[id].tsx calls. Mirrors
 *                            useExperienceDetailPage()'s
 *                            { detail, related } shape in
 *                            useExperienceDetail.ts.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryKeys';
import { fetchExperiencesByPlace, type PlaceExperiencesPage } from '@/services/experiencesService';
import { toExperienceCardModel, type ExperienceCardModel } from '@/types/experience';
import { logError, type StrollError } from '@/lib/errors';
import { trackPlaceViewed } from '@/lib/analytics';
import { usePlace, type UsePlaceResult } from '@/hooks/usePlaces';

const STALE_TIME = 60 * 1000;

function mapRowsToCards(rows: PlaceExperiencesPage['rows'], context: string): ExperienceCardModel[] {
  const cards: ExperienceCardModel[] = [];
  for (const row of rows) {
    const card = toExperienceCardModel(row);
    if (card) {
      cards.push(card);
    } else {
      logError(context, new Error(`Experience ${row.id} is missing its creator or place — dropped.`));
    }
  }
  return cards;
}

// ─── usePlaceExperiences ─────────────────────────────────────────────────────────

export interface UsePlaceExperiencesResult {
  experiences: ExperienceCardModel[];
  isLoading: boolean;
  isError: boolean;
  error: StrollError | null;
  refetch: () => void;
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
}

/**
 * Fetches the paginated "Community Experiences" list for a Place —
 * every published Experience attached to it, newest first. Disabled
 * until a real placeId is available, the same guard usePlace() uses.
 */
export function usePlaceExperiences(placeId: string | undefined): UsePlaceExperiencesResult {
  const query = useInfiniteQuery<PlaceExperiencesPage, StrollError>({
    queryKey: queryKeys.experiences.byPlace(placeId ?? ''),
    queryFn: async ({ pageParam }) => {
      const result = await fetchExperiencesByPlace({
        placeId: placeId!,
        cursor: (pageParam as string | null) ?? null,
      });
      if (!result.ok) throw result.error;
      return result.data;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!placeId,
    staleTime: STALE_TIME,
  });

  const experiences = useMemo(() => {
    if (!query.data) return [];
    return query.data.pages.flatMap((page) => mapRowsToCards(page.rows, 'usePlaceExperiences'));
  }, [query.data]);

  return {
    experiences,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: () => {
      void query.refetch();
    },
    fetchNextPage: () => {
      void query.fetchNextPage();
    },
    hasNextPage: !!query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
  };
}

// ─── usePlaceDetailPage ───────────────────────────────────────────────────────────

export interface UsePlaceDetailPageResult {
  place: UsePlaceResult;
  experiences: UsePlaceExperiencesResult;
  /** Refreshes both the place record and its experiences list together — what the screen's pull-to-refresh calls. */
  refresh: () => Promise<void>;
  isRefreshing: boolean;
}

/**
 * Screen-level composition for app/(app)/place/[id].tsx. Records a
 * `place_viewed` analytics event once per resolved place id (keyed the
 * same way useExperienceDetail's recordExperienceView is — on the id
 * itself, not on `place.data` by reference, so a background refetch of
 * the same place doesn't re-fire this).
 */
export function usePlaceDetailPage(placeId: string | undefined): UsePlaceDetailPageResult {
  const place = usePlace(placeId);
  const experiences = usePlaceExperiences(placeId);
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const resolvedPlaceId = place.place?.id;
  useEffect(() => {
    if (!resolvedPlaceId) return;
    trackPlaceViewed({ placeId: resolvedPlaceId });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally keyed on resolvedPlaceId only, see this function's doc
  }, [resolvedPlaceId]);

  const refresh = useCallback(async () => {
    if (!placeId) return;
    setIsRefreshing(true);
    try {
      await Promise.all([
        queryClient.refetchQueries({ queryKey: queryKeys.places.detail(placeId) }),
        queryClient.refetchQueries({ queryKey: queryKeys.experiences.byPlace(placeId) }),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  }, [placeId, queryClient]);

  return { place, experiences, refresh, isRefreshing };
}
