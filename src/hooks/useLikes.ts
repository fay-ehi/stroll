/**
 * Stroll — Likes Hooks
 * src/hooks/useLikes.ts
 *
 * Sprint 6 Prompt 2. The Likes domain's public API — screens/components
 * go through these hooks, never likesService or supabase directly
 * (architecture rule: UI Screens → Hooks → Stores → Repositories →
 * Supabase). Built on src/services/likesService.ts (see that file's own
 * module doc, and supabase/migrations/sprint6_prompt2_likes.sql for the
 * `likes` table backing it).
 *
 * Exposes:
 *   useIsLiked()           — is the SIGNED-IN user liking a given
 *                             experience? Every heart's own indicator.
 *   useLikedExperienceIds() — the signed-in user's full liked-id set —
 *                             for a screen checking membership across
 *                             many experiences at once.
 *   useLikeCount()          — a single experience's LIVE like count
 *                             (Experience Detail's own engagement row —
 *                             see below for why this isn't wired to
 *                             every ExperienceCard).
 *   useLike()               — like/unlike mutation, optimistic.
 *
 * ── Why a shared ids-query backs every heart's on/off state ──
 * Same reasoning as useFollows.ts's / useSaved.ts's own module docs:
 * useIsLiked(id) and useLikedExperienceIds(userId) both read the SAME
 * query (queryKeys.likes.likedExperienceIds), so a Discover feed full of
 * cards plus an open Experience Detail for one of them still fires
 * exactly one request, and a select-based subset check means only the
 * ONE heart whose target actually flipped re-renders.
 *
 * ── Why useLikeCount() is NOT on every ExperienceCard ──
 * It's a real network request (requirement #14 explicitly rules out "one
 * query per ExperienceCard"). Every card already receives its own
 * starting count for free as the `likeCount` field baked into whichever
 * list query rendered it (Discover, Related, Saved, Place Detail, Public
 * Profile, Collection Detail all already select `like_count` off
 * `experiences` — see types/experience.ts's toExperienceCardModel). This
 * hook is reserved for the one surface that has no such starting value
 * of its own to patch and genuinely wants to read live —Experience
 * Detail's engagement row — matching the migration's own header comment:
 * "the app itself... still reads live from the `likes` table directly
 * rather than [experiences.like_count], for the same 'always correct, no
 * denormalization drift' reasoning saved_items/follows' own bulk-id
 * helpers already lean on."
 *
 * ── Keeping every card's count in sync without a query-per-card ──
 * requirement #13 asks every one of these surfaces to update
 * optimistically: Discover, Experience Detail, Saved, Place Detail,
 * Related, Public Profile, Collection Detail. Rather than hand-enumerate
 * every query key that might be holding a copy of one experience (and
 * keep that list in sync as new surfaces get added), useLike()'s
 * onMutate/onError below call patchExperienceLikeCounts(), a small
 * generic cache walk keyed only on query-key PREFIX
 * (['experiences', ...] and ['saved', 'experiences', ...] — every
 * Experience-shaped cache in this app lives under one of those two).
 * It tolerates the one real inconsistency in how this codebase caches
 * Experience data: flat, single-page useQuery hooks (Featured, Continue
 * Exploring, Detail) cache already-MAPPED ExperienceCardModel/
 * ExperienceDetailModel objects (`likeCount`, camelCase), while every
 * useInfiniteQuery hook (Discover feed, byPlace, byUser, byCollection,
 * Saved) caches the RAW ExperienceFeedRow page under `.rows` and maps to
 * card models at read time (`like_count`, snake_case) — see
 * useDiscoverFeed.ts / usePlaceExperiences.ts / useUserGallery.ts /
 * useCollections.ts / useSaved.ts for that read-time mapping. The patch
 * below checks for both field names so one function covers every shape
 * without needing to know which hook cached which.
 *
 * This deliberately does NOT invalidate (refetch) any of those list
 * queries — only the one thing that changed (the liked-ids set, and — if
 * mounted — this specific experience's own live count/detail query) gets
 * a real network round trip on success. Every other surface stays
 * correct off the optimistic patch alone until it naturally refetches on
 * its own cadence (pull-to-refresh, staleTime elapsing, remount) —
 * satisfying requirement #14's "avoid unnecessary refetches" without
 * leaving any surface stale in the meantime.
 *
 * ── Why there's no offline mutation queue ──
 * Same established convention as useSaved.ts's / useFollows.ts's own
 * toggle mutations — a like/unlike attempted while offline fails fast
 * with a clear NETWORK_ERROR toast instead of queuing.
 *
 * ── Why there's no success toast ──
 * Save and Follow both toast on success — deliberate actions taken
 * occasionally. Likes are the opposite: meant to feel instant and be
 * fired rapidly (including via double tap) per this sprint's own
 * Objective ("Likes should feel instant"). The heart's own scale-pop +
 * fill animation (see components/ui/LikeButton.tsx) IS the success
 * feedback; a toast on every tap would be noise. An error toast still
 * fires on failure, same as every other mutation in this app.
 */

