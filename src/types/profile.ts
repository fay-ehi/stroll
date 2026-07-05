/**
 * Stroll — Profile Domain Types
 * src/types/profile.ts
 *
 * The profile domain works with TWO shapes of a profile, on purpose:
 *
 *   1. `Tables<'profiles'>` (from src/lib/supabase, aliased `ProfileRow` here)
 *      — the raw snake_case Supabase row. Only src/services/profileService.ts
 *      and the onboarding store (which predates this domain) touch this shape.
 *
 *   2. `ProfileModel` (defined below) — the canonical camelCase model every
 *      hook, store, and screen in the app should use from now on.
 *
 * `toProfileModel()` is the one place that translates between them. Nothing
 * else in the app should hand-write that mapping — this is what "single
 * source of truth for user profile data" means in practice: one shape, one
 * translation function, everywhere else just consumes `ProfileModel`.
 *
 * This file has no dependency on the services layer (only on `@/lib/supabase`
 * for the row type and on cross-cutting constants/utils), so it can sit
 * underneath both the services layer and the hooks layer without creating
 * a layering inversion.
 */

import type { Tables } from '@/lib/supabase';
import { VALIDATION } from '@/utils';
import { PROFILE_LIMITS, AVAILABLE_CITIES, IMAGE_CONFIG } from '@/constants/app';
import { ONBOARDING_RULES } from '@/constants/onboarding';

// ─── Raw Row Alias ─────────────────────────────────────────────────────────────

export type ProfileRow = Tables<'profiles'>;

// ─── Canonical Domain Model ────────────────────────────────────────────────────

export interface ProfileModel {
  id:                  string;
  username:            string;
  displayName:         string;
  avatarUrl:           string | null;
  bio:                 string | null;
  city:                string | null;
  interests:           string[];
  isVerified:          boolean;
  onboardingCompleted: boolean;
  createdAt:           string;
  updatedAt:           string;
}

/** Maps a raw Supabase `profiles` row to the canonical camelCase domain model. */
export function toProfileModel(row: ProfileRow): ProfileModel {
  return {
    id:                  row.id,
    username:            row.username,
    displayName:         row.display_name,
    avatarUrl:           row.avatar_url,
    bio:                 row.bio,
    city:                row.city,
    interests:           row.interests,
    isVerified:          row.is_verified,
    onboardingCompleted: row.onboarding_complete,
    createdAt:           row.created_at,
    updatedAt:           row.updated_at,
  };
}

// ─── Update Input ──────────────────────────────────────────────────────────────
// What a screen submits to update a profile. camelCase, partial — only the
// fields being changed need to be present. `useUpdateProfile()` maps this to
// the snake_case UpdateProfilePayload the service layer expects.

export interface ProfileUpdateInput {
  displayName?: string;
  bio?:         string;
  city?:        string;
  interests?:   string[];
}

// ─── Field Validation ──────────────────────────────────────────────────────────
// Reuses the shared VALIDATION utilities (src/utils) wherever a check already
// exists there; only adds profile-specific composition on top.

export interface ProfileValidationErrors {
  displayName?: string;
  bio?:         string;
  city?:        string;
  interests?:   string;
}

/**
 * Validates only the fields present on `input` — safe to call on every
 * keystroke of a partial edit form, not just on full-form submit.
 */
export function validateProfileUpdate(input: ProfileUpdateInput): ProfileValidationErrors {
  const errors: ProfileValidationErrors = {};

  if (input.displayName !== undefined && !VALIDATION.isValidDisplayName(input.displayName)) {
    errors.displayName = 'Display name must be between 1 and 50 characters.';
  }

  if (input.bio !== undefined && !VALIDATION.isValidBio(input.bio, PROFILE_LIMITS.MAX_BIO_LENGTH)) {
    errors.bio = `Bio must be ${PROFILE_LIMITS.MAX_BIO_LENGTH} characters or fewer.`;
  }

  if (input.city !== undefined && !VALIDATION.isValidCity(input.city, AVAILABLE_CITIES)) {
    errors.city = "Please choose one of Stroll's supported cities.";
  }

  if (
    input.interests !== undefined &&
    !VALIDATION.isValidInterests(input.interests, ONBOARDING_RULES.MIN_INTERESTS, ONBOARDING_RULES.MAX_INTERESTS)
  ) {
    errors.interests = `Choose between ${ONBOARDING_RULES.MIN_INTERESTS} and ${ONBOARDING_RULES.MAX_INTERESTS} interests.`;
  }

  return errors;
}

export function hasValidationErrors(errors: ProfileValidationErrors): boolean {
  return Object.values(errors).some((message) => message !== undefined);
}

// ─── Avatar Validation ─────────────────────────────────────────────────────────

export interface AvatarAsset {
  uri:       string;
  mimeType?: string;
  fileSize?: number;
}

export interface AvatarValidationResult {
  valid:    boolean;
  message?: string;
}

/**
 * Validates a picked image asset before it's uploaded. `fileSize` is
 * optional because expo-image-picker doesn't always report it — when it's
 * missing, the size check is skipped here and enforced again after the
 * blob is read (see profileService.uploadAvatar), so oversized files are
 * still always caught, just slightly later.
 */
export function validateAvatarAsset(asset: AvatarAsset): AvatarValidationResult {
  const mimeType = asset.mimeType ?? 'image/jpeg';

  if (!VALIDATION.isValidAvatarMimeType(mimeType, IMAGE_CONFIG.ACCEPTED_TYPES)) {
    return { valid: false, message: 'Please choose a JPEG, PNG, or WebP image.' };
  }

  if (
    asset.fileSize !== undefined &&
    !VALIDATION.isValidAvatarFileSize(asset.fileSize, IMAGE_CONFIG.MAX_FILE_SIZE_BYTES)
  ) {
    return { valid: false, message: 'Image is too large. Please choose a file under 5MB.' };
  }

  return { valid: true };
}
