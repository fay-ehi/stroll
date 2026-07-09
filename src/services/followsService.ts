/**
 * Stroll — Follows Service (MOCK — Skeleton Only)
 * src/services/followsService.ts
 *
 * STATUS: Not real — see src/types/follow.ts's module doc. Returns fixed
 * mock counts/lists through the same Result-type async signature a real
 * service would use, so the Profile screen's follow UI never has to
 * change shape when this becomes real — only this file's body swaps out.
 */

import type { FollowUserRow } from '@/types/follow';
import type { StrollError } from '@/lib/errors';
import { makeError } from '@/lib/errors';

export type FollowsResult<T> = { ok: true; data: T } | { ok: false; error: StrollError };

function ok<T>(data: T): FollowsResult<T> {
  return { ok: true, data };
}

export function failFollows(err: unknown): FollowsResult<never> {
  return { ok: false, error: makeError('UNKNOWN', 'Failed to load.', err) };
}

const MOCK_FOLLOWERS: FollowUserRow[] = [
  {
    id: 'mock-follower-1',
    username: 'amaka.explores',
    display_name: 'Amaka',
    avatar_url: null,
    is_verified: false,
  },
  {
    id: 'mock-follower-2',
    username: 'tunde.eats',
    display_name: 'Tunde',
    avatar_url: null,
    is_verified: false,
  },
];

const MOCK_FOLLOWING: FollowUserRow[] = [
  {
    id: 'mock-following-1',
    username: 'chioma.b',
    display_name: 'Chioma',
    avatar_url: null,
    is_verified: true,
  },
];

/** MOCK — fixed follower/following counts for a user. */
export async function fetchFollowCounts(
  userId: string,
): Promise<FollowsResult<{ followers: number; following: number }>> {
  void userId;
  await new Promise((resolve) => setTimeout(resolve, 200));
  return ok({ followers: MOCK_FOLLOWERS.length, following: MOCK_FOLLOWING.length });
}

/** MOCK — fixed follower list for a user. */
export async function fetchFollowers(userId: string): Promise<FollowsResult<FollowUserRow[]>> {
  void userId;
  await new Promise((resolve) => setTimeout(resolve, 200));
  return ok(MOCK_FOLLOWERS);
}

/** MOCK — fixed following list for a user. */
export async function fetchFollowing(userId: string): Promise<FollowsResult<FollowUserRow[]>> {
  void userId;
  await new Promise((resolve) => setTimeout(resolve, 200));
  return ok(MOCK_FOLLOWING);
}
