/**
 * Stroll — Auth Hooks
 * src/hooks/useAuth.ts
 *
 * Thin, composable hooks that expose auth functionality to UI screens.
 * Screens import from here — never from authStore or authService directly.
 *
 * This indirection means:
 *   - Screens stay clean and don't import from multiple layers
 *   - The underlying implementation (store shape, service API) can change
 *     without touching every screen
 *   - Each hook is independently testable
 */

import { useCallback, useState } from 'react';
import { useAuthStore, selectIsAuthenticated, selectUser } from '@/stores/authStore';
import { showToast } from '@/stores/toastStore';
import { VALIDATION } from '@/utils';
import { checkUsernameAvailable } from '@/services/profileService';
import type { StrollError } from '@/lib/errors';

// ─── useAuthState ──────────────────────────────────────────────────────────────
// Read-only view of the current auth state.

export function useAuthState() {
  const status          = useAuthStore((s) => s.status);
  const user            = useAuthStore(selectUser);
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const error           = useAuthStore((s) => s.error);

  return { status, user, isAuthenticated, error };
}

// ─── useSignIn ─────────────────────────────────────────────────────────────────

export interface SignInFormValues {
  email:    string;
  password: string;
}

export interface SignInFormErrors {
  email?:    string;
  password?: string;
}

export function useSignIn() {
  const signIn    = useAuthStore((s) => s.signIn);
  const [loading, setLoading] = useState(false);

  const validate = useCallback((values: SignInFormValues): SignInFormErrors => {
    const errors: SignInFormErrors = {};
    if (!values.email.trim())           errors.email    = 'Email is required.';
    else if (!VALIDATION.isValidEmail(values.email))
                                        errors.email    = 'Enter a valid email address.';
    if (!values.password)               errors.password = 'Password is required.';
    return errors;
  }, []);

  const submit = useCallback(
    async (values: SignInFormValues): Promise<{ ok: boolean }> => {
      setLoading(true);
      try {
        const result = await signIn({
          email:    values.email.trim().toLowerCase(),
          password: values.password,
        });

        if (!result.ok && result.error) {
          showToast({ type: 'error', message: result.error.userMessage });
          return { ok: false };
        }

        return { ok: true };
      } finally {
        setLoading(false);
      }
    },
    [signIn]
  );

  return { submit, validate, loading };
}

// ─── useSignUp ─────────────────────────────────────────────────────────────────

export interface SignUpFormValues {
  displayName: string;
  username:    string;
  email:       string;
  password:    string;
}

export interface SignUpFormErrors {
  displayName?: string;
  username?:    string;
  email?:       string;
  password?:    string;
}

export interface SignUpSubmitResult {
  ok: boolean;
  requiresConfirmation?: boolean;
  /**
   * Set when the failure is attributable to a specific field (taken
   * username, already-registered email) so the screen can show it right
   * under that field instead of — or in addition to — a toast.
   */
  fieldErrors?: SignUpFormErrors;
}

