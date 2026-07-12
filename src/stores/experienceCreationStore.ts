/**
 * Stroll — Experience Creation Store
 * src/stores/experienceCreationStore.ts
 *
 * Sprint 3 Prompt 1 — Experience Creation Foundation, requirement #8
 * ("Create a dedicated creation store... Manage: Current step, Draft
 * data, Dirty state, Saving state, Validation state.").
 * Sprint 3 Prompt 2 — Experience Media & Publishing extends this with
 * Place selection, Photo management, and Story/Metadata setters. All of
 * it is still pure client/UI state over the local draft — Publishing
 * itself (a real network mutation) deliberately does NOT live here; see
 * `usePublishExperience` in useExperienceCreation.ts and this file's own
 * module doc below for why.
 *
 * Shaped after onboardingStore.ts — the app's other multi-step,
 * locally-resumable flow — rather than profileStore.ts's "UI-only, server
 * state lives in TanStack Query" shape, because a draft has no server
 * counterpart yet (see types/experienceDraft.ts's module doc): the draft
 * IS the source of truth here, not a cache in front of Supabase. Reusing
 * TanStack Query for a value that only ever comes from AsyncStorage would
 * add a caching layer with nothing to invalidate against.
 *
 * "Validation state" (requirement #8) is deliberately NOT stored here as
 * field state — src/types/experienceDraft.ts's `validateDraftStep()` is a
 * pure function of `draft` + `currentStep`, so it's derived on read
 * (see useExperienceCreation.ts) rather than duplicated into the store
 * and kept in sync by hand.
 *
 * ── Why photo upload/publish network calls are NOT actions here ──
 * This store's own architecture note says "Architecture: UI screens →
 * useExperienceCreation (hook) → this store → experienceDraftService →
 * storage.ts" — every action below still only ever talks to
 * experienceDraftService (local AsyncStorage). Uploading a photo or
 * publishing the experience talks to Supabase (experiencesService), and
 * the codebase-wide state rule is explicit: "TanStack Query manages all
 * server state. Zustand manages client/UI state only." So the hook layer
 * (useExperienceCreation.ts) calls experiencesService directly for
 * network work and then calls the plain setters below
 * (updatePhotoStatus, etc.) to reflect the result — the same division of
 * labor useUploadAvatar (useProfile.ts) already uses between itself and
 * profileStore.
 *
 * Architecture: UI screens → useExperienceCreation (hook) → this store → experienceDraftService → storage.ts
 */

import { create } from 'zustand';
import {
  loadDraft,
  saveDraft as persistDraft,
  deleteDraft,
} from '@/services/experienceDraftService';
import type { StrollError } from '@/lib/errors';
import type {
  ExperienceDraft,
  DraftPlaceSummary,
  ExperienceDraftPhoto,
  PhotoUploadStatus,
} from '@/types/experienceDraft';
import { createEmptyDraft } from '@/types/experienceDraft';
import {
  CREATION_STEPS,
  creationStepIndex,
  type CreationStep,
} from '@/constants/experienceCreation';
import { trackExperienceCreationStarted } from '@/lib/analytics';
import type { PlaceCategoryId } from '@/constants/places';
import { EXPERIENCE_LIMITS } from '@/constants/app';
import type { AmountSpent, VisitType, GoodForTag, VibeTag } from '@/constants/app';
import { generateLocalId } from '@/utils';
import { makeError } from '@/lib/errors';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type CreationStatus = 'idle' | 'loading' | 'ready' | 'error';

/**
 * Sprint 3 Prompt 3 — 'create' is everything this store already did
 * (an AsyncStorage-backed draft the user can freely swap between — see
 * experienceDraftService.ts). 'edit' is new: the wizard is reused
 * unmodified (requirement #3: "Do not build a separate editing UI"), but
 * the in-memory `draft` it operates on is seeded from an already-published
 * Experience instead of loaded from/persisted to the local draft slot —
 * editing a published post has nothing to do with the separate
 * "in-progress, unpublished draft" concept the rest of this store models,
 * and must never overwrite or delete that user's real draft-in-progress.
 * See `initDraftForEdit` and the mode-aware branches in `saveDraft` /
 * `discardDraft` below for what that means in practice.
 */
export type CreationMode = 'create' | 'edit';

