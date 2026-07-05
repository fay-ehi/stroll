/**
 * Stroll — Onboarding Store
 * src/stores/onboardingStore.ts
 *
 * Manages state across all onboarding steps.
 * Persists progress to AsyncStorage so onboarding can be resumed
 * if the user backgrounds the app mid-flow.
 *
 * Architecture:
 *   Onboarding screens → useOnboardingStore → profileService → Supabase
 */

import { create } from 'zustand';
import { storage, STORAGE_KEYS } from '@/lib/storage';
import {
  createProfile,
  updateProfile,
  completeOnboarding,
  uploadAvatar,
  type Profile,
} from '@/services/profileService';
import type { StrollError } from '@/lib/errors';
import {
  ONBOARDING_STEPS,
  type OnboardingStep,
} from '@/constants/onboarding';
import { queryClient } from '@/lib/queryClient';
import { queryKeys } from '@/lib/queryKeys';
import { toProfileModel, type ProfileModel } from '@/types/profile';

// Sprint 1 Prompt 3 note: onboarding predates the profile domain and still
// talks to profileService directly (by design — see that file's header).
// The three lines below each call `queryClient.setQueryData(...)` right
// after onboarding successfully writes a profile change. This seeds the
// SAME cache `useProfile()` reads from, so the first time a freshly
// onboarded user opens the Profile tab it renders instantly from cache
// instead of firing a redundant network request for data we already have.

// ─── Cache Helper ──────────────────────────────────────────────────────────────

function seedProfileCache(row: Profile): void {
  queryClient.setQueryData<ProfileModel>(queryKeys.users.me(), toProfileModel(row));
}

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface OnboardingData {
  city:             string | null;
  interests:        string[];
  avatarUri:        string | null;
  avatarMimeType:   string;
  notificationsGranted: boolean | null;
}

interface OnboardingState {
  // ── Progress ────────────────────────────────────────────────────────────────
  currentStep:   OnboardingStep;
  completedSteps: OnboardingStep[];

  // ── Collected data ──────────────────────────────────────────────────────────
  data: OnboardingData;

  // ── Async state ─────────────────────────────────────────────────────────────
  submitting: boolean;
  error:      StrollError | null;

  // ── Profile (set after createProfile succeeds) ──────────────────────────────
  profile: Profile | null;

  // ── Actions ─────────────────────────────────────────────────────────────────
  setCity:        (city: string) => void;
  setInterests:   (interests: string[]) => void;
  setAvatarUri:   (uri: string | null, mimeType?: string) => void;
  setNotifications: (granted: boolean) => void;

  goToStep:       (step: OnboardingStep) => void;
  goToNextStep:   () => void;
  goToPrevStep:   () => void;

  /** Creates the profile row in Supabase with data collected so far. */
  submitProfile:  (userId: string, username: string, displayName: string) => Promise<boolean>;

  /** Saves city + interests to the existing profile. */
  savePreferences: (userId: string) => Promise<boolean>;

  /** Uploads avatar if selected, updates profile. */
  saveAvatar:     (userId: string) => Promise<boolean>;

  /** Marks onboarding complete in Supabase + AsyncStorage. */
  finalize:       (userId: string) => Promise<boolean>;

  clearError:     () => void;
  reset:          () => void;
}

// ─── Initial State ─────────────────────────────────────────────────────────────

const INITIAL_DATA: OnboardingData = {
  city:                 null,
  interests:            [],
  avatarUri:            null,
  avatarMimeType:       'image/jpeg',
  notificationsGranted: null,
};

