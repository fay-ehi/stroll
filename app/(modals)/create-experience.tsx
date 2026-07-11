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
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { router, useNavigation, Redirect } from 'expo-router';
import { AlertTriangle } from 'lucide-react-native';

import { useAuthStore, selectIsAuthenticated } from '@/stores/authStore';
import { useProfile } from '@/hooks/useProfile';
import { ROUTES, TAB_ROUTES } from '@/constants/routes';
import { useExperienceCreation, usePublishExperience } from '@/hooks/useExperienceCreation';
import { showToast } from '@/stores/toastStore';
import { WizardShell } from '@/components/wizard';
import {
  PhotosStep,
  ComposeStep,
  PreviewStep,
} from '@/components/experience-creation';
import { Button, ScreenContainer, FullScreenLoading, EmptyState } from '@/components/ui';
import type { DraftValidationErrors } from '@/types/experienceDraft';
import type { CreationStep } from '@/constants/experienceCreation';

export default function CreateExperienceScreen() {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);

  // (modals) is a sibling of (app), not nested inside it, so it doesn't
  // inherit (app)/_layout.tsx's route guard — mirrors that guard's own
  // pattern (selectIsAuthenticated + Redirect) rather than assuming a
  // signed-out user can never reach this route (e.g. a stale deep link).
  if (!isAuthenticated) {
    return <Redirect href={ROUTES.auth.welcome as never} />;
  }

  return <CreateExperienceWizard />;
}

// ─── Step Copy ────────────────────────────────────────────────────────────────

const STEP_COPY: Record<CreationStep, { title: string; subtitle: string }> = {
  photos: {
    title: 'Add photos',
    subtitle: 'Every experience starts with a photo — add at least one to continue.',
  },
  compose: {
    title: 'Tell people about it',
    subtitle: 'Add the place and a caption — everything else is optional.',
  },
  preview: {
    title: 'Preview',
    subtitle: 'Here\u2019s how your experience will look once published.',
  },
};

function CreateExperienceWizard() {
  const navigation = useNavigation();
  const [attempted, setAttempted] = useState(false);
  const { profile } = useProfile();

  const {
    status,
    draft,
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
  } = useExperienceCreation();

  const { startPublish, isPublishing } = usePublishExperience();

  // Set synchronously, in the same tick as router.back() below, right
  // before we leave for a successfully-started publish — a ref rather
  // than reading `isPublishing` (mutation.isPending) in the listener,
  // because that's React state: it wouldn't necessarily reflect
  // mutation.mutate() having just been called within the very same
  // synchronous handler that also calls router.back() a line later. The
  // `beforeRemove` event fires synchronously off that same call, so a
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

  const confirmExit = useCallback(() => {
    Alert.alert(
      'Save this draft?',
      "You have unsaved changes. You can save your draft and finish later, or discard it.",
      [
        { text: 'Keep Editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => { void handleDiscard(); } },
        { text: 'Save & Exit', onPress: () => { void handleSaveAndExit(); } },
      ]
    );
  }, [handleDiscard, handleSaveAndExit]);

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
  // Guarded on `isLeavingForPublishRef` too — a successful Publish now
  // navigates away immediately (see onPressPublish below), while `dirty`
  // is still true (the draft isn't cleared until the mutation's
  // onSuccess, which hasn't run yet at that point) — without this, our
  // own publish-triggered navigation would trip this exact guard and pop
  // "Save this draft?" over what the user just confirmed with Publish.
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

  // Validates, then leaves for Discover immediately rather than waiting
  // for the upload+publish round trip to finish — see
  // usePublishExperience's doc (useExperienceCreation.ts) for why. The
  // "Publishing…" toast is the only feedback while that continues in the
  // background; the success/failure toast follows once it's actually
  // done, wherever the user has navigated to by then.
  const onPressPublish = useCallback(() => {
    const started = startPublish();
    if (!started) {
      setAttempted(true);
      return;
    }

    isLeavingForPublishRef.current = true;
    showToast({
      type: 'info',
      message: 'Publishing your experience… this can take a moment if you added photos.',
    });
    router.back();
    router.push(TAB_ROUTES.discover as never);
  }, [startPublish]);

  // ── Initial draft loading ───────────────────────────────────────────────

  if (status === 'idle' || status === 'loading') {
    return (
      <ScreenContainer scroll={false}>
        <FullScreenLoading label="Loading your draft…" />
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
          description="We couldn't load your draft. Please try again."
          action={{ label: 'Go back', onPress: () => router.back(), variant: 'secondary' }}
        />
      </ScreenContainer>
    );
  }

  const copy = STEP_COPY[currentStep];

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
            label="Publish"
            variant="primary"
            fullWidth
            disabled={attempted && !canProceed}
            loading={isPublishing}
            onPress={onPressPublish}
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
      {currentStep === 'photos' ? (
        <PhotosStep
          photos={draft.photos}
          isPicking={isPickingPhotos}
          onPickPhotos={() => { void pickPhotos(); }}
          onRemove={(photoId) => { void removePhoto(photoId); }}
          onRetry={(photoId) => { void retryPhotoUpload(photoId); }}
          onMakeCover={makeCoverPhoto}
          onMoveLeft={movePhotoLeft}
          onMoveRight={movePhotoRight}
          error={attempted ? stepErrors.photos : undefined}
        />
      ) : currentStep === 'compose' ? (
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
