/**
 * Stroll — Places Hooks
 * src/hooks/usePlaces.ts
 *
 * The Places domain's public API. Screens should go through these hooks —
 * never `placesService` or `supabase` directly (architecture rule: UI
 * screens → hooks → stores → services → Supabase). There's no places
 * Zustand store because there's no place-specific UI state to hold yet
 * (no editing, no drafts) — everything here is server state, owned by
 * TanStack Query.
 *
 * Exposes:
 *   useFeaturedPlaces()   — editorially "featured" places, optionally by city.
 *   useNearbyPlaces()     — PostGIS proximity search from given coordinates.
 *   usePlacesByCity()     — places in a city, optionally filtered by category.
 *   usePlacesByCategory() — places of a category, optionally filtered by city.
 *   usePlace()            — a single place by id.
 *   useRefreshPlaces()    — force-refresh every active places query at once.
 *
 * Caching: each hook has its own query key (src/lib/queryKeys.ts) and a
 * staleTime tuned to how often that data actually changes — see
 * STALE_TIMES below. `retry` skips non-retryable errors (validation, not
 * found) so a bad input doesn't hammer the network 3 times before failing.
 */

import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryKeys';
import { makeError, type StrollError } from '@/lib/errors';
import { useDebounce } from '@/hooks';
import { TIMEOUTS } from '@/constants/app';
import type { PlaceCategoryId } from '@/constants/places';
import {
  fetchFeaturedPlaces,
  fetchNearbyPlaces,
  fetchPlacesByCity,
  fetchPlacesByCategory,
  fetchPlaceById,
  searchPlaces,
} from '@/services/placesService';
import {
  toPlaceModel,
  validateCoordinates,
  type PlaceModel,
  type FeaturedPlacesParams,
  type NearbyPlacesParams,
  type PlacesByCityParams,
  type PlacesByCategoryParams,
} from '@/types/place';

// ─── Stale Times ───────────────────────────────────────────────────────────────
// How long each kind of places data is considered fresh before TanStack
// Query will silently refetch it in the background. Featured places are
// editorial and change rarely; nearby results are kept shorter since
// "what's near me" has a more real-time feel even though the underlying
// rows don't change any faster than the others.

const STALE_TIMES = {
  featured:   10 * 60 * 1000,
  byCity:      5 * 60 * 1000,
  byCategory:  5 * 60 * 1000,
  nearby:      2 * 60 * 1000,
  detail:      5 * 60 * 1000,
  // Shorter than the others — a search result set going stale a minute
  // after the user typed it is a non-issue (they've usually already
  // picked or moved on), but keeping it noticeably shorter than
  // `byCity`/`byCategory` avoids serving a visibly-stale list back if
  // they clear and retype the same query within the same session.
  search:      1 * 60 * 1000,
} as const;

function isRetryableStrollError(failureCount: number, error: StrollError): boolean {
  return error.isRetryable && failureCount < 2;
}

// ─── Shared List Result Shape ──────────────────────────────────────────────────

export interface UsePlacesListResult {
  places:       PlaceModel[];
  isLoading:    boolean;
  isRefetching: boolean;
  isError:      boolean;
  error:        StrollError | null;
  refetch:      () => void;
}

function usePlacesListQuery(
  queryKey: readonly unknown[],
  queryFn: () => Promise<PlaceModel[]>,
  staleTime: number,
  enabled = true
): UsePlacesListResult {
  const query = useQuery<PlaceModel[], StrollError>({
    queryKey,
    queryFn,
    staleTime,
    enabled,
    retry: isRetryableStrollError,
  });

  return {
    places:       query.data ?? [],
    isLoading:    query.isLoading,
    isRefetching: query.isRefetching,
    isError:      query.isError,
    error:        query.error,
    refetch:      () => { void query.refetch(); },
  };
}

// ─── useFeaturedPlaces ─────────────────────────────────────────────────────────

export function useFeaturedPlaces(params?: FeaturedPlacesParams): UsePlacesListResult {
  return usePlacesListQuery(
    queryKeys.places.featured(params?.city),
    async () => {
      const result = await fetchFeaturedPlaces(params);
      if (!result.ok) throw result.error;
      return result.data.map((row) => toPlaceModel(row));
    },
    STALE_TIMES.featured
  );
}

// ─── useNearbyPlaces ───────────────────────────────────────────────────────────

const DEFAULT_RADIUS_KM = 10;

/**
 * Fetches places near a given coordinate. Takes latitude/longitude as
 * explicit params rather than reading device location itself — acquiring
 * GPS coordinates is a permissions/UX concern for whichever screen uses
 * this (a future "near me" Discover feature), not this data hook.
 */
