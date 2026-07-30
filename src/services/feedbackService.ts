/**
 * Stroll — Feedback Service
 * src/services/feedbackService.ts
 *
 * Sprint 9 Prompt 2 — Help, About & Legal: Send Feedback. Pure async
 * functions — no UI, no Zustand, no navigation. Mirrors the Result-type
 * pattern established in savedService.ts / likesService.ts / every other
 * service file exactly.
 *
 * This is the ONLY file that talks to the `feedback` table directly (see
 * supabase/migrations/sprint9_prompt2_feedback.sql) — screens/hooks go
 * through src/hooks/useFeedback.ts.
 *
 * Deliberately ONE insert function, no list/detail reads — the prompt
 * doc's "do not over-engineer the backend" plus the sprint's own
 * Acceptance Criteria ("Feedback can be submitted") stop at submission.
 * The migration's RLS already allows a user to SELECT their own rows
 * (see that file's own comment) so a future "my submitted feedback"
 * screen is a service function + a hook away, not a schema change.
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '@/lib/supabase';
import { normalizeError, makeError, type StrollError } from '@/lib/errors';

export type FeedbackResult<T> = { ok: true; data: T } | { ok: false; error: StrollError };

function ok<T>(data: T): FeedbackResult<T> {
  return { ok: true, data };
}

function fail(err: unknown): FeedbackResult<never> {
  return { ok: false, error: normalizeError(err) };
}

// ─── Types ─────────────────────────────────────────────────────────────────────

/**
 * Matches the migration's `type` check constraint exactly
 * ('bug' | 'feature' | 'general') — the three categories the prompt doc
 * names ("Bug Reports, Feature Requests, General Feedback").
 */
export type FeedbackType = 'bug' | 'feature' | 'general';

export interface SubmitFeedbackPayload {
  type:    FeedbackType;
  message: string;
}

// ─── Submit Feedback ────────────────────────────────────────────────────────────
// app_version/platform are captured here (not passed in by the caller) —
// they're environment facts the service layer can read itself
// (Constants.expoConfig?.version, Platform.OS), not user input, so
// there's nothing for the Feedback screen's own form state to carry.
// Both are optional columns — if either read fails to resolve to a
// string for any reason, the row still inserts fine without them (see
// the migration: both nullable, never required).

export async function submitFeedback(
  userId: string,
  payload: SubmitFeedbackPayload
): Promise<FeedbackResult<void>> {
  try {
    const message = payload.message.trim();
    if (message.length === 0) {
      return fail(makeError('VALIDATION_ERROR', 'Feedback message is empty at submitFeedback call site.'));
    }

    const { error } = await supabase.from('feedback').insert({
      user_id:     userId,
      type:        payload.type,
      message,
      app_version: Constants.expoConfig?.version ?? null,
      platform:    Platform.OS,
    });

    if (error) return fail(error);
    return ok(undefined);
  } catch (err) {
    return fail(err);
  }
}