import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryKeys';
import { makeError, normalizeError, logError, type StrollError } from '@/lib/errors';
import { showToast } from '@/stores/toastStore';
import { useAuthStore } from '@/stores/authStore';
import { useNetworkStatus } from '@/hooks';
import { useInvalidateExperienceDetail } from '@/hooks/useExperienceDetail';
import {
  likeExperience,
  unlikeExperience,
  getLikedExperienceIds,
  getLikeCount,
} from '@/services/likesService';
import { trackExperienceLiked, trackExperienceUnliked, type LikeSource } from '@/lib/analytics';
import { emitExperienceLiked } from '@/lib/domainEvents';

// ─── Shared ─────────────────────────────────────────────────────────────────────

const STALE_TIMES = {
  ids: 30 * 1000,
  count: 30 * 1000,
} as const;

const NOT_SIGNED_IN_MESSAGE = 'Please sign in to continue.';
const OFFLINE_MESSAGE = "You're offline. Connect to the internet and try again.";

function isRetryableStrollError(failureCount: number, error: StrollError): boolean {
  return error.isRetryable && failureCount < 2;
}

// ─── Liked Ids (shared) ──────────────────────────────────────────────────────
// Not exported directly — useIsLiked/useLikedExperienceIds (every heart)
// are the public shape, both built on this one query per module doc's
// "why a shared ids-query backs every heart's on/off state."

function useLikedExperienceIdsQuery<T = string[]>(
  userId: string | undefined,
  select?: (ids: string[]) => T,
) {
  return useQuery({
    queryKey: queryKeys.likes.likedExperienceIds(userId ?? ''),
    enabled: !!userId,
    queryFn: async () => {
      const result = await getLikedExperienceIds(userId!);
      if (!result.ok) throw result.error;
      return result.data;
    },
    select,
    staleTime: STALE_TIMES.ids,
  });
}

/** Every heart (ExperienceCard footer, double-tap, Experience Detail's engagement row) reads its own on/off state through this. */
export function useIsLiked(experienceId: string | undefined): boolean {
  const user = useAuthStore((s) => s.user);
  const query = useLikedExperienceIdsQuery(user?.id, (ids) => ids.includes(experienceId ?? ''));
  return query.data ?? false;
}

/** Bulk membership set — for a screen that checks many experiences at once outside of a per-card component. */
export function useLikedExperienceIds(userId: string | undefined): Set<string> {
  const query = useLikedExperienceIdsQuery(userId);
  return useMemo(() => new Set(query.data ?? []), [query.data]);
}

// ─── Like Count (single experience, live) ───────────────────────────────────────
// See module doc for why this exists alongside (not instead of) the
// `likeCount` field already embedded in every card model.

/**
 * @param initialCount Seeds the query so the Detail screen's engagement
 *   row never flashes 0 before this resolves — pass the same
 *   `experience.likeCount` the Detail screen's own model already carries
 *   (correct as of that model's own last fetch; this hook then keeps it
 *   live from here on).
 */
export function useLikeCount(experienceId: string | undefined, initialCount?: number): number {
  const query = useQuery({
    queryKey: queryKeys.likes.count(experienceId ?? ''),
    enabled: !!experienceId,
    queryFn: async () => {
      const result = await getLikeCount(experienceId!);
      if (!result.ok) throw result.error;
      return result.data;
    },
    initialData: initialCount,
    staleTime: STALE_TIMES.count,
    retry: isRetryableStrollError,
  });
  return query.data ?? initialCount ?? 0;
}

// ─── Cross-cache count patch ────────────────────────────────────────────────────
// See module doc's "Keeping every card's count in sync without a
// query-per-card" for the full reasoning.

interface LikeCountCarrier {
  id: string;
  likeCount?: number;
  like_count?: number;
}

function isLikeCountCarrier(value: unknown): value is LikeCountCarrier {
  return (
    !!value &&
    typeof value === 'object' &&
    'id' in (value as Record<string, unknown>) &&
    (typeof (value as Record<string, unknown>).likeCount === 'number' ||
      typeof (value as Record<string, unknown>).like_count === 'number')
  );
}

function bumpCarrier<T>(item: T, experienceId: string, delta: number): T {
  if (!isLikeCountCarrier(item) || item.id !== experienceId) return item;
  if (typeof item.likeCount === 'number') {
    return { ...item, likeCount: Math.max(0, item.likeCount + delta) };
  }
  return { ...item, like_count: Math.max(0, item.like_count! + delta) };
}

