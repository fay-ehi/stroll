/**
 * Stroll — Experience Creation Hook
 * src/hooks/useExperienceCreation.ts
 *
 * The only thing app/(modals)/create-experience.tsx and the step
 * components (src/components/experience-creation) should talk to.
 * Screens never import experienceCreationStore or experienceDraftService
 * directly — same indirection useAuth.ts already establishes for the
 * auth domain, for the same reason (implementation can change shape
 * without touching every call site).
 *
 * Owns:
 *   - Kicking off initDraft() on mount (Resume / Automatic draft creation)
 *   - Debounced auto-save (requirement #10) — reuses the shared
 *     useDebounce hook (src/hooks/index.ts) rather than a bespoke timer
 *   - Deriving per-step validation from the pure validateDraftStep()
 *     function (types/experienceDraft.ts) so the store never has to keep
 *     a separate "errors" field in sync by hand
 *   - Step navigation guarded by that validation
 *   - Discard / Save-and-exit, both of which navigate back via expo-router
 *   - Sprint 3 Prompt 2: Place selection, Photo picking/upload/retry/
 *     reorder, Story + optional metadata editing
 *
 * Also exports `usePublishExperience` (Sprint 3 Prompt 2) — a SEPARATE
 * hook, not folded into the above, because publishing is a server
 * mutation (TanStack Query's job — see this codebase's state rule:
 * "TanStack Query manages all server state. Zustand manages client/UI
 * state only.") layered on top of the same draft this hook manages, the
 * same way useUpdateProfile is its own hook alongside useProfile in
 * useProfile.ts rather than a method bolted onto one giant hook.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuthState } from '@/hooks/useAuth';
import { useDebounce } from '@/hooks';
import { useExperienceCreationStore, type CreationStatus } from '@/stores/experienceCreationStore';
import { showToast } from '@/stores/toastStore';
import {
  validateDraftStep,
  validateForPublish,
  hasValidationErrors,
  type ExperienceDraft,
  type DraftValidationErrors,
  type DraftPlaceSummary,
  type ExperienceDraftPhoto,
  type PhotoUploadStatus,
} from '@/types/experienceDraft';
import { validateAvatarAsset } from '@/types/profile';
import { CREATION_STEPS, creationStepIndex, isLastCreationStep, type CreationStep } from '@/constants/experienceCreation';
import { TIMEOUTS, EXPERIENCE_LIMITS, IMAGE_CONFIG } from '@/constants/app';
import type { PlaceCategoryId } from '@/constants/places';
import type { AmountSpent, VisitType, GoodForTag, VibeTag } from '@/constants/app';
import type { StrollError } from '@/lib/errors';
import { makeError, normalizeError, logError } from '@/lib/errors';
import { queryKeys } from '@/lib/queryKeys';
import { generateLocalId, chunk } from '@/utils';
import {
  uploadExperiencePhoto,
  deleteExperiencePhoto,
  createExperience,
} from '@/services/experiencesService';
import {
  trackExperienceDraftStepCompleted,
  trackExperienceDraftDiscarded,
  trackExperiencePublished,
} from '@/lib/analytics';

// ─── Shared Photo Upload Helper ──────────────────────────────────────────────
// Used by both `pickPhotos` (upload-as-you-pick, in this hook) and
// `usePublishExperience` (upload-any-still-pending-photo at Publish time,
// covering a retry after a previous failed attempt) — kept as one
// function so the batching/status-update logic isn't duplicated between
// the two call sites (architecture rule: never duplicate logic).
//
// Batched 3-at-a-time via the existing `chunk()` utility (requirement
// #11 "Upload batching") rather than one `Promise.all` over every photo
// at once — a full-size, uncompressed device photo is a few MB; firing
// up to MAX_PHOTOS (10) uploads simultaneously on a mobile connection is
// exactly the kind of burst this requirement is about avoiding.

const PHOTO_UPLOAD_CONCURRENCY = 3;

async function uploadDraftPhotos(params: {
  userId: string;
  draftId: string;
  photos: ExperienceDraftPhoto[];
  onStatusChange: (photoId: string, status: PhotoUploadStatus, remoteUrl?: string) => void;
}): Promise<boolean> {
  let allSucceeded = true;

  const batches = chunk(params.photos, PHOTO_UPLOAD_CONCURRENCY);
  for (const batch of batches) {
    await Promise.all(
      batch.map(async (photo) => {
        params.onStatusChange(photo.id, 'uploading');

        const result = await uploadExperiencePhoto({
          userId:   params.userId,
          draftId:  params.draftId,
          photoId:  photo.id,
          uri:      photo.localUri,
        });

        if (result.ok) {
          params.onStatusChange(photo.id, 'uploaded', result.data);
        } else {
          allSucceeded = false;
          // The toast the caller shows is deliberately generic (Design
          // System §35 — no raw backend errors in user-facing copy), so
          // this is the ONLY place the real cause (e.g. "Bucket not
          // found", an RLS policy violation, a network failure) is
          // visible at all. Check the Metro/console output for this
          // `[Error: uploadExperiencePhoto]` line when a photo fails.
          logError('uploadExperiencePhoto', result.error);
          params.onStatusChange(photo.id, 'failed');
        }
      })
    );
  }

  return allSucceeded;
}

// ─── useExperienceCreation ──────────────────────────────────────────────────────

export interface UseExperienceCreationResult {
  status: CreationStatus;
  draft: ExperienceDraft | null;

  currentStep: CreationStep;
  stepIndex: number;
  stepCount: number;
  isFirstStep: boolean;
  isLastStep: boolean;

  dirty: boolean;
  saving: boolean;
  stepErrors: DraftValidationErrors;
  canProceed: boolean;

  // ── Title / Category ─────────────────────────────────────────────────────────
  updateTitle: (title: string) => void;
  setCategory: (categoryId: PlaceCategoryId) => void;

  // ── Place ────────────────────────────────────────────────────────────────────
  selectPlace: (place: DraftPlaceSummary) => void;

  // ── Photos ───────────────────────────────────────────────────────────────────
  isPickingPhotos: boolean;
  pickPhotos: () => Promise<void>;
  retryPhotoUpload: (photoId: string) => Promise<void>;
  removePhoto: (photoId: string) => Promise<void>;
  /** Moves a photo to the front of the list — position 0 is always the cover (see ExperienceDraftPhoto's doc). */
  makeCoverPhoto: (photoId: string) => void;
  movePhotoLeft: (photoId: string) => void;
  movePhotoRight: (photoId: string) => void;

  // ── Story (Caption) + Metadata ───────────────────────────────────────────────
  updateStory: (story: string) => void;
  setAmountSpent: (value: AmountSpent | null) => void;
  setVisitType: (value: VisitType | null) => void;
  setWouldRecommend: (value: boolean | null) => void;
  toggleGoodForTag: (tag: GoodForTag) => void;
  toggleVibeTag: (tag: VibeTag) => void;

  handleNext: () => void;
  handleBack: () => void;

  /** For the exit-confirmation prompt (requirement #9). */
  handleSaveAndExit: () => Promise<void>;
  handleDiscard: () => Promise<void>;

  clearError: () => void;
  error: StrollError | null;
}