export function useSignUp() {
  const signUp    = useAuthStore((s) => s.signUp);
  const [loading, setLoading] = useState(false);

  const validate = useCallback((values: SignUpFormValues): SignUpFormErrors => {
    const errors: SignUpFormErrors = {};

    if (!VALIDATION.isValidDisplayName(values.displayName))
      errors.displayName = 'Name must be between 1 and 50 characters.';

    if (!values.username.trim())
      errors.username = 'Username is required.';
    else if (!VALIDATION.isValidUsername(values.username))
      errors.username = 'Username must be 3–30 characters, letters, numbers, and underscores only.';

    if (!VALIDATION.isValidEmail(values.email))
      errors.email = 'Enter a valid email address.';

    if (!VALIDATION.isValidPassword(values.password))
      errors.password = 'Password must be at least 8 characters.';

    return errors;
  }, []);

  const submit = useCallback(
    async (values: SignUpFormValues): Promise<SignUpSubmitResult> => {
      setLoading(true);
      try {
        const username = values.username.trim().toLowerCase();

        // Sprint 1 Prompt 4 fix: this is the actual fix for "picked a taken
        // username, got stuck in onboarding with no way back". Username is
        // collected here at sign-up, but the profiles row (where the unique
        // constraint lives) isn't created until the onboarding interests
        // step — so without this check, a taken username sailed straight
        // through account creation and only surfaced as a failure several
        // screens later, on a step with no way to change it. Checking here,
        // before the Supabase Auth account is even created, means a taken
        // username never gets this far.
        const availability = await checkUsernameAvailable(username);
        if (availability.ok && !availability.data) {
          return {
            ok: false,
            fieldErrors: { username: 'This username is already taken. Please choose another.' },
          };
        }

        const result = await signUp({
          email:       values.email.trim().toLowerCase(),
          password:    values.password,
          displayName: values.displayName.trim(),
          username,
        });

        if (!result.ok && result.error) {
          if (result.error.code === 'EMAIL_ALREADY_REGISTERED') {
            return { ok: false, fieldErrors: { email: result.error.userMessage } };
          }
          showToast({ type: 'error', message: result.error.userMessage });
          return { ok: false };
        }

        return { ok: true, requiresConfirmation: result.requiresConfirmation };
      } finally {
        setLoading(false);
      }
    },
    [signUp]
  );

  return { submit, validate, loading };
}

// ─── useSignOut ────────────────────────────────────────────────────────────────

export function useSignOut() {
  const storeSignOut = useAuthStore((s) => s.signOut);
  const [loading, setLoading] = useState(false);

  const signOut = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      await storeSignOut();
      showToast({ type: 'success', message: 'You have been signed out.' });
    } finally {
      setLoading(false);
    }
  }, [storeSignOut]);

  return { signOut, loading };
}

// ─── useForgotPassword ─────────────────────────────────────────────────────────

export function useForgotPassword() {
  const requestReset = useAuthStore((s) => s.requestReset);
  const [loading, setLoading]   = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const validate = useCallback((email: string): string | undefined => {
    if (!email.trim())               return 'Email is required.';
    if (!VALIDATION.isValidEmail(email)) return 'Enter a valid email address.';
    return undefined;
  }, []);

  const submit = useCallback(
    async (email: string): Promise<{ ok: boolean }> => {
      setLoading(true);
      try {
        const result = await requestReset(email.trim().toLowerCase());
        if (!result.ok && result.error) {
          showToast({ type: 'error', message: result.error.userMessage });
          return { ok: false };
        }
        setSubmitted(true);
        return { ok: true };
      } finally {
        setLoading(false);
      }
    },
    [requestReset]
  );

  return { submit, validate, loading, submitted };
}

// ─── useResetPassword ──────────────────────────────────────────────────────────

export function useResetPassword() {
  const storeUpdatePassword = useAuthStore((s) => s.updatePassword);
  const [loading, setLoading] = useState(false);

  const validate = useCallback((password: string, confirm: string): { password?: string; confirm?: string } => {
    const errors: { password?: string; confirm?: string } = {};
    if (!VALIDATION.isValidPassword(password))
      errors.password = 'Password must be at least 8 characters.';
    if (password !== confirm)
      errors.confirm = 'Passwords do not match.';
    return errors;
  }, []);

  const submit = useCallback(
    async (password: string): Promise<{ ok: boolean; error?: StrollError }> => {
      setLoading(true);
      try {
        const result = await storeUpdatePassword(password);
        if (!result.ok && result.error) {
          showToast({ type: 'error', message: result.error.userMessage });
          return { ok: false, error: result.error };
        }
        showToast({ type: 'success', message: 'Password updated successfully.' });
        return { ok: true };
      } finally {
        setLoading(false);
      }
    },
    [storeUpdatePassword]
  );

  return { submit, validate, loading };
}
