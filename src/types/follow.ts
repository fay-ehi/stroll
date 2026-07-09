/**
 * Stroll — Follow Domain Types (Skeleton)
 * src/types/follow.ts
 *
 * STATUS: Skeleton only, same situation as src/types/collection.ts — no
 * `follows` table exists in this repo (no migrations checked in at all),
 * and queryKeys.users.followers(id) / .following(id) were already
 * reserved but never implemented. This fills that gap with a
 * ready-to-wire shape rather than leaving it unbuilt.
 *
 * When a future sprint adds real follows:
 *   1. Confirm/create a `follows` table (follower_id, following_id,
 *      created_at — the standard shape for this relationship).
 *   2. Replace src/services/followsService.ts's mock implementation with
 *      real Supabase queries.
 *   3. Nothing on the Profile screen needs to change beyond that — it
 *      already calls useFollowCounts()/useFollowList() through their
 *      real hook signatures.
 */

import type { CreatorPreview } from './experience';

export interface FollowUserRow {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  is_verified: boolean;
}

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