export function useExperienceCreation(): UseExperienceCreationResult {
  const { user } = useAuthState();
  const userId = user?.id;

  const status  = useExperienceCreationStore((s) => s.status);
  const draft   = useExperienceCreationStore((s) => s.draft);
  const dirty   = useExperienceCreationStore((s) => s.dirty);
  const saving  = useExperienceCreationStore((s) => s.saving);
  const error   = useExperienceCreationStore((s) => s.error);

  const initDraft         = useExperienceCreationStore((s) => s.initDraft);
  const storeSetTitle     = useExperienceCreationStore((s) => s.setTitle);
  const storeSetCategory  = useExperienceCreationStore((s) => s.setCategory);
  const storeSetPlace     = useExperienceCreationStore((s) => s.setPlace);
  const storeAddPhotos    = useExperienceCreationStore((s) => s.addPhotos);
  const storeRemovePhoto  = useExperienceCreationStore((s) => s.removePhoto);
  const storeMovePhoto    = useExperienceCreationStore((s) => s.movePhoto);
  const updatePhotoStatus = useExperienceCreationStore((s) => s.updatePhotoStatus);
  const storeUpdateStory  = useExperienceCreationStore((s) => s.updateStory);
  const storeSetAmountSpent    = useExperienceCreationStore((s) => s.setAmountSpent);
  const storeSetVisitType      = useExperienceCreationStore((s) => s.setVisitType);
  const storeSetWouldRecommend = useExperienceCreationStore((s) => s.setWouldRecommend);
  const storeToggleGoodForTag  = useExperienceCreationStore((s) => s.toggleGoodForTag);
  const storeToggleVibeTag     = useExperienceCreationStore((s) => s.toggleVibeTag);
  const goNext        = useExperienceCreationStore((s) => s.goNext);
  const goBack         = useExperienceCreationStore((s) => s.goBack);
  const saveDraft      = useExperienceCreationStore((s) => s.saveDraft);
  const discardDraft   = useExperienceCreationStore((s) => s.discardDraft);
  const clearError     = useExperienceCreationStore((s) => s.clearError);

  const [isPickingPhotos, setIsPickingPhotos] = useState(false);

  // ── Initial load / resume ─────────────────────────────────────────────────

  useEffect(() => {
    if (!userId) return;
    initDraft(userId);
  }, [userId, initDraft]);

  // ── Auto-save (debounced) ─────────────────────────────────────────────────
  // Debounce the draft's content, not a timer directly — this is exactly
  // the pattern useUsernameCheck (useOnboarding.ts) already uses to avoid
  // firing a request on every keystroke.

  const debouncedDraft = useDebounce(draft, TIMEOUTS.AUTOSAVE_DEBOUNCE_MS);

  useEffect(() => {
    if (!userId || !dirty || !debouncedDraft) return;
    saveDraft(userId);
    // Only the settled (debounced) value should trigger a save — `dirty`
    // and `saveDraft` are read fresh from the store when this does fire.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedDraft, userId]);

  // ── Derived: step + validation ────────────────────────────────────────────

  const currentStep = draft?.currentStep ?? CREATION_STEPS[0]!;
  const stepIndex    = creationStepIndex(currentStep);
  const isFirstStep  = stepIndex === 0;
  const isLastStep   = isLastCreationStep(currentStep);

  const stepErrors = useMemo(
    () => (draft ? validateDraftStep(currentStep, draft) : {}),
    [draft, currentStep]
  );
  const canProceed = !hasValidationErrors(stepErrors);

  // ── Field updates: Title / Category ─────────────────────────────────────────

  const updateTitle = useCallback(
    (title: string) => storeSetTitle(title),
    [storeSetTitle]
  );
  const setCategory = useCallback(
    (categoryId: PlaceCategoryId) => storeSetCategory(categoryId),
    [storeSetCategory]
  );

  // ── Place ────────────────────────────────────────────────────────────────────

  const selectPlace = useCallback(
    (place: DraftPlaceSummary) => storeSetPlace(place),
    [storeSetPlace]
  );

  // ── Photos ───────────────────────────────────────────────────────────────────

  const pickPhotos = useCallback(async () => {
    if (!draft || !userId) return;

    const remainingSlots = EXPERIENCE_LIMITS.MAX_PHOTOS - draft.photos.length;
    if (remainingSlots <= 0) {
      showToast({ type: 'info', message: `You can add up to ${EXPERIENCE_LIMITS.MAX_PHOTOS} photos.` });
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showToast({ type: 'info', message: 'Photo access is needed to add pictures to your experience.' });
      return;
    }

    setIsPickingPhotos(true);
    try {
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: remainingSlots,
        quality: IMAGE_CONFIG.COMPRESSION_QUALITY,
      });

      if (picked.canceled || picked.assets.length === 0) return;

      const validAssets: typeof picked.assets = [];
      for (const asset of picked.assets) {
        const validation = validateAvatarAsset({
          uri: asset.uri,
          mimeType: asset.mimeType,
          fileSize: asset.fileSize,
        });
        if (validation.valid) {
          validAssets.push(asset);
        } else {
          showToast({ type: 'error', message: validation.message ?? 'One of those photos could not be used.' });
        }
      }
      if (validAssets.length === 0) return;

      const newPhotos: ExperienceDraftPhoto[] = validAssets.map((asset) => ({
        id: generateLocalId('photo'),
        localUri: asset.uri,
        remoteUrl: null,
        status: 'pending',
        width: asset.width,
        height: asset.height,
      }));

      const addedCount = storeAddPhotos(newPhotos);
      const added = newPhotos.slice(0, addedCount);
      if (added.length === 0) return;

      void uploadDraftPhotos({
        userId,
        draftId: draft.id,
        photos: added,
        onStatusChange: updatePhotoStatus,
      }).then((allSucceeded) => {
        if (!allSucceeded) {
          showToast({ type: 'error', message: 'Some photos failed to upload. Tap a photo to retry.' });
        }
      });
    } finally {
      setIsPickingPhotos(false);
    }
  }, [draft, userId, storeAddPhotos, updatePhotoStatus]);

  const retryPhotoUpload = useCallback(
    async (photoId: string) => {
      if (!draft || !userId) return;
      const photo = draft.photos.find((p) => p.id === photoId);
      if (!photo) return;

      await uploadDraftPhotos({
        userId,
        draftId: draft.id,
        photos: [photo],
        onStatusChange: updatePhotoStatus,
      });
    },
    [draft, userId, updatePhotoStatus]
  );

  const removePhoto = useCallback(
    async (photoId: string) => {
      if (!draft) return;
      const photo = draft.photos.find((p) => p.id === photoId);
      storeRemovePhoto(photoId);
      // Best-effort — see deleteExperiencePhoto's doc. Fires after the
      // optimistic local removal so the UI never waits on a network
      // round trip just to remove a thumbnail.
      if (photo?.status === 'uploaded' && photo.remoteUrl) {
        void deleteExperiencePhoto(photo.remoteUrl);
      }
    },
    [draft, storeRemovePhoto]
  );

  const makeCoverPhoto = useCallback(
    (photoId: string) => storeMovePhoto(photoId, 0),
    [storeMovePhoto]
  );

  const movePhotoLeft = useCallback(
    (photoId: string) => {
      if (!draft) return;
      const index = draft.photos.findIndex((p) => p.id === photoId);
      if (index <= 0) return;
      storeMovePhoto(photoId, index - 1);
    },
    [draft, storeMovePhoto]
  );

  const movePhotoRight = useCallback(
    (photoId: string) => {
      if (!draft) return;
      const index = draft.photos.findIndex((p) => p.id === photoId);
      if (index === -1 || index >= draft.photos.length - 1) return;
      storeMovePhoto(photoId, index + 1);
    },
    [draft, storeMovePhoto]
  );

  // ── Story + Metadata ─────────────────────────────────────────────────────────

  const updateStory = useCallback((story: string) => storeUpdateStory(story), [storeUpdateStory]);
  const setAmountSpent = useCallback(
    (value: AmountSpent | null) => storeSetAmountSpent(value),
    [storeSetAmountSpent]
  );
  const setVisitType = useCallback(
    (value: VisitType | null) => storeSetVisitType(value),
    [storeSetVisitType]
  );
  const setWouldRecommend = useCallback(
    (value: boolean | null) => storeSetWouldRecommend(value),
    [storeSetWouldRecommend]
  );
  const toggleGoodForTag = useCallback(
    (tag: GoodForTag) => storeToggleGoodForTag(tag),
    [storeToggleGoodForTag]
  );
  const toggleVibeTag = useCallback((tag: VibeTag) => storeToggleVibeTag(tag), [storeToggleVibeTag]);

  // ── Navigation ─────────────────────────────────────────────────────────────
  // No more "isLastStep saves and exits" special case (Sprint 3 Prompt 1
  // had one, with a "Publishing is coming in a future update" toast) —
  // Publishing is now real (see usePublishExperience below). The last
  // step ('preview') renders a Publish action instead of a "Continue"
  // button — see app/(modals)/create-experience.tsx — so handleNext no
  // longer needs to special-case it at all.

  const handleNext = useCallback(() => {
    if (!canProceed || !draft) return;
    trackExperienceDraftStepCompleted({ draftId: draft.id, step: currentStep });
    goNext();
  }, [canProceed, draft, currentStep, goNext]);

  const handleBack = useCallback(() => {
    goBack();
  }, [goBack]);

  // ── Exit ─────────────────────────────────────────────────────────────────

  const handleSaveAndExit = useCallback(async () => {
    if (userId) {
      const success = await saveDraft(userId);
      if (!success) {
        showToast({ type: 'error', message: "We couldn't save your draft. Please try again." });
        return;
      }
    }
    router.back();
  }, [userId, saveDraft]);

  const handleDiscard = useCallback(async () => {
    if (!userId || !draft) {
      router.back();
      return;
    }

    // Best-effort cleanup of anything already uploaded — otherwise a
    // discarded draft leaves orphaned files in EXPERIENCE_BUCKET forever
    // (see deleteExperiencePhoto's doc). Fired before the draft record
    // itself is deleted, but not awaited-per-photo in a way that blocks
    // the discard — a slow/failed cleanup call shouldn't stop the user
    // from leaving.
    for (const photo of draft.photos) {
      if (photo.status === 'uploaded' && photo.remoteUrl) {
        void deleteExperiencePhoto(photo.remoteUrl);
      }
    }

    const success = await discardDraft(userId);
    if (!success) {
      showToast({ type: 'error', message: "We couldn't discard your draft. Please try again." });
      return;
    }
    trackExperienceDraftDiscarded({ draftId: draft.id, step: currentStep });
    router.back();
  }, [userId, draft, currentStep, discardDraft]);

  return {
    status,
    draft,
    currentStep,
    stepIndex,
    stepCount: CREATION_STEPS.length,
    isFirstStep,
    isLastStep,
    dirty,
    saving,
    stepErrors,
    canProceed,
    updateTitle,
    setCategory,
    selectPlace,
    isPickingPhotos,
    pickPhotos,
    retryPhotoUpload,
    removePhoto,
    makeCoverPhoto,
    movePhotoLeft,
    movePhotoRight,
    updateStory,
    setAmountSpent,
    setVisitType,
    setWouldRecommend,
    toggleGoodForTag,
    toggleVibeTag,
    handleNext,
    handleBack,
    handleSaveAndExit,
    handleDiscard,
    clearError,
    error,
  };
}

