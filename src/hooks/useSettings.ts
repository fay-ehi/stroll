/**
 * Stroll — Settings Hooks
 * src/hooks/useSettings.ts
 *
 * Sprint 9 Prompt 1 — Account Settings.
 *
 * The settings domain's public API, following the same "UI screens →
 * hooks → stores/services → Supabase" rule as useProfile.ts and
 * useAuth.ts, and the same fine-grained-hook style as useProfile.ts
 * (useUpdateProfile / useUploadAvatar / useRemoveAvatar are separate
 * hooks there rather than one combined "useProfileEditor" — this file
 * follows suit).
 *
 * Exposes:
 *   useUsernameAvailability(candidate) — live, debounced "is this taken?"
 *                                         check as the user types (the
 *                                         sprint doc's "Immediate
 *                                         availability checking").
 *   useUpdateUsername()                — commits a new username.
 *   useEmailSettings()                 — validate + submit a new email
 *                                         through Supabase's own secure
 *                                         email-change flow.
 *   useDeleteAccount()                 — the irreversible one.
 *
 * Password intentionally has NO hook here — useResetPassword (already in
 * @/hooks/useAuth, built for the forgot-password flow) does exactly what
 * a logged-in password change needs too: Supabase's `updateUser({password})`
 * only requires a valid session, not the current password, so there's
 * nothing settings-specific to add. The Settings screen imports
 * useResetPassword directly. See that hook's own doc in useAuth.ts.
 *
 * Reserved-username / format checks reuse VALIDATION.isValidUsername and
 * VALIDATION.isReservedUsername (src/utils/index.ts) — the same functions
 * useSignUp already runs at sign-up — so a name blocked here is blocked
 * everywhere else too.
 */

import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { User } from '@supabase/supabase-js';

import { useAuthStore } from '@/stores/authStore';
import { useDebounce, useNetworkStatus } from '@/hooks';
import { queryKeys } from '@/lib/queryKeys';
import { showToast } from '@/stores/toastStore';
import { normalizeError, type StrollError, type ErrorCode } from '@/lib/errors';
import { VALIDATION } from '@/utils';
import { RESERVED_USERNAMES, TIMEOUTS } from '@/constants/app';
import {
  checkUsernameAvailable,
  updateUsername as updateUsernameService,
} from '@/services/profileService';
import { toProfileModel, type ProfileModel } from '@/types/profile';

// ─── Shared Helpers ─────────────────────────────────────────────────────────────
// Same shape/spirit as useProfile.ts's own module-private buildStrollError —
// kept as a separate copy here rather than exported from useProfile.ts, since
// this is the only other file that needs it and importing a "private helper"
// across hook files would blur which file owns it.

function buildStrollError(code: ErrorCode, message: string): StrollError {
  return { code, devMessage: message, userMessage: message, isRetryable: code === 'NETWORK_ERROR' };
}

const OFFLINE_MESSAGE = "You're offline. Connect to the internet and try again.";
const NOT_SIGNED_IN_MESSAGE = 'Please sign in to continue.';

// ─── useUsernameAvailability ────────────────────────────────────────────────────
// Purely for as-you-type feedback under the Username field. Does NOT gate
// Save by itself — useUpdateUsername re-validates + re-checks
// availability right before writing regardless of what this hook last
// reported, closing the race where a user types a name, waits for
// "Available", then the debounce fires one more time on an unrelated
// re-render before they tap Save.

export type UsernameAvailabilityStatus =
  | 'idle'       // Empty, or unchanged from the current username.
  | 'invalid'    // Fails format rules — no need to hit the network.
  | 'checking'   // Debounce settled, request in flight.
  | 'available'
  | 'taken'
  | 'reserved';

export interface UsernameAvailabilityResult {
  status:  UsernameAvailabilityStatus;
  /** Friendly copy for TextInput's errorText (taken/reserved/invalid) — undefined when status is idle/checking/available (checking and available both render via `success`/no-error, handled by the caller). */
  message?: string;
}

/**
 * @param candidate       The raw text currently in the username field.
 * @param currentUsername The signed-in user's EXISTING username — so
 *                         re-typing it back out (or just changing its
 *                         casing) reads as "idle", not "taken".
 */
