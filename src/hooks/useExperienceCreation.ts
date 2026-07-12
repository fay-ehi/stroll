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
 *   - Debounced auto-save — reuses the shared useDebounce hook
 *     (src/hooks/index.ts) rather than a bespoke timer
 *   - Deriving per-step validation from the pure validateDraftStep()
 *     function (types/experienceDraft.ts) so the store never has to keep
 *     a separate "errors" field in sync by hand
 *   - Step navigation guarded by that validation
 *   - Discard / Save-and-exit, both of which navigate back via expo-router
 *   - Place selection, Photo picking/upload/retry/reorder, Story +
 *     optional metadata editing
 *
 * Also exports `usePublishExperience` (extended for Edit) — a SEPARATE
 * hook, not folded into the above, because publishing is a server
 * mutation (TanStack Query's job — see this codebase's state rule:
 * "TanStack Query manages all server state. Zustand manages client/UI
 * state only.") layered on top of the same draft this hook manages, the
 * same way useUpdateProfile is its own hook alongside useProfile in
 * useProfile.ts rather than a method bolted onto one giant hook.
 *
 * ── Edit mode ──
 * Pass an `experienceId` to seed the wizard from an already-published
 * Experience instead of the local create-draft — see
 * experienceCreationStore.ts's `CreationMode` doc for why this is a
 * genuinely separate, in-memory-only session rather than a second kind of
 * local draft. `usePublishExperience` below reads `mode` off the same
 * store and calls `updateExperience` instead of `createExperience` when
 * it's 'edit' — everything else (validation, upload-only-what's-new,
 * duplicate-submission guard) is identical between the two.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuthState } from '@/hooks/useAuth';
import { useDebounce } from '@/hooks';
import { useExperienceDetail } from '@/hooks/useExperienceDetail';
import { useExperienceCreationStore, type CreationStatus, type CreationMode } from '@/stores/experienceCreationStore';
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
import type { ExperienceDetailModel } from '@/types/experience';
import { CREATION_STEPS, creationStepIndex, isLastCreationStep, FIRST_CREATION_STEP, type CreationStep } from '@/constants/experienceCreation';
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
  updateExperience,
} from '@/services/experiencesService';
import {
  trackExperienceDraftStepCompleted,
  trackExperienceDraftDiscarded,
  trackExperiencePublished,
  trackExperienceEditStarted,
  trackExperienceUpdated,
} from '@/lib/analytics';

// ─── Edit-mode seed mapper ────────────────────────────────────────────────────
// Maps an already-published Experience into the exact shape the wizard
// already knows how to render/edit — see experienceCreationStore.ts's
// `initDraftForEdit` doc for why this is built here (a pure, local mapping
// off data useExperienceDetail already fetched) rather than a network call
// of its own. `title` has no published equivalent (see
// types/experienceDraft.ts's module doc) — left blank, same as any other
// optional field with nothing to prefill. Edit-loaded photos are seeded
// directly as `status: 'uploaded'` with no `mediaLibraryAssetId` — they're
// already-remote URLs, not device-gallery picks, so the ph:// resolution
// step (resolveUploadUri below) never applies to them.

function experienceToEditDraft(
  experience: ExperienceDetailModel,
): { draft: ExperienceDraft; originalPhotoUrls: string[] } {
  const photos: ExperienceDraftPhoto[] = experience.photos.map((photo) => ({
    id: generateLocalId('photo'),
    localUri: photo.url,
    remoteUrl: photo.url,
    status: 'uploaded',
  }));

  const now = new Date().toISOString();

  const draft: ExperienceDraft = {
    id: generateLocalId('draft'),
    userId: experience.creator.id,
    title: '',
    categoryId: experience.category?.id ?? null,
    currentStep: FIRST_CREATION_STEP,
    createdAt: now,
    updatedAt: now,
    place: {
      id: experience.place.id,
      name: experience.place.name,
      slug: experience.place.slug,
      city: experience.place.city,
      address: experience.place.address,
      latitude: experience.place.latitude,
      longitude: experience.place.longitude,
      category: experience.place.category?.id ?? null,
      // Not part of PlaceSummary (types/experience.ts) — the collapsed
      // Place row in ComposeStep falls back to PlaceImage's own
      // no-image state, same as any place with no hero image.
      heroImage: null,
    },
    photos,
    story: experience.story,
    amountSpent: experience.amountSpent,
    visitType: experience.visitType,
    wouldRecommend: experience.wouldRecommend,
    goodForTags: experience.goodForTags,
    vibeTags: experience.vibeTags,
  };

  return { draft, originalPhotoUrls: experience.photos.map((p) => p.url) };
}

