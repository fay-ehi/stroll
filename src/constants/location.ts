/**
 * Stroll — Location & Nearby Surfacing Constants
 * src/constants/location.ts
 *
 * Sprint 4 Prompt 2 — Location-Aware Nearby Experience Surfacing.
 * Every tunable number and every piece of user-facing copy this feature
 * needs lives here, matching constants/app.ts's rule: "if a number or
 * string appears more than once, or if its purpose isn't immediately
 * obvious from context, it belongs here."
 */

// ─── Feed Interleaving ──────────────────────────────────────────────────────────

export const LOCATION_CONFIG = {
  /**
   * A nearby card (or, the first time, the location permission ask) is
   * spliced in every Nth feed item. Brief calls for "every 8–10 feed
   * items" — 9 sits in the middle of that range. Tunable in one place.
   */
  NEARBY_CARD_CADENCE: 9,
  /**
   * How many nearby places (with at least one published Experience) to
   * resolve into actual nearby cards per session/location-fix. Bounds
   * the number of parallel `byPlaceLatest` queries useNearbyExperiences
   * fires — the feed only ever needs a handful of these in view at once,
   * not every nearby place the RPC returns.
   */
  NEARBY_POOL_SIZE: 6,
  /**
   * "Once per meaningfully-changed location fix (e.g., moved >500m)" —
   * fed straight into expo-location's `watchPositionAsync`
   * `distanceInterval`, so the OS itself only calls back on real
   * movement instead of this code polling and diffing coordinates.
   */
  MEANINGFUL_MOVEMENT_METERS: 500,
  /**
   * Time-based fallback for the same watch — in case the device sits
   * still for a very long time, still refresh occasionally. Deliberately
   * long; this is a "once per session" feature, not a live tracker.
   */
  WATCH_TIME_INTERVAL_MS: 5 * 60 * 1000,
  /** Safety cap so a hung `getCurrentPositionAsync()` call can't block the ask/nearby state forever — degrades silently on timeout per this sprint's error-handling requirement. */
  POSITION_FETCH_TIMEOUT_MS: 10_000,
} as const;

// ─── Permission Prompt Copy ─────────────────────────────────────────────────────
// The in-app contextual card shown BEFORE the OS system dialog. Must stay
// consistent with the location section of the privacy policy and with
// app.json's ios.infoPlist.NSLocationWhenInUseUsageDescription — if any
// of the three changes, check the other two.

export const LOCATION_PERMISSION_COPY = {
  title: 'See what’s happening near you',
  body: 'Turn on location to discover Experiences other people have shared nearby, with how far away they are. You can turn this off anytime in Settings.',
  enableLabel: 'Enable Location',
  dismissLabel: 'Not Now',
} as const;

/**
 * Mirrors app.json's ios.infoPlist.NSLocationWhenInUseUsageDescription —
 * app.json is JSON and can't import this, so this is documentation /
 * a single source of truth for what that string SHOULD say, not the
 * string's actual runtime source. Keep both in sync by hand.
 */
export const IOS_LOCATION_USAGE_DESCRIPTION =
  'Stroll uses your location to show you Experiences nearby and how far away they are.';

// ─── City Switch Suggestion Copy ────────────────────────────────────────────────

export function citySwitchSuggestionMessage(city: string): string {
  return `You're in ${city} now — switch your feed?`;
}
