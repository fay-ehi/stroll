/**
 * Stroll — Place Domain Types
 * src/types/place.ts
 *
 * Same two-shapes-one-mapper pattern as the Profile domain
 * (src/types/profile.ts):
 *   1. `PlaceRow` — the raw snake_case Supabase row.
 *   2. `PlaceModel` — the canonical camelCase model every hook, and every
 *      future screen, should use.
 * `toPlaceModel()` is the one place that translates between them.
 *
 * ── A note on PRD alignment (please read before wiring this into UI) ──
 * The Stroll PRD (§8.8 "Place Detail Page") explicitly lists Star Rating,
 * Price Range, and Opening Hours under "Intentionally Not Shown" — Stroll's
 * product philosophy is "Places are infrastructure, Experiences are the
 * hero", deliberately avoiding a Yelp/TripAdvisor-style directory. The PRD
 * also says "Average Community Rating" is explicitly a *future* feature
 * (Design System §25, Place Card), and that Places are normally sourced
 * from an external provider (Google Places/Mapbox) via experience-tagging,
 * not admin-curated the way `featured`/`verified` here imply.
 *
 * This sprint's brief asks for `rating`, `priceLevel`, `openingHours`,
 * `verified`, and `featured` on the model regardless, so they're included
 * below as NULLABLE fields — cheap to store, and ready for whenever a
 * product decision is made about them — but no hook or component in this
 * sprint surfaces them in any UI, and future Place Detail / Discover work
 * should default to the PRD's stricter list unless that decision changes.
 * `reviewCount` from the brief is named `experienceCount` here instead,
 * matching the PRD's actual terminology — Stroll doesn't have a separate
 * "Review" entity; Experiences are what a review would be elsewhere.
 */

import type { Tables } from '@/lib/supabase';
import type { PlaceCategoryId } from '@/constants/places';
import { PLACE_CATEGORIES, isPlaceCategoryId } from '@/constants/places';

// ─── Raw Row Alias ─────────────────────────────────────────────────────────────
// `type`, not `interface` — see the "IMPORTANT" note in types/database.ts
// about why an interface here would silently break Supabase's typing.

export type PlaceRow = Tables<'places'>;

// ─── Opening Hours ─────────────────────────────────────────────────────────────
// Stored as jsonb. Not surfaced in any UI this sprint (see note above) —
// modeled now so the shape is settled if/when that changes.

export type DayOfWeek =
  | 'monday' | 'tuesday' | 'wednesday' | 'thursday'
  | 'friday' | 'saturday' | 'sunday';

export interface OpeningHoursRange {
  /** 24-hour "HH:mm", e.g. "09:00". */
  open:  string;
  close: string;
}

/** Missing/absent day = closed. Multiple ranges support split hours (e.g. lunch/dinner). */
export type OpeningHours = Partial<Record<DayOfWeek, OpeningHoursRange[]>>;

/** Google Places-style 1–4 scale ($ to $$$$). */
export type PriceLevel = 1 | 2 | 3 | 4;

export type PlaceSource = 'internal' | 'google_places' | 'mapbox';

// ─── Canonical Domain Model ────────────────────────────────────────────────────

export interface PlaceModel {
  id:               string;
  name:             string;
  slug:             string;
  description:      string | null;
  category:         PlaceCategoryId;
  city:             string;
  address:          string | null;
  latitude:         number;
  longitude:        number;
  heroImage:        string | null;
  gallery:          string[];
  /** Not shown in Place Detail per PRD §8.8 — stored for future use. */
  openingHours:     OpeningHours | null;
  /** Not shown in Place Detail per PRD §8.8 — "future" per Design System §25. */
  rating:           number | null;
  experienceCount:  number;
  /** Not shown in Place Detail per PRD §8.8 — stored for future use. */
  priceLevel:       PriceLevel | null;
  verified:         boolean;
  featured:         boolean;
  source:           PlaceSource;
  providerPlaceId:  string | null;
  /** Distance from a reference point in kilometers — only present on useNearbyPlaces() results. */
  distanceKm?:      number;
  createdAt:        string;
  updatedAt:        string;
}

/** Maps a raw Supabase `places` row to the canonical camelCase domain model. */
export function toPlaceModel(row: PlaceRow, distanceKm?: number): PlaceModel {
  return {
    id:              row.id,
    name:            row.name,
    slug:            row.slug,
    description:     row.description,
    category:        isPlaceCategoryId(row.category) ? row.category : 'attractions',
    city:            row.city,
    address:         row.address,
    latitude:        row.latitude,
    longitude:       row.longitude,
    heroImage:       row.hero_image,
    gallery:         row.gallery,
    openingHours:    (row.opening_hours as OpeningHours | null) ?? null,
    rating:          row.rating,
    experienceCount: row.experience_count,
    priceLevel:      row.price_level as PriceLevel | null,
    verified:        row.verified,
    featured:        row.featured,
    source:          isPlaceSource(row.source) ? row.source : 'internal',
    providerPlaceId: row.provider_place_id,
    ...(distanceKm !== undefined && { distanceKm }),
    createdAt:       row.created_at,
    updatedAt:       row.updated_at,
  };
}

function isPlaceSource(value: string): value is PlaceSource {
  return value === 'internal' || value === 'google_places' || value === 'mapbox';
}

// ─── Query Params ──────────────────────────────────────────────────────────────
// Deliberately simple (fixed `limit`, no pagination cursor) — infinite
// scroll / pagination is Discover UI scope, not this sprint's.

export interface FeaturedPlacesParams {
  city?:  string;
  limit?: number;
}

export interface NearbyPlacesParams {
  latitude:   number;
  longitude:  number;
  /** Search radius in kilometers. Defaults to 10. */
  radiusKm?:  number;
  category?:  PlaceCategoryId;
  limit?:     number;
}

export interface PlacesByCityParams {
  city:      string;
  category?: PlaceCategoryId;
  limit?:    number;
}

export interface PlacesByCategoryParams {
  category: PlaceCategoryId;
  city?:    string;
  limit?:   number;
}

// ─── Validation ────────────────────────────────────────────────────────────────
// For validating params before they hit the network — not form validation
// (there's no place-creation UI yet; places aren't user-creatable this
// sprint, matching the PRD's "sourced from a provider" model).

export interface CoordinateValidationResult {
  valid:    boolean;
  message?: string;
}

/** Validates a lat/lng pair is within real-world bounds before it's sent to the nearby-places RPC. */
export function validateCoordinates(latitude: number, longitude: number): CoordinateValidationResult {
  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return { valid: false, message: 'Location is unavailable right now.' };
  }
  if (latitude < -90 || latitude > 90) {
    return { valid: false, message: 'Latitude must be between -90 and 90.' };
  }
  if (longitude < -180 || longitude > 180) {
    return { valid: false, message: 'Longitude must be between -180 and 180.' };
  }
  return { valid: true };
}

/** True when the category id is recognized — guards fetchPlacesByCategory() against typos. */
export function validateCategory(category: string): category is PlaceCategoryId {
  return isPlaceCategoryId(category);
}

// Re-exported for convenience so `import { PLACE_CATEGORIES } from '@/types/place'`
// works alongside the model types without a second import from constants.
export { PLACE_CATEGORIES };
export type { PlaceCategoryId };