// ─── Shared Photo Upload Helper ──────────────────────────────────────────────
// Used by both the "add a photo" path below (upload-as-you-pick) and
// `usePublishExperience` (upload-any-still-pending-photo at Publish time,
// covering a retry after a previous failed attempt) — kept as one
// function so the batching/status-update logic isn't duplicated between
// the two call sites (architecture rule: never duplicate logic).
//
// Batched 3-at-a-time via the existing `chunk()` utility rather than one
// `Promise.all` over every photo at once — a full-size, uncompressed
// device photo is a few MB; firing up to MAX_PHOTOS (10) uploads
// simultaneously on a mobile connection is exactly the kind of burst
// that batching avoids.

const PHOTO_UPLOAD_CONCURRENCY = 3;

// A gallery pick's `localUri` is a `ph://` asset-library reference (see
// ExperienceDraftPhoto.mediaLibraryAssetId's doc) — expo-image can render
// that directly, but expo-file-system's `File` (used by
// uploadExperiencePhoto to read the bytes) can't read it. MediaLibrary's
// own `getAssetInfoAsync` is what resolves a `ph://` id to a real,
// readable `file://` path (downloading from iCloud first if needed) —
// the same resolution step Expo apps have always needed before handing a
// gallery pick to a bytes-based upload. Camera captures never set
// `mediaLibraryAssetId`, so this is a no-op for them — `localUri` is
// already a `file://` path there.
async function resolveUploadUri(photo: ExperienceDraftPhoto): Promise<string> {
  if (!photo.mediaLibraryAssetId) return photo.localUri;
  try {
    const info = await MediaLibrary.getAssetInfoAsync(photo.mediaLibraryAssetId);
    return info.localUri ?? photo.localUri;
  } catch {
    // Falls back to the ph:// uri — the upload below will fail the same
    // way it would have without this resolution step, rather than
    // throwing somewhere this function's caller isn't expecting.
    return photo.localUri;
  }
}

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

        const uploadUri = await resolveUploadUri(photo);
        const result = await uploadExperiencePhoto({
          userId:   params.userId,
          draftId:  params.draftId,
          photoId:  photo.id,
          uri:      uploadUri,
        });

        if (result.ok) {
          params.onStatusChange(photo.id, 'uploaded', result.data);
        } else {
          allSucceeded = false;
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
  /** 'edit' when this hook was called with an `experienceId` — see the module doc above. */
  mode: CreationMode;
  /** The published Experience being edited — null in 'create' mode. */
  sourceExperienceId: string | null;
  /** Set only in edit mode, only if fetching the source Experience itself failed (as opposed to a normal creation-store error) — see the screen's own error-state branch. */
  sourceError: StrollError | null;

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
  /** True while a camera capture or a single tapped-in-grid photo is being validated/added — used to disable a tile mid-tap, not a full-screen loading state. */
  isAddingPhoto: boolean;
  /** Tap on a device-library thumbnail in the in-app grid — adds it if not yet selected, removes it if it is. */
  toggleLibraryAsset: (asset: { id?: string; uri: string; width: number; height: number }) => void;
  /** The grid's camera tile — opens the OS camera, then adds the capture the same way a tapped library thumbnail would. */
  captureFromCamera: () => Promise<void>;
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

export function useExperienceCreation(experienceId?: string, draftId?: string): UseExperienceCreationResult {
  const { user } = useAuthState();
  const userId = user?.id;
  const isEditMode = !!experienceId;
  const queryClient = useQueryClient();

  const status  = useExperienceCreationStore((s) => s.status);
  const draft   = useExperienceCreationStore((s) => s.draft);
  const mode    = useExperienceCreationStore((s) => s.mode);
  const sourceExperienceId = useExperienceCreationStore((s) => s.sourceExperienceId);
  const originalPhotoUrls  = useExperienceCreationStore((s) => s.originalPhotoUrls);
  const dirty   = useExperienceCreationStore((s) => s.dirty);
  const saving  = useExperienceCreationStore((s) => s.saving);
  const error   = useExperienceCreationStore((s) => s.error);

  const initDraft         = useExperienceCreationStore((s) => s.initDraft);
  const initDraftForEdit  = useExperienceCreationStore((s) => s.initDraftForEdit);
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
  const resetSession   = useExperienceCreationStore((s) => s.reset);
  const clearError     = useExperienceCreationStore((s) => s.clearError);

  // ── Initial load / resume (create mode) ───────────────────────────────────
  // Invalidates the Drafts tile's query (useExperienceDrafts.ts) once
  // this resolves — covers the "this draft didn't exist in storage yet,
  // saveDraft just wrote it for the first time" case elsewhere in this
  // file; this effect's own invalidate below only matters for the
  // Resume-a-specific-draft path (draftId given), where nothing new was
  // written but the list's "last edited" ordering may have shifted.
  //
  // Re-entry (e.g. this exact effect firing twice, or the screen
  // component being reused by the navigator across two separate
  // presentations of this route) is guarded inside the store's own
  // `initDraft`, not here — see that action's doc in
  // experienceCreationStore.ts for why a plain per-mount ref isn't
  // enough: it would incorrectly no-op a genuine "Resume a different
  // draft" call if the navigator happens to keep the previous screen
  // instance alive instead of unmounting it.

  useEffect(() => {
    if (!userId || isEditMode) return;
    void initDraft(userId, draftId).then(() => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.drafts.list(userId) });
    });
  }, [userId, isEditMode, draftId, initDraft, queryClient]);

  // ── Edit-session seed ──────────────────────────────────────────────────────
  // Reuses useExperienceDetail — the same fetch/cache Experience Details
  // itself uses, so opening Edit is "free" if the creator just came from
  // viewing their own experience, and this seed also warms the query cache
  // that screen reads from. Guarded on the store's own mode/sourceExperienceId
  // (not a ref) so it naturally stays a no-op once seeded, even across the
  // background refetches useExperienceDetail may perform while this screen
  // stays mounted.

  const sourceExperienceQuery = useExperienceDetail(experienceId ?? '');

  useEffect(() => {
    if (!isEditMode || !experienceId) return;
    if (mode === 'edit' && sourceExperienceId === experienceId) return; // already seeded
    if (!sourceExperienceQuery.experience) return;

    const { draft: editDraft, originalPhotoUrls: seedPhotoUrls } = experienceToEditDraft(
      sourceExperienceQuery.experience,
    );
    initDraftForEdit({ experienceId, draft: editDraft, originalPhotoUrls: seedPhotoUrls });
    trackExperienceEditStarted({ experienceId });
  }, [isEditMode, experienceId, sourceExperienceQuery.experience, mode, sourceExperienceId, initDraftForEdit]);

  // ── Auto-save (debounced, create mode only) ───────────────────────────────
  // Debounce the draft's content, not a timer directly — this is exactly
  // the pattern useUsernameCheck (useOnboarding.ts) already uses to avoid
  // firing a request on every keystroke. Skipped entirely in edit mode —
  // there's nothing to persist locally (see CreationMode's doc in
  // experienceCreationStore.ts); saveDraft() already no-ops for 'edit', but
  // there's no reason to even schedule the call.

  const debouncedDraft = useDebounce(draft, TIMEOUTS.AUTOSAVE_DEBOUNCE_MS);

  useEffect(() => {
    if (!userId || !dirty || !debouncedDraft || mode !== 'create') return;
    saveDraft(userId);
    // Only the settled (debounced) value should trigger a save — `dirty`
    // and `saveDraft` are read fresh from the store when this does fire.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedDraft, userId, mode]);

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

  const [isAddingPhoto, setIsAddingPhoto] = useState(false);

  // The reusable core of "add photo(s) to the draft": caps at
  // MAX_PHOTOS, validates each asset (reusing validateAvatarAsset — same
  // size/type rules a photo needs regardless of whether it's an avatar
  // or an experience photo), adds the valid ones to the store, and kicks
  // off their upload in the background. Shared by `toggleLibraryAsset`
  // (tapping an in-grid thumbnail) and `captureFromCamera` (the grid's
  // camera tile) — previously this was all inline in a single
  // `pickPhotos` that also opened expo-image-picker's native multi-select
  // sheet; that sheet is gone (replaced by the in-app grid — see
  // PhotoGridPicker.tsx) but the validate/add/upload logic underneath it
  // is exactly what both new entry points still need.
  const addAssets = useCallback(
    async (pickedAssets: { id?: string; uri: string; width: number; height: number; mimeType?: string; fileSize?: number }[]) => {
      if (!draft || !userId || pickedAssets.length === 0) return;

      const remainingSlots = EXPERIENCE_LIMITS.MAX_PHOTOS - draft.photos.length;
      if (remainingSlots <= 0) {
        showToast({ type: 'info', message: `You can add up to ${EXPERIENCE_LIMITS.MAX_PHOTOS} photos.` });
        return;
      }

      const capped = pickedAssets.slice(0, remainingSlots);
      if (capped.length < pickedAssets.length) {
        showToast({ type: 'info', message: `You can add up to ${EXPERIENCE_LIMITS.MAX_PHOTOS} photos.` });
      }

      const validAssets: typeof capped = [];
      for (const asset of capped) {
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
        mediaLibraryAssetId: asset.id,
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
    },
    [draft, userId, storeAddPhotos, updatePhotoStatus]
  );

  const removePhoto = useCallback(
    async (photoId: string) => {
      if (!draft) return;
      const photo = draft.photos.find((p) => p.id === photoId);
      storeRemovePhoto(photoId);
      // Best-effort — see deleteExperiencePhoto's doc. Fires after the
      // optimistic local removal so the UI never waits on a network
      // round trip just to remove a thumbnail.
      //
      // Skipped for a photo that was already live on the published
      // experience being edited (`originalPhotoUrls` — see
      // experienceCreationStore.ts's `CreationMode` doc): deleting its
      // Storage object right now, before the edit is even saved, would
      // break the still-live published experience the instant "remove"
      // is tapped — even if the user goes on to discard this edit
      // entirely. Those get cleaned up later instead, only once the
      // update actually succeeds — see usePublishExperience's doc.
      if (photo?.status === 'uploaded' && photo.remoteUrl && !originalPhotoUrls.includes(photo.remoteUrl)) {
        void deleteExperiencePhoto(photo.remoteUrl);
      }
    },
    [draft, storeRemovePhoto, originalPhotoUrls]
  );

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

  // Tapping a grid thumbnail toggles it — matches how the asset already
  // reads visually in PhotoGridPicker (dimmed + numbered badge when
  // selected). Matched by `localUri`, since that's exactly the
  // `asset.uri` expo-media-library returned when it was added — there's
  // no separate "library asset id" stored on ExperienceDraftPhoto to
  // look up instead (see that type's doc).
  const toggleLibraryAsset = useCallback(
    (asset: { id?: string; uri: string; width: number; height: number }) => {
      if (!draft) return;
      const existing = draft.photos.find((p) => p.localUri === asset.uri);
      if (existing) {
        void removePhoto(existing.id);
      } else {
        setIsAddingPhoto(true);
        void addAssets([asset]).finally(() => setIsAddingPhoto(false));
      }
    },
    [draft, removePhoto, addAssets]
  );

  const captureFromCamera = useCallback(async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      showToast({ type: 'info', message: 'Camera access is needed to take a photo.' });
      return;
    }

    setIsAddingPhoto(true);
    try {
      const result = await ImagePicker.launchCameraAsync({ quality: IMAGE_CONFIG.COMPRESSION_QUALITY });
      if (result.canceled || result.assets.length === 0) return;

      const asset = result.assets[0]!;
      await addAssets([
        { uri: asset.uri, width: asset.width, height: asset.height, mimeType: asset.mimeType, fileSize: asset.fileSize },
      ]);
    } finally {
      setIsAddingPhoto(false);
    }
  }, [addAssets]);

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
    // Create-mode only — an edit session has nothing local to save (see
    // CreationMode's doc); the screen uses usePublishExperience directly
    // for its edit-mode "Save Changes" instead of this.
    if (userId) {
      const success = await saveDraft(userId);
      if (!success) {
        showToast({ type: 'error', message: "We couldn't save your draft. Please try again." });
        return;
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.drafts.list(userId) });
    }
    // Clears the in-memory session (the draft itself is already safely
    // on disk as of the successful save above) so the NEXT time Create
    // is opened it starts a genuinely new draft, rather than silently
    // reopening this one — multiple drafts can coexist now, so "Create"
    // reopening whatever was last active would make it impossible to
    // ever start a second one. Resuming this specific draft again is
    // still one tap away, from the Drafts tile/modal.
    resetSession();
    router.back();
  }, [userId, saveDraft, resetSession, queryClient]);

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
    //
    // In edit mode, `originalPhotoUrls` are photos that were already live
    // on the published experience before this session started — those are
    // deliberately skipped here even if the user tapped "remove" on one:
    // discarding an edit must never delete something still visible on the
    // published experience. Only photos uploaded fresh during *this*
    // session get cleaned up on discard.
    for (const photo of draft.photos) {
      if (photo.status === 'uploaded' && photo.remoteUrl && !originalPhotoUrls.includes(photo.remoteUrl)) {
        void deleteExperiencePhoto(photo.remoteUrl);
      }
    }

    const success = await discardDraft(userId);
    if (!success) {
      showToast({ type: 'error', message: "We couldn't discard your draft. Please try again." });
      return;
    }
    trackExperienceDraftDiscarded({ draftId: draft.id, step: currentStep });
    void queryClient.invalidateQueries({ queryKey: queryKeys.drafts.list(userId) });
    router.back();
  }, [userId, draft, currentStep, discardDraft, originalPhotoUrls, queryClient]);

  return {
    status,
    draft,
    mode,
    sourceExperienceId,
    sourceError: isEditMode ? (sourceExperienceQuery.error ?? null) : null,
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
    isAddingPhoto,
    toggleLibraryAsset,
    captureFromCamera,
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
 * Discover and the creator Profile grid both pick up the change on their
 * own, and clears the session (local draft in 'create' mode; just the
 * in-memory edit session in 'edit' mode — `discardDraft` already branches
 * on this, see experienceCreationStore.ts).
 * On failure: the draft is left exactly as it was — in 'create' mode,
 * nothing was left half-written server-side either (createExperience's
 * compensating rollback — see that function's doc); in 'edit' mode,
 * updateExperience only ever touches an experience that was already a
 * fully valid published row, so a failure leaves the live experience
 * exactly as it was before Save was pressed. Either way, "try again" is
 * just pressing Publish/Save again.
 *
 * ── Edit mode ──
 * Reads `mode`/`sourceExperienceId`/`originalPhotoUrls` off the same
 * store `useExperienceCreation` seeds via `initDraftForEdit`, and calls
 * `updateExperience` instead of `createExperience` when `mode === 'edit'`.
 * "Upload only newly added media, preserve unchanged media" falls out of
 * the exact same `status !== 'uploaded'` upload-skip logic Create already
 * used — an edit-loaded photo starts out `status: 'uploaded'` (see
 * experienceToEditDraft above), so it's already skipped. What IS new for
 * edit: photos the creator removed that were part of the original
 * published experience need their storage objects cleaned up too, but
 * only once the update actually succeeds — never on mere
 * removal-from-the-list (that already happens, deferred, in
 * handleDiscard above) and never if the edit is discarded instead of
 * saved. Computed as `originalPhotoUrls` minus the final photo URL list,
 * right after a successful update.
 */
export function usePublishExperience(): UsePublishExperienceResult {
  const { user } = useAuthState();
  const userId = user?.id;
  const queryClient = useQueryClient();

  const draft = useExperienceCreationStore((s) => s.draft);
  const mode = useExperienceCreationStore((s) => s.mode);
  const sourceExperienceId = useExperienceCreationStore((s) => s.sourceExperienceId);
  const originalPhotoUrls = useExperienceCreationStore((s) => s.originalPhotoUrls);
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
      // 'pending'/'uploading' when Publish was pressed, covers a clean
      // retry of anything that previously ended 'failed', and (edit mode)
      // covers exactly the newly-added photos, since every edit-loaded
      // photo already starts out 'uploaded' — see this function's own doc
      // above. If this keeps failing, it's almost always a Supabase
      // Storage/RLS setup issue (missing `experience-photos` bucket or
      // insert policy), not an app bug — see uploadExperiencePhoto's doc
      // in experiencesService.ts.
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

      if (mode === 'edit') {
        if (!sourceExperienceId) throw makeError('UNKNOWN', 'No experience to update.');

        const result = await updateExperience({
          experienceId: sourceExperienceId,
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

        // Best-effort cleanup of photos removed during this edit — see
        // this function's module doc above for why this only happens
        // here, after a successful save, and not at removal time.
        const removedUrls = originalPhotoUrls.filter((url) => !photoUrls.includes(url));
        for (const url of removedUrls) void deleteExperiencePhoto(url);

        return result.data;
      }

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
        if (mode === 'edit') {
          trackExperienceUpdated({ experienceId, photoCount: publishedDraft.photos.length });
        } else {
          trackExperiencePublished({
            draftId: publishedDraft.id,
            experienceId,
            placeId: publishedDraft.place?.id ?? '',
            photoCount: publishedDraft.photos.length,
          });
        }
      }

      await queryClient.invalidateQueries({ queryKey: queryKeys.experiences.all() });

      if (userId) {
        await discardDraft(userId);
        void queryClient.invalidateQueries({ queryKey: queryKeys.drafts.list(userId) });
      }

      // Longer than the 3s default — this is the ONLY confirmation the
      // user gets that a several-second background operation actually
      // finished, since (unlike the old flow) they're no longer looking
      // at a screen that visibly changes state on its own.
      showToast({
        type: 'success',
        message: mode === 'edit' ? 'Your changes are saved.' : 'Your experience is live! 🎉',
        duration: 4500,
      });
    },

    onError: (error) => {
      logError('usePublishExperience', error);

      // Longer than the 3s default, and phrased around the one thing the
      // user can actually do about it (reopen Create/Edit — their changes
      // are untouched) rather than just a raw error message, since
      // there's no screen left showing a retry button by the time this
      // fires.
      showToast({
        type: 'error',
        message:
          mode === 'edit'
            ? `We couldn't save your changes: ${normalizeError(error).userMessage} Reopen Edit to try again.`
            : `We couldn't publish: ${normalizeError(error).userMessage} Your draft is saved — reopen Create to try again.`,
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