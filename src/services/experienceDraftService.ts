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
 * ── Multiple drafts per user ──
 * A user can now have any number of in-progress drafts at once (this
 * used to be capped at one — see git history for the earlier
 * `experienceDraft:${userId}` single-slot design). Storage is now two
 * layers:
 *   - Each draft is its own record, keyed `experienceDraft:${userId}:${draftId}`.
 *   - A per-user INDEX — a plain `string[]` of draft ids, keyed
 *     `experienceDraftIndex:${userId}` — is what makes "list all of this
 *     user's drafts" possible without scanning every key in storage.
 * `loadAllDrafts` self-heals the index if it ever points at a draft
 * record that no longer exists (e.g. a previous delete that wrote the
 * draft removal but was interrupted before the index update landed) —
 * see its own doc below.
 *
 * ── A draft is only written to storage once it's actually saved ──
 * There is no `createDraft` here anymore. The creation store
 * (experienceCreationStore.ts) builds a brand-new draft's initial value
 * entirely in memory (`createEmptyDraft`, types/experienceDraft.ts) the
 * moment "Create" is opened, and this service is never touched until
 * that draft is actually saved for the first time — either by the
 * debounced auto-save (once the user has made a real change) or by an
 * explicit "Save as Draft" exit. This is deliberate: a user who opens
 * Create and immediately backs out without changing anything should
 * never see a blank "draft" appear in their Drafts tile — see
 * `saveDraft` below, which upserts (creates on first save, overwrites on
 * every save after) rather than requiring a prior `createDraft` call.
 */

import { storage, STORAGE_KEYS } from '@/lib/storage';
import { normalizeError, makeError, type StrollError } from '@/lib/errors';
import type { ExperienceDraft } from '@/types/experienceDraft';
import { CREATION_STEPS, FIRST_CREATION_STEP } from '@/constants/experienceCreation';

// ─── Result Type ───────────────────────────────────────────────────────────────
// Same shape as ExperiencesResult / ProfileResult / PlacesResult.

export type ExperienceDraftResult<T> = { ok: true; data: T } | { ok: false; error: StrollError };

function ok<T>(data: T): ExperienceDraftResult<T> {
  return { ok: true, data };
}
function fail(err: unknown): ExperienceDraftResult<never> {
  return { ok: false, error: normalizeError(err) };
}

function draftKey(userId: string, draftId: string): string {
  return `${STORAGE_KEYS.experienceDraftPrefix}:${userId}:${draftId}`;
}
function indexKey(userId: string): string {
  return `${STORAGE_KEYS.experienceDraftIndexPrefix}:${userId}`;
}

async function readIndex(userId: string): Promise<string[]> {
  return (await storage.get<string[]>(indexKey(userId))) ?? [];
}

// ─── Shape migration ────────────────────────────────────────────────────────────
// A draft written to AsyncStorage before photo/place/story support shipped
// has no `place`/`photos`/`story`/`amountSpent`/`visitType`/`wouldRecommend`/
// `goodForTags`/`vibeTags` keys at all — `storage.get<ExperienceDraft>()`
// just trusts the stored JSON matches the current type, so those fields
// come back `undefined` rather than the empty defaults the rest of the
// app assumes (this is what crashed PhotosStep: `draft.photos.length` on
// an `undefined` `photos`). Every read path (`loadDraft`, `loadAllDrafts`)
// runs the stored value through this first, so an old, partially-shaped
// draft is backfilled with the same defaults `createEmptyDraft` would
// have used had it been created today — a one-time, silent,
// non-destructive upgrade, not a new error state the UI needs to handle.
// Whatever the user had already filled in (title/category/currentStep/
// place/photos/story/metadata) is preserved untouched.
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

// ─── Load (single) ──────────────────────────────────────────────────────────────
// Returns `data: null` (not an error) when the given draft id doesn't
// exist — a legitimate case now (a deep link or stale UI state pointing
// at an already-deleted draft), not just "no draft in progress".

