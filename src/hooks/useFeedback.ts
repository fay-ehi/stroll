/**
 * Stroll — Feedback Hook
 * src/hooks/useFeedback.ts
 *
 * Sprint 9 Prompt 2 — Help, About & Legal: Send Feedback.
 * Same "UI → hooks → services → Supabase" layering as useSettings.ts,
 * and the same non-optimistic useMutation shape as useUpdateUsername
 * there (a submission that can fail server-side shouldn't flash success
 * before it's confirmed).
 */

import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { useNetworkStatus } from '@/hooks';
import { showToast } from '@/stores/toastStore';
import type { StrollError, ErrorCode } from '@/lib/errors';
import {
  submitFeedback,
  type FeedbackType,
  type SubmitFeedbackPayload,
} from '@/services/feedbackService';

// ─── Shared Helpers ─────────────────────────────────────────────────────────────
// Same shape as useProfile.ts's / useSettings.ts's own module-private
// buildStrollError — see useSettings.ts's doc for why this is a small
// local copy rather than a shared cross-file export.

function buildStrollError(code: ErrorCode, message: string): StrollError {
  return { code, devMessage: message, userMessage: message, isRetryable: code === 'NETWORK_ERROR' };
}

const OFFLINE_MESSAGE = "You're offline. Connect to the internet and try again.";
const NOT_SIGNED_IN_MESSAGE = 'Please sign in to continue.';

/** Matches the migration's `char_length(message) <= 1000` check constraint — the Feedback screen's own character counter reads this too, so the client-visible limit and the database's are the same number in one place. */
export const FEEDBACK_MESSAGE_MAX_LENGTH = 1000;

export const FEEDBACK_TYPE_LABELS: Record<FeedbackType, string> = {
  bug:     'Bug Report',
  feature: 'Feature Request',
  general: 'General Feedback',
};

// ─── useSubmitFeedback ──────────────────────────────────────────────────────────

export function useSubmitFeedback() {
  const user = useAuthStore((s) => s.user);
  const { isConnected } = useNetworkStatus();

  return useMutation<void, StrollError, SubmitFeedbackPayload>({
    mutationFn: async (payload) => {
      if (!user) throw buildStrollError('UNAUTHORIZED', NOT_SIGNED_IN_MESSAGE);
      if (!isConnected) throw buildStrollError('NETWORK_ERROR', OFFLINE_MESSAGE);

      const message = payload.message.trim();
      if (message.length === 0) {
        throw buildStrollError('VALIDATION_ERROR', 'Please enter your feedback before sending.');
      }
      if (message.length > FEEDBACK_MESSAGE_MAX_LENGTH) {
        throw buildStrollError(
          'VALIDATION_ERROR',
          `Feedback must be ${FEEDBACK_MESSAGE_MAX_LENGTH} characters or fewer.`
        );
      }

      const result = await submitFeedback(user.id, { ...payload, message });
      if (!result.ok) throw result.error;
    },

    onError: (error) => {
      showToast({ type: 'error', message: error.userMessage });
    },

    onSuccess: () => {
      // No cache to update — nothing in this app reads feedback back yet
      // (see feedbackService.ts's module doc). The Feedback screen itself
      // owns the visible "success state" the prompt doc asks for (a
      // confirmation view swapped in after this resolves, not a toast
      // alone) — see app/(app)/feedback.tsx.
      showToast({ type: 'success', message: 'Thanks for the feedback!' });
    },
  });
}
