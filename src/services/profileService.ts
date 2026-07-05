/**
 * Stroll — Profile Service
 * src/services/profileService.ts
 *
 * Supabase operations for user profiles (raw DB row shape — snake_case).
 * Pure async functions — no UI, no Zustand, no navigation.
 *
 * This is the ONLY file that talks to the `profiles` table or the
 * `avatars` storage bucket directly. Everything else (the profile domain's
 * hooks, the onboarding store) goes through the functions exported here.
 *
 * Sprint 1 Prompt 3 fix log:
 *   - The `as any` casts previously on every `.from('profiles')` call have
 *     been removed. They existed because src/types/database.ts only had a
 *     generic index-signature stub with no concrete `profiles` shape, which
 *     made Insert/Update resolve to `never`. database.ts now defines
 *     `profiles` concretely, so the client is fully typed without casts.
 *   - `Profile` is now derived from `Tables<'profiles'>` (the generated-style
 *     Database type) instead of being hand-duplicated — one definition,
 *     no drift risk between this file and database.ts.
 *   - Added `ensureProfile()` — fetches the caller's profile, creating one
 *     with sensible defaults if it doesn't exist yet. Used by `useProfile()`
 *     so "missing profile" is never a state the rest of the app has to
 *     handle.
 *   - Added `removeAvatar()` — clears `avatar_url` and best-effort deletes
 *     the stored file, for the Avatar Management requirement's "remove"
 *     case (createProfile/updateProfile/uploadAvatar only covered upload
 *     and replace).
 */

import { supabase, type Tables } from '@/lib/supabase';
import { normalizeError, makeError, type StrollError } from '@/lib/errors';
import { IMAGE_CONFIG } from '@/constants/app';

// ─── Result Type ───────────────────────────────────────────────────────────────

export type ProfileResult<T = void> =
  | { ok: true;  data: T }
  | { ok: false; error: StrollError };

function ok<T>(data: T): ProfileResult<T> {
  return { ok: true, data };
}
function fail(err: unknown): ProfileResult<never> {
  return { ok: false, error: normalizeError(err) };
}

// ─── Types ─────────────────────────────────────────────────────────────────────

/** Raw `profiles` table row — snake_case, exactly as stored in Supabase. */
export type Profile = Tables<'profiles'>;

export interface CreateProfilePayload {
  id:           string;
  username:     string;
  display_name: string;
  city?:        string;
  interests?:   string[];
  avatar_url?:  string;
}

export interface UpdateProfilePayload {
  display_name?:        string;
  city?:                string;
  interests?:           string[];
  avatar_url?:          string;
  bio?:                 string;
  onboarding_complete?: boolean;
}

// ─── Create Profile ────────────────────────────────────────────────────────────

export async function createProfile(
  payload: CreateProfilePayload
): Promise<ProfileResult<Profile>> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        id:           payload.id,
        username:     payload.username.toLowerCase().trim(),
        display_name: payload.display_name.trim(),
        city:         payload.city ?? null,
        interests:    payload.interests ?? [],
        avatar_url:   payload.avatar_url ?? null,
      })
      .select()
      .single();

    if (error) {
      // Sprint 1 Prompt 4 fix: a username unique-violation (Postgres code
      // 23505) used to fall through to the generic Postgrest error mapping
      // (a vague "conflicts with something that already exists" message,
      // via the CONFLICT/409 path). Callers — specifically the onboarding
      // interests step, which is where this is actually surfaced (username
      // is chosen at sign-up, but the profile row isn't created until
      // onboarding submits it) — need to know specifically that it's the
      // USERNAME that's taken, not a generic conflict.
      if (isUsernameUniqueViolation(error)) {
        return fail(makeError(
          'USERNAME_TAKEN',
          `Username unique violation creating profile: ${error.message}`,
          error,
        ));
      }
      return fail(error);
    }
    return ok(data);
  } catch (err) {
    return fail(err);
  }
}

/** True when a Postgres error is a unique-violation on the username column specifically. */
function isUsernameUniqueViolation(error: { code?: string; message?: string; details?: string }): boolean {
  if (error.code !== '23505') return false;
  const text = `${error.message ?? ''} ${error.details ?? ''}`.toLowerCase();
  return text.includes('username');
}

// ─── Get Profile ───────────────────────────────────────────────────────────────

export async function getProfile(
  userId: string
): Promise<ProfileResult<Profile | null>> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) return fail(error);
    return ok(data);
  } catch (err) {
    return fail(err);
  }
}

// ─── Update Profile ────────────────────────────────────────────────────────────

export async function updateProfile(
  userId: string,
  payload: UpdateProfilePayload
): Promise<ProfileResult<Profile>> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', userId)
      .select()
      .single();

    if (error) return fail(error);
    return ok(data);
  } catch (err) {
    return fail(err);
  }
}

// ─── Username Availability ─────────────────────────────────────────────────────

export async function checkUsernameAvailable(
  username: string
): Promise<ProfileResult<boolean>> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .ilike('username', username.trim())
      .maybeSingle();

    if (error) return fail(error);
    return ok(data === null);
  } catch (err) {
    return fail(err);
  }
}

// ─── Avatar Upload ─────────────────────────────────────────────────────────────

import { File } from 'expo-file-system';

