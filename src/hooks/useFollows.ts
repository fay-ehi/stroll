/**
 * Stroll — Follows Hooks
 * src/hooks/useFollows.ts
 *
 * Sprint 6 — Prompt 1. The Follow domain's public API — screens/
 * components go through these hooks, never followsService or supabase
 * directly (architecture rule: UI Screens → Hooks → Stores →
 * Repositories → Supabase). Built on the now-real
 * src/services/followsService.ts (see that file's own module doc, and
 * supabase/migrations/sprint6_prompt1_follows.sql for the `follows`
 * table this replaces src/types/follow.ts's former mock with).
 *
 * Exposes:
 *   useFollowCounts()  — followers/following counts (the profile stat
 *                        row — used by both the Profile tab, unchanged,
 *                        and the new Public Profile screen).
 *   useIsFollowing()   — is the SIGNED-IN user following a given user?
 *                        Every Follow/Following button's own indicator.
 *   useFollowingIds()  — the signed-in user's full following-id set —
 *                        for a screen checking membership across many
 *                        users at once, the same shape useSaved.ts's
 *                        useSavedExperienceIds serves for cards.
 *   useFollow()        — follow/unfollow mutation, optimistic.
 *   useFollowers()     — a user's paginated Followers list.
 *   useFollowing()     — a user's paginated Following list.
 *
 * ── Why a shared ids-query backs every Follow button ──
 * Same reasoning as useSaved.ts's own module doc: useIsFollowing(id) and
 * useFollowingIds(userId) both read the SAME query
 * (queryKeys.users.followingIds), so mounting a Public Profile's own
 * Follow button plus a dozen more inside an open Followers/Following
 * list still fires exactly one request, and a select-based subset check
 * means only the ONE button whose target actually flipped re-renders.
 *
 * ── Why there's no offline mutation queue ──
 * Same established convention as useSaved.ts's own toggle mutations —
 * this codebase doesn't queue writes for later; a follow/unfollow
 * attempted while offline fails fast with a clear NETWORK_ERROR toast
 * instead.
 */

import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryKeys';
import { makeError, normalizeError, logError, type StrollError } from '@/lib/errors';
import { showToast } from '@/stores/toastStore';
import { useAuthStore } from '@/stores/authStore';
import { useNetworkStatus } from '@/hooks';
import {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  getFollowingIds,
  fetchFollowCounts,
  type FollowListPage,
} from '@/services/followsService';
import { toFollowUserPreview, type FollowUserPreview } from '@/types/follow';

// ─── Shared ─────────────────────────────────────────────────────────────────────

const STALE_TIMES = {
  counts: 60 * 1000,
  ids: 30 * 1000,
  list: 60 * 1000,
} as const;

const NOT_SIGNED_IN_MESSAGE = 'Please sign in to continue.';
const OFFLINE_MESSAGE = "You're offline. Connect to the internet and try again.";

function isRetryableStrollError(failureCount: number, error: StrollError): boolean {
  return error.isRetryable && failureCount < 2;
}

// ─── useFollowCounts ────────────────────────────────────────────────────────────
// Unchanged signature/shape from the skeleton this replaces — the
// Profile tab (app/(app)/(tabs)/profile.tsx) already calls this exact
// hook and needed no changes when the mock underneath became real.

export interface UseFollowCountsResult {
  followerCount: number;
  followingCount: number;
  isLoading: boolean;
}

/** Just the counts — for a profile header's stat row, where a full list fetch would be wasted work. */
export function useFollowCounts(userId: string | undefined): UseFollowCountsResult {
  const query = useQuery({
    // A sub-key of queryKeys.users.followers(id), so invalidating that
    // broader key (e.g. after a follow/unfollow — see useFollow()'s
    // onSuccess below) also invalidates this counts query by prefix
    // match, with no separate invalidation call needed for it.
    queryKey: userId ? [...queryKeys.users.followers(userId), 'counts'] : ['follow-counts', 'disabled'],
    queryFn: async () => {
      const result = await fetchFollowCounts(userId!);
      if (!result.ok) throw result.error;
      return result.data;
    },
    enabled: !!userId,
    staleTime: STALE_TIMES.counts,
    retry: isRetryableStrollError,
  });

  return {
    followerCount: query.data?.followers ?? 0,
    followingCount: query.data?.following ?? 0,
    isLoading: query.isLoading,
  };
}

// ─── Following Ids (shared) ──────────────────────────────────────────────────
// Not exported directly — useIsFollowing/useFollowingIds (and every
// Follow button) are the public shape, both built on this one query per
// module doc's "why a shared ids-query backs every Follow button."

function useFollowingIdsQuery<T = string[]>(
  followerId: string | undefined,
  select?: (ids: string[]) => T,
) {
  return useQuery({
    queryKey: queryKeys.users.followingIds(followerId ?? ''),
    enabled: !!followerId,
    queryFn: async () => {
      const result = await getFollowingIds(followerId!);
      if (!result.ok) throw result.error;
      return result.data;
    },
    select,
    staleTime: STALE_TIMES.ids,
  });
}

/** Every Follow button (Public Profile header, Followers/Following list rows) reads its own state through this. */
export function useIsFollowing(targetUserId: string | undefined): boolean {
  const user = useAuthStore((s) => s.user);
  const query = useFollowingIdsQuery(user?.id, (ids) => ids.includes(targetUserId ?? ''));
  return query.data ?? false;
}

