/**
 * Stroll — Auth Service
 * src/services/authService.ts
 *
 * Pure functions that wrap Supabase auth calls.
 * This layer has zero knowledge of UI, navigation, or Zustand.
 * Every function returns a consistent Result type — never throws.
 *
 * Architecture:
 *   UI screens → auth hooks → auth store → auth service → Supabase
 *
 * The service is the only place in the codebase that imports supabase
 * for auth operations. Everything above it goes through hooks/store.
 */

import { supabase } from '@/lib/supabase';
import { normalizeError, type StrollError } from '@/lib/errors';
import type { User, Session } from '@supabase/supabase-js';

// ─── Result Type ───────────────────────────────────────────────────────────────

export type AuthResult<T = void> =
  | { ok: true;  data: T }
  | { ok: false; error: StrollError };

function ok<T>(data: T): AuthResult<T> {
  return { ok: true, data };
}

function fail(err: unknown): AuthResult<never> {
  return { ok: false, error: normalizeError(err) };
}

// ─── Sign Up ───────────────────────────────────────────────────────────────────

export interface SignUpCredentials {
  email:       string;
  password:    string;
  displayName: string;
  username:    string;
}

export interface SignUpResult {
  user:    User | null;
  session: Session | null;
  /** True when email confirmation is required before sign-in. */
  requiresConfirmation: boolean;
}

export async function signUp(
  credentials: SignUpCredentials
): Promise<AuthResult<SignUpResult>> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email:    credentials.email,
      password: credentials.password,
      options: {
        data: {
          display_name: credentials.displayName,
          username:     credentials.username,
        },
      },
    });

    if (error) return fail(error);

    // When email confirmation is disabled, session is returned immediately.
    // When enabled, user exists but session is null — requiresConfirmation = true.
    return ok({
      user:                 data.user,
      session:              data.session,
      requiresConfirmation: data.session === null && data.user !== null,
    });
  } catch (err) {
    return fail(err);
  }
}

// ─── Sign In ───────────────────────────────────────────────────────────────────

export interface SignInCredentials {
  email:    string;
  password: string;
}

export async function signIn(
  credentials: SignInCredentials
): Promise<AuthResult<{ user: User; session: Session }>> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email:    credentials.email,
      password: credentials.password,
    });

    if (error) return fail(error);
    if (!data.user || !data.session) return fail(new Error('Sign in succeeded but returned no session.'));

    return ok({ user: data.user, session: data.session });
  } catch (err) {
    return fail(err);
  }
}

// ─── Sign Out ──────────────────────────────────────────────────────────────────

export async function signOut(): Promise<AuthResult<void>> {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) return fail(error);
    return ok(undefined);
  } catch (err) {
    return fail(err);
  }
}

// ─── Password Reset Request ────────────────────────────────────────────────────

export async function requestPasswordReset(
  email: string
): Promise<AuthResult<void>> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      // Deep link that Supabase redirects to after the user clicks the
      // reset link in their email. expo-router intercepts this and renders
      // app/(auth)/reset-password.tsx with the token in the URL params.
      redirectTo: 'stroll:///(auth)/reset-password',
    });
    if (error) return fail(error);
    return ok(undefined);
  } catch (err) {
    return fail(err);
  }
}

// ─── Password Update ───────────────────────────────────────────────────────────

export async function updatePassword(
  newPassword: string
): Promise<AuthResult<void>> {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) return fail(error);
    return ok(undefined);
  } catch (err) {
    return fail(err);
  }
}

// ─── Session Restoration ───────────────────────────────────────────────────────

export async function getSession(): Promise<AuthResult<Session | null>> {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) return fail(error);
    return ok(data.session);
  } catch (err) {
    return fail(err);
  }
}

// ─── Auth State Listener ───────────────────────────────────────────────────────
// Returns an unsubscribe function. Call it when the listener is no longer
// needed (e.g. in a useEffect cleanup).

export type AuthStateCallback = (
  event: string,
  session: Session | null
) => void;

export function onAuthStateChange(
  callback: AuthStateCallback
): () => void {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
  return () => data.subscription.unsubscribe();
}
