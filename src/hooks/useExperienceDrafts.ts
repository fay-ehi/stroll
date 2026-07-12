/**
 * Stroll — Experience Drafts Hook
 * src/hooks/useExperienceDrafts.ts
 *
 * Sprint 3 Prompt 3 — Draft Management (Profile Integration).
 *
 * Backs the Profile screen's Drafts tile (existence/count/preview) and
 * the Drafts modal (app/(modals)/drafts.tsx) opened from it. Wraps
 * experienceDraftService's local AsyncStorage read in TanStack Query for
 * the same reason queryKeys.ts's `personalization` domain already does
 * this — consistent loading-state/caching/invalidation ergonomics with
 * the rest of the app, not because it's actually a network request.
 *
 * ── Any number of drafts ──
 * A user can have any number of in-progress drafts now (this used to be
 * capped at one — see experienceDraftService.ts's module doc for the
 * storage-layout change behind it). `useDraftsQuery` resolves to
 * `ExperienceDraft[]`, sorted most-recently-edited first; the Drafts tile
 * and modal are written to degrade correctly across 0, 1, or many.
 *
 * Deliberately its own small file rather than folded into
 * experienceCreationStore.ts / useExperienceCreation.ts: those own the
 * *active editing session* for a single draft; this owns *knowing which
 * drafts exist*, read from screens (Profile, Drafts modal) that have no
 * business mounting the creation wizard's state just to answer that.
 */

import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryKeys';
import { loadAllDrafts, deleteDraft } from '@/services/experienceDraftService';
import { useExperienceCreationStore } from '@/stores/experienceCreationStore';
import { showToast } from '@/stores/toastStore';
import { normalizeError, logError } from '@/lib/errors';
import type { ExperienceDraft } from '@/types/experienceDraft';
import type { StrollError } from '@/lib/errors';

const STALE_TIME = 30 * 1000;

// ─── useDraftsQuery ─────────────────────────────────────────────────────────────

export interface UseDraftsQueryResult {
  drafts: ExperienceDraft[];
  isLoading: boolean;
  isError: boolean;
  error: StrollError | null;
}

export function useDraftsQuery(userId: string | undefined): UseDraftsQueryResult {
  const query = useQuery<ExperienceDraft[], StrollError>({
    queryKey: queryKeys.drafts.list(userId ?? ''),
    queryFn: async () => {
      const result = await loadAllDrafts(userId!);
      if (!result.ok) throw result.error;
      return result.data;
    },
    enabled: !!userId,
    staleTime: STALE_TIME,
  });

  return {
    drafts: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}

// ─── useDeleteDraftMutation ───────────────────────────────────────────────────

export interface UseDeleteDraftResult {
  deleteDraft: (draftId: string) => Promise<boolean>;
  isDeleting: boolean;
  /** The id of the draft currently mid-delete, if any — lets a specific row show its own spinner instead of every row in the list disabling at once. */
  deletingDraftId: string | null;
}

/**
 * Deleting a draft from the Drafts modal is a plain async action, not a
 * `useMutation` — no background/duplicate-submission concerns beyond a
 * simple `isDeleting` flag, and it needs to touch the *creation store*
 * too: if the draft being deleted is the one currently loaded there (the
 * user opened Create/Resume on it, backgrounded the app, then deleted
 * that same draft from Profile), the store must be reset so a stale
 * in-memory draft can't be silently resurrected by autosave the next
 * time Create is opened.
 */
export function useDeleteDraftMutation(userId: string | undefined): UseDeleteDraftResult {
  const queryClient = useQueryClient();
  const resetCreationStore = useExperienceCreationStore((s) => s.reset);
  const storeDraftId = useExperienceCreationStore((s) => s.draft?.id);
  const [deletingDraftId, setDeletingDraftId] = useState<string | null>(null);

  const deleteDraftAction = useCallback(
    async (draftId: string): Promise<boolean> => {
      if (!userId) return false;

      setDeletingDraftId(draftId);
      try {
        const result = await deleteDraft(userId, draftId);
        if (!result.ok) {
          logError('useDeleteDraftMutation', result.error);
          showToast({
            type: 'error',
            message: `We couldn't delete this draft: ${normalizeError(result.error).userMessage}`,
          });
          return false;
        }

        // The creation store may already have this exact draft loaded in
        // memory (see this function's doc above) — drop it so a
        // subsequent autosave can't write it straight back to storage.
        if (storeDraftId === draftId) resetCreationStore();

        await queryClient.invalidateQueries({ queryKey: queryKeys.drafts.list(userId) });
        showToast({ type: 'success', message: 'Draft deleted.' });
        return true;
      } finally {
        setDeletingDraftId(null);
      }
    },
    [userId, storeDraftId, resetCreationStore, queryClient]
  );

  return { deleteDraft: deleteDraftAction, isDeleting: deletingDraftId !== null, deletingDraftId };
}
