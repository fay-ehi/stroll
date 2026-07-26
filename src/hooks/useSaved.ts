/**
 * Stroll — Saved Hooks
 * src/hooks/useSaved.ts
 *
 * Sprint 5 — Prompt 4. The Saved domain's public API — screens and
 * components go through these hooks, never savedService or supabase
 * directly (architecture rule: UI Screens → Hooks → Stores →
 * Repositories → Supabase). No Zustand store here for the same reason
 * useCollections.ts has none — every piece of state below is server
 * state (TanStack Query).
 *
 * Exposes:
 *   useIsExperienceSaved()   — single-card saved indicator (Experience).
 *   useIsCollectionSaved()   — single-card saved indicator (Collection).
 *   useSavedExperienceIds()  — the full saved-experience-id set, for a
 *                              screen checking membership across many
 *                              items at once (e.g. the Profile grid).
 *   useSavedCollectionIds()  — same shape, for Collections.
 *   useToggleSaveExperience() — save/unsave an Experience.
 *   useToggleSaveCollection() — save/unsave a Collection.
 *   useSavedExperiences()    — the Saved tab's paginated Experiences section.
 *   useSavedCollections()    — the Saved tab's paginated Collections section.
 *   useSavedLibrary()        — screen-level composition of the two above,
 *                              what app/(app)/(tabs)/saved.tsx calls.
 *
 * ── Why a shared ids-query backs every card's indicator ──
 * `useIsExperienceSaved(experienceId)` and `useSavedExperienceIds(userId)`
 * both read the SAME query (`queryKeys.saved.experienceIds`) — TanStack
 * Query dedupes the underlying network fetch across every observer of a
 * key regardless of how many components call a hook built on it, so a
 * screen with dozens of Experience Cards on it still fires exactly one
 * request. `useIsExperienceSaved` additionally passes a `select` that
 * reduces the shared array down to a single boolean, so a re-render only
 * happens for a specific card when THAT card's membership actually
 * flips, not on every save/unsave anywhere in the app — the requirement
 * #12 "avoid unnecessary re-renders" this sprint's brief asks for, for
 * free from TanStack Query's own per-observer `select` mechanism, no
 * custom memoization needed.
 *
 * ── Why there's no offline mutation queue ──
 * Requirement #9 (Offline Behaviour) allows queuing an unsave "if your
 * existing architecture supports it." It doesn't — no query/mutation in
 * this codebase queues a write for later; useUpdateCollection and every
 * other mutation in useCollections.ts instead fail fast with a clear
 * NETWORK_ERROR toast when offline (see OFFLINE_MESSAGE there). The
 * mutations below follow that exact same established convention rather
 * than introducing a new queuing mechanism as a side effect of this
 * sprint. Saved's own offline story instead comes from
 * src/lib/queryPersister.ts (edited this sprint) — a previously-
 * synchronized Saved list is still viewable offline (in-memory during the
 * session, AsyncStorage-persisted across a restart); only a NEW save/
 * unsave attempted while offline is blocked, with a clear message and the
 * same button available to retry the moment connectivity returns.
 */

