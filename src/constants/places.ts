/**
 * Stroll — Place Categories
 * src/constants/places.ts
 *
 * Centralized category metadata for the Places domain. This is a
 * STRUCTURAL classification of a venue (what kind of place it physically
 * is) — deliberately separate from `INTEREST_CATEGORIES` in
 * `constants/onboarding.ts`, which are user preference *tags* used to seed
 * Discover recommendations (broader/vaguer, e.g. "Hidden Gems", "Art &
 * Culture" — not something a place literally "is").
 *
 * Where the two naturally overlap (restaurants, cafés, bars, museums,
 * nightlife), the `id` strings are kept identical on purpose, so a future
 * "recommend places matching your interests" feature can match by id
 * directly without a translation table.
 */

// Declared `as const` first so PlaceCategoryId can be derived from its
// literal `id` values below — a PlaceCategory interface that referenced
// PlaceCategoryId here directly would be circular (the id type would
// depend on the array, which would depend on the id type).
const PLACE_CATEGORIES_DATA = [
  { id: 'restaurants',   label: 'Restaurants',   emoji: '🍽️' },
  { id: 'cafes',         label: 'Cafés',          emoji: '☕' },
  { id: 'bars',          label: 'Bars',           emoji: '🍸' },
  { id: 'museums',       label: 'Museums',        emoji: '🏛️' },
  { id: 'parks',         label: 'Parks',          emoji: '🌳' },
  { id: 'beaches',       label: 'Beaches',        emoji: '🏖️' },
  { id: 'shopping',      label: 'Shopping',       emoji: '🛍️' },
  { id: 'nightlife',     label: 'Nightlife',      emoji: '🌙' },
  { id: 'entertainment', label: 'Entertainment',  emoji: '🎭' },
  { id: 'hotels',        label: 'Hotels',         emoji: '🏨' },
  { id: 'attractions',   label: 'Attractions',    emoji: '📍' },
] as const;

export type PlaceCategoryId = typeof PLACE_CATEGORIES_DATA[number]['id'];

export interface PlaceCategory {
  id:    PlaceCategoryId;
  label: string;
  emoji: string;
}

export const PLACE_CATEGORIES: readonly PlaceCategory[] = PLACE_CATEGORIES_DATA;

const CATEGORY_BY_ID = new Map<PlaceCategoryId, PlaceCategory>(
  PLACE_CATEGORIES.map((c) => [c.id, c])
);

/** Looks up a category's display metadata by id. Returns undefined for an unrecognized id. */
export function getPlaceCategory(id: PlaceCategoryId | string): PlaceCategory | undefined {
  return CATEGORY_BY_ID.get(id as PlaceCategoryId);
}

/** True when the given string is a known place category id — useful for validating query params. */
export function isPlaceCategoryId(id: string): id is PlaceCategoryId {
  return CATEGORY_BY_ID.has(id as PlaceCategoryId);
}