export function useUsernameAvailability(
  candidate: string,
  currentUsername: string | undefined
): UsernameAvailabilityResult {
  const user = useAuthStore((s) => s.user);
  const [checking, setChecking] = useState(false);
  const [remoteResult, setRemoteResult] = useState<{ for: string; available: boolean } | null>(null);

  const normalized = candidate.trim().toLowerCase();
  const debounced = useDebounce(normalized, TIMEOUTS.USERNAME_CHECK_DEBOUNCE_MS);

  // Fire the network check only once the debounce settles on a
  // syntactically valid, non-reserved, actually-changed candidate.
  const shouldCheck =
    debounced.length > 0 &&
    debounced !== currentUsername?.toLowerCase() &&
    VALIDATION.isValidUsername(debounced) &&
    !VALIDATION.isReservedUsername(debounced, RESERVED_USERNAMES);

  useEffect(() => {
    if (!shouldCheck) {
      setChecking(false);
      return;
    }
    let cancelled = false;
    setChecking(true);
    checkUsernameAvailable(debounced, user?.id).then((result) => {
      if (cancelled) return;
      setChecking(false);
      if (result.ok) {
        setRemoteResult({ for: debounced, available: result.data });
      }
    });
    return () => {
      cancelled = true;
    };
    // shouldCheck is derived from debounced + currentUsername, so it's
    // covered transitively — including it directly would just duplicate
    // the same dependency without changing when this fires.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced, user?.id, shouldCheck]);

  if (normalized.length === 0 || normalized === currentUsername?.toLowerCase()) {
    return { status: 'idle' };
  }
  if (!VALIDATION.isValidUsername(normalized)) {
    // Checked against the raw `normalized` value (not `debounced`) so a
    // format error (e.g. a space or a 2-character name) surfaces
    // immediately rather than waiting out the debounce — the client
    // already knows the answer to that one without a network round trip.
    return {
      status:  'invalid',
      message: 'Username must be 3–30 characters, letters, numbers, and underscores only.',
    };
  }
  if (VALIDATION.isReservedUsername(normalized, RESERVED_USERNAMES)) {
    return { status: 'reserved', message: 'This username isn\u2019t available. Please choose another.' };
  }
  if (debounced !== normalized || checking) {
    return { status: 'checking' };
  }
  if (remoteResult && remoteResult.for === normalized) {
    return remoteResult.available
      ? { status: 'available' }
      : { status: 'taken', message: 'This username is already taken. Please choose another.' };
  }
  return { status: 'checking' };
}

// ─── useUpdateUsername ──────────────────────────────────────────────────────────

export function useUpdateUsername() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const { isConnected } = useNetworkStatus();

  return useMutation<ProfileModel, StrollError, string>({
    mutationFn: async (rawUsername) => {
      if (!user) throw buildStrollError('UNAUTHORIZED', NOT_SIGNED_IN_MESSAGE);
      if (!isConnected) throw buildStrollError('NETWORK_ERROR', OFFLINE_MESSAGE);

      const username = rawUsername.trim().toLowerCase();

      if (!VALIDATION.isValidUsername(username)) {
        throw buildStrollError(
          'VALIDATION_ERROR',
          'Username must be 3–30 characters, letters, numbers, and underscores only.'
        );
      }
      if (VALIDATION.isReservedUsername(username, RESERVED_USERNAMES)) {
        throw buildStrollError('RESERVED_USERNAME', 'This username isn\u2019t available. Please choose another.');
      }

      // Re-check right before writing — useUsernameAvailability's live
      // check is for feedback as the user types, not a guarantee at the
      // moment Save is tapped (another device could have claimed it in
      // between). updateUsernameService's own unique-violation handling
      // is still the final source of truth either way.
      const availability = await checkUsernameAvailable(username, user.id);
      if (availability.ok && !availability.data) {
        throw buildStrollError('USERNAME_TAKEN', 'This username is already taken. Please choose another.');
      }

      const result = await updateUsernameService(user.id, username);
      if (!result.ok) throw result.error;
      return toProfileModel(result.data);
    },

    onError: (error) => {
      showToast({ type: 'error', message: normalizeError(error).userMessage });
    },

    onSuccess: (data) => {
      // Same cache-write shape as useUpdateProfile in useProfile.ts —
      // write straight into queryKeys.users.me() (no refetch needed) and
      // invalidate queryKeys.users.detail(id) so every OTHER screen that
      // reads this profile by id (public profile, gallery attribution,
      // notification actor names, etc.) picks up the new @handle too.
      queryClient.setQueryData(queryKeys.users.me(), data);
      queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(data.id) });
      showToast({ type: 'success', message: 'Username updated.' });
    },
  });
}

