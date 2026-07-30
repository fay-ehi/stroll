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
import { IMAGE_CONFIG, SEARCH_LIMITS } from '@/constants/app';
import type { CreatorSearchRow } from '@/types/search';

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

// ─── Update Username (Sprint 9 Prompt 1 — Settings: Username Management) ──────
// Deliberately its own function rather than folded into updateProfile()/
// UpdateProfilePayload above — a username change has its own failure mode
// (the unique-violation → USERNAME_TAKEN mapping createProfile() already
// established below) that display_name/bio/city/interests edits never hit,
// and the caller (useSettings.ts) always checks checkUsernameAvailable()
// first anyway, so this is a deliberately narrow, single-purpose write.

export async function updateUsername(
  userId: string,
  newUsername: string
): Promise<ProfileResult<Profile>> {
  try {
    const username = newUsername.trim().toLowerCase();

    const { data, error } = await supabase
      .from('profiles')
      .update({ username })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      // Same race-condition safety net as createProfile() above — the
      // checkUsernameAvailable() pre-check in useSettings.ts closes most
      // of the window, but two devices/tabs racing to claim the same name
      // can still both pass that check before either write lands. The
      // database's unique constraint is the actual source of truth.
      if (isUsernameUniqueViolation(error)) {
        return fail(makeError(
          'USERNAME_TAKEN',
          `Username unique violation updating profile: ${error.message}`,
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

// ─── Username Availability ─────────────────────────────────────────────────────

export async function checkUsernameAvailable(
  username: string,
  /**
   * Sprint 9 Prompt 1 (Settings — Username Management) addition. Pass the
   * signed-in user's own id when checking availability from an EDIT
   * context (as opposed to sign-up, where there's no existing row yet) —
   * without this, a user re-submitting their own unchanged username (or
   * just changing its casing) would see it reported as "taken" because
   * the `.ilike` match finds their own row. Optional and unused by
   * useSignUp's call site above, which has no existing user yet.
   */
  excludeUserId?: string
): Promise<ProfileResult<boolean>> {
  try {
    let query = supabase
      .from('profiles')
      .select('id')
      .ilike('username', username.trim());

    if (excludeUserId) {
      query = query.neq('id', excludeUserId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) return fail(error);
    return ok(data === null);
  } catch (err) {
    return fail(err);
  }
}

// ─── Search Creators (Sprint 7 Prompt 1 — Search Foundation) ───────────────────
// Backs the Search screen's Creators section — src/services/searchService.ts
// orchestrates this alongside experiencesService.ts's searchExperiences()
// and collectionsService.ts's searchCollections() into one unified
// response. Deliberately its own function rather than a repurposed
// collaborationService.ts's searchInvitableUsers() — that function is
// scoped to a single Collection's invite-eligibility (excludes existing
// collaborators/pending invites for THAT collection), a different,
// narrower concern than a global "search every creator" this screen
// needs. The two share the same underlying `.or(username.ilike...,
// display_name.ilike...)` shape (this file remains the only one that
// queries `profiles` directly) but nothing else.
//
// `excludeUserId` (typically the signed-in user) keeps a Creator from
// finding themselves in their own search results — mirrors the Follow
// domain's own "a user can never follow themselves" rule
// (useFollows.ts), even though nothing here writes a follow; it's simply
// not a useful result to show.

export async function searchCreators(params: {
  query: string;
  excludeUserId?: string;
  limit?: number;
}): Promise<ProfileResult<CreatorSearchRow[]>> {
  try {
    const query = params.query.trim();
    if (query.length < SEARCH_LIMITS.MIN_QUERY_LENGTH) return ok([]);

    const likePattern = `%${query}%`;

    let dbQuery = supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, bio, is_verified')
      .or(`username.ilike.${likePattern},display_name.ilike.${likePattern}`)
      .limit(params.limit ?? SEARCH_LIMITS.RESULTS_PER_SECTION);

    if (params.excludeUserId) {
      dbQuery = dbQuery.neq('id', params.excludeUserId);
    }

    const { data, error } = await dbQuery;
    if (error) return fail(error);

    return ok((data as unknown as CreatorSearchRow[]) ?? []);
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

    // Bug fix: `filePath` is deterministic (userId + extension), so
    // replacing an existing avatar re-uploads to the SAME storage path
    // and Supabase returns the exact same public URL string as before.
    // `avatar_url` in the profile row and in every cached query result
    // then never changes — and React Native's <Image> caches by URI, so
    // nothing re-fetches the new file. (Removing the avatar first works
    // "by accident" only because it briefly sets avatar_url to null,
    // forcing components to actually swap sources.) A cache-busting query
    // param makes the stored URL change on every upload, which both
    // invalidates the Image cache and gives React a genuinely new prop
    // value to re-render on. `extractStoragePath` below strips this
    // param back off before using the URL to address the storage object.
    const cacheBustedUrl = `${data.publicUrl}?updated=${Date.now()}`;

    return ok(cacheBustedUrl);
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
  // uploadAvatar() appends a `?updated=<timestamp>` cache-busting param —
  // strip it (and any other query string) so this resolves to the real
  // storage object path, not a path with a trailing "?updated=..." that
  // wouldn't match anything and would silently no-op the delete.
  const withoutQuery = publicUrl.split('?')[0]!;
  return withoutQuery.slice(idx + marker.length);
}