// ─── Store ─────────────────────────────────────────────────────────────────────

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  currentStep:    ONBOARDING_STEPS[0]!,
  completedSteps: [],
  data:           INITIAL_DATA,
  submitting:     false,
  error:          null,
  profile:        null,

  // ── Setters ─────────────────────────────────────────────────────────────────

  setCity: (city) => {
    set((s) => ({ data: { ...s.data, city } }));
  },

  setInterests: (interests) => {
    set((s) => ({ data: { ...s.data, interests } }));
  },

  setAvatarUri: (uri, mimeType = 'image/jpeg') => {
    set((s) => ({
      data: { ...s.data, avatarUri: uri, avatarMimeType: mimeType },
    }));
  },

  setNotifications: (granted) => {
    set((s) => ({ data: { ...s.data, notificationsGranted: granted } }));
  },

  // ── Navigation ──────────────────────────────────────────────────────────────

  goToStep: (step) => set({ currentStep: step }),

  goToNextStep: () => {
    const { currentStep, completedSteps } = get();
    const idx  = ONBOARDING_STEPS.indexOf(currentStep);
    const next = ONBOARDING_STEPS[idx + 1];
    if (!next) return;

    set({
      completedSteps: completedSteps.includes(currentStep)
        ? completedSteps
        : [...completedSteps, currentStep],
      currentStep: next,
    });
  },

  goToPrevStep: () => {
    const { currentStep } = get();
    const idx  = ONBOARDING_STEPS.indexOf(currentStep);
    const prev = ONBOARDING_STEPS[idx - 1];
    if (!prev) return;
    set({ currentStep: prev });
  },

  // ── Submit Profile ───────────────────────────────────────────────────────────
  // Called after city + interests are collected (before avatar step).

  submitProfile: async (userId, username, displayName) => {
    const { data } = get();
    set({ submitting: true, error: null });

    try {
      const result = await createProfile({
        id:           userId,
        username,
        display_name: displayName,
        city:         data.city ?? undefined,
        interests:    data.interests,
      });

      if (!result.ok) {
        set({ error: result.error });
        return false;
      }

      set({ profile: result.data });
      seedProfileCache(result.data);
      return true;
    } finally {
      set({ submitting: false });
    }
  },

  // ── Save Preferences ─────────────────────────────────────────────────────────

  savePreferences: async (userId) => {
    const { data } = get();
    set({ submitting: true, error: null });

    try {
      const result = await updateProfile(userId, {
        city:      data.city ?? undefined,
        interests: data.interests,
      });

      if (!result.ok) {
        set({ error: result.error });
        return false;
      }

      set({ profile: result.data });
      seedProfileCache(result.data);
      return true;
    } finally {
      set({ submitting: false });
    }
  },

  // ── Save Avatar ──────────────────────────────────────────────────────────────

  saveAvatar: async (userId) => {
    const { data } = get();
    if (!data.avatarUri) return true; // Skipped — that's fine.

    set({ submitting: true, error: null });

    try {
      const uploadResult = await uploadAvatar(
        userId,
        data.avatarUri,
        data.avatarMimeType
      );

      if (!uploadResult.ok) {
        set({ error: uploadResult.error });
        return false;
      }

      const updateResult = await updateProfile(userId, {
        avatar_url: uploadResult.data,
      });

      if (!updateResult.ok) {
        set({ error: updateResult.error });
        return false;
      }

      set({ profile: updateResult.data });
      seedProfileCache(updateResult.data);
      return true;
    } finally {
      set({ submitting: false });
    }
  },

  // ── Finalize ─────────────────────────────────────────────────────────────────

  finalize: async (userId) => {
    set({ submitting: true, error: null });

    try {
      const result = await completeOnboarding(userId);

      if (!result.ok) {
        set({ error: result.error });
        return false;
      }

      // Persist locally so the guard doesn't re-show onboarding on next launch.
      await storage.set(STORAGE_KEYS.onboardingComplete, true);

      // completeOnboarding() only flips the flag server-side and returns
      // void, so patch the cached model in place rather than refetching.
      queryClient.setQueryData<ProfileModel>(queryKeys.users.me(), (old) =>
        old ? { ...old, onboardingCompleted: true } : old
      );

      return true;
    } finally {
      set({ submitting: false });
    }
  },

  // ── Utilities ────────────────────────────────────────────────────────────────

  clearError: () => set({ error: null }),

  reset: () =>
    set({
      currentStep:    ONBOARDING_STEPS[0]!,
      completedSteps: [],
      data:           INITIAL_DATA,
      submitting:     false,
      error:          null,
      profile:        null,
    }),
}));
