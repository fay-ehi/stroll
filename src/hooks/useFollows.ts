/**
 * Stroll — Follows Hook (Skeleton)
 * src/hooks/useFollows.ts
 *
 * STATUS: Built on the mock src/services/followsService.ts — see
 * src/types/follow.ts's module doc for what's real vs. scaffolded.
 * Uses queryKeys.users.followers(id) / .following(id), both already
 * reserved in queryKeys.ts before this hook existed.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { fetchFollowCounts, fetchFollowers, fetchFollowing } from '@/services/followsService';
import { toFollowUserPreview, type FollowUserPreview } from '@/types/follow';

export interface UseFollowCountsResult {
  followerCount: number;
  followingCount: number;
  isLoading: boolean;
}

/** Just the counts — for the profile header's stat row, where a full list fetch would be wasted work. */
export function useFollowCounts(userId: string | undefined): UseFollowCountsResult {
  const query = useQuery({
    queryKey: userId ? [...queryKeys.users.followers(userId), 'counts'] : ['follow-counts', 'disabled'],
    queryFn: async () => {
      const result = await fetchFollowCounts(userId!);
      if (!result.ok) throw result.error;
      return result.data;
    },
    enabled: !!userId,
    staleTime: 60_000,
  });

  return {
    followerCount: query.data?.followers ?? 0,
    followingCount: query.data?.following ?? 0,
    isLoading: query.isLoading,
  };
}

export interface UseFollowListResult {
  users: FollowUserPreview[];
  isLoading: boolean;
  isError: boolean;
}

/** The actual list for a given tab — only fetched once a follow list sheet/screen is opened, not on every profile view. */
export function useFollowList(
  userId: string | undefined,
  kind: 'followers' | 'following',
): UseFollowListResult {
  const queryKey = userId
    ? kind === 'followers'
      ? queryKeys.users.followers(userId)
      : queryKeys.users.following(userId)
    : ['follow-list', 'disabled'];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const result = kind === 'followers' ? await fetchFollowers(userId!) : await fetchFollowing(userId!);
      if (!result.ok) throw result.error;
      return result.data;
    },
    enabled: !!userId,
    staleTime: 60_000,
  });

  const users = useMemo(() => (query.data ?? []).map(toFollowUserPreview), [query.data]);

  return { users, isLoading: query.isLoading, isError: query.isError };
}
