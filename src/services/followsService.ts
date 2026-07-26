/**
 * Stroll — Follows Service
 * src/services/followsService.ts
 *
 * Sprint 6 — Prompt 1. Supabase operations for the Follow domain —
 * previously a mock (see src/types/follow.ts's module doc), now backed
 * by the real `follows` table (see
 * supabase/migrations/sprint6_prompt1_follows.sql). Pure async
 * functions — no UI, no Zustand, no navigation. Mirrors the Result-type
 * pattern established in profileService.ts / savedService.ts /
 * collectionsService.ts.
 *
 * This is the ONLY file that talks to the `follows` table directly —
 * screens/hooks go through src/hooks/useFollows.ts.
 *
 * ── Why two disambiguated joins ──
 * `follows` has two foreign keys into `profiles` (follower_id AND
 * following_id), so a plain `profiles(...)` embed is ambiguous to
 * PostgREST. getFollowers()/getFollowing() below disambiguate with the
 * explicit `!<constraint_name>` hint — `follows_follower_id_fkey` /
 * `follows_following_id_fkey` are Postgres's own default constraint
 * names for the `references` clauses in the migration above (the
 * standard `<table>_<column>_fkey` shape), not names invented here.
 *
 * ── Pagination strategy ──
 * Keyset (cursor) pagination on `follows.created_at` (+ `id` as a
 * tie-breaker), same "fetch one extra row to detect a next page"
 * approach and cursor token shape as savedService.ts — kept as this
 * file's own private helpers per that file's own "cursor helpers stay
 * local to their own service file" convention, rather than a shared
 * import.
 */

import { supabase } from '@/lib/supabase';
import { normalizeError, makeError, type StrollError } from '@/lib/errors';
import { PAGINATION } from '@/constants/app';
import type { FollowUserRow, FollowCounts } from '@/types/follow';

// ─── Result Type ───────────────────────────────────────────────────────────────

export type FollowsResult<T> = { ok: true; data: T } | { ok: false; error: StrollError };

function ok<T>(data: T): FollowsResult<T> {
  return { ok: true, data };
}

export function failFollows(err: unknown): FollowsResult<never> {
  return { ok: false, error: normalizeError(err) };
}

const DEFAULT_LIMIT = PAGINATION.DEFAULT_PAGE_SIZE;

const PROFILE_PREVIEW_COLUMNS = 'id, username, display_name, avatar_url, is_verified';

// ─── Follow / Unfollow ──────────────────────────────────────────────────────────
// Checks for an existing row first so a duplicate follow surfaces as a
// specific, friendly CONFLICT rather than a raw unique-constraint
// Postgres error — the same shape savedService.ts's saveItem() already
// established. `follows_unique_pair` (see the migration) is still the
// backstop for any race between this check and the insert.
// `follows_no_self_follow` is the backstop for the self-follow guard
// below — checked client-side too so the failure surfaces as a clear
// VALIDATION_ERROR rather than an opaque Postgres check-constraint error.

export async function followUser(
  followerId: string,
  followingId: string,
): Promise<FollowsResult<void>> {
  try {
    if (followerId === followingId) {
      return failFollows(makeError('VALIDATION_ERROR', 'You cannot follow yourself.'));
    }

    const { data: existing, error: checkError } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .maybeSingle();

    if (checkError) return failFollows(checkError);
    if (existing) return failFollows(makeError('CONFLICT', 'You are already following this user.'));

    const { error } = await supabase
      .from('follows')
      .insert({ follower_id: followerId, following_id: followingId });

    if (error) return failFollows(error);
    return ok(undefined);
  } catch (err) {
    return failFollows(err);
  }
}

// Unfollow never checks existence first — deleting a row that isn't
// there is a no-op, not an error (same convention as savedService.ts's
// unsaveItem() / collectionsService.ts's removeExperienceFromCollection()).
export async function unfollowUser(
  followerId: string,
  followingId: string,
): Promise<FollowsResult<void>> {
  try {
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId);

    if (error) return failFollows(error);
    return ok(undefined);
  } catch (err) {
    return failFollows(err);
  }
}

// ─── Is Following (single pair) ─────────────────────────────────────────────────
// The literal per-pair repository primitive the prompt doc names.
// useFollows.ts's button-level indicators use the bulk id lookup below
// instead (see getFollowingIds's own doc) — this exists for any future
// caller that only needs a single yes/no answer.

export async function isFollowing(
  followerId: string,
  followingId: string,
): Promise<FollowsResult<boolean>> {
  try {
    const { data, error } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .maybeSingle();

    if (error) return failFollows(error);
    return ok(!!data);
  } catch (err) {
    return failFollows(err);
  }
}

// ─── Following Ids (bulk) ─────────────────────────────────────────────────────
// Same "fetch once, let every button check the same in-memory set" shape
// as savedService.ts's getSavedExperienceIds() — backs every Follow
// button's indicator via useFollows.ts's useIsFollowing()/
// useFollowingIds() rather than one isFollowing() network round trip per
// rendered button (a Public Profile's own button, plus one per row in
// an open Followers/Following list).
export async function getFollowingIds(followerId: string): Promise<FollowsResult<string[]>> {
  try {
    const { data, error } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', followerId);

    if (error) return failFollows(error);
    return ok(((data ?? []) as { following_id: string }[]).map((row) => row.following_id));
  } catch (err) {
    return failFollows(err);
  }
}

// ─── Counts ─────────────────────────────────────────────────────────────────────

export async function getFollowerCount(userId: string): Promise<FollowsResult<number>> {
  try {
    const { count, error } = await supabase
      .from('follows')
      .select('id', { count: 'exact', head: true })
      .eq('following_id', userId);

    if (error) return failFollows(error);
    return ok(count ?? 0);
  } catch (err) {
    return failFollows(err);
  }
}