export interface ExperienceCreationState {
  // ── Loaded draft + wizard progress ──────────────────────────────────────────
  status: CreationStatus;
  draft:  ExperienceDraft | null;
  mode:   CreationMode;
  /** The published Experience being edited — null in 'create' mode. */
  sourceExperienceId: string | null;
  /**
   * Snapshot of the published Experience's photo URLs at the moment
   * editing started — diffed against `draft.photos` at save time so only
   * genuinely-removed photos get cleaned up from Storage, and so a
   * discarded edit never deletes anything still live (see
   * useExperienceCreation.ts's `handleDiscard` / `usePublishExperience`).
   * Always empty in 'create' mode.
   */
  originalPhotoUrls: string[];

  // ── Save lifecycle ──────────────────────────────────────────────────────────
  /** True when in-memory `draft` has changes not yet written to storage. */
  dirty:  boolean;
  /** True while a save (auto or explicit) is in flight. */
  saving: boolean;
  error:  StrollError | null;

  // ── Actions ──────────────────────────────────────────────────────────────────
  /**
   * Starts or resumes a creation session and sets mode: 'create'.
   *   - With no `draftId`: always starts a brand-new, in-memory draft.
   *     Multiple drafts can coexist now, so "Create" no longer
   *     auto-resumes "the" previous in-progress draft the way a
   *     single-draft model did — nothing is written to storage until
   *     this draft is actually saved (see `saveDraft` below).
   *   - With a `draftId`: loads that specific, already-saved draft from
   *     storage — this is how the Drafts tile/modal's "Resume" action
   *     re-enters the wizard on a particular draft.
   */
  initDraft: (userId: string, draftId?: string) => Promise<void>;
  /**
   * Seeds an in-memory-only 'edit' session from an already-published
   * Experience — no AsyncStorage read/write, unlike `initDraft` above (see
   * `CreationMode`'s doc). Synchronous: there's no local storage round
   * trip, just a pure mapping from the already-fetched Experience the
   * caller passes in (see useExperienceCreation.ts, which fetches it via
   * useExperienceDetail). Safe to call more than once with the same
   * experience id — re-entering an edit session that's already loaded
   * this tick is a no-op, mirroring `initDraft`'s own re-entry guard.
   */
  initDraftForEdit: (params: { experienceId: string; draft: ExperienceDraft; originalPhotoUrls: string[] }) => void;

  /** Optional local working label — see types/experienceDraft.ts's module doc. */
  setTitle:    (title: string) => void;
  setCategory: (categoryId: PlaceCategoryId) => void;

  // ── Place ────────────────────────────────────────────────────────────────────
  setPlace: (place: DraftPlaceSummary | null) => void;

  // ── Photos ───────────────────────────────────────────────────────────────────
  /** Appends newly-picked photos, capped at EXPERIENCE_LIMITS.MAX_PHOTOS. Returns how many were actually added (may be fewer than given, if capped). */
  addPhotos: (photos: ExperienceDraftPhoto[]) => number;
  removePhoto: (photoId: string) => void;
  /** Moves a photo to `toIndex`, shifting the rest — index 0 is always the cover (see ExperienceDraftPhoto's doc). */
  movePhoto: (photoId: string, toIndex: number) => void;
  updatePhotoStatus: (photoId: string, status: PhotoUploadStatus, remoteUrl?: string) => void;

  // ── Story (Caption) + Metadata ───────────────────────────────────────────────
  updateStory:        (story: string) => void;
  setAmountSpent:     (value: AmountSpent | null) => void;
  setVisitType:       (value: VisitType | null) => void;
  setWouldRecommend:  (value: boolean | null) => void;
  toggleGoodForTag:   (tag: GoodForTag) => void;
  toggleVibeTag:      (tag: VibeTag) => void;

  goToStep: (step: CreationStep) => void;
  goNext:   () => void;
  goBack:   () => void;

  /** Debounced auto-save AND the explicit "Save draft" exit action both call this. Returns false only on a real failure — a no-op (nothing dirty) still resolves true. */
  saveDraft:    (userId: string) => Promise<boolean>;
  /** Deletes the draft from storage and resets the store. */
  discardDraft: (userId: string) => Promise<boolean>;

  clearError: () => void;
  /** Clears in-memory state only (e.g. on sign-out) — does NOT touch storage; use discardDraft for that. */
  reset: () => void;
}

// ─── Initial State ─────────────────────────────────────────────────────────────

const INITIAL_STATE: Pick<
  ExperienceCreationState,
  'status' | 'draft' | 'mode' | 'sourceExperienceId' | 'originalPhotoUrls' | 'dirty' | 'saving' | 'error'
> = {
  status: 'idle',
  draft:  null,
  mode:   'create',
  sourceExperienceId: null,
  originalPhotoUrls:  [],
  dirty:  false,
  saving: false,
  error:  null,
};

// ─── Store ─────────────────────────────────────────────────────────────────────

