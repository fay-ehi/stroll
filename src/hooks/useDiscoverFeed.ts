/**
 * Stroll — Discover Feed Hooks
 * src/hooks/useDiscoverFeed.ts
 *
 * The Discover domain's public API. Screens should go through these hooks
 * — never `experiencesService` or `supabase` directly (architecture rule:
 * UI screens → hooks → stores → services → Supabase). There's no Discover
 * Zustand store because there's no Discover-specific *client* state to
 * hold yet beyond the sort toggle and category chip selection, both of
 * which are page-local UI state owned by the Discover screen itself (see
 * app/(app)/(tabs)/discover.tsx) — everything here is server state, owned
 * by TanStack Query, matching the precedent set by usePlaces.ts.
 *
 * Exposes:
 *   useFeaturedExperiences()  — the small curated Featured Carousel set.
 *   useInfiniteDiscoverFeed() — the paginated newest/trending feed.
 *   useDiscoverFeed()         — screen-level composition of both, plus a
 *                               combined pull-to-refresh — what the
 *                               Discover screen actually calls.
 *   useRefreshDiscoverFeed()  — standalone refresh, for reuse anywhere
 *                               else the feed appears without needing the
 *                               full useDiscoverFeed() bundle (mirrors
 *                               useRefreshPlaces()).
 *
 * Caching: staleTime tuned per query the same way usePlaces.ts tunes
 * STALE_TIMES — featured (editorial, changes rarely) gets a longer
 * staleTime than the fast-moving newest/trending feed.
 */

import { useCallback, useMemo, useState } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryKeys';
import { logError, type StrollError } from '@/lib/errors';
import {
  fetchFeaturedExperiences,
  fetchDiscoverFeedPage,
  type DiscoverFeedPage,
} from '@/services/experiencesService';
import {
  toExperienceCardModel,
  type ExperienceCardModel,
  type ExperienceFeedRow,
  type DiscoverSortMode,
  type FeaturedExperiencesParams,
  type DiscoverFeedParams,
} from '@/types/experience';

// ─── Stale Times ───────────────────────────────────────────────────────────────

const STALE_TIMES = {
  featured: 10 * 60 * 1000,
  discover: 2 * 60 * 1000,
} as const;

function isRetryableStrollError(failureCount: number, error: StrollError): boolean {
  return error.isRetryable && failureCount < 2;
}

/**
 * Maps a page of raw rows to card models, dropping (and logging) any row
 * whose embedded creator/place came back null — see the "malformed
 * responses" handling this sprint's brief asks for. One bad row degrades
 * the feed by one card; it never fails the whole page.
 */
function mapRowsToCards(rows: ExperienceFeedRow[], context: string): ExperienceCardModel[] {
  const cards: ExperienceCardModel[] = [];
  for (const row of rows) {
    const card = toExperienceCardModel(row);
    if (card) {
      cards.push(card);
    } else {
      logError(
        context,
        new Error(`Experience ${row.id} is missing its creator or place — dropped from feed.`),
      );
    }
  }
  return cards;
}

// ─── useFeaturedExperiences ──────────────────────────────────────────────────────

export interface UseFeaturedExperiencesResult {
  experiences: ExperienceCardModel[];
  isLoading: boolean;
  isRefetching: boolean;
  isError: boolean;
  error: StrollError | null;
  refetch: () => void;
}

export function useFeaturedExperiences(
  params?: FeaturedExperiencesParams,
): UseFeaturedExperiencesResult {
  const query = useQuery<ExperienceCardModel[], StrollError>({
    queryKey: queryKeys.experiences.featured(params?.city),
    queryFn: async () => {
      const result = await fetchFeaturedExperiences(params);
      if (!result.ok) throw result.error;
      return mapRowsToCards(result.data, 'useFeaturedExperiences');
    },
    staleTime: STALE_TIMES.featured,
    retry: isRetryableStrollError,
  });

  return {
    experiences: query.data ?? [],
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    isError: query.isError,
    error: query.error,
    refetch: () => {
      void query.refetch();
    },
  };
}

// ─── useInfiniteDiscoverFeed ─────────────────────────────────────────────────────

export interface UseInfiniteDiscoverFeedResult {
  experiences: ExperienceCardModel[];
  isLoading: boolean;
  isRefetching: boolean;
  isError: boolean;
  error: StrollError | null;
  refetch: () => void;
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
}