export async function loadDraft(
  userId: string,
  draftId: string,
): Promise<ExperienceDraftResult<ExperienceDraft | null>> {
  try {
    const draft = await storage.get<ExperienceDraft>(draftKey(userId, draftId));
    return ok(draft ? migrateDraft(draft) : null);
  } catch (err) {
    return fail(err);
  }
}

// ─── Load (all) ─────────────────────────────────────────────────────────────────
// Backs the Drafts tile + Drafts modal. Reads the index, then reads every
// draft it names — self-healing the index (rewriting it without any id
// whose record has gone missing) rather than surfacing a gap as an error,
// since a stale index entry is a storage inconsistency the user can't do
// anything about anyway. Sorted most-recently-edited first, so the
// Drafts tile's single-photo preview and the modal's top-of-list entry
// are always the one the user was most recently working on.
export async function loadAllDrafts(userId: string): Promise<ExperienceDraftResult<ExperienceDraft[]>> {
  try {
    const ids = await readIndex(userId);
    if (ids.length === 0) return ok([]);

    const drafts: ExperienceDraft[] = [];
    let staleIndex = false;

    for (const id of ids) {
      const raw = await storage.get<ExperienceDraft>(draftKey(userId, id));
      if (raw) {
        drafts.push(migrateDraft(raw));
      } else {
        staleIndex = true;
      }
    }

    if (staleIndex) {
      await storage.set(indexKey(userId), drafts.map((d) => d.id));
    }

    drafts.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return ok(drafts);
  } catch (err) {
    return fail(err);
  }
}

// ─── Save (upsert) ────────────────────────────────────────────────────────────
// Writes the given draft as-is (the creation store already holds the
// merged, up-to-date `ExperienceDraft` in memory — this is a plain write,
// not a partial-patch merge the way the old single-slot `updateDraft` was).
// Adds the draft's id to the index if it isn't already there — a no-op
// on every save after the first for the same draft. This single function
// covers what used to be two separate `createDraft`/`updateDraft` calls:
// the very first save for a brand-new draft and every save after it are
// the exact same operation now (write the record, ensure the index has
// the id), so there's no "does this draft already exist in storage yet"
// branch for callers to get wrong.
export async function saveDraft(
  userId: string,
  draft: ExperienceDraft,
): Promise<ExperienceDraftResult<ExperienceDraft>> {
  try {
    const wrote = await storage.set(draftKey(userId, draft.id), draft);
    if (!wrote) {
      return fail(makeError('UNKNOWN', 'Failed to save draft to local storage.'));
    }

    const ids = await readIndex(userId);
    if (!ids.includes(draft.id)) {
      const indexWrote = await storage.set(indexKey(userId), [draft.id, ...ids]);
      if (!indexWrote) {
        return fail(makeError('UNKNOWN', 'Failed to save draft to local storage.'));
      }
    }

    return ok(draft);
  } catch (err) {
    return fail(err);
  }
}

// ─── Delete ────────────────────────────────────────────────────────────────────
// Safe to call even for a draft that was never actually written to
// storage (e.g. discarding a brand-new draft that was never saved) —
// `storage.remove` on a key that doesn't exist is a harmless no-op, and
// the id simply won't be found in the index either.

export async function deleteDraft(userId: string, draftId: string): Promise<ExperienceDraftResult<null>> {
  try {
    const removed = await storage.remove(draftKey(userId, draftId));
    if (!removed) {
      return fail(makeError('UNKNOWN', 'Failed to discard draft from local storage.'));
    }

    const ids = await readIndex(userId);
    if (ids.includes(draftId)) {
      const indexWrote = await storage.set(indexKey(userId), ids.filter((id) => id !== draftId));
      if (!indexWrote) {
        return fail(makeError('UNKNOWN', 'Failed to discard draft from local storage.'));
      }
    }

    return ok(null);
  } catch (err) {
    return fail(err);
  }
}
