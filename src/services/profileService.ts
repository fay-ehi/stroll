/**
 * Stroll — Profile Service
 * src/services/profileService.ts
 *
 * Supabase operations for user profiles.
 * Pure async functions — no UI, no Zustand, no navigation.
 *
 * Fix log (tsc pass):
 *   - Removed unused `config` import (IMAGE_CONFIG comes from @/constants/app).
 *   - Added explicit `as any` casts on .from('profiles') query builders to
 *     work around the stub Database type's generic index signature, which
 *     makes every table's Insert/Update type resolve to `never`. These casts
 *     will be removed automatically once `supabase gen types typescript`
 *     generates the real Database type with a concrete profiles table shape.
 */

import { supabase } from '@/lib/supabase';
import { normalizeError, type StrollError } from '@/lib/errors';
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

export interface Profile {
  id:                  string;
  username:            string;
  display_name:        string;
  avatar_url:          string | null;
  bio:                 string | null;
  city:                string | null;
  interests:           string[];
  is_verified:         boolean;
  onboarding_complete: boolean;
  created_at:          string;
  updated_at:          string;
}

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('profiles') as any)
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

    if (error) return fail(error);
    return ok(data as Profile);
  } catch (err) {
    return fail(err);
  }
}

// ─── Get Profile ───────────────────────────────────────────────────────────────

export async function getProfile(
  userId: string
): Promise<ProfileResult<Profile | null>> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('profiles') as any)
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) return fail(error);
    return ok(data as Profile | null);
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('profiles') as any)
      .update(payload)
      .eq('id', userId)
      .select()
      .single();

    if (error) return fail(error);
    return ok(data as Profile);
  } catch (err) {
    return fail(err);
  }
}

// ─── Username Availability ─────────────────────────────────────────────────────

export async function checkUsernameAvailable(
  username: string
): Promise<ProfileResult<boolean>> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('profiles') as any)
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

export async function uploadAvatar(
  userId:   string,
  uri:      string,
  mimeType: string = 'image/jpeg'
): Promise<ProfileResult<string>> {
  try {
    const response = await fetch(uri);
    const blob     = await response.blob();

    if (blob.size > IMAGE_CONFIG.MAX_FILE_SIZE_BYTES) {
      return fail(new Error('Image is too large. Please choose a file under 5MB.'));
    }

    const ext      = mimeType.split('/')[1] ?? 'jpg';
    const filePath = `${userId}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(IMAGE_CONFIG.AVATAR_BUCKET)
      .upload(filePath, blob, {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('profiles') as any)
      .update({ onboarding_complete: true })
      .eq('id', userId);

    if (error) return fail(error);
    return ok(undefined);
  } catch (err) {
    return fail(err);
  }
}
