/**
 * Stroll — Create Experience
 * app/(modals)/create-experience.tsx
 *
 * PRD §8.7 — The most important creation flow. Opened via the center
 * Create button in the bottom navigation.
 *
 * ── Photos → Compose → Preview ──
 * Reshaped from the original six required-feeling screens (Basics →
 * Category → Place → Photos → Story → Preview) into three, matching how
 * Instagram/TikTok's composer actually flows — see
 * constants/experienceCreation.ts for the full redesign rationale:
 *
 *   1. Photos  — the entry point, not step #4. Compulsory (at least one).
 *      Its own full-screen Cancel/New Post/Next header (PhotoGridPicker.tsx)
 *      rather than WizardShell — see that component's doc for why.
 *   2. Compose — everything else on one scrollable screen: the photos
 *      just picked previewed at the top, Place search (compulsory),
 *      an optional Title, a compulsory Caption, and category/tags/
 *      metadata tucked into a collapsed "Add more details" section.
 *   3. Preview — mirrors the final Experience Details page; Publish
 *      lives here.
 *
 * "Add To Collection" is deliberately not a step here — the PRD models
 * it as a modal that appears AFTER an Experience is created, not part of
 * this wizard.
 *
 * All state lives behind useExperienceCreation / usePublishExperience —
 * this file is presentation + navigation-guard wiring only.
 *
 * ── Edit mode ──
 * This exact same screen also handles editing an already-published
 * experience — opened via MODAL_ROUTES.editExperience(id), i.e. this same
 * route with an `?experienceId=` query param, read below via
 * useLocalSearchParams. This must NOT be a separate editing UI: every
 * step component, WizardShell, and the Photos step (PhotoGridPicker,
 * reused unmodified for full media management — add/remove/reorder/
 * change cover) are all reused completely as-is. Only this file's copy,
 * exit-confirmation wording, and post-save navigation branch on mode —
 * see `isEditMode` below.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { router, useNavigation, useLocalSearchParams, Redirect } from 'expo-router';
import { AlertTriangle } from 'lucide-react-native';

import { useAuthStore, selectIsAuthenticated } from '@/stores/authStore';
import { useProfile } from '@/hooks/useProfile';
import { ROUTES, TAB_ROUTES } from '@/constants/routes';
import { useExperienceCreation, usePublishExperience } from '@/hooks/useExperienceCreation';
import { showToast } from '@/stores/toastStore';
import { WizardShell } from '@/components/wizard';
import {
  PhotoGridPicker,
  ComposeStep,
  PreviewStep,
} from '@/components/experience-creation';
import { Button, ScreenContainer, FullScreenLoading, EmptyState } from '@/components/ui';
import type { DraftValidationErrors } from '@/types/experienceDraft';
import type { CreationStep } from '@/constants/experienceCreation';

export default function CreateExperienceScreen() {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const { experienceId: experienceIdParam } = useLocalSearchParams<{ experienceId?: string }>();
  // useLocalSearchParams can hand back an array if a param repeats in the
  // URL — collapses that to the plain string | undefined the rest of this
  // screen (and useExperienceCreation) expects.
  const experienceId = Array.isArray(experienceIdParam) ? experienceIdParam[0] : experienceIdParam;

  // (modals) is a sibling of (app), not nested inside it, so it doesn't
  // inherit (app)/_layout.tsx's route guard — mirrors that guard's own
  // pattern (selectIsAuthenticated + Redirect) rather than assuming a
  // signed-out user can never reach this route (e.g. a stale deep link).
  if (!isAuthenticated) {
    return <Redirect href={ROUTES.auth.welcome as never} />;
  }

  return <CreateExperienceWizard experienceId={experienceId} />;
}

// ─── Step Copy ────────────────────────────────────────────────────────────────
// 'photos' has no entry — PhotoGridPicker.tsx owns its own header, not
// WizardShell, so it never reads this.

function getStepCopy(step: Exclude<CreationStep, 'photos'>, isEditMode: boolean): { title: string; subtitle: string } {
  if (step === 'compose') {
    return isEditMode
      ? { title: 'Edit the details', subtitle: 'Update the place, caption, or anything else about this experience.' }
      : { title: 'Tell people about it', subtitle: 'Add the place and a caption — everything else is optional.' };
  }
  return isEditMode
    ? { title: 'Preview', subtitle: 'Here\u2019s how your changes will look once saved.' }
    : { title: 'Preview', subtitle: 'Here\u2019s how your experience will look once published.' };
}

function CreateExperienceWizard({ experienceId }: { experienceId?: string }) {
  const navigation = useNavigation();
  const [attempted, setAttempted] = useState(false);
  const { profile } = useProfile();
  const isEditMode = !!experienceId;

  const {
    status,
    draft,
    mode,
    sourceExperienceId,
    sourceError,
    currentStep,
    stepIndex,
    stepCount,
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
  } = useExperienceCreation(experienceId);

  const { startPublish, isPublishing } = usePublishExperience();

  // Set synchronously, in the same tick as router.back() below, right
  // before we leave for a successfully-started publish/save — a ref
  // rather than reading `isPublishing` (mutation.isPending) in the
  // listener, because that's React state: it wouldn't necessarily
  // reflect mutation.mutate() having just been called within the very
  // same synchronous handler that also calls router.back() a line later.
  // The `beforeRemove` event fires synchronously off that same call, so a
  // ref (always current, no render lag) is the only thing that's
  // guaranteed to be set in time.
  const isLeavingForPublishRef = useRef(false);
  useEffect(() => {
    setAttempted(false);
  }, [currentStep]);

  // Only surface a field's error before the user has attempted to
  // proceed if it's already been given a value that's actually invalid
  // (e.g. too long) — an empty required field's error stays hidden until
  // either Continue is pressed or the step is left. 'photos' and 'place'
  // have no partial/invalid state (a photo is added or it isn't, a place
  // is selected or it isn't), so — unlike title/story — their errors
  // only ever show once an attempt has actually been made.
  const visibleErrors: DraftValidationErrors = useMemo(() => {
    if (attempted || !draft) return stepErrors;
    const filtered: DraftValidationErrors = {};
    if (stepErrors.title && draft.title.trim().length > 0) filtered.title = stepErrors.title;
    if (stepErrors.story && draft.story.trim().length > 0) filtered.story = stepErrors.story;
    return filtered;
  }, [attempted, stepErrors, draft]);

  // Validates, then leaves immediately rather than waiting for the
  // upload+publish/update round trip to finish — see
  // usePublishExperience's doc (useExperienceCreation.ts) for why. The
  // info toast is the only feedback while that continues in the
  // background; the success/failure toast follows once it's actually
  // done, wherever the user has navigated to by then. Shared between the
  // footer's Publish/Save Changes button and the exit-confirmation
  // dialog's "Save Changes" option (edit mode) — same action either way.
  const commitAndLeave = useCallback(() => {
    const started = startPublish();
    if (!started) {
      setAttempted(true);
      return;
    }

    isLeavingForPublishRef.current = true;
    showToast({
      type: 'info',
      message: isEditMode
        ? 'Saving your changes…'
        : 'Publishing your experience… this can take a moment if you added photos.',
    });
    router.back();
    if (isEditMode && sourceExperienceId) {
      router.push(ROUTES.app.experienceDetail(sourceExperienceId) as never);
    } else {
      router.push(TAB_ROUTES.discover as never);
    }
  }, [startPublish, isEditMode, sourceExperienceId]);

  const confirmExit = useCallback(() => {
    if (isEditMode) {
      Alert.alert(
        'Save changes?',
        "You have unsaved changes. You can save them now, or discard them.",
        [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'Discard Changes', style: 'destructive', onPress: () => { void handleDiscard(); } },
          { text: 'Save Changes', onPress: commitAndLeave },
        ]
      );
      return;
    }

    Alert.alert(
      'Save this draft?',
      "You have unsaved changes. You can save your draft and finish later, or discard it.",
      [
        { text: 'Keep Editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => { void handleDiscard(); } },
        { text: 'Save & Exit', onPress: () => { void handleSaveAndExit(); } },
      ]
    );
  }, [isEditMode, handleDiscard, handleSaveAndExit, commitAndLeave]);

  const handleClose = useCallback(() => {
    if (dirty) {
      confirmExit();
    } else {
      router.back();
    }
  }, [dirty, confirmExit]);

  // Hardware back (Android) and swipe-to-dismiss (iOS) both route through
  // this event before the screen is actually removed — intercepting it
  // here means Requirement #9 (Exit Confirmation) applies no matter how
  // the user tries to leave, not just via the header's close button.
  // Guarded on `isLeavingForPublishRef` too — a successful Publish/Save
  // now navigates away immediately (see commitAndLeave above), while
  // `dirty` is still true (the session isn't cleared until the
  // mutation's onSuccess, which hasn't run yet at that point) — without
  // this, our own navigation would trip this exact guard and pop "Save
  // changes?" over what the user just confirmed.
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!dirty || isLeavingForPublishRef.current) return;
      e.preventDefault();
      confirmExit();
    });
    return unsubscribe;
  }, [navigation, dirty, confirmExit]);

  const onPressContinue = useCallback(() => {
    if (!canProceed) {
      setAttempted(true);
      return;
    }
    handleNext();
  }, [canProceed, handleNext]);

  // ── Initial draft loading ───────────────────────────────────────────────
  // In edit mode, also waits for the source experience to finish fetching
  // AND for the store to have actually seeded from it (`mode === 'edit' &&
  // sourceExperienceId === experienceId`) — guards against a one-tick
  // flash of a stale 'create' session's content if one happened to be
  // loaded already (see useExperienceCreation.ts's edit-seed effect).

  const isSeeded = !isEditMode || (mode === 'edit' && sourceExperienceId === experienceId);

  // Only fatal before the draft has actually loaded — once `isSeeded`,
  // the in-memory draft is authoritative for this session; a later
  // background refetch of the source experience failing (e.g. a
  // transient network blip) shouldn't yank the user out of an
  // already-in-progress edit.
  if (isEditMode && sourceError && !isSeeded) {
    return (
      <ScreenContainer scroll={false}>
        <EmptyState
          icon={AlertTriangle}
          title="Something went wrong"
          description="We couldn't load this experience. Please try again."
          action={{ label: 'Go back', onPress: () => router.back(), variant: 'secondary' }}
        />
      </ScreenContainer>
    );
  }

  if (status === 'idle' || status === 'loading' || !isSeeded) {
    return (
      <ScreenContainer scroll={false}>
        <FullScreenLoading label={isEditMode ? 'Loading your experience…' : 'Loading your draft…'} />
      </ScreenContainer>
    );
  }

  // ── Draft failed to load/create ──────────────────────────────────────────

  if (status === 'error' || !draft) {
    return (
      <ScreenContainer scroll={false}>
        <EmptyState
          icon={AlertTriangle}
          title="Something went wrong"
          description={isEditMode ? "We couldn't load this experience. Please try again." : "We couldn't load your draft. Please try again."}
          action={{ label: 'Go back', onPress: () => router.back(), variant: 'secondary' }}
        />
      </ScreenContainer>
    );
  }

  // ── Photos step — its own full-screen Cancel/New Post/Next header, not
  //    WizardShell (see PhotoGridPicker.tsx's doc for why). Reused as-is
  //    for edit mode too — the same in-app gallery grid doubles as full
  //    media management (add/remove/change cover) for an existing post. ──

  if (currentStep === 'photos') {
    return (
      <PhotoGridPicker
        photos={draft.photos}
        isAddingPhoto={isAddingPhoto}
        onToggleAsset={toggleLibraryAsset}
        onCaptureFromCamera={() => { void captureFromCamera(); }}
        onRemovePhoto={(photoId) => { void removePhoto(photoId); }}
        onRetryPhoto={(photoId) => { void retryPhotoUpload(photoId); }}
        onMakeCover={makeCoverPhoto}
        onCancel={handleClose}
        onNext={onPressContinue}
        canProceed={canProceed}
        error={attempted ? stepErrors.photos : undefined}
      />
    );
  }

  const copy = getStepCopy(currentStep, isEditMode);

  return (
    <WizardShell
      stepIndex={stepIndex}
      stepCount={stepCount}
      title={copy.title}
      subtitle={copy.subtitle}
      showBack={!isFirstStep}
      onBack={handleBack}
      onClose={handleClose}
      saving={saving}
      footer={
        isLastStep ? (
          <Button
            label={isEditMode ? 'Save Changes' : 'Publish'}
            variant="primary"
            fullWidth
            disabled={attempted && !canProceed}
            loading={isPublishing}
            onPress={commitAndLeave}
          />
        ) : (
          <Button
            label="Continue"
            variant="primary"
            fullWidth
            disabled={attempted && !canProceed}
            onPress={onPressContinue}
          />
        )
      }
    >
      {currentStep === 'compose' ? (
        <ComposeStep
          photos={draft.photos}
          onEditPhotos={handleBack}
          categoryId={draft.categoryId}
          onSelectCategory={setCategory}
          cityFilter={profile?.city ?? null}
          place={draft.place}
          onSelectPlace={selectPlace}
          title={draft.title}
          onChangeTitle={updateTitle}
          story={draft.story}
          onChangeStory={updateStory}
          amountSpent={draft.amountSpent}
          onSetAmountSpent={setAmountSpent}
          visitType={draft.visitType}
          onSetVisitType={setVisitType}
          wouldRecommend={draft.wouldRecommend}
          onSetWouldRecommend={setWouldRecommend}
          goodForTags={draft.goodForTags}
          onToggleGoodForTag={toggleGoodForTag}
          vibeTags={draft.vibeTags}
          onToggleVibeTag={toggleVibeTag}
          errors={visibleErrors}
        />
      ) : (
        <PreviewStep draft={draft} />
      )}
    </WizardShell>
  );
}
