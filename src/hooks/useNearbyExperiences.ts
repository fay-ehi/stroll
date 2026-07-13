/**
 * Stroll — useNearbyExperiences Hook
 * src/hooks/useNearbyExperiences.ts
 *
 * Sprint 4 Prompt 2 — Location-Aware Nearby Experience Surfacing.
 *
 * Builds the pool of nearby cards the Discover feed can splice in:
 *   1. Reuses useNearbyPlaces() (usePlaces.ts) — already wraps the
 *      `nearby_places` Supabase RPC, which does server-side distance
 *      calculation. Not re-implemented here.
 *   2. Places with at least one published Experience are identified
 *      straight from PlaceModel.experienceCount — no extra query needed
 *      just to check existence.
 *   3. For a bounded number of those places (LOCATION_CONFIG.NEARBY_POOL_SIZE
 *      — the feed only ever needs a handful in view at once), fetches the
 *      one Experience to surface via the existing fetchExperiencesByPlace()
 *      (same repository call Place Detail's "Community Experiences" list
 *      uses), limited to 1 row. Its default ordering — newest published
 *      first — IS the "existing Discover ranking utility" this sprint
 *      asks to reuse; nothing new is invented here.
 *
 * Deliberately does NOT gate on city-match — that's a display-layer
 * concern (Requirement 3) handled by the caller (discover.tsx /
 * useDiscoverFeed.ts), so switching the city filter mid-session doesn't
 * require re-fetching this pool, just re-evaluating whether to show it.
 */

import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';

import { useNearbyPlaces } from '@/hooks/usePlaces';
import { fetchExperiencesByPlace } from '@/services/experiencesService';
import { queryKeys } from '@/lib/queryKeys';
import { LOCATION_CONFIG } from '@/constants/location';
import { toExperienceCardModel } from '@/types/experience';
import { logError } from '@/lib/errors';
import type { Coordinates, NearbyExperienceModel } from '@/types/location';

const STALE_TIME_MS = 2 * 60 * 1000;

export interface UseNearbyExperiencesParams {
  /** Null while permission is undetermined/denied or the first fix hasn't resolved yet — the query stays disabled rather than firing with placeholder coordinates. */
  coords: Coordinates | null;
}

export interface UseNearbyExperiencesResult {
  nearbyPool: NearbyExperienceModel[];
  isLoading: boolean;
}

export function useNearbyExperiences({ coords }: UseNearbyExperiencesParams): UseNearbyExperiencesResult {
  const nearbyPlacesQuery = useNearbyPlaces({
    latitude: coords?.latitude ?? 0,
    longitude: coords?.longitude ?? 0,
    enabled: coords !== null,
  });

  const eligiblePlaces = useMemo(
    () =>
      nearbyPlacesQuery.places
        .filter((place) => place.experienceCount > 0)
        .slice(0, LOCATION_CONFIG.NEARBY_POOL_SIZE),
    [nearbyPlacesQuery.places]
  );

  const experienceQueries = useQueries({
    queries: eligiblePlaces.map((place) => ({
      queryKey: queryKeys.experiences.byPlaceLatest(place.id),
      queryFn: async () => {
        const result = await fetchExperiencesByPlace({ placeId: place.id, limit: 1 });
        if (!result.ok) throw result.error;
        return result.data;
      },
      enabled: coords !== null,
      staleTime: STALE_TIME_MS,
    })),
  });

  const nearbyPool = useMemo<NearbyExperienceModel[]>(() => {
    const pool: NearbyExperienceModel[] = [];

    eligiblePlaces.forEach((place, index) => {
      const row = experienceQueries[index]?.data?.rows[0];
      if (!row) return;

      const experience = toExperienceCardModel(row);
      if (!experience) {
        logError(
          'useNearbyExperiences',
          new Error(`Experience for nearby place ${place.id} is missing creator/place data — dropped from pool.`)
        );
        return;
      }

      pool.push({ placeId: place.id, distanceKm: place.distanceKm ?? 0, experience });
    });

    return pool;
    // experienceQueries is a fresh array identity every render (useQueries'
    // contract) — depend on its serialized data instead so this memo only
    // recomputes when the underlying query results actually change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eligiblePlaces, experienceQueries.map((q) => q.dataUpdatedAt).join(',')]);

  const isLoading = nearbyPlacesQuery.isLoading || experienceQueries.some((q) => q.isLoading);

  return { nearbyPool, isLoading };
}