export const useExperienceCreationStore = create<ExperienceCreationState>((set, get) => ({
  ...INITIAL_STATE,

  initDraft: async (userId, draftId) => {
    // Resuming a draft that's already the one loaded — a no-op, so
    // reopening the same in-progress session doesn't flash a loading
    // state over content that's already current. Deliberately does NOT
    // guard the "start a brand-new draft" path (draftId undefined) at
    // all — every call with no draftId must actually create a fresh
    // draft, even if this is the same screen component instance the
    // navigator happens to be reusing from an earlier Create session
    // (React Navigation does not always fully unmount/remount a screen
    // between separate presentations of the same route) — see this
    // action's own interface doc above.
    if (draftId) {
      const current = get();
      if (current.status === 'ready' && current.mode === 'create' && current.draft?.id === draftId) {
        return;
      }
    }

    set({ status: 'loading', error: null, mode: 'create', sourceExperienceId: null, originalPhotoUrls: [] });

    if (draftId) {
      const result = await loadDraft(userId, draftId);
      if (!result.ok) {
        set({ status: 'error', error: result.error });
        return;
      }
      if (!result.data) {
        set({
          status: 'error',
          error: makeError('NOT_FOUND', "This draft couldn't be found — it may have already been deleted."),
        });
        return;
      }
      set({ status: 'ready', draft: result.data, dirty: false });
      return;
    }

    // No specific draft requested — always start a brand-new, in-memory
    // draft (see this action's doc above). Nothing is persisted yet;
    // `saveDraft` below writes it to storage the first time it's
    // actually saved.
    const draft = createEmptyDraft(generateLocalId('draft'), userId);
    trackExperienceCreationStarted({ draftId: draft.id });
    set({ status: 'ready', draft, dirty: false });
  },

  initDraftForEdit: ({ experienceId, draft, originalPhotoUrls }) => {
    // Already loaded this exact edit session this tick — see initDraft's
    // identical re-entry guard above.
    const current = get();
    if (current.status === 'ready' && current.mode === 'edit' && current.sourceExperienceId === experienceId) {
      return;
    }

    set({
      status: 'ready',
      draft,
      mode: 'edit',
      sourceExperienceId: experienceId,
      originalPhotoUrls,
      dirty: false,
      saving: false,
      error: null,
    });
  },

  setTitle: (title) => {
    set((s) => (s.draft ? { draft: { ...s.draft, title }, dirty: true } : s));
  },

  setCategory: (categoryId) => {
    set((s) => (s.draft ? { draft: { ...s.draft, categoryId }, dirty: true } : s));
  },

  // ── Place ────────────────────────────────────────────────────────────────────

  setPlace: (place) => {
    set((s) => (s.draft ? { draft: { ...s.draft, place }, dirty: true } : s));
  },

  // ── Photos ───────────────────────────────────────────────────────────────────

  addPhotos: (photos) => {
    const { draft } = get();
    if (!draft) return 0;

    const remainingSlots = EXPERIENCE_LIMITS.MAX_PHOTOS - draft.photos.length;
    if (remainingSlots <= 0) return 0;

    const toAdd = photos.slice(0, remainingSlots);
    set({ draft: { ...draft, photos: [...draft.photos, ...toAdd] }, dirty: true });
    return toAdd.length;
  },

  removePhoto: (photoId) => {
    set((s) =>
      s.draft
        ? { draft: { ...s.draft, photos: s.draft.photos.filter((p) => p.id !== photoId) }, dirty: true }
        : s
    );
  },

  movePhoto: (photoId, toIndex) => {
    set((s) => {
      if (!s.draft) return s;
      const photos = [...s.draft.photos];
      const fromIndex = photos.findIndex((p) => p.id === photoId);
      if (fromIndex === -1) return s;

      const clampedIndex = Math.max(0, Math.min(toIndex, photos.length - 1));
      const [moved] = photos.splice(fromIndex, 1);
      if (!moved) return s;
      photos.splice(clampedIndex, 0, moved);

      return { draft: { ...s.draft, photos }, dirty: true };
    });
  },

  updatePhotoStatus: (photoId, status, remoteUrl) => {
    set((s) =>
      s.draft
        ? {
            draft: {
              ...s.draft,
              photos: s.draft.photos.map((p) =>
                p.id === photoId
                  ? { ...p, status, remoteUrl: remoteUrl ?? (status === 'uploaded' ? p.remoteUrl : null) }
                  : p
              ),
            },
            dirty: true,
          }
        : s
    );
  },

  // ── Story + Metadata ─────────────────────────────────────────────────────────

  updateStory: (story) => {
    set((s) => (s.draft ? { draft: { ...s.draft, story }, dirty: true } : s));
  },

  setAmountSpent: (value) => {
    set((s) => (s.draft ? { draft: { ...s.draft, amountSpent: value }, dirty: true } : s));
  },

  setVisitType: (value) => {
    set((s) => (s.draft ? { draft: { ...s.draft, visitType: value }, dirty: true } : s));
  },

  setWouldRecommend: (value) => {
    set((s) => {
      if (!s.draft) return s;
      // Tapping the already-selected option deselects it — both fields
      // are optional (PRD §8.7), so "no opinion" must stay reachable,
      // not just "yes"/"no".
      const next = s.draft.wouldRecommend === value ? null : value;
      return { draft: { ...s.draft, wouldRecommend: next }, dirty: true };
    });
  },

  toggleGoodForTag: (tag) => {
    set((s) => {
      if (!s.draft) return s;
      const has = s.draft.goodForTags.includes(tag);
      const goodForTags = has
        ? s.draft.goodForTags.filter((t) => t !== tag)
        : [...s.draft.goodForTags, tag];
      return { draft: { ...s.draft, goodForTags }, dirty: true };
    });
  },

  toggleVibeTag: (tag) => {
    set((s) => {
      if (!s.draft) return s;
      const has = s.draft.vibeTags.includes(tag);
      const vibeTags = has ? s.draft.vibeTags.filter((t) => t !== tag) : [...s.draft.vibeTags, tag];
      return { draft: { ...s.draft, vibeTags }, dirty: true };
    });
  },

  // ── Navigation ───────────────────────────────────────────────────────────────

  goToStep: (step) => {
    set((s) => (s.draft ? { draft: { ...s.draft, currentStep: step }, dirty: true } : s));
  },

  goNext: () => {
    const { draft } = get();
    if (!draft) return;
    const next = CREATION_STEPS[creationStepIndex(draft.currentStep) + 1];
    if (!next) return;

    set({ draft: { ...draft, currentStep: next }, dirty: true });
  },

  goBack: () => {
    const { draft } = get();
    if (!draft) return;
    const prev = CREATION_STEPS[creationStepIndex(draft.currentStep) - 1];
    if (!prev) return;
    set({ draft: { ...draft, currentStep: prev }, dirty: true });
  },

  saveDraft: async (userId) => {
    const { draft, dirty, mode } = get();
    if (!draft || !dirty) return true;

    // Edit sessions are in-memory only — there is nothing on local
    // storage to write to (see CreationMode's doc above). "Saving" an
    // edit means publishing the update to Supabase, which is
    // usePublishExperience's job (useExperienceCreation.ts), not this
    // store's. `dirty` deliberately stays true here — it's still exactly
    // correct as "there are unsaved changes" for the exit-confirmation
    // flow, which is the only other thing that reads it.
    if (mode === 'edit') return true;

    set({ saving: true, error: null });
    try {
      const updated: ExperienceDraft = { ...draft, updatedAt: new Date().toISOString() };
      // Upsert — see experienceDraftService.ts's `saveDraft` doc. This is
      // the exact same call whether this is this draft's very first save
      // (nothing in storage for it yet) or its hundredth.
      const result = await persistDraft(userId, updated);

      if (!result.ok) {
        set({ error: result.error });
        return false;
      }

      set({ draft: result.data, dirty: false });
      return true;
    } finally {
      set({ saving: false });
    }
  },

  discardDraft: async (userId) => {
    // Edit sessions never wrote to local draft storage in the first
    // place (see CreationMode's doc) — "discard" just means dropping the
    // in-memory changes, never a call to deleteDraft(). That resetting to
    // INITIAL_STATE below already accomplishes, for both modes — same
    // reason `reset()` exists at all.
    const { draft, mode } = get();
    if (mode === 'edit') {
      set({ ...INITIAL_STATE });
      return true;
    }

    set({ saving: true, error: null });
    try {
      // Safe even if this draft was never actually saved to storage
      // (e.g. discarding a brand-new draft the user never edited) —
      // deleteDraft is a harmless no-op for an id storage doesn't
      // recognize (see its own doc in experienceDraftService.ts).
      if (draft) {
        const result = await deleteDraft(userId, draft.id);
        if (!result.ok) {
          set({ error: result.error });
          return false;
        }
      }
      set({ ...INITIAL_STATE });
      return true;
    } finally {
      set({ saving: false });
    }
  },

  clearError: () => set({ error: null }),

  reset: () => set({ ...INITIAL_STATE }),
}));
