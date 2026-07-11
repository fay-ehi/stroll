/**
 * Stroll — Experience Drafts Hook
 * src/hooks/useExperienceDrafts.ts
 *
 * Sprint 3 Prompt 3 — Draft Management (Profile Integration).
 *
 * Backs the Profile screen's Drafts tile (existence/preview) and the
 * Drafts modal (app/(modals)/drafts.tsx) opened from it. Wraps
 * experienceDraftService's local AsyncStorage read in TanStack Query for
 * the same reason queryKeys.ts's `personalization` domain already does
 * this — consistent loading-state/caching/invalidation ergonomics with
 * the rest of the app, not because it's actually a network request.
 *
 * ── One draft, not a list ──
 * experienceDraftService.ts's module doc is explicit: a user has at most
 * one in-progress draft at a time, keyed by their user id, not by a draft
 * id. This hook is a thin, honest reflection of that — `useDraftQuery`
 * resolves to `ExperienceDraft | null`, never an array. The Drafts tile
 * and modal are written to degrade gracefully across that (0 or 1 item),
 * matching the "Instagram/TikTok-style creator grid" this sprint's brief
 * asks for without a schema change to local draft storage the brief never
 * asked for either. See this project's Sprint 3 Prompt 3 end-of-task
 * report for the full architecture-decision writeup.
 *
 * Deliberately its own small file rather than folded into
 * experienceCreationStore.ts / useExperienceCreation.ts: those own the
 * *active editing session* for a draft; this owns *knowing whether one
 * exists*, read from screens (Profile, Drafts modal) that have no
 * business mounting the creation wizard's state just to answer that.
 */

import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryKeys';
import { loadDraft, deleteDraft } from '@/services/experienceDraftService';
import { useExperienceCreationStore } from '@/stores/experienceCreationStore';
import { showToast } from '@/stores/toastStore';
import { normalizeError, logError } from '@/lib/errors';
import type { ExperienceDraft } from '@/types/experienceDraft';
import type { StrollError } from '@/lib/errors';

const STALE_TIME = 30 * 1000;

// ─── useDraftQuery ──────────────────────────────────────────────────────────────

export interface UseDraftQueryResult {
  draft: ExperienceDraft | null;
  isLoading: boolean;
  isError: boolean;
  error: StrollError | null;
}

export function useDraftQuery(userId: string | undefined): UseDraftQueryResult {
  const query = useQuery<ExperienceDraft | null, StrollError>({
    queryKey: queryKeys.drafts.mine(userId ?? ''),
    queryFn: async () => {
      const result = await loadDraft(userId!);
      if (!result.ok) throw result.error;
      return result.data;
    },
    enabled: !!userId,
    staleTime: STALE_TIME,
  });

  return {
    draft: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}

// ─── useDeleteDraftMutation ───────────────────────────────────────────────────

export interface UseDeleteDraftResult {
  deleteDraft: () => Promise<boolean>;
  isDeleting: boolean;
}

/**
 * Deleting a draft from the Drafts modal is a plain async action, not a
 * `useMutation` — there's exactly one call site (drafts.tsx), no
 * background/duplicate-submission concerns beyond a simple `isDeleting`
 * flag, and it needs to touch the *creation store* too: if the draft
 * being deleted is the one currently loaded there (the user opened
 * Create, backgrounded the app, then deleted the same draft from
 * Profile), the store must be reset so a stale in-memory draft can't be
 * silently resurrected by autosave the next time Create is opened.
 */
export function useDeleteDraftMutation(userId: string | undefined): UseDeleteDraftResult {
  const queryClient = useQueryClient();
  const resetCreationStore = useExperienceCreationStore((s) => s.reset);
  const storeDraftId = useExperienceCreationStore((s) => s.draft?.id);
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteDraftAction = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;

    setIsDeleting(true);
    try {
      const result = await deleteDraft(userId);
      if (!result.ok) {
        logError('useDeleteDraftMutation', result.error);
        showToast({
          type: 'error',
          message: `We couldn't delete this draft: ${normalizeError(result.error).userMessage}`,
        });
        return false;
      }

      // The creation store may already have this exact draft loaded in
      // memory (see this function's doc above) — drop it so a subsequent
      // autosave can't write it straight back to storage.
      if (storeDraftId) resetCreationStore();

      await queryClient.invalidateQueries({ queryKey: queryKeys.drafts.mine(userId) });
      showToast({ type: 'success', message: 'Draft deleted.' });
      return true;
    } finally {
      setIsDeleting(false);
    }
  }, [userId, storeDraftId, resetCreationStore, queryClient]);

  return { deleteDraft: deleteDraftAction, isDeleting };
}
