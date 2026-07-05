/**
 * Stroll — Onboarding Hook
 * src/hooks/useOnboarding.ts
 *
 * Exposes:
 *   useOnboardingGuard  — determines whether onboarding should be shown
 *   useUsernameCheck    — debounced username availability checking
 *
 * Sprint 1 Prompt 3 note: this file used to also export `useProfileLoader`,
 * a raw (non-cached) profile fetch used for screens that "need existing
 * profile data". It had no consumers yet and is now superseded by
 * `useProfile()` in `@/hooks/useProfile` — the profile domain's single
 * source of truth, backed by TanStack Query caching/retry/invalidation.
 * Use that instead on any new screen.
 */

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { storage, STORAGE_KEYS } from '@/lib/storage';
import { getProfile, checkUsernameAvailable } from '@/services/profileService';
import { useDebounce } from '@/hooks';
import { VALIDATION } from '@/utils';
import { TIMEOUTS } from '@/constants/app';
import type { Profile } from '@/services/profileService';

// ─── useOnboardingGuard ────────────────────────────────────────────────────────

export type OnboardingGuardStatus =
  | 'loading'
  | 'show_onboarding'
  | 'onboarding_complete';

/**
 * Determines whether the authenticated user needs to complete onboarding.
 *
 * Check order:
 *   1. Local AsyncStorage flag (fastest — avoids a network call on every launch)
 *   2. Supabase profile.onboarding_complete (source of truth)
 *
 * Returns 'loading' until the check resolves, then either
 * 'show_onboarding' or 'onboarding_complete'.
 */
export function useOnboardingGuard(): {
  status:  OnboardingGuardStatus;
  profile: Profile | null;
} {
  const user = useAuthStore((s) => s.user);
  const [status,  setStatus]  = useState<OnboardingGuardStatus>('loading');
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    async function check() {
      // 1. Check local flag first for speed.
      const localDone = await storage.get<boolean>(STORAGE_KEYS.onboardingComplete);
      if (localDone && !cancelled) {
        setStatus('onboarding_complete');
        return;
      }

      // 2. Check Supabase profile.
      const result = await getProfile(user!.id);

      if (cancelled) return;

      if (!result.ok || result.data === null) {
        // No profile yet — new user, show onboarding.
        setStatus('show_onboarding');
        return;
      }

      const p = result.data;
      setProfile(p);

      if (p.onboarding_complete) {
        // Sync local flag so future launches skip the network call.
        await storage.set(STORAGE_KEYS.onboardingComplete, true);
        setStatus('onboarding_complete');
      } else {
        setStatus('show_onboarding');
      }
    }

    check();
    return () => { cancelled = true; };
  }, [user]);

  return { status, profile };
}

// ─── useUsernameCheck ─────────────────────────────────────────────────────────

export type UsernameCheckState =
  | 'idle'
  | 'checking'
  | 'available'
  | 'taken'
  | 'invalid';

/**
 * Debounced username availability checker.
 * Validates format first, then checks Supabase.
 *
 * Usage:
 *   const { state, message } = useUsernameCheck(usernameInput);
 */
export function useUsernameCheck(username: string): {
  state:   UsernameCheckState;
  message: string | undefined;
} {
  const debounced = useDebounce(username.trim(), TIMEOUTS.SEARCH_DEBOUNCE_MS);
  const [state,   setState]   = useState<UsernameCheckState>('idle');
  const [message, setMessage] = useState<string | undefined>();

  useEffect(() => {
    if (!debounced) {
      setState('idle');
      setMessage(undefined);
      return;
    }

    if (!VALIDATION.isValidUsername(debounced)) {
      setState('invalid');
      setMessage('3–30 characters, letters, numbers, and underscores only.');
      return;
    }

    let cancelled = false;
    setState('checking');
    setMessage(undefined);

    checkUsernameAvailable(debounced).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setState('idle');
        setMessage(undefined);
        return;
      }
      if (result.data) {
        setState('available');
        setMessage('Username is available.');
      } else {
        setState('taken');
        setMessage('This username is already taken.');
      }
    });

    return () => { cancelled = true; };
  }, [debounced]);

  return { state, message };
}