import { useMemo, useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient, useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryKeys';
import { makeError, normalizeError, logError, type StrollError } from '@/lib/errors';
import { showToast } from '@/stores/toastStore';
import { useAuthStore } from '@/stores/authStore';
import { useNetworkStatus } from '@/hooks';
import {
  saveExperience,
  unsaveExperience,
  saveCollection,
  unsaveCollection,
  getSavedExperienceIds,
  getSavedCollectionIds,
  getSavedExperiences,
  getSavedCollections,
  type SavedExperiencesPage,
  type SavedCollectionsPage,
} from '@/services/savedService';
import { toExperienceCardModel, type ExperienceCardModel } from '@/types/experience';
import { toCollectionCardModel, type CollectionCardModel } from '@/types/collection';

// ─── Shared ─────────────────────────────────────────────────────────────────────

const STALE_TIMES = {
  ids: 30 * 1000,
  list: 60 * 1000,
} as const;

const NOT_SIGNED_IN_MESSAGE = 'Please sign in to continue.';
const OFFLINE_MESSAGE = "You're offline. Connect to the internet and try again.";

function isRetryableStrollError(failureCount: number, error: StrollError): boolean {
  return error.isRetryable && failureCount < 2;
}

// ─── Saved Ids (shared) ──────────────────────────────────────────────────────
// Not exported directly — useIsExperienceSaved/useSavedExperienceIds
// (and their Collection counterparts) are the public shape, both built on
// this one query per module doc's "why a shared ids-query backs every
// card's indicator."

function useSavedExperienceIdsQuery<T = string[]>(userId: string | undefined, select?: (ids: string[]) => T) {
  return useQuery({
    queryKey: queryKeys.saved.experienceIds(userId ?? ''),
    enabled: !!userId,
    queryFn: async () => {
      const result = await getSavedExperienceIds(userId!);
      if (!result.ok) throw result.error;
      return result.data;
    },
    select,
    staleTime: STALE_TIMES.ids,
  });
}

function useSavedCollectionIdsQuery<T = string[]>(userId: string | undefined, select?: (ids: string[]) => T) {
  return useQuery({
    queryKey: queryKeys.saved.collectionIds(userId ?? ''),
    enabled: !!userId,
    queryFn: async () => {
      const result = await getSavedCollectionIds(userId!);
      if (!result.ok) throw result.error;
      return result.data;
    },
    select,
    staleTime: STALE_TIMES.ids,
  });
}

/** Every Experience Card (Discover feed, Related, Continue Exploring, Place Detail, Collection Detail) reads its own saved state through this. */
export function useIsExperienceSaved(experienceId: string | undefined): boolean {
  const user = useAuthStore((s) => s.user);
  const query = useSavedExperienceIdsQuery(user?.id, (ids) => ids.includes(experienceId ?? ''));
  return query.data ?? false;
}

/** Every Collection Card reads its own saved state through this. */
export function useIsCollectionSaved(collectionId: string | undefined): boolean {
  const user = useAuthStore((s) => s.user);
  const query = useSavedCollectionIdsQuery(user?.id, (ids) => ids.includes(collectionId ?? ''));
  return query.data ?? false;
}

/** Bulk membership set — for a screen (the Profile grid) that checks many ids at once outside of a per-card component, where a hook-per-item isn't possible. */
export function useSavedExperienceIds(userId: string | undefined): Set<string> {
  const query = useSavedExperienceIdsQuery(userId);
  return useMemo(() => new Set(query.data ?? []), [query.data]);
}

/** Bulk membership set for Collections — same shape as useSavedExperienceIds. */
export function useSavedCollectionIds(userId: string | undefined): Set<string> {
  const query = useSavedCollectionIdsQuery(userId);
  return useMemo(() => new Set(query.data ?? []), [query.data]);
}

// ─── useToggleSaveExperience ──────────────────────────────────────────────────
// Backs every Save/Unsave affordance for Experiences: ExperienceCard's
// own bookmark button, ExperienceActionBar (Experience Detail, wired in
// app/(app)/experience/[id].tsx), and ExperienceGridTile's long-press
// menu (Profile's own grid, wired in app/(app)/(tabs)/profile.tsx).
// Optimistically flips the shared ids cache (every card's indicator
// updates instantly, wherever it's rendered) and, when the direction is
// "unsave", also removes the row from the Saved tab's own cached list —
// requirement #6's "Support optimistic updates. Immediately refresh
// affected queries," satisfied without waiting on a round trip.

interface ToggleSaveExperienceVars {
  experienceId: string;
  /** The item's CURRENT saved state (before this toggle) — the mutation flips it. */
  isSaved: boolean;
}

interface ToggleSaveContext {
  previousIds?: string[];
  previousList?: InfiniteData<SavedExperiencesPage>;
}

export function useToggleSaveExperience() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const { isConnected } = useNetworkStatus();

  return useMutation<void, StrollError, ToggleSaveExperienceVars, ToggleSaveContext>({
    mutationFn: async ({ experienceId, isSaved }) => {
      if (!user) throw makeError('UNAUTHORIZED', NOT_SIGNED_IN_MESSAGE);
      if (!isConnected) throw makeError('NETWORK_ERROR', OFFLINE_MESSAGE);

      const result = isSaved ? await unsaveExperience(user.id, experienceId) : await saveExperience(user.id, experienceId);
      if (!result.ok) throw result.error;
    },

    onMutate: async ({ experienceId, isSaved }) => {
      if (!user) return {};
      const idsKey = queryKeys.saved.experienceIds(user.id);
      const listKey = queryKeys.saved.experiences(user.id);

      await Promise.all([
        queryClient.cancelQueries({ queryKey: idsKey }),
        queryClient.cancelQueries({ queryKey: listKey }),
      ]);

      const previousIds = queryClient.getQueryData<string[]>(idsKey);
      if (previousIds) {
        queryClient.setQueryData<string[]>(
          idsKey,
          isSaved ? previousIds.filter((id) => id !== experienceId) : [...previousIds, experienceId],
        );
      }

      const previousList = queryClient.getQueryData<InfiniteData<SavedExperiencesPage>>(listKey);
      if (isSaved && previousList) {
        queryClient.setQueryData<InfiniteData<SavedExperiencesPage>>(listKey, {
          ...previousList,
          pages: previousList.pages.map((page) => ({
            ...page,
            rows: page.rows.filter((row) => row.id !== experienceId),
          })),
        });
      }

      return { previousIds, previousList };
    },

    onError: (error, _vars, context) => {
      if (user) {
        if (context?.previousIds) {
          queryClient.setQueryData(queryKeys.saved.experienceIds(user.id), context.previousIds);
        }
        if (context?.previousList) {
          queryClient.setQueryData(queryKeys.saved.experiences(user.id), context.previousList);
        }
      }
      logError('useToggleSaveExperience', error);
      showToast({ type: 'error', message: normalizeError(error).userMessage });
    },

    onSuccess: (_data, { isSaved }) => {
      showToast({ type: 'success', message: isSaved ? 'Removed from Saved.' : 'Saved.' });
      if (user) {
        queryClient.invalidateQueries({ queryKey: queryKeys.saved.experienceIds(user.id) });
        queryClient.invalidateQueries({ queryKey: queryKeys.saved.experiences(user.id) });
      }
    },
  });
}

