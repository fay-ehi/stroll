/**
 * Stroll — Stores Barrel
 * src/stores/index.ts
 */

export {
  useToastStore,
  showToast,
  hideToast,
  type ToastType,
  type ToastPayload,
} from './toastStore';

export {
  useAuthStore,
  startAuthListener,
  stopAuthListener,
  selectIsAuthenticated,
  selectIsLoading,
  selectUser,
  selectAuthError,
  type AuthStatus,
  type AuthState,
} from './authStore';

export {
  useOnboardingStore,
  type OnboardingData,
} from './onboardingStore';

export {
  useProfileStore,
  selectIsAvatarUploading,
  type AvatarUploadStage,
  type ProfileDraft,
} from './profileStore';

export {
  useExperienceCreationStore,
  type CreationStatus,
  type ExperienceCreationState,
} from './experienceCreationStore';

export {
  useLocationStore,
} from './locationStore';
