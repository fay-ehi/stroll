/**
 * Stroll — Location Service
 * src/services/locationService.ts
 *
 * Sprint 4 Prompt 2 — Location-Aware Nearby Experience Surfacing.
 *
 * Thin wrapper around expo-location. Every function here degrades to a
 * quiet `null`/no-op on failure rather than throwing — per this sprint's
 * Requirement 9, permission denial, disabled location services, fetch
 * timeouts, and reverse-geocode failures must all read as "feature
 * doesn't exist," never a thrown error or a toast. logError() still
 * records the failure for diagnostics; it's just never surfaced to the
 * person.
 *
 * Reverse geocoding uses expo-location's built-in reverseGeocodeAsync —
 * the native, on-device platform geocoder (Apple's on iOS, the OS-level
 * one on Android). No Google API key, no third-party network call.
 */

import { Platform } from 'react-native';
import * as Location from 'expo-location';

import { NIGERIAN_CITIES } from '@/constants/onboarding';
import { LOCATION_CONFIG } from '@/constants/location';
import { logError } from '@/lib/errors';
import type { Coordinates, LocationPermissionStatus } from '@/types/location';

const IS_WEB = Platform.OS === 'web';

// ─── Permission ─────────────────────────────────────────────────────────────────

function toPermissionStatus(status: Location.PermissionStatus): LocationPermissionStatus {
  switch (status) {
    case Location.PermissionStatus.GRANTED:
      return 'granted';
    case Location.PermissionStatus.DENIED:
      return 'denied';
    default:
      return 'undetermined';
  }
}

/**
 * Reads the current permission WITHOUT prompting. Safe to call on every
 * mount/foreground — this is how "granted later in system Settings" and
 * "revoked mid-session" get detected without ever showing a second
 * system dialog.
 */
export async function getForegroundPermissionStatus(): Promise<LocationPermissionStatus> {
  if (IS_WEB) return 'denied';
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    return toPermissionStatus(status);
  } catch (err) {
    logError('locationService.getForegroundPermissionStatus', err);
    return 'denied';
  }
}

/**
 * Triggers the actual OS permission dialog. Only ever call this from a
 * direct user action (the in-app LocationPermissionCard's "Enable
 * Location" button) — never automatically, and never for "Always"
 * (requestForegroundPermissionsAsync only ever asks for "When In Use").
 */
export async function requestForegroundPermission(): Promise<LocationPermissionStatus> {
  if (IS_WEB) return 'denied';
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return toPermissionStatus(status);
  } catch (err) {
    logError('locationService.requestForegroundPermission', err);
    return 'denied';
  }
}

// ─── Position ───────────────────────────────────────────────────────────────────

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Location fetch timed out.')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

/** Device-wide location services toggle — distinct from per-app permission. */
export async function isLocationServicesEnabled(): Promise<boolean> {
  if (IS_WEB) return false;
  try {
    return await Location.hasServicesEnabledAsync();
  } catch (err) {
    logError('locationService.isLocationServicesEnabled', err);
    return false;
  }
}

/** One-shot current position. Balanced accuracy — this feature needs city/few-hundred-meter precision, not turn-by-turn navigation, so there's no reason to spend the battery budget on best accuracy. */
export async function getCurrentCoordinates(): Promise<Coordinates | null> {
  if (IS_WEB) return null;
  try {
    const position = await withTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      LOCATION_CONFIG.POSITION_FETCH_TIMEOUT_MS
    );
    return { latitude: position.coords.latitude, longitude: position.coords.longitude };
  } catch (err) {
    logError('locationService.getCurrentCoordinates', err);
    return null;
  }
}

export type LocationSubscription = { remove: () => void };

/**
 * Long-lived position watch. `distanceInterval` does the "once per
 * meaningfully-changed location fix (moved >500m)" work natively — the
 * OS only invokes the callback after real movement, so there's no
 * manual haversine-diffing needed here. `timeInterval` is just a
 * long-idle fallback.
 */
export async function watchPosition(
  onFix: (coords: Coordinates) => void
): Promise<LocationSubscription | null> {
  if (IS_WEB) return null;
  try {
    const subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: LOCATION_CONFIG.WATCH_TIME_INTERVAL_MS,
        distanceInterval: LOCATION_CONFIG.MEANINGFUL_MOVEMENT_METERS,
      },
      (position) => {
        onFix({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      }
    );
    return subscription;
  } catch (err) {
    logError('locationService.watchPosition', err);
    return null;
  }
}

// ─── Reverse Geocoding & City Normalization ─────────────────────────────────────

/**
 * Matches reverse-geocoder output against Stroll's own supported-city
 * list (NIGERIAN_CITIES — the same list onboarding's city picker uses,
 * i.e. whatever already powers the city filter today). Raw geocoder
 * output is never trusted directly: an unresolved or unsupported
 * locality returns null, same as denied permission.
 */
export function normalizeCityMatch(candidates: Array<string | null | undefined>): string | null {
  for (const candidate of candidates) {
    if (!candidate) continue;
    const trimmed = candidate.trim().toLowerCase();
    if (!trimmed) continue;
    const match = NIGERIAN_CITIES.find((city) => city.toLowerCase() === trimmed);
    if (match) return match;
  }
  return null;
}

/**
 * Resolves coordinates to a supported city name, or null if the
 * geocoder failed or the resolved locality isn't one of Stroll's
 * supported cities. Tries `city`, then `subregion`, then `region` from
 * the geocoder result, since Nigerian addresses don't always populate
 * `city` consistently across iOS/Android.
 */
export async function reverseGeocodeToCity(coords: Coordinates): Promise<string | null> {
  if (IS_WEB) return null;
  try {
    const results = await Location.reverseGeocodeAsync(coords);
    const first = results[0];
    if (!first) return null;
    return normalizeCityMatch([first.city, first.subregion, first.region]);
  } catch (err) {
    logError('locationService.reverseGeocodeToCity', err);
    return null;
  }
}