// ─── useEmailSettings ───────────────────────────────────────────────────────────
// Modeled directly on useForgotPassword's shape in useAuth.ts (validate +
// submit + loading) — Supabase's secure email-change flow is, from this
// app's point of view, "send something, then wait for the person to
// click a link," the same shape as a password-reset request.

export interface UseEmailSettingsResult {
  validate: (email: string) => string | undefined;
  submit:   (email: string) => Promise<{ ok: boolean; pendingEmail?: string }>;
  loading:  boolean;
}

export function useEmailSettings(): UseEmailSettingsResult {
  const storeUpdateEmail = useAuthStore((s) => s.updateEmail);
  const currentEmail = useAuthStore((s) => s.user?.email);
  const [loading, setLoading] = useState(false);

  const validate = useCallback((email: string): string | undefined => {
    const trimmed = email.trim();
    if (!trimmed) return 'Email is required.';
    if (!VALIDATION.isValidEmail(trimmed)) return 'Enter a valid email address.';
    if (trimmed.toLowerCase() === currentEmail?.toLowerCase()) {
      return 'That\u2019s already your current email address.';
    }
    return undefined;
  }, [currentEmail]);

  const submit = useCallback(
    async (email: string): Promise<{ ok: boolean; pendingEmail?: string }> => {
      setLoading(true);
      try {
        const result = await storeUpdateEmail(email.trim().toLowerCase());
        if (!result.ok || !result.pendingEmail) {
          showToast({ type: 'error', message: result.error?.userMessage ?? 'Unable to update account.' });
          return { ok: false };
        }
        showToast({
          type:    'success',
          message: `Check ${result.pendingEmail} to confirm your new email address.`,
        });
        return { ok: true, pendingEmail: result.pendingEmail };
      } finally {
        setLoading(false);
      }
    },
    [storeUpdateEmail]
  );

  return { submit, validate, loading };
}

// ─── useDeleteAccount ───────────────────────────────────────────────────────────
// No `validate` here — the delete-account modal's confirmation gate
// (typing the exact username, see app/(modals)/delete-account.tsx) is UI
// state local to that screen, not something this hook needs to know
// about. By the time submit() is called, confirmation has already
// happened.

export function useDeleteAccount() {
  const storeDeleteAccount = useAuthStore((s) => s.deleteAccount);
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const submit = useCallback(async (): Promise<{ ok: boolean; error?: StrollError }> => {
    setLoading(true);
    try {
      const result = await storeDeleteAccount();
      if (!result.ok) {
        showToast({ type: 'error', message: result.error?.userMessage ?? 'Unable to delete your account.' });
        return { ok: false, error: result.error };
      }
      // The account no longer exists server-side — drop every cached
      // query rather than leaving this device holding onto a dead
      // user's data (queryClient.clear(), not just this user's keys:
      // matches how thoroughly authStore.deleteAccount already wipes
      // AsyncStorage on success).
      queryClient.clear();
      showToast({ type: 'success', message: 'Your account has been deleted.' });
      return { ok: true };
    } finally {
      setLoading(false);
    }
  }, [storeDeleteAccount, queryClient]);

  return { submit, loading };
}

// ─── hasPasswordAuth ────────────────────────────────────────────────────────────
// Sprint 9 Prompt 1's Password section: "If the user authenticated
// through another provider that does not use passwords: Hide or
// gracefully disable this option." This codebase currently only ever
// creates email/password accounts (see authService.signUp — there is no
// OAuth sign-in anywhere yet), so this will always evaluate true today.
// It's written against the general shape (checking `identities` first,
// falling back to `app_metadata.provider`) so the Password row adapts
// automatically the day an OAuth-only sign-in method is added, without
// this file or the Settings screen needing to change.
export function hasPasswordAuth(user: User | null | undefined): boolean {
  if (!user) return false;
  const identities = user.identities ?? [];
  if (identities.length > 0) {
    return identities.some((identity) => identity.provider === 'email');
  }
  return user.app_metadata?.provider === 'email';
}
