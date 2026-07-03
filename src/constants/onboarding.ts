/**
 * Stroll — Onboarding Constants
 * src/constants/onboarding.ts
 *
 * All static data for the onboarding flow:
 *   - Full Nigerian city list
 *   - Interest categories
 *   - Onboarding step definitions
 */

// ─── Nigerian Cities ───────────────────────────────────────────────────────────
// Comprehensive list of Nigerian cities ordered by population/prominence.
// Users pick one as their home city — this tags their content and seeds
// their Discover feed. Can be changed any time from their profile.

export const NIGERIAN_CITIES = [
  'Lagos',
  'Abuja',
  'Kano',
  'Ibadan',
  'Port Harcourt',
  'Kaduna',
  'Benin City',
  'Maiduguri',
  'Zaria',
  'Aba',
  'Jos',
  'Ilorin',
  'Oyo',
  'Enugu',
  'Abeokuta',
  'Onitsha',
  'Warri',
  'Sokoto',
  'Calabar',
  'Uyo',
  'Asaba',
  'Akure',
  'Bauchi',
  'Makurdi',
  'Minna',
  'Owerri',
  'Yola',
  'Ado Ekiti',
  'Lokoja',
  'Lafia',
  'Gombe',
  'Umuahia',
  'Abakaliki',
  'Awka',
  'Damaturu',
  'Dutse',
  'Gusau',
  'Jalingo',
  'Birnin Kebbi',
  'Ikeja',
] as const;

export type NigerianCity = typeof NIGERIAN_CITIES[number];

// ─── Interest Categories ───────────────────────────────────────────────────────
// Used during onboarding to seed personalised recommendations.
// Maps to place/experience categories in the Discover feed.

export interface InterestCategory {
  id:    string;
  label: string;
  emoji: string;
}

export const INTEREST_CATEGORIES: InterestCategory[] = [
  { id: 'restaurants',  label: 'Restaurants',   emoji: '🍽️' },
  { id: 'cafes',        label: 'Cafés',          emoji: '☕' },
  { id: 'bars',         label: 'Bars',           emoji: '🍸' },
  { id: 'nightlife',    label: 'Nightlife',      emoji: '🌙' },
  { id: 'bookstores',   label: 'Bookstores',     emoji: '📚' },
  { id: 'museums',      label: 'Museums',        emoji: '🏛️' },
  { id: 'hidden_gems',  label: 'Hidden Gems',    emoji: '💎' },
  { id: 'outdoor',      label: 'Outdoor',        emoji: '🌿' },
  { id: 'art_culture',  label: 'Art & Culture',  emoji: '🎨' },
  { id: 'fitness',      label: 'Fitness',        emoji: '💪' },
] as const;

// ─── Onboarding Steps ──────────────────────────────────────────────────────────

export type OnboardingStep =
  | 'city'
  | 'interests'
  | 'avatar'
  | 'notifications'
  | 'suggested_users';

export const ONBOARDING_STEPS: OnboardingStep[] = [
  'city',
  'interests',
  'avatar',
  'notifications',
  'suggested_users',
];

export const ONBOARDING_STEP_COUNT = ONBOARDING_STEPS.length;

// ─── Validation Rules ──────────────────────────────────────────────────────────

export const ONBOARDING_RULES = {
  /** Minimum interest selections required. */
  MIN_INTERESTS: 3,
  /** Maximum interest selections allowed. */
  MAX_INTERESTS: INTEREST_CATEGORIES.length,
  /** Max avatar file size: 5MB (matches IMAGE_CONFIG). */
  MAX_AVATAR_BYTES: 5 * 1024 * 1024,
} as const;