export function useNearbyPlaces(params: NearbyPlacesParams): UsePlacesListResult {
  const radiusKm = params.radiusKm ?? DEFAULT_RADIUS_KM;
  const enabled = params.enabled ?? true;

  return usePlacesListQuery(
    queryKeys.places.nearby(params.latitude, params.longitude, radiusKm, params.category),
    async () => {
      const validation = validateCoordinates(params.latitude, params.longitude);
      if (!validation.valid) {
        throw makeError('VALIDATION_ERROR', validation.message ?? 'Invalid coordinates.');
      }

      const result = await fetchNearbyPlaces({ ...params, radiusKm });
      if (!result.ok) throw result.error;
      return result.data.map((row) => toPlaceModel(row, row.distance_km));
    },
    STALE_TIMES.nearby,
    enabled
  );
}

// ─── usePlacesByCity ───────────────────────────────────────────────────────────

export function usePlacesByCity(params: PlacesByCityParams): UsePlacesListResult {
  return usePlacesListQuery(
    queryKeys.places.byCity(params.city, params.category),
    async () => {
      const result = await fetchPlacesByCity(params);
      if (!result.ok) throw result.error;
      return result.data.map((row) => toPlaceModel(row));
    },
    STALE_TIMES.byCity
  );
}

// ─── usePlacesByCategory ───────────────────────────────────────────────────────

export function usePlacesByCategory(params: PlacesByCategoryParams): UsePlacesListResult {
  return usePlacesListQuery(
    queryKeys.places.byCategory(params.category, params.city),
    async () => {
      const result = await fetchPlacesByCategory(params);
      if (!result.ok) throw result.error;
      return result.data.map((row) => toPlaceModel(row));
    },
    STALE_TIMES.byCategory
  );
}

// ─── usePlaceSearch (Sprint 3 Prompt 2 — Experience Creation's Place step) ──────
// Debounces the raw `query` itself (not a separate "committed query" piece
// of state) — same reasoning useExperienceCreation.ts's autosave already
// documents: debounce the *value*, not a manually-managed timer, so the
// query key naturally settles once typing pauses instead of firing a
// network request per keystroke.

export interface UsePlaceSearchParams {
  query:     string;
  city?:     string;
  category?: PlaceCategoryId;
  limit?:    number;
}

export function usePlaceSearch(params: UsePlaceSearchParams): UsePlacesListResult {
  const debouncedQuery = useDebounce(params.query, TIMEOUTS.SEARCH_DEBOUNCE_MS);

  return usePlacesListQuery(
    queryKeys.places.search(debouncedQuery, params.city),
    async () => {
      const result = await searchPlaces({ ...params, query: debouncedQuery });
      if (!result.ok) throw result.error;
      return result.data.map((row) => toPlaceModel(row));
    },
    STALE_TIMES.search
  );
}

// ─── usePlace ──────────────────────────────────────────────────────────────────

export interface UsePlaceResult {
  place:        PlaceModel | null;
  isLoading:    boolean;
  isRefetching: boolean;
  isError:      boolean;
  error:        StrollError | null;
  refetch:      () => void;
}

export function usePlace(id: string | undefined): UsePlaceResult {
  const query = useQuery<PlaceModel, StrollError>({
    queryKey: queryKeys.places.detail(id ?? ''),
    enabled:  !!id,
    queryFn: async () => {
      if (!id) throw makeError('VALIDATION_ERROR', 'No place id provided.');

      const result = await fetchPlaceById(id);
      if (!result.ok) throw result.error;
      if (!result.data) throw makeError('NOT_FOUND', `No place found with id ${id}.`);

      return toPlaceModel(result.data);
    },
    staleTime: STALE_TIMES.detail,
    retry: isRetryableStrollError,
  });

  return {
    place:        query.data ?? null,
    isLoading:    query.isLoading,
    isRefetching: query.isRefetching,
    isError:      query.isError,
    error:        query.error,
    refetch:      () => { void query.refetch(); },
  };
}

// ─── useRefreshPlaces ──────────────────────────────────────────────────────────

export interface UseRefreshPlacesResult {
  refresh:      () => Promise<void>;
  isRefreshing: boolean;
}

/**
 * Force-refreshes every currently-mounted places query at once (featured,
 * nearby, by-city, by-category, detail — they all share the `['places', ...]`
 * key prefix). Intended for a Discover pull-to-refresh gesture once that
 * screen exists; each individual hook's own `refetch()` still works for
 * refreshing just that one query.
 */
export function useRefreshPlaces(): UseRefreshPlacesResult {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await queryClient.refetchQueries({ queryKey: queryKeys.places.all(), type: 'active' });
    } finally {
      setIsRefreshing(false);
    }
  }, [queryClient]);

  return { refresh, isRefreshing };
}