export async function getFollowingCount(userId: string): Promise<FollowsResult<number>> {
  try {
    const { count, error } = await supabase
      .from('follows')
      .select('id', { count: 'exact', head: true })
      .eq('follower_id', userId);

    if (error) return failFollows(error);
    return ok(count ?? 0);
  } catch (err) {
    return failFollows(err);
  }
}

/** Both counts in one call — backs useFollowCounts()'s single combined query (the Profile stat row needs both numbers together, not two separate loading states). */
export async function fetchFollowCounts(userId: string): Promise<FollowsResult<FollowCounts>> {
  const [followersResult, followingResult] = await Promise.all([
    getFollowerCount(userId),
    getFollowingCount(userId),
  ]);

  if (!followersResult.ok) return followersResult;
  if (!followingResult.ok) return followingResult;

  return ok({ followers: followersResult.data, following: followingResult.data });
}

// ─── Cursors (Followers / Following lists) ──────────────────────────────────────

interface FollowListCursor {
  createdAt: string;
  id: string;
}

function encodeFollowCursor(payload: FollowListCursor): string {
  return encodeURIComponent(JSON.stringify(payload));
}

function decodeFollowCursor(cursor: string): FollowListCursor | null {
  try {
    return JSON.parse(decodeURIComponent(cursor)) as FollowListCursor;
  } catch {
    return null;
  }
}

function buildKeysetFilter(columns: { name: string; value: string | number }[]): string {
  const branches: string[] = [];
  for (let i = 0; i < columns.length; i++) {
    const strictColumn = columns[i]!;
    const equalPrefix = columns.slice(0, i).map((c) => `${c.name}.eq.${c.value}`);
    const clause = [...equalPrefix, `${strictColumn.name}.lt.${strictColumn.value}`];
    branches.push(clause.length === 1 ? clause[0]! : `and(${clause.join(',')})`);
  }
  return branches.join(',');
}

export interface FollowListPage {
  users: FollowUserRow[];
  nextCursor: string | null;
}

// Raw joined-row shapes for the two disambiguated embeds (see module
// doc). Cast through `unknown` before use, the same convention every
// other service in this codebase already follows for a Supabase
// `.select()` with an embedded relation (see experiencesService.ts's
// `SELECT_COLUMNS` mapper, savedService.ts's fetchSavedItemsPage, etc.)
// — database.ts's hand-maintained `Relationships: []` doesn't give
// supabase-js enough to infer the embedded shape statically.
interface RawFollowerRow {
  id: string;
  created_at: string;
  follower: FollowUserRow | null;
}

interface RawFollowingRow {
  id: string;
  created_at: string;
  following: FollowUserRow | null;
}

/** Who follows `userId` — paginated, newest-first. Backs the "Followers" list screen. */
export async function getFollowers(params: {
  userId: string;
  cursor?: string | null;
  limit?: number;
}): Promise<FollowsResult<FollowListPage>> {
  try {
    const limit = params.limit ?? DEFAULT_LIMIT;
    let query = supabase
      .from('follows')
      .select(`id, created_at, follower:profiles!follows_follower_id_fkey(${PROFILE_PREVIEW_COLUMNS})`)
      .eq('following_id', params.userId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false });

    if (params.cursor) {
      const cursor = decodeFollowCursor(params.cursor);
      if (cursor) {
        query = query.or(
          buildKeysetFilter([
            { name: 'created_at', value: cursor.createdAt },
            { name: 'id', value: cursor.id },
          ]),
        );
      }
    }

    // Fetch one extra row to know whether a next page exists without a
    // separate count query — same trick savedService.ts's
    // fetchSavedItemsPage uses.
    const { data, error } = await query.limit(limit + 1);
    if (error) return failFollows(error);

    const rows = (data ?? []) as unknown as RawFollowerRow[];
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const last = page[page.length - 1];
    const nextCursor =
      hasMore && last ? encodeFollowCursor({ createdAt: last.created_at, id: last.id }) : null;

    const users = page
      .map((row) => row.follower)
      .filter((user): user is FollowUserRow => user !== null);

    return ok({ users, nextCursor });
  } catch (err) {
    return failFollows(err);
  }
}

/** Who `userId` follows — paginated, newest-first. Backs the "Following" list screen. */
export async function getFollowing(params: {
  userId: string;
  cursor?: string | null;
  limit?: number;
}): Promise<FollowsResult<FollowListPage>> {
  try {
    const limit = params.limit ?? DEFAULT_LIMIT;
    let query = supabase
      .from('follows')
      .select(`id, created_at, following:profiles!follows_following_id_fkey(${PROFILE_PREVIEW_COLUMNS})`)
      .eq('follower_id', params.userId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false });

    if (params.cursor) {
      const cursor = decodeFollowCursor(params.cursor);
      if (cursor) {
        query = query.or(
          buildKeysetFilter([
            { name: 'created_at', value: cursor.createdAt },
            { name: 'id', value: cursor.id },
          ]),
        );
      }
    }

    const { data, error } = await query.limit(limit + 1);
    if (error) return failFollows(error);

    const rows = (data ?? []) as unknown as RawFollowingRow[];
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const last = page[page.length - 1];
    const nextCursor =
      hasMore && last ? encodeFollowCursor({ createdAt: last.created_at, id: last.id }) : null;

    const users = page
      .map((row) => row.following)
      .filter((user): user is FollowUserRow => user !== null);

    return ok({ users, nextCursor });
  } catch (err) {
    return failFollows(err);
  }
}
