/**
 * Stroll — Collection Collaboration Hooks
 * src/hooks/useCollaboration.ts
 *
 * Sprint 5 — Prompt 2. The Collaborative Collections domain's public API
 * — screens go through these hooks, never collaborationService or
 * supabase directly (same architecture rule useCollections.ts follows:
 * UI screens → hooks → stores → services → Supabase). Deliberately its
 * own file rather than folded into useCollections.ts — that file's
 * module doc already enumerates a stable set of Collection CRUD hooks;
 * collaboration is a distinct sub-domain (its own table, its own RLS,
 * its own invitation lifecycle) that composes with it rather than
 * extending it.
 *
 * Exposes:
 *   useInvitableUserSearch()      — debounced user search for the Invite
 *                                    screen (requirement #2).
 *   useCollectionCollaborators()  — a Collection's full collaborator/
 *                                    invitation list, every status
 *                                    (Manage Collaborators screen).
 *   useMyPendingInvitations()     — the signed-in user's own pending
 *                                    invitations, across every Collection
 *                                    (Profile's Invitations entry point).
 *   useInviteCollaborators()      — send one or more invitations.
 *   useCancelInvitation()         — owner cancels a still-pending invite.
 *   useAcceptInvitation()         — invited user accepts.
 *   useDeclineInvitation()        — invited user declines.
 *   useRemoveCollaborator()       — owner removes an accepted collaborator.
 *   useLeaveCollection()          — a collaborator leaves on their own.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryKeys';
import { makeError, normalizeError, logError, type StrollError } from '@/lib/errors';
import { showToast } from '@/stores/toastStore';
import { useAuthStore } from '@/stores/authStore';
import { useDebounce } from '@/hooks';
import { TIMEOUTS } from '@/constants/app';
import {
  searchInvitableUsers,
  inviteCollaborators,
  cancelInvitation,
  acceptInvitation,
  declineInvitation,
  removeCollaborator,
  leaveCollection,
  getCollectionCollaborators,
  getMyPendingInvitations,
} from '@/services/collaborationService';
import {
  toCollaboratorModel,
  toPendingInvitationModel,
  type CollaboratorModel,
  type PendingInvitationModel,
} from '@/types/collaboration';
import type { CreatorPreview } from '@/types/experience';
import {
  emitCollectionInvitationSent,
  emitCollectionInvitationAccepted,
  emitCollectionInvitationDeclined,
  emitCollectionCollaboratorAdded,
  emitCollectionCollaboratorRemoved,
} from '@/lib/domainEvents';

// ─── Shared ─────────────────────────────────────────────────────────────────────

const STALE_TIMES = {
  search: 15 * 1000,
  collaborators: 30 * 1000,
  myInvitations: 30 * 1000,
} as const;

const NOT_SIGNED_IN_MESSAGE = 'Please sign in to continue.';

function isRetryableStrollError(failureCount: number, error: StrollError): boolean {
  return error.isRetryable && failureCount < 2;
}

// ─── useInvitableUserSearch ─────────────────────────────────────────────────────
// Same shape as usePlaces.ts's usePlaceSearch — debounces the raw query
// value itself (not a manually-managed timer) so the query key settles
// once typing pauses. The screen owns the text input's state and passes
// the live value in, exactly like usePlaceSearch's callers do.

export interface UseInvitableUserSearchResult {
  results: CreatorPreview[];
  isLoading: boolean;
  isError: boolean;
  error: StrollError | null;
}

export function useInvitableUserSearch(collectionId: string, query: string): UseInvitableUserSearchResult {
  const user = useAuthStore((s) => s.user);
  const debouncedQuery = useDebounce(query, TIMEOUTS.SEARCH_DEBOUNCE_MS);

  const search = useQuery<CreatorPreview[], StrollError>({
    queryKey: queryKeys.users.invitableSearch(collectionId, debouncedQuery),
    enabled: !!user && debouncedQuery.trim().length >= 2,
    queryFn: async () => {
      if (!user) throw makeError('UNAUTHORIZED', NOT_SIGNED_IN_MESSAGE);
      const result = await searchInvitableUsers({
        query: debouncedQuery,
        collectionId,
        currentUserId: user.id,
      });
      if (!result.ok) throw result.error;
      return result.data;
    },
    staleTime: STALE_TIMES.search,
    retry: isRetryableStrollError,
  });

  return {
    results: search.data ?? [],
    isLoading: search.isFetching,
    isError: search.isError,
    error: search.error ?? null,
  };
}

// ─── useCollectionCollaborators ─────────────────────────────────────────────────
// Backs the Manage Collaborators screen — every status (pending,
// accepted, declined, expired), unlike the accepted-only list
// CollectionModel.collaborators (types/collection.ts) carries for
// display purposes elsewhere.

export interface UseCollectionCollaboratorsResult {
  collaborators: CollaboratorModel[];
  isLoading: boolean;
  isRefetching: boolean;
  isError: boolean;
  refetch: () => void;
}

export function useCollectionCollaborators(collectionId: string | undefined): UseCollectionCollaboratorsResult {
  const query = useQuery<CollaboratorModel[], StrollError>({
    queryKey: queryKeys.collections.collaborators(collectionId ?? ''),
    enabled: !!collectionId,
    queryFn: async () => {
      const result = await getCollectionCollaborators(collectionId!);
      if (!result.ok) throw result.error;

      const models: CollaboratorModel[] = [];
      for (const row of result.data) {
        const model = toCollaboratorModel(row);
        if (model) models.push(model);
      }
      return models;
    },
    staleTime: STALE_TIMES.collaborators,
    retry: isRetryableStrollError,
  });

  return {
    collaborators: query.data ?? [],
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    isError: query.isError,
    refetch: () => {
      void query.refetch();
    },
  };
}

// ─── useMyPendingInvitations ─────────────────────────────────────────────────────
// Backs the Profile screen's Invitations pill (CollectionsRow.tsx) and
// app/(modals)/collection-invitations.tsx's list.

export interface UseMyPendingInvitationsResult {
  invitations: PendingInvitationModel[];
  isLoading: boolean;
  isRefetching: boolean;
  isError: boolean;
  refetch: () => void;
}

export function useMyPendingInvitations(userId: string | undefined): UseMyPendingInvitationsResult {
  const query = useQuery<PendingInvitationModel[], StrollError>({
    queryKey: queryKeys.collections.myInvitations(userId ?? ''),
    enabled: !!userId,
    queryFn: async () => {
      const result = await getMyPendingInvitations(userId!);
      if (!result.ok) throw result.error;

      const models: PendingInvitationModel[] = [];
      for (const row of result.data) {
        const model = toPendingInvitationModel(row);
        if (model) models.push(model);
      }
      return models;
    },
    staleTime: STALE_TIMES.myInvitations,
    retry: isRetryableStrollError,
  });

  return {
    invitations: query.data ?? [],
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    isError: query.isError,
    refetch: () => {
      void query.refetch();
    },
  };
}

// ─── useInviteCollaborators ──────────────────────────────────────────────────────

export function useInviteCollaborators(collectionId: string) {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation<{ invited: string[]; skipped: string[] }, StrollError, string[]>({
    mutationFn: async (userIds) => {
      if (!user) throw makeError('UNAUTHORIZED', NOT_SIGNED_IN_MESSAGE);
      const result = await inviteCollaborators({ collectionId, userIds, invitedBy: user.id });
      if (!result.ok) throw result.error;
      return result.data;
    },

    onSuccess: ({ invited, skipped }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.collections.collaborators(collectionId) });

      if (user) {
        for (const invitedUserId of invited) {
          emitCollectionInvitationSent({ collectionId, invitedUserId, invitedBy: user.id });
        }
      }

      if (invited.length === 1) {
        showToast({ type: 'success', message: 'Invitation sent.' });
      } else if (invited.length > 1) {
        showToast({ type: 'success', message: `${invited.length} invitations sent.` });
      }
      if (skipped.length > 0 && invited.length === 0) {
        showToast({ type: 'info', message: 'Everyone selected is already invited or collaborating.' });
      }
    },

    onError: (error) => {
      logError('useInviteCollaborators', error);
      showToast({ type: 'error', message: normalizeError(error).userMessage });
    },
  });
}

// ─── useCancelInvitation ─────────────────────────────────────────────────────────
// Owner-only — cancels a still-pending invite (requirement #7).

export function useCancelInvitation(collectionId: string) {
  const queryClient = useQueryClient();

  return useMutation<void, StrollError, { collaboratorId: string }>({
    mutationFn: async ({ collaboratorId }) => {
      const result = await cancelInvitation(collaboratorId);
      if (!result.ok) throw result.error;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.collections.collaborators(collectionId) });
      showToast({ type: 'success', message: 'Invitation canceled.' });
    },

    onError: (error) => {
      logError('useCancelInvitation', error);
      showToast({ type: 'error', message: normalizeError(error).userMessage });
    },
  });
}

// ─── useAcceptInvitation / useDeclineInvitation ─────────────────────────────────
// Both take the Collection id alongside the collaborator-row id purely
// to know which caches to invalidate — same shape
// useRemoveExperienceFromCollection takes `collectionId` for. Used by
// both a same-collection-page inline banner (a pending invite for the
// Collection currently being viewed) and the "My Invitations" list
// modal, so neither call site needs collaboration-cache bookkeeping of
// its own.

export function useAcceptInvitation() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation<void, StrollError, { collaboratorId: string; collectionId: string }>({
    mutationFn: async ({ collaboratorId }) => {
      const result = await acceptInvitation(collaboratorId);
      if (!result.ok) throw result.error;
    },

    onSuccess: (_data, { collectionId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.collections.collaborators(collectionId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.collections.detail(collectionId) });
      if (user) {
        queryClient.invalidateQueries({ queryKey: queryKeys.collections.myInvitations(user.id) });
        queryClient.invalidateQueries({ queryKey: queryKeys.collections.byUser(user.id) });
        emitCollectionInvitationAccepted({ collectionId, userId: user.id });
        emitCollectionCollaboratorAdded({ collectionId, userId: user.id });
      }
      showToast({ type: 'success', message: "You're now a collaborator." });
    },

    onError: (error) => {
      logError('useAcceptInvitation', error);
      showToast({ type: 'error', message: normalizeError(error).userMessage });
    },
  });
}

export function useDeclineInvitation() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation<void, StrollError, { collaboratorId: string; collectionId: string }>({
    mutationFn: async ({ collaboratorId }) => {
      const result = await declineInvitation(collaboratorId);
      if (!result.ok) throw result.error;
    },

    onSuccess: (_data, { collectionId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.collections.collaborators(collectionId) });
      if (user) {
        queryClient.invalidateQueries({ queryKey: queryKeys.collections.myInvitations(user.id) });
        emitCollectionInvitationDeclined({ collectionId, userId: user.id });
      }
      showToast({ type: 'info', message: 'Invitation declined.' });
    },

    onError: (error) => {
      logError('useDeclineInvitation', error);
      showToast({ type: 'error', message: normalizeError(error).userMessage });
    },
  });
}

// ─── useRemoveCollaborator ───────────────────────────────────────────────────────
// Owner-only (requirement #7).

export function useRemoveCollaborator(collectionId: string) {
  const queryClient = useQueryClient();

  return useMutation<void, StrollError, { collaboratorId: string; userId: string }>({
    mutationFn: async ({ collaboratorId }) => {
      const result = await removeCollaborator(collaboratorId);
      if (!result.ok) throw result.error;
    },

    onSuccess: (_data, { userId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.collections.collaborators(collectionId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.collections.detail(collectionId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.collections.byUser(userId) });
      emitCollectionCollaboratorRemoved({ collectionId, userId, reason: 'removed_by_owner' });
      showToast({ type: 'success', message: 'Collaborator removed.' });
    },

    onError: (error) => {
      logError('useRemoveCollaborator', error);
      showToast({ type: 'error', message: normalizeError(error).userMessage });
    },
  });
}

// ─── useLeaveCollection ──────────────────────────────────────────────────────────
// A collaborator (not the original creator) leaving on their own
// (requirement #7). Navigation back out of Collection Detail on success
// is the calling screen's responsibility, same as useDeleteCollection.

export function useLeaveCollection(collectionId: string) {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation<void, StrollError, void>({
    mutationFn: async () => {
      if (!user) throw makeError('UNAUTHORIZED', NOT_SIGNED_IN_MESSAGE);
      const result = await leaveCollection(collectionId, user.id);
      if (!result.ok) throw result.error;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.collections.collaborators(collectionId) });
      if (user) {
        queryClient.invalidateQueries({ queryKey: queryKeys.collections.byUser(user.id) });
        emitCollectionCollaboratorRemoved({ collectionId, userId: user.id, reason: 'left' });
      }
      showToast({ type: 'success', message: 'You left the collection.' });
    },

    onError: (error) => {
      logError('useLeaveCollection', error);
      showToast({ type: 'error', message: normalizeError(error).userMessage });
    },
  });
}
