/**
 * Stroll — Search Hooks
 * src/hooks/useSearch.ts
 *
 * Sprint 7 Prompt 1 — Search Foundation. The Search domain's public API
 * — screens/components go through these hooks, never searchService,
 * recentSearches, or supabase directly (architecture rule: UI Screens →
 * Hooks → Stores → Repositories → Supabase).
 *
 * Exposes:
 *   useSearch()             — the debounced, unified Experiences/
 *                             Collections/Creators search, now also
 *                             ranked and carrying recommendation
 *                             fallbacks (Sprint 7 Prompt 2).
 *   useRecentSearches()     — the locally-stored recent-search list,
 *                             plus record/remove/clear actions.
 *   useSearchSuggestions()  — Sprint 7 Prompt 2's Suggested Searches
 *                             typeahead. Deliberately NOT debounced —
 *                             it's a pure local computation (recent
 *                             searches + features/search's suggestion
 *                             vocabulary), not a network request, so it
 *                             can and should update every keystroke.
 *   useSearchInspiration()  — Sprint 7 Prompt 2's enhanced "no query
 *                             yet" empty state (Continue Exploring /
 *                             Recently Saved Collections / Suggested
 *                             Experiences). Composes existing Discover
 *                             and Saved hooks rather than fetching
 *                             anything new — see that hook's own doc.
 *
 * ── Why debouncing lives here, not in the SearchInput component ──
 * The prompt's own requirement: "Wait briefly after the user stops
 * typing... Cancel previous requests if a new query begins." Reuses the
 * existing generic `useDebounce` (src/hooks/index.ts) — the same
 * TIMEOUTS.SEARCH_DEBOUNCE_MS-driven pattern useCollections.ts's
 * useSearchCollections() already established — rather than introducing
 * a second debounce implementation. "Cancel previous requests" comes for
 * free from TanStack Query itself: a query keyed by the debounced value
 * (queryKeys.search.results) is a NEW query whenever that value changes,
 * so an in-flight request for a stale query is simply abandoned by the
 * query cache rather than needing an explicit AbortController here.
 *
 * ── Why one combined query, not three ──
 * searchService.ts's searchAll() already returns one unified
 * `SearchResults` object (see that file's own doc) — this hook wraps
 * that single call in one `useQuery`, rather than three separate
 * `useQuery` calls (one per domain), because the three sections are
 * always shown together on one screen and always the product of the
 * same debounced query string; splitting them into three cache entries
 * would only add bookkeeping without buying anything, since nothing
 * else in the app reads "just the Creators half of a Search screen's
 * results" independently the way, say, `queryKeys.collections.feed`
 * backs a screen its Collections section is unique to.
 */

