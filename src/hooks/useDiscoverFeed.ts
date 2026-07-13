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
 *   useInfiniteDiscoverFeed() — the paginated newest/trending feed, now
 *                               personalized (Sprint 2 Prompt 3) — see
 *                               that function's own doc for how.
 *   useFrequentCategories()   — the user's most-viewed categories
 *                               (lib/recentlyViewed.ts), wrapped in
 *                               TanStack Query for consistent loading-
 *                               state ergonomics with everything else.
 *   useContinueExploring()    — the "Continue Exploring" recommendations
 *                               rail (requirement #2). Reuses
 *                               fetchRelatedExperiences() from Sprint 2
 *                               Prompt 2 — same query shape, different
 *                               seed category — rather than a parallel
 *                               recommendation query.
 *   useDiscoverFeed()         — screen-level composition of the above,
 *                               plus a combined pull-to-refresh — what
 *                               the Discover screen actually calls.
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
import { personalizeExperienceList, type PersonalizationContext } from '@/lib/personalization';
import { getFrequentCategories, getMostRecentlyViewedExperienceId } from '@/lib/recentlyViewed';
import { trackFeedRefreshed } from '@/lib/analytics';
import {
  fetchFeaturedExperiences,
  fetchDiscoverFeedPage,
  fetchRelatedExperiences,
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
import { isPlaceCategoryId, type PlaceCategoryId } from '@/constants/places';
import { LOCATION_CONFIG } from '@/constants/location';
import type { NearbyExperienceModel } from '@/types/location';

// ─── Stale Times ───────────────────────────────────────────────────────────────

const STALE_TIMES = {
  featured: 10 * 60 * 1000,
  discover: 2 * 60 * 1000,
  // Local storage, not network — cheap enough to refetch often, but no
  // reason to hammer AsyncStorage on every render either.
  frequentCategories: 60 * 1000,
} as const;

/**
 * `fetchRelatedExperiences()` always excludes one experience id — for
 * "Continue Exploring" (useContinueExploring below) that's normally the
 * most recently viewed experience, but a brand-new user has no view
 * history yet. The nil UUID never matches a real row, making the
 * exclusion filter a harmless no-op instead of a special case the query
 * builder needs to branch on.
 */
const NIL_UUID = '00000000-0000-0000-0000-000000000000';

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

// ─── useFrequentCategories ────────────────────────────────────────────────────────

export interface UseFrequentCategoriesResult {
  categoryIds: PlaceCategoryId[];
  isLoading: boolean;
}

/**
 * Wraps `getFrequentCategories()` (lib/recentlyViewed.ts) in TanStack
 * Query. There's no network request here — this exists purely so every
 * consumer (personalization scoring, Continue Exploring) gets the same
 * loading-state/caching shape as every other hook in this file, instead
 * of hand-rolling its own `useState` + `useEffect` for an async read.
 */
export function useFrequentCategories(): UseFrequentCategoriesResult {
  const query = useQuery<PlaceCategoryId[]>({
    queryKey: queryKeys.personalization.frequentCategories(),
    queryFn: () => getFrequentCategories(),
    staleTime: STALE_TIMES.frequentCategories,
  });

  return {
    categoryIds: query.data ?? [],
    isLoading: query.isLoading,
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

export function useInfiniteDiscoverFeed(
  params: DiscoverFeedParams & {
    /** Sprint 2 Prompt 3 — see personalizeExperienceList's doc for how these re-rank each page. Both default to empty (no personalization signal), not undefined, so this hook works exactly as before if a caller doesn't pass them. */
    interests?: string[];
    recentCategoryIds?: PlaceCategoryId[];
  },
): UseInfiniteDiscoverFeedResult {
  const { sort, city, limit, interests = [], recentCategoryIds = [] } = params;

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
  //
  // Personalization (Sprint 2 Prompt 3) re-ranks WITHIN each page, before
  // flattening — never across the combined list. City and sort order are
  // still resolved entirely server-side; this only reorders the rows one
  // server page already returned. See personalization.ts's module doc for
  // why that boundary matters for cursor pagination correctness.
  const context: PersonalizationContext = useMemo(
    () => ({ interests, recentCategoryIds }),
    [interests, recentCategoryIds],
  );

  const experiences = useMemo(() => {
    if (!query.data) return [];
    return query.data.pages.flatMap((page) => {
      const cards = mapRowsToCards(page.rows, 'useInfiniteDiscoverFeed');
      return personalizeExperienceList(cards, context);
    });
  }, [query.data, context]);

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

// ─── useContinueExploring ────────────────────────────────────────────────────────

export interface UseContinueExploringResult {
  experiences: ExperienceCardModel[];
  isLoading: boolean;
  isError: boolean;
  error: StrollError | null;
  refetch: () => void;
}

/**
 * Recently-viewed categories are a stronger signal ("what they're
 * actually doing right now") than onboarding interests ("what they said
 * once, weeks ago") — so a recent category wins when both are available.
 * Falls back to the first onboarding interest that happens to be a real
 * PlaceCategoryId (see personalization.ts's module doc on why not every
 * interest is one). Returns null — meaning "don't render this section
 * at all" — only when neither signal exists.
 */
function pickSeedCategory(
  interests: string[],
  recentCategoryIds: PlaceCategoryId[],
): PlaceCategoryId | null {
  if (recentCategoryIds[0]) return recentCategoryIds[0];
  return interests.find(isPlaceCategoryId) ?? null;
}

export interface UseContinueExploringParams {
  city?: string;
  interests: string[];
  recentCategoryIds: PlaceCategoryId[];
}

/**
 * Requirement #2 — "Continue Exploring": categories the user frequently
 * opens, similar experiences, previously viewed experiences. Reuses
 * `fetchRelatedExperiences()` (Sprint 2 Prompt 2's Experience Detail
 * "related" rail) rather than a parallel recommendation query — the
 * query shape ("other experiences in this category/city, excluding one
 * id") is identical; only WHICH category and WHICH excluded id differ.
 */
export function useContinueExploring(
  params: UseContinueExploringParams,
): UseContinueExploringResult {
  const { city, interests, recentCategoryIds } = params;
  const category = pickSeedCategory(interests, recentCategoryIds);
  const enabled = !!category && !!city;

  const query = useQuery<ExperienceCardModel[], StrollError>({
    queryKey: queryKeys.experiences.recommended(category ?? 'none', city ?? 'all'),
    queryFn: async () => {
      // `enabled` guarantees category/city are non-null whenever this runs.
      const excludeId = (await getMostRecentlyViewedExperienceId()) ?? NIL_UUID;
      const result = await fetchRelatedExperiences({
        experienceId: excludeId,
        category: category as PlaceCategoryId,
        city: city as string,
        limit: 10,
      });
      if (!result.ok) throw result.error;
      return mapRowsToCards(result.data, 'useContinueExploring');
    },
    enabled,
    staleTime: STALE_TIMES.discover,
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

// ─── useRefreshDiscoverFeed ──────────────────────────────────────────────────────

export interface UseRefreshDiscoverFeedResult {
  refresh: () => Promise<void>;
  isRefreshing: boolean;
}

/**
 * Force-refreshes every currently-mounted Discover query at once —
 * featured, every sort/city combination of the infinite feed, and
 * Continue Exploring's recommendations (all share the `['experiences', ...]`
 * key prefix via `queryKeys.experiences.all()`) — plus the frequent-
 * categories read that feeds those recommendations, so a pull-to-refresh
 * genuinely reflects fresh view history, not just fresh server data.
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
      await Promise.all([
        queryClient.refetchQueries({ queryKey: queryKeys.experiences.all(), type: 'active' }),
        queryClient.refetchQueries({
          queryKey: queryKeys.personalization.frequentCategories(),
          type: 'active',
        }),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  }, [queryClient]);

  return { refresh, isRefreshing };
}

// ─── useDiscoverFeed ─────────────────────────────────────────────────────────────
// Screen-level composition — what app/(app)/(tabs)/discover.tsx actually
// calls. Bundles the sort-aware personalized infinite feed, Continue
// Exploring, and a single pull-to-refresh, so the screen itself doesn't
// need to juggle separate hooks and their loading states.
//
// Does NOT bundle useFeaturedExperiences() — per product direction (the
// Discover wireframe), there's no Featured Carousel on this screen
// anymore. useFeaturedExperiences() stays exported above, standalone, for
// whenever a Featured/Collections surface needs it again — bundling an
// unrendered background fetch into every Discover mount would be exactly
// the kind of unnecessary network request this app's performance rules
// call out.

export interface UseDiscoverFeedResult {
  feed: UseInfiniteDiscoverFeedResult;
  continueExploring: UseContinueExploringResult;
  sort: DiscoverSortMode;
  setSort: (sort: DiscoverSortMode) => void;
  refresh: () => Promise<void>;
  isRefreshing: boolean;
}

export interface UseDiscoverFeedParams {
  city?: string;
  /** `profile.interests` — pass through so both personalization and Continue Exploring can use it. Defaults to none. */
  interests?: string[];
  /** Initial sort mode for the feed section. Defaults to 'newest'. */
  initialSort?: DiscoverSortMode;
}

export function useDiscoverFeed(params?: UseDiscoverFeedParams): UseDiscoverFeedResult {
  const { city, interests = [], initialSort = 'newest' } = params ?? {};
  const [sort, setSort] = useState<DiscoverSortMode>(initialSort);

  const { categoryIds: recentCategoryIds } = useFrequentCategories();

  // Deliberately NOT gated on the profile query resolving first (e.g. via
  // `enabled: !!city`). Discover is the app's primary home screen — if the
  // profile is already warm in cache (the common case; it's fetched right
  // after auth in Sprint 1), `city` is available on the very first render
  // and this is a non-issue. In the rare case it isn't, this briefly
  // queries the unfiltered ("all cities") feed under a different cache key
  // and swaps to the city-filtered one the moment `city` resolves — a tiny
  // flash of broader content beats making the whole home screen wait on a
  // second round trip before painting anything at all.
  const feed = useInfiniteDiscoverFeed({ sort, city, interests, recentCategoryIds });
  const continueExploring = useContinueExploring({ city, interests, recentCategoryIds });
  const { refresh: refreshQueries, isRefreshing } = useRefreshDiscoverFeed();

  const refresh = useCallback(async () => {
    trackFeedRefreshed({ screen: 'discover' });
    await refreshQueries();
  }, [refreshQueries]);

  return { feed, continueExploring, sort, setSort, refresh, isRefreshing };
}

// ─── Nearby Card Interleaving (Sprint 4 Prompt 2) ───────────────────────────────
// "Extend useDiscoverFeed.ts / the feed-rendering logic to splice a nearby
// card in every N items ... as additive data, not a parallel
// fetch-and-prepend." Nearby cards themselves come from useNearbyExperiences
// (a session-scoped pool, refreshed on meaningful movement — NOT paginated),
// so they're spliced into the already-paginated `feed.experiences` array at
// render-composition time here, rather than being fetched as part of the
// feed query itself. This keeps pagination, pull-to-refresh, and offline
// caching (all of which already work today) completely untouched — a user
// with no permission, no city match, or no nearby experiences gets an
// `items` array that's identical, item for item, to `feed.experiences`.

export type DiscoverFeedItem =
  | { kind: 'experience'; key: string; experience: ExperienceCardModel }
  | { kind: 'nearby'; key: string; nearby: NearbyExperienceModel }
  /** The in-feed permission ask (Requirement 1) rides the same cadence slots nearby cards use — it's what occupies the FIRST such slot when permission is still undetermined, so the OS prompt is only ever reachable from a contextual, already-scrolled-to card, never at launch. */
  | { kind: 'location_permission_ask'; key: string };

export interface BuildDiscoverFeedItemsParams {
  experiences: ExperienceCardModel[];
  nearbyPool: NearbyExperienceModel[];
  /** Permission granted AND the reverse-geocoded city matches the active city filter (Requirement 3) — the ONLY condition under which nearby cards actually render. */
  showNearbyCards: boolean;
  /** Permission still undetermined AND the soft-ask hasn't been shown yet this session (locationStore.softAskShownThisSession). */
  showPermissionAsk: boolean;
  cadence?: number;
}

export interface DiscoverFeedItemsResult {
  items: DiscoverFeedItem[];
  /** True the moment a permission-ask item is actually included in `items` — the caller uses this to mark it shown in locationStore, exactly once, exactly when it truly entered the feed (not merely "was eligible to"). */
  didInsertPermissionAsk: boolean;
}

export function buildDiscoverFeedItems(params: BuildDiscoverFeedItemsParams): DiscoverFeedItemsResult {
  const {
    experiences,
    nearbyPool,
    showNearbyCards,
    showPermissionAsk,
    cadence = LOCATION_CONFIG.NEARBY_CARD_CADENCE,
  } = params;

  const items: DiscoverFeedItem[] = [];
  let nearbyPoolIndex = 0;
  let didInsertPermissionAsk = false;

  experiences.forEach((experience, index) => {
    items.push({ kind: 'experience', key: experience.id, experience });

    // A "slot" occurs every `cadence` experience cards (1-indexed: the
    // 9th, 18th, 27th ... card). Nothing extra is inserted between slots
    // — this is "additive data" at fixed intervals, not a re-shuffle.
    const isSlot = (index + 1) % cadence === 0;
    if (!isSlot) return;

    // The FIRST eligible slot gets the permission ask instead of a
    // nearby card, if one is due — never both, and never more than once
    // per call (the `!didInsertPermissionAsk` guard), which is what
    // keeps a later page's cadence slots from re-inserting it after
    // pagination grows `experiences`.
    if (!didInsertPermissionAsk && showPermissionAsk) {
      items.push({ kind: 'location_permission_ask', key: `location-permission-ask-${index}` });
      didInsertPermissionAsk = true;
      return;
    }

    if (showNearbyCards && nearbyPoolIndex < nearbyPool.length) {
      const nearby = nearbyPool[nearbyPoolIndex];
      if (nearby) {
        items.push({ kind: 'nearby', key: `nearby-${nearby.experience.id}-${index}`, nearby });
        nearbyPoolIndex += 1;
      }
    }
    // Pool exhausted, permission denied, or city mismatched: the slot
    // simply contributes nothing extra — indistinguishable from a feed
    // with this feature turned off entirely.
  });

  return { items, didInsertPermissionAsk };
}

/**
 * Memoized wrapper around buildDiscoverFeedItems — the pure computation
 * above never mutates state (no store writes inside the memo), so it's
 * safe to recompute on every relevant dependency change. The caller
 * (app/(app)/(tabs)/discover.tsx) is responsible for reacting to
 * `didInsertPermissionAsk` via its own `useEffect`, e.g.:
 *
 *   useEffect(() => {
 *     if (didInsertPermissionAsk) markSoftAskShown();
 *   }, [didInsertPermissionAsk]);
 */
export function useDiscoverFeedItems(params: BuildDiscoverFeedItemsParams): DiscoverFeedItemsResult {
  return useMemo(
    () => buildDiscoverFeedItems(params),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [params.experiences, params.nearbyPool, params.showNearbyCards, params.showPermissionAsk, params.cadence]
  );
}
