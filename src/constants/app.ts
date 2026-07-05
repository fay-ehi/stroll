/**
 * Stroll — Application Constants
 * src/constants/app.ts
 *
 * Centralized home for every magic number, limit, timeout, and
 * configuration value that would otherwise be scattered across the
 * codebase as an unexplained literal.
 *
 * Rule: if a number or string appears more than once, or if its
 * purpose isn't immediately obvious from context, it belongs here.
 */

// ─── Application Metadata ──────────────────────────────────────────────────────

export const APP_META = {
  name:        'Stroll',
  description: 'Discover your city through people who actually know it.',
  scheme:      'stroll',
  supportEmail:'support@stroll.app', // placeholder
} as const;

// ─── Launch Cities (PRD §4) ────────────────────────────────────────────────────

export const CITIES = {
  LAGOS:         'Lagos',
  ABUJA:         'Abuja',
  PORT_HARCOURT: 'Port Harcourt',
  IBADAN:        'Ibadan',
  BENIN_CITY:    'Benin City',
  ENUGU:         'Enugu',
} as const;

export type City = typeof CITIES[keyof typeof CITIES];

export const DEFAULT_CITY: City = CITIES.LAGOS;

export const AVAILABLE_CITIES: City[] = [
  CITIES.LAGOS,
  CITIES.ABUJA,
  CITIES.PORT_HARCOURT,
  CITIES.IBADAN,
  CITIES.BENIN_CITY,
  CITIES.ENUGU,
];

// ─── Pagination ────────────────────────────────────────────────────────────────

export const PAGINATION = {
  /** Default number of items per page for feed queries. */
  DEFAULT_PAGE_SIZE:         20,
  /** Number of experiences shown per section in Search before "View All". */
  SEARCH_SECTION_PREVIEW:     2,
  /** Number of items to prefetch ahead of current scroll position. */
  PREFETCH_THRESHOLD:         5,
} as const;

// ─── Experience Limits (PRD §8.7) ─────────────────────────────────────────────

export const EXPERIENCE_LIMITS = {
  /** Maximum photos per experience (PRD §8.7). */
  MAX_PHOTOS:                10,
  /** Minimum photos required to publish. */
  MIN_PHOTOS:                 0,
  /** Maximum characters in an experience story. */
  MAX_STORY_LENGTH:        2000,
  /** Maximum lines shown in a card preview (PRD §24). */
  CARD_PREVIEW_LINES:         3,
  /** Minimum story length to publish. */
  MIN_STORY_LENGTH:          10,
} as const;

// ─── Amount Spent Options (PRD §8.7) ──────────────────────────────────────────

export const AMOUNT_SPENT_OPTIONS = [
  'Under ₦5,000',
  '₦5,000 – ₦10,000',
  '₦10,000 – ₦20,000',
  '₦20,000 – ₦50,000',
  '₦50,000+',
] as const;

export type AmountSpent = typeof AMOUNT_SPENT_OPTIONS[number];

// ─── Visit Types (PRD §8.7) ────────────────────────────────────────────────────

export const VISIT_TYPES = [
  'Solo',
  'Date',
  'Friends',
  'Family',
  'Work',
  'Group Event',
] as const;

export type VisitType = typeof VISIT_TYPES[number];

// ─── Tags (PRD §8.7) ──────────────────────────────────────────────────────────

export const GOOD_FOR_TAGS = [
  'Couples',
  'Families',
  'Remote Workers',
  'Students',
  'Friends',
  'Business Meetings',
] as const;

export type GoodForTag = typeof GOOD_FOR_TAGS[number];

export const VIBE_TAGS = [
  'Quiet',
  'Romantic',
  'Luxury',
  'Budget Friendly',
  'Hidden Gem',
  'Lively',
  'Cozy',
  'Instagrammable',
  'Late Night',
  'Date Spot',
  'Remote Work Friendly',
  'Family Friendly',
  'Great for Groups',
] as const;

export type VibeTag = typeof VIBE_TAGS[number];

// ─── Profile Limits (Sprint 1 Prompt 3) ───────────────────────────────────────
// The PRD/Design System don't specify a bio character limit, so 150 is used
// as a deliberate product decision — short enough to keep profiles scannable
// (Design Philosophy §13 "Maximum Content Width"), matching the common social
// app convention. Display name and username bounds already live in
// utils/VALIDATION (isValidDisplayName, isValidUsername) — not duplicated here.

export const PROFILE_LIMITS = {
  /** Maximum characters in a profile bio. */
  MAX_BIO_LENGTH: 150,
  /**
   * Maximum characters in a display name — mirrors the bound already
   * enforced by VALIDATION.isValidDisplayName (utils/index.ts). Exported
   * here purely so UI components (e.g. a TextInput's `maxLength`) have a
   * named value instead of a bare "50", without changing that validator's
   * signature (it's also used by the sign-up form in useAuth.ts).
   */
  MAX_DISPLAY_NAME_LENGTH: 50,
} as const;

// ─── Collection Limits ─────────────────────────────────────────────────────────

export const COLLECTION_LIMITS = {
  MAX_TITLE_LENGTH:         80,
  MAX_DESCRIPTION_LENGTH:  300,
} as const;

// ─── Timeouts ─────────────────────────────────────────────────────────────────

export const TIMEOUTS = {
  /** Network request timeout in milliseconds. */
  API_REQUEST_MS:         15_000,
  /** Debounce delay for search input in milliseconds. */
  SEARCH_DEBOUNCE_MS:        400,
  /** Toast display duration (Design System §36: 3 seconds). */
  TOAST_DURATION_MS:       3_000,
  /** Splash screen minimum display time. */
  SPLASH_MIN_MS:             500,
} as const;

// ─── Image Configuration ───────────────────────────────────────────────────────

export const IMAGE_CONFIG = {
  /** Maximum file size for uploads in bytes (5MB). */
  MAX_FILE_SIZE_BYTES:  5 * 1024 * 1024,
  /** Accepted MIME types for experience photos. */
  ACCEPTED_TYPES:       ['image/jpeg', 'image/png', 'image/webp'] as const,
  /** Target compression quality (0–1) for uploaded images. */
  COMPRESSION_QUALITY:  0.8,
  /** Supabase storage bucket for experience photos. */
  EXPERIENCE_BUCKET:    'experience-photos',
  /** Supabase storage bucket for avatars. */
  AVATAR_BUCKET:        'avatars',
  /** Supabase storage bucket for collection covers. */
  COLLECTION_BUCKET:    'collection-covers',
} as const;

// ─── Feature Flags ─────────────────────────────────────────────────────────────
// Checked at runtime — set in environment variables or toggle here
// during development. Avoids shipping broken partial features.

export const FEATURE_FLAGS = {
  /** Enable AI-powered recommendations (PRD §14 Phase 5 — post-MVP). */
  AI_RECOMMENDATIONS:   false,
  /** Enable direct messaging (PRD §10 Out of Scope — MVP). */
  DIRECT_MESSAGING:     false,
  /** Enable business profile claiming (PRD §14 Phase 2). */
  BUSINESS_PROFILES:    false,
  /** Enable reservations (PRD §14 Phase 4). */
  RESERVATIONS:         false,
  /** Enable video content (PRD §10 Out of Scope). */
  VIDEO_CONTENT:        false,
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;
