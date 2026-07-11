/**
 * Stroll — Experience Draft Repository
 * src/services/experienceDraftService.ts
 *
 * Sprint 3 Prompt 1 — Experience Creation Foundation, requirement #7
 * ("Draft Repository... The implementation should support future
 * synchronization with Supabase.").
 *
 * Unlike every other file in src/services/ (authService, profileService,
 * placesService, experiencesService — all Supabase-backed), this
 * repository's backing store is the local storage abstraction
 * (src/lib/storage.ts), because Experience Drafts are a local-only
 * concept until a later prompt adds Publish. It's still named and
 * shaped like the rest of this layer — a `*Service.ts` file, pure async
 * functions, no UI/Zustand/navigation, same `{ ok, data } | { ok, error }`
 * Result type every other service returns — specifically so that
 * swapping the backing store for a Supabase `experience_drafts` table
 * later is a change to this file's internals only. No caller (the
 * creation store, the wizard hook) would need to change.
 *
 * One draft per user at a time (requirement #3's "Automatic draft
 * creation" / "Resume draft" describe a single in-progress draft, not a
 * list) — storage is keyed `experienceDraft:${userId}`, not by draft id.
 */

import { storage, STORAGE_KEYS } from '@/lib/storage';
import { normalizeError, makeError, type StrollError } from '@/lib/errors';
import { createEmptyDraft, type ExperienceDraft, type ExperienceDraftPatch } from '@/types/experienceDraft';
import { CREATION_STEPS, FIRST_CREATION_STEP } from '@/constants/experienceCreation';
import { generateLocalId } from '@/utils';

// ─── Result Type ───────────────────────────────────────────────────────────────
// Same shape as ExperiencesResult / ProfileResult / PlacesResult.

export type ExperienceDraftResult<T> = { ok: true; data: T } | { ok: false; error: StrollError };

function ok<T>(data: T): ExperienceDraftResult<T> {
  return { ok: true, data };
}
function fail(err: unknown): ExperienceDraftResult<never> {
  return { ok: false, error: normalizeError(err) };
}

function draftKey(userId: string): string {
  return `${STORAGE_KEYS.experienceDraftPrefix}:${userId}`;
}

// ─── Shape migration ────────────────────────────────────────────────────────────
// A draft written to AsyncStorage before photo/place/story support shipped
// has no `place`/`photos`/`story`/`amountSpent`/`visitType`/`wouldRecommend`/
// `goodForTags`/`vibeTags` keys at all — `storage.get<ExperienceDraft>()`
// just trusts the stored JSON matches the current type, so those fields
// come back `undefined` rather than the empty defaults the rest of the
// app assumes (this is what crashed PhotosStep: `draft.photos.length` on
// an `undefined` `photos`). Every read path (`loadDraft`, and
// `updateDraft`'s read of the existing record before patching) runs the
// stored value through this first, so an old, partially-shaped draft is
// backfilled with the same defaults `createEmptyDraft` would have used
// had it been created today — a one-time, silent, non-destructive
// upgrade, not a new error state the UI needs to handle. Whatever the
// user had already filled in (title/category/currentStep/place/photos/
// story/metadata) is preserved untouched.
//
// The Photos → Compose → Preview redesign also retired the old six-step
// wizard's step ids ('basics', 'category', 'place', 'story' — see
// constants/experienceCreation.ts). A draft saved mid-wizard before that
// redesign shipped can have `currentStep` set to one of those retired
// values, which no longer exists in `CREATION_STEPS` — resuming it would
// otherwise land on a step the UI can't render. Falls back to the first
// step of the new flow ('photos') rather than guessing which new step is
// the "closest" equivalent; the draft's actual field values (title,
// place, photos, story, etc.) are untouched either way, so nothing the
// user already filled in is lost — they just start the resume from the
// top of the new, shorter flow instead of the old, longer one.
function migrateDraft(raw: ExperienceDraft): ExperienceDraft {
  return {
    ...raw,
    currentStep:    CREATION_STEPS.includes(raw.currentStep) ? raw.currentStep : FIRST_CREATION_STEP,
    place:          raw.place          ?? null,
    photos:         raw.photos         ?? [],
    story:          raw.story          ?? '',
    amountSpent:    raw.amountSpent    ?? null,
    visitType:      raw.visitType      ?? null,
    wouldRecommend: raw.wouldRecommend ?? null,
    goodForTags:    raw.goodForTags    ?? [],
    vibeTags:       raw.vibeTags       ?? [],
  };
}

// ─── Load ──────────────────────────────────────────────────────────────────────
// Returns `data: null` (not an error) when the user simply has no draft in
// progress — that's the expected steady state, not a failure.

export async function loadDraft(userId: string): Promise<ExperienceDraftResult<ExperienceDraft | null>> {
  try {
    const draft = await storage.get<ExperienceDraft>(draftKey(userId));
    return ok(draft ? migrateDraft(draft) : null);
  } catch (err) {
    return fail(err);
  }
}

// ─── Create ────────────────────────────────────────────────────────────────────
// Persists an empty draft immediately (rather than waiting for the first
// edit) so "Resume after app restart" is correct even if the user leaves
// before typing anything — the draft, and the fact that creation was
// started, already exist in storage.

export async function createDraft(userId: string): Promise<ExperienceDraftResult<ExperienceDraft>> {
  try {
    const draft = createEmptyDraft(generateLocalId('draft'), userId);
    const wrote = await storage.set(draftKey(userId), draft);
    if (!wrote) {
      return fail(makeError('UNKNOWN', 'Failed to write new draft to local storage.'));
    }
    return ok(draft);
  } catch (err) {
    return fail(err);
  }
}

// ─── Update ────────────────────────────────────────────────────────────────────

export async function updateDraft(
  userId: string,
  patch: ExperienceDraftPatch
): Promise<ExperienceDraftResult<ExperienceDraft>> {
  try {
    const existing = await storage.get<ExperienceDraft>(draftKey(userId));
    if (!existing) {
      return fail(makeError('NOT_FOUND', `No draft in progress for user ${userId}.`));
    }

    const updated: ExperienceDraft = {
      ...migrateDraft(existing),
      ...patch,
      updatedAt: new Date().toISOString(),
    };

    const wrote = await storage.set(draftKey(userId), updated);
    if (!wrote) {
      return fail(makeError('UNKNOWN', 'Failed to save draft to local storage.'));
    }
    return ok(updated);
  } catch (err) {
    return fail(err);
  }
}

// ─── Delete ────────────────────────────────────────────────────────────────────

export async function deleteDraft(userId: string): Promise<ExperienceDraftResult<null>> {
  try {
    const removed = await storage.remove(draftKey(userId));
    if (!removed) {
      return fail(makeError('UNKNOWN', 'Failed to discard draft from local storage.'));
    }
    return ok(null);
  } catch (err) {
    return fail(err);
  }
}