function bumpCachedValue(value: unknown, experienceId: string, delta: number): unknown {
  if (!value) return value;

  // Flat array of cards — Featured, Continue Exploring/Recommended, Related.
  if (Array.isArray(value)) {
    return value.map((item) => bumpCarrier(item, experienceId, delta));
  }

  if (typeof value === 'object') {
    // InfiniteData<{ rows }> — Discover feed, byPlace, byUser, byCollection, Saved.
    const maybeInfinite = value as { pages?: unknown[] };
    if (Array.isArray(maybeInfinite.pages)) {
      return {
        ...(value as object),
        pages: maybeInfinite.pages.map((page) => {
          const withRows = page as { rows?: unknown[] } | undefined;
          if (!withRows || !Array.isArray(withRows.rows)) return page;
          return { ...withRows, rows: withRows.rows.map((row) => bumpCarrier(row, experienceId, delta)) };
        }),
      };
    }

    // A single carrier object — Experience Detail's own cached model.
    if (isLikeCountCarrier(value)) {
      return bumpCarrier(value, experienceId, delta);
    }
  }

  return value;
}

/** Bumps `likeCount`/`like_count` by `delta` for one experience id across every currently-cached surface it might appear on. */
function patchExperienceLikeCounts(queryClient: QueryClient, experienceId: string, delta: number): void {
  queryClient.setQueriesData(
    {
      predicate: (query) => {
        const key = query.queryKey as unknown[];
        return key[0] === 'experiences' || (key[0] === 'saved' && key[1] === 'experiences');
      },
    },
    (old: unknown) => bumpCachedValue(old, experienceId, delta),
  );
}

// ─── useLike (toggle) ────────────────────────────────────────────────────────────
// Backs every Like affordance: ExperienceCard's footer heart, the
// double-tap-on-cover gesture (both in components/discover/
// ExperienceCard.tsx), and Experience Detail's own engagement row
// (components/experience-detail/ExperienceDetailHeader.tsx) — all three
// call this one hook per this sprint's requirement #5 ("Reuse the shared
// Like hook. Do not implement separate logic.").

export interface ToggleLikeVars {
  experienceId: string;
  /** Whose Experience this is — the domain event's/analytics' notification recipient, never the actor. */
  creatorId: string;
  /** The experience's CURRENT like state (before this toggle) — the mutation flips it. */
  isLiked: boolean;
  /** Which surface fired this — see LikeSource in lib/analytics.ts. */
  source: LikeSource;
}

interface ToggleLikeContext {
  previousIds?: string[];
  previousCount?: number;
}

export function useLike() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const { isConnected } = useNetworkStatus();
  const invalidateExperienceDetail = useInvalidateExperienceDetail();

  return useMutation<void, StrollError, ToggleLikeVars, ToggleLikeContext>({
    mutationFn: async ({ experienceId, isLiked }) => {
      if (!user) throw makeError('UNAUTHORIZED', NOT_SIGNED_IN_MESSAGE);
      if (!isConnected) throw makeError('NETWORK_ERROR', OFFLINE_MESSAGE);

      const result = isLiked
        ? await unlikeExperience(user.id, experienceId)
        : await likeExperience(user.id, experienceId);
      if (!result.ok) throw result.error;
    },

    onMutate: async ({ experienceId, isLiked }) => {
      if (!user) return {};
      const idsKey = queryKeys.likes.likedExperienceIds(user.id);
      const countKey = queryKeys.likes.count(experienceId);
      const delta = isLiked ? -1 : 1;

      await queryClient.cancelQueries({ queryKey: idsKey });

      const previousIds = queryClient.getQueryData<string[]>(idsKey);
      if (previousIds) {
        queryClient.setQueryData<string[]>(
          idsKey,
          isLiked ? previousIds.filter((id) => id !== experienceId) : [...previousIds, experienceId],
        );
      }

      const previousCount = queryClient.getQueryData<number>(countKey);
      if (typeof previousCount === 'number') {
        queryClient.setQueryData<number>(countKey, Math.max(0, previousCount + delta));
      }

      // Every other surface currently caching this experience — see module doc.
      patchExperienceLikeCounts(queryClient, experienceId, delta);

      return { previousIds, previousCount };
    },

    onError: (error, { experienceId, isLiked }, context) => {
      if (user && context?.previousIds) {
        queryClient.setQueryData(queryKeys.likes.likedExperienceIds(user.id), context.previousIds);
      }
      if (typeof context?.previousCount === 'number') {
        queryClient.setQueryData(queryKeys.likes.count(experienceId), context.previousCount);
      }
      // Undo the cross-cache bump applied in onMutate.
      patchExperienceLikeCounts(queryClient, experienceId, isLiked ? 1 : -1);

      logError('useLike', error);
      showToast({ type: 'error', message: normalizeError(error).userMessage });
    },

    onSuccess: (_data, { experienceId, creatorId, isLiked, source }) => {
      if (user) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.likes.likedExperienceIds(user.id) });
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.likes.count(experienceId) });
      void invalidateExperienceDetail(experienceId);

      if (isLiked) {
        trackExperienceUnliked({ experienceId, creatorId, source });
        return;
      }

      trackExperienceLiked({ experienceId, creatorId, source });
      if (user) {
        emitExperienceLiked({ experienceId, likedBy: user.id, creatorId });
      }
    },
  });
}
