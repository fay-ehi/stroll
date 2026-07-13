/**
 * Stroll — useLocation Hook
 * src/hooks/useLocation.ts
 *
 * Sprint 4 Prompt 2 — Location-Aware Nearby Experience Surfacing.
 *
 * Owns the full lifecycle for this feature's device-location needs:
 *   - Silent permission checks (never prompts) on mount and on every
 *     foreground, via useAppState — this is how "granted later in
 *     system Settings" (Requirement 1) and "revoked mid-session"
 *     (Requirement 7) both get picked up without an app restart.
 *   - The actual OS permission prompt, but ONLY via `requestPermission()`,
 *     which this hook never calls itself — it's wired to the in-feed
 *     LocationPermissionCard's "Enable Location" button by the caller.
 *   - A long-lived, low-frequency position watch once permission is
 *     granted, refreshing only on meaningful movement (handled natively
 *     by expo-location's distanceInterval — see locationService.ts).
 *   - Reverse geocoding each fix to a supported city name.
 *
 * This hook does NOT decide when to show the permission ask, whether
 * nearby cards should render, or how the city-switch suggestion behaves
 * — those are feed-composition and city-filter concerns that belong in
 * the Discover screen (app/(app)/(tabs)/discover.tsx) and
 * useDiscoverFeed.ts, per this app's Layer Order (UI → Hooks → Stores →
 * Repositories). This hook just reports "what does the device currently
 * know."
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { useAppState } from '@/hooks';
import {
  getForegroundPermissionStatus,
  requestForegroundPermission,
  isLocationServicesEnabled,
  getCurrentCoordinates,
  reverseGeocodeToCity,
  watchPosition,
  type LocationSubscription,
} from '@/services/locationService';
import type { Coordinates, LocationPermissionStatus } from '@/types/location';

const IS_WEB = Platform.OS === 'web';

export interface UseLocationResult {
  permissionStatus: LocationPermissionStatus;
  /** Null until permission is granted AND a first fix has resolved. */
  coords: Coordinates | null;
  /** Reverse-geocoded + normalized city, or null (unresolved/unsupported/no fix yet). */
  resolvedCity: string | null;
  /** Triggers the actual OS permission dialog. Call only from a direct user tap. */
  requestPermission: () => Promise<void>;
}

export function useLocation(): UseLocationResult {
  const [permissionStatus, setPermissionStatus] = useState<LocationPermissionStatus>('undetermined');
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [resolvedCity, setResolvedCity] = useState<string | null>(null);

  const watchRef = useRef<LocationSubscription | null>(null);
  const isWatchingRef = useRef(false);

  const clearFix = useCallback(() => {
    setCoords(null);
    setResolvedCity(null);
  }, []);

  const stopWatching = useCallback(() => {
    watchRef.current?.remove();
    watchRef.current = null;
    isWatchingRef.current = false;
  }, []);

  const handleFix = useCallback(async (next: Coordinates) => {
    setCoords(next);
    const city = await reverseGeocodeToCity(next);
    setResolvedCity(city);
  }, []);

  const startWatching = useCallback(async () => {
    if (IS_WEB || isWatchingRef.current) return;
    isWatchingRef.current = true;

    const servicesEnabled = await isLocationServicesEnabled();
    if (!servicesEnabled) {
      // Device-wide location is off — degrade quietly, same as denied
      // permission (Requirement 9). Leave isWatchingRef false so a later
      // foreground check can retry once the person re-enables it.
      isWatchingRef.current = false;
      return;
    }

    // Seed an immediate fix so the first nearby card doesn't wait on the
    // watch's own first callback, which can lag on some Android devices.
    const initial = await getCurrentCoordinates();
    if (initial) void handleFix(initial);

    const subscription = await watchPosition((next) => {
      void handleFix(next);
    });
    watchRef.current = subscription;
  }, [handleFix]);

  const syncPermissionStatus = useCallback(async () => {
    const next = await getForegroundPermissionStatus();

    setPermissionStatus((prev) => (prev === next ? prev : next));

    if (next === 'granted') {
      void startWatching();
    } else {
      // Covers both "denied" and mid-session revocation (Requirement 7):
      // stop the watch and drop any stale fix/city immediately so no
      // stale nearby cards or suggestion are left showing.
      stopWatching();
      clearFix();
    }
  }, [startWatching, stopWatching, clearFix]);

  // Silent check on mount — never prompts. Covers returning users who
  // already granted permission in a previous session.
  useEffect(() => {
    void syncPermissionStatus();
    return () => stopWatching();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-check on every foreground — this is the "detect on next feed
  // load / next foreground, not requiring an app restart" mechanism for
  // both newly-granted and newly-revoked permission (Requirements 1, 7).
  const onForeground = useCallback(() => {
    void syncPermissionStatus();
  }, [syncPermissionStatus]);

  useAppState({ onForeground });

  const requestPermission = useCallback(async () => {
    const next = await requestForegroundPermission();
    setPermissionStatus(next);
    if (next === 'granted') void startWatching();
  }, [startWatching]);

  return { permissionStatus, coords, resolvedCity, requestPermission };
}