// ─── usePublishExperience (Sprint 3 Prompt 2) ────────────────────────────────────

export interface UsePublishExperienceResult {
  /**
   * Validates the draft synchronously and, if valid, starts the publish
   * mutation running in the background and returns `true`. Returns
   * `false` (without starting anything, and without a toast — the caller
   * owns surfacing that via `attempted`/inline errors, same as every
   * other step) if a required field is missing.
   *
   * Deliberately does NOT wait for the network call, and does NOT
   * navigate anywhere itself — see the doc below for why that's now the
   * caller's job (app/(modals)/create-experience.tsx), not this hook's.
   */
  startPublish: () => boolean;
  isPublishing: boolean;
}

/**
 * Wraps the whole Publish flow in one TanStack `useMutation` — requirement
 * #7's "Prevent duplicate submissions" is exactly what `mutation.isPending`
 * (checked defensively inside `startPublish` itself) already guarantees; a
 * second call while one is in flight is a no-op rather than a second
 * network request.
 *
 * ── Why this no longer navigates on success/failure ──
 * The original version kept the user on the wizard, showing a spinner on
 * the Publish button, until the whole upload+insert round trip finished —
 * then navigated to the new Experience's page. In practice, a slow or
 * flaky photo upload made that spinner run long enough that a failure's
 * error toast (3 seconds, per toastStore.ts's Design System §36 spec)
 * came and went while the user was watching the button, not the toast —
 * indistinguishable, from their side, from nothing happening at all.
 *
 * This now matches how the rest of the app already treats slow
 * background work (e.g. auto-save): `startPublish()` validates
 * synchronously, and if valid, the CALLER (the screen) leaves for
 * Discover immediately — the upload/insert continues after that,
 * completely decoupled from whether the wizard screen is still mounted
 * (the mutation and the toast store are both global, not screen-scoped).
 * `onSuccess`/`onError` below only show a toast — they don't navigate,
 * because by the time either fires the user is already elsewhere.
 *
 * On success: invalidates every `experiences.*` query (Discover feed,
 * featured carousel, this user's own gallery — see queryKeys.ts's own
 * doc: invalidating the `['experiences']` prefix covers all of them) so
 * Discover picks up the new post on its own, and clears the local draft.
 * On failure: the draft is left exactly as it was (createExperience's
 * compensating-rollback means nothing was left half-written server-side
 * either — see that function's doc in experiencesService.ts) — reopening
 * Create resumes it automatically (requirement #3's Resume), so "try
 * again" is just tapping Create.
 */