// ─── useToggleSaveCollection ──────────────────────────────────────────────────
// Mirrors useToggleSaveExperience exactly, for Collections. Backs
// CollectionCard's own bookmark button and Collection Detail's Save row
// (wired in app/(app)/collections/[id].tsx).

interface ToggleSaveCollectionVars {
  collectionId: string;
  isSaved: boolean;
}

interface ToggleSaveCollectionContext {
  previousIds?: string[];
  previousList?: InfiniteData<SavedCollectionsPage>;
}

export function useToggleSaveCollection() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const { isConnected } = useNetworkStatus();

  return useMutation<void, StrollError, ToggleSaveCollectionVars, ToggleSaveCollectionContext>({
    mutationFn: async ({ collectionId, isSaved }) => {
      if (!user) throw makeError('UNAUTHORIZED', NOT_SIGNED_IN_MESSAGE);
      if (!isConnected) throw makeError('NETWORK_ERROR', OFFLINE_MESSAGE);

      const result = isSaved ? await unsaveCollection(user.id, collectionId) : await saveCollection(user.id, collectionId);
      if (!result.ok) throw result.error;
    },

    onMutate: async ({ collectionId, isSaved }) => {
      if (!user) return {};
      const idsKey = queryKeys.saved.collectionIds(user.id);
      const listKey = queryKeys.saved.collections(user.id);

      await Promise.all([
        queryClient.cancelQueries({ queryKey: idsKey }),
        queryClient.cancelQueries({ queryKey: listKey }),
      ]);

      const previousIds = queryClient.getQueryData<string[]>(idsKey);
      if (previousIds) {
        queryClient.setQueryData<string[]>(
          idsKey,
          isSaved ? previousIds.filter((id) => id !== collectionId) : [...previousIds, collectionId],
        );
      }

      const previousList = queryClient.getQueryData<InfiniteData<SavedCollectionsPage>>(listKey);
      if (isSaved && previousList) {
        queryClient.setQueryData<InfiniteData<SavedCollectionsPage>>(listKey, {
          ...previousList,
          pages: previousList.pages.map((page) => ({
            ...page,
            rows: page.rows.filter((row) => row.id !== collectionId),
          })),
        });
      }

      return { previousIds, previousList };
    },

    onError: (error, _vars, context) => {
      if (user) {
        if (context?.previousIds) {
          queryClient.setQueryData(queryKeys.saved.collectionIds(user.id), context.previousIds);
        }
        if (context?.previousList) {
          queryClient.setQueryData(queryKeys.saved.collections(user.id), context.previousList);
        }
      }
      logError('useToggleSaveCollection', error);
      showToast({ type: 'error', message: normalizeError(error).userMessage });
    },

    onSuccess: (_data, { isSaved }) => {
      showToast({ type: 'success', message: isSaved ? 'Removed from Saved.' : 'Saved.' });
      if (user) {
        queryClient.invalidateQueries({ queryKey: queryKeys.saved.collectionIds(user.id) });
        queryClient.invalidateQueries({ queryKey: queryKeys.saved.collections(user.id) });
      }
    },
  });
}