export function useInfiniteDiscoverFeed(params: DiscoverFeedParams): UseInfiniteDiscoverFeedResult {
  const { sort, city, limit } = params;

  const query = useInfiniteQuery<DiscoverFeedPage, StrollError>({
    queryKey: queryKeys.experiences.discover(sort, city),
    queryFn: async ({ pageParam }) => {
      const result = await fetchDiscoverFeedPage({
        sort,
        city,
        limit,
        cursor: (pageParam as string | null) ?? null,
      });
      if (!result.ok) throw result.error;
      return result.data;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: STALE_TIMES.discover,
    retry: isRetryableStrollError,
  });

  // Flattened once per data change, not on every render — the feed can
  // grow to several hundred cards deep after many "load more"s.
  const experiences = useMemo(() => {
    if (!query.data) return [];
    const allRows = query.data.pages.flatMap((page) => page.rows);
    return mapRowsToCards(allRows, 'useInfiniteDiscoverFeed');
  }, [query.data]);

  return {
    experiences,
    isLoading: query.isLoading,
    isRefetching: query.isRefetching && !query.isFetchingNextPage,
    isError: query.isError,
    error: query.error,
    refetch: () => {
      void query.refetch();
    },
    fetchNextPage: () => {
      void query.fetchNextPage();
    },
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
  };
}

// ─── useRefreshDiscoverFeed ──────────────────────────────────────────────────────

export interface UseRefreshDiscoverFeedResult {
  refresh: () => Promise<void>;
  isRefreshing: boolean;
}

/**
 * Force-refreshes every currently-mounted Discover query at once
 * (featured, every sort/city combination of the infinite feed — they all
 * share the `['experiences', ...]` key prefix via `queryKeys.experiences.all()`).
 * Mirrors useRefreshPlaces(). Prefer useDiscoverFeed()'s bundled `refresh`
 * for the Discover screen itself; this standalone version is for any
 * other surface that shows Discover content later (e.g. a widget) without
 * needing the full useDiscoverFeed() bundle.
 */
export function useRefreshDiscoverFeed(): UseRefreshDiscoverFeedResult {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await queryClient.refetchQueries({ queryKey: queryKeys.experiences.all(), type: 'active' });
    } finally {
      setIsRefreshing(false);
    }
  }, [queryClient]);

  return { refresh, isRefreshing };
}

// ─── useDiscoverFeed ─────────────────────────────────────────────────────────────
// Screen-level composition — what app/(app)/(tabs)/discover.tsx actually
// calls. Bundles the Featured Carousel, the sort-aware infinite feed, and
// a single pull-to-refresh that invalidates both, so the screen itself
// doesn't need to juggle three separate hooks and their loading states.

export interface UseDiscoverFeedResult {
  featured: UseFeaturedExperiencesResult;
  feed: UseInfiniteDiscoverFeedResult;
  sort: DiscoverSortMode;
  setSort: (sort: DiscoverSortMode) => void;
  refresh: () => Promise<void>;
  isRefreshing: boolean;
}

export interface UseDiscoverFeedParams {
  city?: string;
  /** Initial sort mode for the feed section. Defaults to 'newest'. */
  initialSort?: DiscoverSortMode;
}

export function useDiscoverFeed(params?: UseDiscoverFeedParams): UseDiscoverFeedResult {
  const { city, initialSort = 'newest' } = params ?? {};
  const [sort, setSort] = useState<DiscoverSortMode>(initialSort);

  // Deliberately NOT gated on the profile query resolving first (e.g. via
  // `enabled: !!city`). Discover is the app's primary home screen — if the
  // profile is already warm in cache (the common case; it's fetched right
  // after auth in Sprint 1), `city` is available on the very first render
  // and this is a non-issue. In the rare case it isn't, this briefly
  // queries the unfiltered ("all cities") feed under a different cache key
  // and swaps to the city-filtered one the moment `city` resolves — a tiny
  // flash of broader content beats making the whole home screen wait on a
  // second round trip before painting anything at all.
  const featured = useFeaturedExperiences({ city });
  const feed = useInfiniteDiscoverFeed({ sort, city });
  const { refresh, isRefreshing } = useRefreshDiscoverFeed();

  return { featured, feed, sort, setSort, refresh, isRefreshing };
}
