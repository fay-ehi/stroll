/**
 * Stroll — Follow Domain Types
 * src/types/follow.ts
 *
 * Sprint 6 — Prompt 1. Previously a skeleton with no backing table (see
 * this file's own former module doc, preserved in git history) — the
 * `follows` table now exists (see
 * supabase/migrations/sprint6_prompt1_follows.sql) and
 * src/services/followsService.ts queries it for real. Nothing in this
 * file's shape needed to change from the skeleton version: `FollowRow`
 * is new (the raw table row itself), but `FollowUserRow` /
 * `FollowUserPreview` / `toFollowUserPreview` already anticipated
 * exactly the joined-profile-preview shape a real followers/following
 * list query returns, so every screen built against them (the Profile
 * tab's stat row, the Follow List modal) needed no changes beyond the
 * service/hook layer underneath becoming real.
 */

import type { Tables } from '@/lib/supabase';
import type { CreatorPreview } from './experience';

// ─── Raw Row ────────────────────────────────────────────────────────────────────

/** The raw `follows` table row — snake_case, exactly as stored in Supabase. */
export type FollowRow = Tables<'follows'>;

// ─── Joined Row (a follower/following list entry) ──────────────────────────────
// The shape a followers/following list query returns after joining the
// `follows` row to the OTHER side's `profiles` row (see
// followsService.ts's getFollowers()/getFollowing()) — a profile
// preview, not the raw follows row itself.

export interface FollowUserRow {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  is_verified: boolean;
}

/** Re-exported as its own name in this domain — a Follow list row IS a creator preview, the same shape every other card/list in the app already uses for "who". */
export type FollowUserPreview = CreatorPreview;

export function toFollowUserPreview(row: FollowUserRow): FollowUserPreview {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    isVerified: row.is_verified,
  };
}

// ─── Counts ─────────────────────────────────────────────────────────────────────

export interface FollowCounts {
  followers: number;
  following: number;
}