export function usePublishExperience(): UsePublishExperienceResult {
  const { user } = useAuthState();
  const userId = user?.id;
  const queryClient = useQueryClient();

  const draft = useExperienceCreationStore((s) => s.draft);
  const updatePhotoStatus = useExperienceCreationStore((s) => s.updatePhotoStatus);
  const discardDraft = useExperienceCreationStore((s) => s.discardDraft);

  const mutation = useMutation<string, StrollError, void>({
    mutationFn: async () => {
      if (!userId) throw makeError('UNAUTHORIZED', 'Please sign in to continue.');
      if (!draft) throw makeError('UNKNOWN', 'No draft in progress.');

      // Re-checked here too (startPublish already checked it once,
      // synchronously, before this mutation was even started) — the same
      // "never trust the client-side check alone right before the
      // network call" reasoning validateForPublish's own doc lays out.
      const errors = validateForPublish(draft);
      if (hasValidationErrors(errors)) {
        const firstMessage = Object.values(errors).find((m) => m !== undefined);
        throw makeError('VALIDATION_ERROR', firstMessage ?? 'Please complete the required fields before publishing.');
      }

      // Upload anything not already uploaded — covers a photo still
      // 'pending'/'uploading' when Publish was pressed, and covers a
      // clean retry of anything that previously ended 'failed'. If this
      // keeps failing, it's almost always a Supabase Storage/RLS setup
      // issue (missing `experience-photos` bucket or insert policy),
      // not an app bug — see uploadExperiencePhoto's doc in
      // experiencesService.ts.
      const notYetUploaded = draft.photos.filter((p) => p.status !== 'uploaded');
      if (notYetUploaded.length > 0) {
        await uploadDraftPhotos({
          userId,
          draftId: draft.id,
          photos: notYetUploaded,
          onStatusChange: updatePhotoStatus,
        });
      }

      // Read the freshest photo list — the uploads above already wrote
      // their outcome into the store; the `draft` this closure captured
      // is from whenever the mutation started, so re-read rather than
      // trust it's still current.
      const freshPhotos = useExperienceCreationStore.getState().draft?.photos ?? draft.photos;

      if (freshPhotos.some((p) => p.status === 'failed')) {
        throw makeError(
          'SERVER_ERROR',
          'Some photos failed to upload. Reopen Create to remove or retry them before publishing.'
        );
      }

      const photoUrls = freshPhotos
        .filter((p) => p.remoteUrl !== null)
        .map((p) => p.remoteUrl as string);

      const place = draft.place;
      if (!place) throw makeError('VALIDATION_ERROR', 'Choose a place before publishing.');

      const result = await createExperience({
        userId,
        placeId: place.id,
        city: place.city,
        story: draft.story.trim(),
        amountSpent: draft.amountSpent,
        visitType: draft.visitType,
        wouldRecommend: draft.wouldRecommend,
        goodForTags: draft.goodForTags,
        vibeTags: draft.vibeTags,
        photoUrls,
      });

      if (!result.ok) throw result.error;
      return result.data;
    },

    onSuccess: async (experienceId) => {
      const publishedDraft = draft;
      if (publishedDraft) {
        trackExperiencePublished({
          draftId: publishedDraft.id,
          experienceId,
          placeId: publishedDraft.place?.id ?? '',
          photoCount: publishedDraft.photos.length,
        });
      }

      await queryClient.invalidateQueries({ queryKey: queryKeys.experiences.all() });

      if (userId) await discardDraft(userId);

      // Longer than the 3s default — this is the ONLY confirmation the
      // user gets that a several-second background operation actually
      // finished, since (unlike the old flow) they're no longer looking
      // at a screen that visibly changes state on its own.
      showToast({ type: 'success', message: 'Your experience is live! 🎉', duration: 4500 });
    },

    onError: (error) => {
      logError('usePublishExperience', error);

      // Longer than the 3s default, and phrased around the one thing the
      // user can actually do about it (reopen Create — their draft is
      // untouched) rather than just a raw error message, since there's
      // no screen left showing a retry button by the time this fires.
      showToast({
        type: 'error',
        message: `We couldn't publish: ${normalizeError(error).userMessage} Your draft is saved — reopen Create to try again.`,
        duration: 6000,
      });
    },
  });

  const startPublish = useCallback((): boolean => {
    if (mutation.isPending || !draft) return false;

    const errors = validateForPublish(draft);
    if (hasValidationErrors(errors)) return false;

    mutation.mutate();
    return true;
  }, [draft, mutation]);

  return { startPublish, isPublishing: mutation.isPending };
}
