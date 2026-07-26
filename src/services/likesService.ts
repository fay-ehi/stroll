/**
 * Stroll — Likes Service
 * src/services/likesService.ts
 *
 * Sprint 6 Prompt 2. Supabase operations for Experience Likes — the
 * first engagement feature in Stroll's social layer (requirement:
 * "Likes apply to Experiences only. Do not support: Collections, Places,
 * Profiles, Comments."). Pure async functions — no UI, no Zustand, no
 * navigation. Mirrors the Result-type pattern established in
 * savedService.ts / followsService.ts exactly.
 *
 * This is the ONLY file that talks to the `likes` table directly (see
 * supabase/migrations/sprint6_prompt2_likes.sql) — screens/hooks go
 * through src/hooks/useLikes.ts.
 *
 * ── Naming note ──
 * The prompt doc's own Schema section (requirement #6) names the table
 * `experience_likes`. The migration already provided for this sprint
 * creates it as `likes` instead (see that file's own header comment —
 * it mirrors `follows`' shape almost exactly). This service is written
 * against the table that actually exists — `likes` — rather than the
 * prompt doc's literal name. Flagged in this sprint's End-of-Task Report;
 * nothing here is user-facing, so reconciling the two later is a
 * find-and-replace on this file's `.from('likes')` calls, not a schema
 * change.
 *
 * ── Repository methods (this sprint's requirement #8) ──
 * likeExperience() / unlikeExperience() / toggleLike() / isLiked() /
 * getLikedExperienceIds() are the five methods the prompt doc names
 * explicitly. getLikeCount() is an additional helper backing the one
 * surface that needs a live, single-experience count — Experience
 * Detail's own engagement row (see queryKeys.ts's `likes.count` doc for
 * why this is deliberately NOT wired to every ExperienceCard).
 *
 * Unlike Follow (which blocks self-follow at both layers), liking your
 * own Experience is normal, expected behavior — see the migration's own
 * header comment — so no self-like guard exists here.
 */

import { supabase } from '@/lib/supabase';
import { normalizeError, makeError, type StrollError } from '@/lib/errors';

export type LikesResult<T> = { ok: true; data: T } | { ok: false; error: StrollError };

function ok<T>(data: T): LikesResult<T> {
  return { ok: true, data };
}

function failLikes(err: unknown): LikesResult<never> {
  return { ok: false, error: normalizeError(err) };
}

// ─── Like / Unlike ───────────────────────────────────────────────────────────────
// Checks for an existing row first so a duplicate like surfaces as a
// specific, friendly CONFLICT rather than a raw unique-constraint
// Postgres error — the same shape savedService.ts's saveItem() already
// established. `likes_unique_pair` (see the migration SQL) is still the
// backstop for any race between this check and the insert. Unlike never
// checks existence first — deleting a row that isn't there is a no-op,
// not an error (same as unsaveItem()).

export async function likeExperience(userId: string, experienceId: string): Promise<LikesResult<void>> {
  try {
    const { data: existing, error: checkError } = await supabase
      .from('likes')
      .select('id')
      .eq('user_id', userId)
      .eq('experience_id', experienceId)
      .maybeSingle();

    if (checkError) return failLikes(checkError);
    if (existing) return failLikes(makeError('CONFLICT', 'You already liked this Experience.'));

    const { error } = await supabase.from('likes').insert({ user_id: userId, experience_id: experienceId });
    if (error) return failLikes(error);
    return ok(undefined);
  } catch (err) {
    return failLikes(err);
  }
}

export async function unlikeExperience(userId: string, experienceId: string): Promise<LikesResult<void>> {
  try {
    const { error } = await supabase
      .from('likes')
      .delete()
      .eq('user_id', userId)
      .eq('experience_id', experienceId);

    if (error) return failLikes(error);
    return ok(undefined);
  } catch (err) {
    return failLikes(err);
  }
}

// ─── Toggle ─────────────────────────────────────────────────────────────────────
// The literal repository primitive the prompt doc names alongside
// like/unlike. Checks current state then routes — an extra round trip
// compared to a caller that already knows the state client-side, which
// is exactly why useLikes.ts's useLike() mutation calls
// likeExperience()/unlikeExperience() directly instead (it already has
// the answer from the shared liked-ids cache — see that hook's module
// doc). This export exists for any future caller without that context,
// the same "exists for completeness, not the hot path" reasoning
// isExperienceSaved()/isCollectionSaved() already established in
// savedService.ts.

export async function toggleLike(userId: string, experienceId: string): Promise<LikesResult<boolean>> {
  const likedResult = await isLiked(userId, experienceId);
  if (!likedResult.ok) return likedResult;

  const result = likedResult.data
    ? await unlikeExperience(userId, experienceId)
    : await likeExperience(userId, experienceId);

  if (!result.ok) return result;
  return ok(!likedResult.data);
}

// ─── Is Liked (single experience) ───────────────────────────────────────────────

export async function isLiked(userId: string, experienceId: string): Promise<LikesResult<boolean>> {
  try {
    const { data, error } = await supabase
      .from('likes')
      .select('id')
      .eq('user_id', userId)
      .eq('experience_id', experienceId)
      .maybeSingle();

    if (error) return failLikes(error);
    return ok(!!data);
  } catch (err) {
    return failLikes(err);
  }
}

// ─── Liked Experience Ids (bulk) ─────────────────────────────────────────────────
// Backs every heart's own indicator via one shared query instead of one
// per rendered card — see queryKeys.ts's `likes.likedExperienceIds` doc.

export async function getLikedExperienceIds(userId: string): Promise<LikesResult<string[]>> {
  try {
    const { data, error } = await supabase
      .from('likes')
      .select('experience_id')
      .eq('user_id', userId);

    if (error) return failLikes(error);
    return ok(((data ?? []) as { experience_id: string }[]).map((row) => row.experience_id));
  } catch (err) {
    return failLikes(err);
  }
}

// ─── Live Like Count (single experience) ────────────────────────────────────────
// Reads straight from `likes` rather than the trigger-maintained
// `experiences.like_count` column — see the migration's own header
// comment for the "always correct, no denormalization drift" reasoning,
// the same one saved_items/follows' own bulk-id helpers already lean on.
// `head: true` avoids fetching any rows back, just the count.

export async function getLikeCount(experienceId: string): Promise<LikesResult<number>> {
  try {
    const { count, error } = await supabase
      .from('likes')
      .select('id', { count: 'exact', head: true })
      .eq('experience_id', experienceId);

    if (error) return failLikes(error);
    return ok(count ?? 0);
  } catch (err) {
    return failLikes(err);
  }
}