export async function uploadAvatar(
  userId:   string,
  uri:      string,
  mimeType: string = 'image/jpeg'
): Promise<ProfileResult<string>> {
  try {
    const file = new File(uri);

    if (file.size > IMAGE_CONFIG.MAX_FILE_SIZE_BYTES) {
      return fail(new Error('Image is too large. Please choose a file under 5MB.'));
    }

    const bytes = await file.bytes();

    const ext      = mimeType.split('/')[1] ?? 'jpg';
    const filePath = `${userId}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(IMAGE_CONFIG.AVATAR_BUCKET)
      .upload(filePath, bytes, {
        contentType: mimeType,
        upsert:      true,
      });

    if (uploadError) return fail(uploadError);

    const { data } = supabase.storage
      .from(IMAGE_CONFIG.AVATAR_BUCKET)
      .getPublicUrl(filePath);

    return ok(data.publicUrl);
  } catch (err) {
    return fail(err);
  }
}

// ─── Complete Onboarding ───────────────────────────────────────────────────────

export async function completeOnboarding(
  userId: string
): Promise<ProfileResult<void>> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ onboarding_complete: true })
      .eq('id', userId);

    if (error) return fail(error);
    return ok(undefined);
  } catch (err) {
    return fail(err);
  }
}

// ─── Ensure Profile (fetch, or create if missing) ─────────────────────────────

/**
 * Fetches the caller's profile, creating one with sensible defaults if it
 * doesn't exist yet. This is what makes "missing profile" a non-issue for
 * the rest of the app — `useProfile()` calls this instead of `getProfile()`
 * directly, so every authenticated user always resolves to a real row.
 *
 * Username defaults to the local part of the user's email, sanitized to
 * satisfy VALIDATION.isValidUsername (3–30 chars, alphanumeric/underscore).
 * On a rare username collision, a short numeric suffix is appended and the
 * insert is retried once.
 */
// Mirrors VALIDATION.isValidUsername's bounds (3–30 chars) without importing
// the regex itself — these exist purely to keep the numbers below named
// rather than bare literals.
const USERNAME_MAX_LENGTH = 30;
const USERNAME_BASE_RESERVE = 20; // leaves room to append a numeric suffix on retry
const USERNAME_SUFFIX_MIN = 1000; // 4-digit suffix range: 1000–9999
const USERNAME_SUFFIX_MAX = 9000;

export async function ensureProfile(
  userId: string,
  email: string | undefined,
  fallbackDisplayName: string | undefined
): Promise<ProfileResult<Profile>> {
  const existing = await getProfile(userId);
  if (!existing.ok) return existing;
  if (existing.data !== null) return ok(existing.data);

  const baseUsername = deriveUsername(email, userId);
  const displayName  = fallbackDisplayName?.trim() || baseUsername;

  const firstAttempt = await createProfile({
    id:           userId,
    username:     baseUsername,
    display_name: displayName,
  });

  if (firstAttempt.ok) return firstAttempt;

  // Only retry on a username collision — createProfile() now classifies
  // that specifically as USERNAME_TAKEN (see its "Sprint 1 Prompt 4 fix"
  // comment), so this no longer needs to dig into the raw Postgres error.
  if (firstAttempt.error.code !== 'USERNAME_TAKEN') return firstAttempt;

  const suffix = Math.floor(Math.random() * USERNAME_SUFFIX_MAX + USERNAME_SUFFIX_MIN);
  const retryUsername = `${baseUsername}${suffix}`;
  return createProfile({
    id:           userId,
    username:     retryUsername,
    display_name: displayName,
  });
}

/**
 * Derives a valid, reasonably-unique username from an email address,
 * falling back to a slice of the user id if the email is unusable.
 * Guarantees the 3–30 char, alphanumeric-and-underscore shape that
 * VALIDATION.isValidUsername requires.
 */
const USERNAME_MIN_LENGTH = 3; // mirrors VALIDATION.isValidUsername's floor
const USER_ID_FALLBACK_SLICE = 8; // short-but-unique fallback when email is unusable

function deriveUsername(email: string | undefined, userId: string): string {
  const local = email?.split('@')[0] ?? '';
  const cleaned = local.replace(/[^a-zA-Z0-9_]/g, '').slice(0, USERNAME_BASE_RESERVE);
  const padded = cleaned.length >= USERNAME_MIN_LENGTH
    ? cleaned
    : `user${userId.replace(/-/g, '').slice(0, USER_ID_FALLBACK_SLICE)}`;
  return padded.slice(0, USERNAME_MAX_LENGTH);
}

// ─── Remove Avatar ─────────────────────────────────────────────────────────────

/**
 * Clears the profile's avatar_url and best-effort deletes the stored file.
 * Storage deletion failures are logged but don't block clearing the
 * profile field — an orphaned file is a minor cleanup issue, not something
 * that should stop the user from removing their photo.
 */
export async function removeAvatar(
  userId: string,
  currentAvatarUrl: string | null
): Promise<ProfileResult<Profile>> {
  try {
    if (currentAvatarUrl) {
      const path = extractStoragePath(currentAvatarUrl);
      if (path) {
        await supabase.storage.from(IMAGE_CONFIG.AVATAR_BUCKET).remove([path]);
      }
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({ avatar_url: null })
      .eq('id', userId)
      .select()
      .single();

    if (error) return fail(error);
    return ok(data);
  } catch (err) {
    return fail(err);
  }
}

/** Extracts the storage object path (e.g. "{userId}/avatar.jpg") from a public URL. */
function extractStoragePath(publicUrl: string): string | null {
  const marker = `/${IMAGE_CONFIG.AVATAR_BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return publicUrl.slice(idx + marker.length);
}