import { useCallback, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryKeys';
import { type StrollError } from '@/lib/errors';
import { useAuthStore } from '@/stores/authStore';
import { useDebounce, useNetworkStatus } from '@/hooks';
import { TIMEOUTS, SEARCH_LIMITS } from '@/constants/app';
import { searchAll } from '@/services/searchService';
import {
  getRecentSearches,
  recordRecentSearch,
  removeRecentSearch,
  clearRecentSearches,
  type RecentSearchEntry,
} from '@/lib/recentSearches';
import { EMPTY_SEARCH_RESULTS, type SearchResults } from '@/types/search';
import type { ExperienceCardModel } from '@/types/experience';
import type { CollectionCardModel } from '@/types/collection';
import type { CreatorSearchResult } from '@/types/search';
import { getSuggestedSearches, type SearchSuggestion } from '@/features/search';
import { useProfile } from '@/hooks/useProfile';
import {
  useContinueExploring,
  useFeaturedExperiences,
  useFrequentCategories,
} from '@/hooks/useDiscoverFeed';
import { useSavedCollections } from '@/hooks/useSaved';

const STALE_TIME = 30 * 1000;

function isRetryableStrollError(failureCount: number, error: StrollError): boolean {
  return error.isRetryable && failureCount < 2;
}

// ─── useSearch ──────────────────────────────────────────────────────────────────

export interface UseSearchResult {
  /** The raw (not debounced) query text the caller passed in — echoed back for convenience so a screen doesn't need to hold it separately. */
  query: string;
  experiences: ExperienceCardModel[];
  collections: CollectionCardModel[];
  creators: CreatorSearchResult[];
  /** "Recommended Experiences" — populated only when `experiences` has no exact matches for the current query (Sprint 7 Prompt 2). */
  recommendedExperiences: ExperienceCardModel[];
  /** "Recommended Collections" — populated only when `collections` has no exact matches for the current query (Sprint 7 Prompt 2). */
  recommendedCollections: CollectionCardModel[];
  /** The exact, settled (debounced) query text that produced the results above — pass this, not the live `query`, into HighlightedText/highlightQuery props so highlighting never flashes ahead of what's actually on screen mid-keystroke. Empty string whenever there are no settled results yet. */
  highlightQuery: string;
  /** True once `query` has cleared the "still typing" threshold (SEARCH_LIMITS.MIN_QUERY_LENGTH) — a screen uses this to decide "show results/empty-state" vs. "show Recent Searches". */
  hasQuery: boolean;
  hasResults: boolean;
  /** True if either recommendation list has content — a screen uses this to decide whether the "Suggested Results" section / enhanced no-results fallback has anything to show at all. */
  hasRecommendations: boolean;
  isLoading: boolean;
  isError: boolean;
  error: StrollError | null;
  /** True when there's no network connection — Search has no offline cache (unlike Saved's persisted queries), so a screen shows this instead of attempting a request that would just fail. */
  isOffline: boolean;
  refetch: () => void;
}

/**
 * Debounced, unified search across Experiences, Collections, and
 * Creators. Fires nothing below SEARCH_LIMITS.MIN_QUERY_LENGTH — a
 * one-character query is still "typing", not a search (see
 * constants/app.ts's own doc for why this threshold is centralized
 * here rather than left to each domain's own laxer default). Also
 * fires nothing while offline — Search has no offline persistence to
 * fall back to, so there's no point attempting (and failing) a request.
 */
export function useSearch(query: string): UseSearchResult {
  const user = useAuthStore((s) => s.user);
  const { isConnected } = useNetworkStatus();
  const debouncedQuery = useDebounce(query.trim(), TIMEOUTS.SEARCH_DEBOUNCE_MS);
  const isQueryLongEnough = debouncedQuery.length >= SEARCH_LIMITS.MIN_QUERY_LENGTH;

  const searchQuery = useQuery<SearchResults, StrollError>({
    queryKey: queryKeys.search.results(debouncedQuery),
    enabled: isQueryLongEnough && isConnected,
    queryFn: async () => {
      const result = await searchAll({ query: debouncedQuery, excludeUserId: user?.id });
      if (!result.ok) throw result.error;
      return result.data;
    },
    staleTime: STALE_TIME,
    retry: isRetryableStrollError,
  });

  const data = searchQuery.data ?? EMPTY_SEARCH_RESULTS;
  const hasResults =
    data.experiences.length > 0 || data.collections.length > 0 || data.creators.length > 0;
  const hasRecommendations =
    data.recommendedExperiences.length > 0 || data.recommendedCollections.length > 0;

  return {
    query,
    experiences: data.experiences,
    collections: data.collections,
    creators: data.creators,
    recommendedExperiences: data.recommendedExperiences,
    recommendedCollections: data.recommendedCollections,
    // Only worth highlighting against once a query has actually resolved
    // (searchQuery.data set) — an empty string here is a no-op for
    // HighlightedText, which already renders plain text when its `query`
    // prop is falsy.
    highlightQuery: searchQuery.data ? debouncedQuery : '',
    hasQuery: isQueryLongEnough,
    hasResults,
    hasRecommendations,
    // Only reports "loading" once a query has actually been fired —
    // otherwise a screen would show a loading skeleton while the user
    // is still mid-keystroke, before the debounce has even settled.
    isLoading: isQueryLongEnough && isConnected && searchQuery.isLoading,
    isError: isQueryLongEnough && isConnected && searchQuery.isError,
    error: searchQuery.error ?? null,
    isOffline: isQueryLongEnough && !isConnected,
    refetch: () => {
      void searchQuery.refetch();
    },
  };
}

// ─── useRecentSearches ──────────────────────────────────────────────────────────
// Wraps lib/recentSearches.ts's AsyncStorage-backed functions in
// TanStack Query purely for consistent loading-state/caching ergonomics
// with everything else in this app (queryKeys.search.recent() — same
// reasoning as queryKeys.personalization.frequentCategories), not
// because it's a network request.

export interface UseRecentSearchesResult {
  searches: RecentSearchEntry[];
  isLoading: boolean;
  /** Records a completed search — called once a search actually resolves (see search.tsx), not on every keystroke. */
  record: (query: string) => void;
  /** Removes one recent-search entry by its exact query text. */
  remove: (query: string) => void;
  /** Clears the entire recent-searches list. */
  clear: () => void;
}

export function useRecentSearches(): UseRecentSearchesResult {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.search.recent();

  const query = useQuery<RecentSearchEntry[]>({
    queryKey,
    queryFn: getRecentSearches,
    staleTime: STALE_TIME,
  });

  const record = useCallback(
    (searchQuery: string) => {
      void recordRecentSearch(searchQuery).then((updated) => {
        queryClient.setQueryData(queryKey, updated);
      });
    },
    [queryClient, queryKey],
  );

  const remove = useCallback(
    (searchQuery: string) => {
      void removeRecentSearch(searchQuery).then((updated) => {
        queryClient.setQueryData(queryKey, updated);
      });
    },
    [queryClient, queryKey],
  );

  const clear = useCallback(() => {
    void clearRecentSearches().then(() => {
      queryClient.setQueryData(queryKey, []);
    });
  }, [queryClient, queryKey]);

  return {
    searches: query.data ?? [],
    isLoading: query.isLoading,
    record,
    remove,
    clear,
  };
}

// ─── useSearchScreen ────────────────────────────────────────────────────────────
// Screen-level composition hook — same precedent as useSaved.ts's
// useSavedLibrary and useProfile.ts's usePublicProfilePage: one call for
// the screen, business logic (here: recording a completed search into
// Recent Searches) living in the hook rather than the component, per
// this prompt's own "Business logic belongs inside hooks and services.
// Keep components focused on rendering."
//
// Recording fires once a search actually settles (has a query, finished
// loading, no error) — not on every keystroke — so Recent Searches only
// ever fills with terms the user meant to search for, matching
// lib/recentSearches.ts's own doc.

export interface UseSearchScreenResult extends UseSearchResult {
  recentSearches: UseRecentSearchesResult;
}

export function useSearchScreen(query: string): UseSearchScreenResult {
  const search = useSearch(query);
  const recentSearches = useRecentSearches();

  const trimmedQuery = query.trim();
  const { record } = recentSearches;
  const { hasQuery, isLoading, isError } = search;

  useEffect(() => {
    if (hasQuery && !isLoading && !isError && trimmedQuery) {
      record(trimmedQuery);
    }
    // Intentionally NOT keyed on `trimmedQuery` alone — this should only
    // fire on the loading→settled transition (hasQuery/isLoading/isError
    // changing), not on every keystroke. By the time that transition
    // happens, `trimmedQuery` already holds the settled value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasQuery, isLoading, isError]);

  return { ...search, recentSearches };
}

// ─── useSearchSuggestions ───────────────────────────────────────────────────────
// Sprint 7 Prompt 2 — "Suggested Searches". Pure local computation (see
// features/search/keyword-mapping/suggestionVocabulary.ts) — no network
// request, so unlike useSearch() above this deliberately reads the RAW,
// not debounced, query text: a typeahead suggestion list that only
// updated after the same 400ms search-debounce would feel sluggish for
// something that costs nothing to compute instantly.

/**
 * Suggestion chips for the text currently in the search box — recent
 * searches first, then related vocabulary (see that module's own doc
 * for the full source list). Returns `[]` for an empty/whitespace query;
 * search.tsx shows Recent Searches or the inspiration empty state
 * instead in that case (see useSearchInspiration below).
 */
export function useSearchSuggestions(query: string): SearchSuggestion[] {
  const { searches } = useRecentSearches();
  return useMemo(() => getSuggestedSearches(query, searches), [query, searches]);
}

// ─── useSearchInspiration ────────────────────────────────────────────────────────
// Sprint 7 Prompt 2 — "Empty Search Enhancement": "When no query exists,
// show inspiration instead of an empty screen... Continue Exploring,
// Recently Saved Collections, Suggested Experiences."
//
// Composes three ALREADY-EXISTING hooks rather than fetching anything
// new — this codebase's own "reuse existing services/hooks" rule, and
// exactly the reasoning discover.tsx's own Continue Exploring section
// and profile.tsx's Collections section already rely on:
//   - Continue Exploring    → useContinueExploring() (useDiscoverFeed.ts),
//                             the same personalized-by-category feed
//                             Discover's own Continue Exploring rail uses.
//   - Suggested Experiences → useFeaturedExperiences() (useDiscoverFeed.ts),
//                             editorially-featured content — a genuinely
//                             different pool than Continue Exploring's
//                             personalized one, not a duplicate rail.
//   - Recently Saved        → useSavedCollections() (useSaved.ts), the
//     Collections            same data the Saved tab's Collections
//                             section already renders, capped to a
//                             preview-sized slice here.
//
// A signed-out user (no `user.id`) simply sees Recently Saved Collections
// stay empty — useSavedCollections() already `enabled: !!userId`-gates
// itself, so this needs no extra guard here.

const INSPIRATION_SAVED_COLLECTIONS_LIMIT = 4;

export interface UseSearchInspirationResult {
  continueExploring: { experiences: ExperienceCardModel[]; isLoading: boolean };
  suggestedExperiences: { experiences: ExperienceCardModel[]; isLoading: boolean };
  savedCollections: { collections: CollectionCardModel[]; isLoading: boolean };
}

export function useSearchInspiration(): UseSearchInspirationResult {
  const user = useAuthStore((s) => s.user);
  const { profile } = useProfile();
  const { categoryIds: recentCategoryIds } = useFrequentCategories();

  const city = profile?.city ?? undefined;
  const interests = profile?.interests ?? [];

  const continueExploring = useContinueExploring({ city, interests, recentCategoryIds });
  const suggestedExperiences = useFeaturedExperiences({ city, limit: 6 });
  const savedCollections = useSavedCollections(user?.id);

  return {
    continueExploring: {
      experiences: continueExploring.experiences,
      isLoading: continueExploring.isLoading,
    },
    suggestedExperiences: {
      experiences: suggestedExperiences.experiences,
      isLoading: suggestedExperiences.isLoading,
    },
    savedCollections: {
      collections: savedCollections.collections.slice(0, INSPIRATION_SAVED_COLLECTIONS_LIMIT),
      isLoading: savedCollections.isLoading,
    },
  };
}
