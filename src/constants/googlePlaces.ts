/**
 * Stroll — Google Places Integration Constants
 * src/constants/googlePlaces.ts
 *
 * Sprint 4 Prompt 3 — Canonical Place Resolution via Google Places.
 * Every tunable number, endpoint, and field mask this feature needs
 * lives here, matching constants/app.ts's rule: "if a number or string
 * appears more than once, or if its purpose isn't immediately obvious
 * from context, it belongs here."
 *
 * ── Field mask: real Essentials tier, not the brief's literal list ──
 * The brief that kicked this off asked for "place ID, display name,
 * formatted address, location" as "Essentials-tier" fields. Per Google's
 * current Place Details (New) SKU documentation, `displayName` actually
 * triggers the PRO SKU, not Essentials — only `addressComponents`,
 * `formattedAddress`, `location` (plus a handful of fields this app has
 * no use for: plusCode, postalAddress, shortFormattedAddress, types,
 * viewport) are genuinely Essentials-tier.
 *
 * Rather than silently eating the Pro upcharge to satisfy the letter of
 * "display name", this keeps the terminating Place Details call on
 * genuine Essentials pricing and sources the place's name for free from
 * the Autocomplete (New) suggestion itself (`structuredFormat.mainText`)
 * — Autocomplete requests are billed on their own session-based SKU,
 * entirely separate from Place Details' tiering, so this doesn't cost
 * anything extra. See googlePlacesService.ts's module doc for the full
 * request/response shapes this relies on.
 */

// ─── Endpoints ──────────────────────────────────────────────────────────────────
// Places API (New) — see https://developers.google.com/maps/documentation/places/web-service

export const GOOGLE_PLACES_ENDPOINTS = {
  AUTOCOMPLETE: 'https://places.googleapis.com/v1/places:autocomplete',
  /** Append `/{placeId}` to get a single place's Details endpoint. */
  PLACE_DETAILS_BASE: 'https://places.googleapis.com/v1/places',
} as const;

// ─── Field Mask ─────────────────────────────────────────────────────────────────
// Every field here is confirmed Essentials-tier. `id` is always required in
// the mask (never returned for free) but never triggers a paid data SKU by
// itself. Adding ANY field outside this list — `displayName` included —
// upgrades the entire Place Details response to Pro or Enterprise pricing.

export const PLACE_DETAILS_FIELD_MASK = 'id,formattedAddress,addressComponents,location';

// ─── Request Config ─────────────────────────────────────────────────────────────

export const GOOGLE_PLACES_CONFIG = {
  /** Scopes Autocomplete predictions to Nigeria — Stroll is a Nigerian-cities-only product, so results outside it are never useful and only cost money. ISO 3166-1 alpha-2. */
  REGION_CODE: 'ng',
  /** Safety cap so a hung request can't block the creation wizard forever. */
  REQUEST_TIMEOUT_MS: 10_000,
  /** Address component types checked, in priority order, when deriving a Place's city from Google's addressComponents. */
  CITY_COMPONENT_TYPES: ['locality', 'administrative_area_level_2', 'administrative_area_level_1'] as const,
} as const;

// ─── Copy ───────────────────────────────────────────────────────────────────────

export const GOOGLE_PLACES_COPY = {
  searchPrompt: 'Search for a place to tag this Experience.',
  noResults: (query: string) => `No places match "${query}".`,
  loadFailedTitle: "We couldn't load suggestions",
  loadFailedDescription: 'Something went wrong. Please try again.',
} as const;