/** Bulk membership set — for a screen that checks many users at once outside of a per-row component. */
export function useFollowingIds(userId: string | undefined): Set<string> {
  const query = useFollowingIdsQuery(userId);
  return useMemo(() => new Set(query.data ?? []), [query.data]);
}

// ─── useFollow (toggle) ─────────────────────────────────────────────────────────
// Backs every Follow/Following affordance: the Public Profile screen's
// own header button, and each row's button inside the Followers/
// Following list modal. Optimistically flips the shared ids cache —
// every button targeting the same user updates instantly, wherever it's
// rendered — the same shape useSaved.ts's useToggleSaveExperience
// already establishes for Saved.

export interface ToggleFollowVars {
  targetUserId: string;
  /** The target's CURRENT follow state (before this toggle) — the mutation flips it. */
  isFollowing: boolean;
}

interface ToggleFollowContext {
  previousIds?: string[];
}

export function useFollow() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const { isConnected } = useNetworkStatus();

  return useMutation<void, StrollError, ToggleFollowVars, ToggleFollowContext>({
    mutationFn: async ({ targetUserId, isFollowing }) => {
      if (!user) throw makeError('UNAUTHORIZED', NOT_SIGNED_IN_MESSAGE);
      if (!isConnected) throw makeError('NETWORK_ERROR', OFFLINE_MESSAGE);
      if (targetUserId === user.id) {
        throw makeError('VALIDATION_ERROR', 'You cannot follow yourself.');
      }

      const result = isFollowing
        ? await unfollowUser(user.id, targetUserId)
        : await followUser(user.id, targetUserId);
      if (!result.ok) throw result.error;
    },

    onMutate: async ({ targetUserId, isFollowing }) => {
      if (!user) return {};
      const idsKey = queryKeys.users.followingIds(user.id);

      await queryClient.cancelQueries({ queryKey: idsKey });

      const previousIds = queryClient.getQueryData<string[]>(idsKey);
      if (previousIds) {
        queryClient.setQueryData<string[]>(
          idsKey,
          isFollowing ? previousIds.filter((id) => id !== targetUserId) : [...previousIds, targetUserId],
        );
      }

      return { previousIds };
    },

    onError: (error, _vars, context) => {
      if (user && context?.previousIds) {
        queryClient.setQueryData(queryKeys.users.followingIds(user.id), context.previousIds);
      }
      logError('useFollow', error);
      showToast({ type: 'error', message: normalizeError(error).userMessage });
    },

    onSuccess: (_data, { targetUserId, isFollowing }) => {
      showToast({ type: 'success', message: isFollowing ? 'Unfollowed.' : 'Following.' });

      if (user) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.users.followingIds(user.id) });
        // My own combined follower/following counts (see useFollowCounts's key shape above).
        void queryClient.invalidateQueries({ queryKey: queryKeys.users.followers(user.id) });
        // My own Following list, if it's open anywhere.
        void queryClient.invalidateQueries({ queryKey: queryKeys.users.following(user.id) });
      }
      // The target's combined counts AND their Followers list, if open anywhere.
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.followers(targetUserId) });
    },
  });
}

// ─── useFollowers / useFollowing (paginated lists) ─────────────────────────────
// Backs the Followers/Following list modal (app/(modals)/follows/
// [userId].tsx). Same useInfiniteQuery + flatten-and-map shape as
// useSaved.ts's useSavedExperiences/useSavedCollections. `kind` decides
// which repository function and which query key factory to use — both
// share this one implementation rather than two near-identical copies.

export interface UseFollowListResult {
  users: FollowUserPreview[];
  isLoading: boolean;
  isRefetching: boolean;
  isError: boolean;
  error: StrollError | null;
  refetch: () => void;
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
}

function useFollowListQuery(
  userId: string | undefined,
  kind: 'followers' | 'following',
): UseFollowListResult {
  const queryKey = userId
    ? kind === 'followers'
      ? queryKeys.users.followers(userId)
      : queryKeys.users.following(userId)
    : ['follow-list', kind, 'disabled'];

  const query = useInfiniteQuery<FollowListPage, StrollError>({
    queryKey,
    queryFn: async ({ pageParam }) => {
      const cursor = (pageParam as string | null) ?? null;
      const result =
        kind === 'followers'
          ? await getFollowers({ userId: userId!, cursor })
          : await getFollowing({ userId: userId!, cursor });
      if (!result.ok) throw result.error;
      return result.data;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!userId,
    staleTime: STALE_TIMES.list,
    retry: isRetryableStrollError,
  });

  const users = useMemo(() => {
    if (!query.data) return [];
    return query.data.pages.flatMap((page) => page.users.map(toFollowUserPreview));
  }, [query.data]);

  return {
    users,
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    isError: query.isError,
    error: query.error,
    refetch: () => {
      void query.refetch();
    },
    fetchNextPage: () => {
      void query.fetchNextPage();
    },
    hasNextPage: !!query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
  };
}

/** A user's paginated Followers list. */
export function useFollowers(userId: string | undefined): UseFollowListResult {
  return useFollowListQuery(userId, 'followers');
}

/** A user's paginated Following list. */
export function useFollowing(userId: string | undefined): UseFollowListResult {
  return useFollowListQuery(userId, 'following');
}