// ─── useSavedExperiences / useSavedCollections ──────────────────────────────
// The Saved tab's two paginated sections (requirement #5). Same
// useInfiniteQuery + flatten-and-map shape as
// useCollections.ts's useCollectionExperiences.

function mapSavedExperienceRows(rows: SavedExperiencesPage['rows']): ExperienceCardModel[] {
  const cards: ExperienceCardModel[] = [];
  for (const row of rows) {
    const card = toExperienceCardModel(row);
    if (card) {
      cards.push(card);
    } else {
      logError('useSavedExperiences', new Error(`Saved experience ${row.id} is missing its creator or place — dropped.`));
    }
  }
  return cards;
}

function mapSavedCollectionRows(rows: SavedCollectionsPage['rows']): CollectionCardModel[] {
  const cards: CollectionCardModel[] = [];
  for (const row of rows) {
    const card = toCollectionCardModel(row);
    if (card) {
      cards.push(card);
    } else {
      logError('useSavedCollections', new Error(`Saved collection ${row.id} is missing its owner — dropped.`));
    }
  }
  return cards;
}

export interface UseSavedExperiencesResult {
  experiences: ExperienceCardModel[];
  isLoading: boolean;
  isRefetching: boolean;
  isError: boolean;
  error: StrollError | null;
  refetch: () => void;
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
}

export function useSavedExperiences(userId: string | undefined): UseSavedExperiencesResult {
  const query = useInfiniteQuery<SavedExperiencesPage, StrollError>({
    queryKey: queryKeys.saved.experiences(userId ?? ''),
    queryFn: async ({ pageParam }) => {
      const result = await getSavedExperiences({ userId: userId!, cursor: (pageParam as string | null) ?? null });
      if (!result.ok) throw result.error;
      return result.data;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!userId,
    staleTime: STALE_TIMES.list,
    retry: isRetryableStrollError,
  });

  const experiences = useMemo(() => {
    if (!query.data) return [];
    return query.data.pages.flatMap((page) => mapSavedExperienceRows(page.rows));
  }, [query.data]);

  return {
    experiences,
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

export interface UseSavedCollectionsResult {
  collections: CollectionCardModel[];
  isLoading: boolean;
  isRefetching: boolean;
  isError: boolean;
  error: StrollError | null;
  refetch: () => void;
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
}

export function useSavedCollections(userId: string | undefined): UseSavedCollectionsResult {
  const query = useInfiniteQuery<SavedCollectionsPage, StrollError>({
    queryKey: queryKeys.saved.collections(userId ?? ''),
    queryFn: async ({ pageParam }) => {
      const result = await getSavedCollections({ userId: userId!, cursor: (pageParam as string | null) ?? null });
      if (!result.ok) throw result.error;
      return result.data;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!userId,
    staleTime: STALE_TIMES.list,
    retry: isRetryableStrollError,
  });

  const collections = useMemo(() => {
    if (!query.data) return [];
    return query.data.pages.flatMap((page) => mapSavedCollectionRows(page.rows));
  }, [query.data]);

  return {
    collections,
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

// ─── useSavedLibrary ──────────────────────────────────────────────────────────
// Screen-level composition — what app/(app)/(tabs)/saved.tsx calls.
// Mirrors useCollections.ts's useCollectionDetailPage: one `refresh()`
// that pulls both sections together for a single pull-to-refresh gesture,
// even though only one section is visible at a time (requirement #5's
// "Pull-to-refresh" applies to each section, and refreshing both together
// on either pull keeps the inactive tab from ever showing stale data the
// moment the user switches to it).

export interface UseSavedLibraryResult {
  experiences: UseSavedExperiencesResult;
  collections: UseSavedCollectionsResult;
  refresh: () => Promise<void>;
  isRefreshing: boolean;
}

export function useSavedLibrary(userId: string | undefined): UseSavedLibraryResult {
  const experiences = useSavedExperiences(userId);
  const collections = useSavedCollections(userId);
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setIsRefreshing(true);
    try {
      await Promise.all([
        queryClient.refetchQueries({ queryKey: queryKeys.saved.experiences(userId) }),
        queryClient.refetchQueries({ queryKey: queryKeys.saved.collections(userId) }),
        queryClient.refetchQueries({ queryKey: queryKeys.saved.experienceIds(userId) }),
        queryClient.refetchQueries({ queryKey: queryKeys.saved.collectionIds(userId) }),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  }, [userId, queryClient]);

  return { experiences, collections, refresh, isRefreshing };
}
