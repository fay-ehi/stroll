/**
 * Stroll — Auth Store
 * src/stores/authStore.ts
 *
 * Single source of truth for authentication state.
 * All auth state reads happen through this store.
 * All auth state writes happen through the actions in this store,
 * which delegate to authService for the actual Supabase calls.
 *
 * Architecture:
 *   UI screens → useAuthStore() → store actions → authService → Supabase
 *
 * The store also manages the Supabase auth state listener so that
 * session changes (token refresh, sign out from another tab, etc.)
 * are reflected in the UI automatically without manual polling.
 */

import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';
import {
  signIn,
  signUp,
  signOut,
  requestPasswordReset,
  updatePassword,
  getSession,
  onAuthStateChange,
  type SignInCredentials,
  type SignUpCredentials,
  type SignUpResult,
} from '@/services/authService';
import { storage, STORAGE_KEYS } from '@/lib/storage';
import { type StrollError, logError } from '@/lib/errors';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type AuthStatus =
  | 'loading'         // Checking persisted session on app launch
  | 'authenticated'   // Valid session exists
  | 'unauthenticated' // No session, or session expired
  | 'error';          // Unrecoverable auth error

export interface AuthState {
  status:  AuthStatus;
  user:    User | null;
  session: Session | null;
  error:   StrollError | null;

  // ── Actions ──────────────────────────────────────────────────────────────
  /** Called once on app launch to restore session from AsyncStorage. */
  initialize:       () => Promise<void>;
  signIn:           (credentials: SignInCredentials) => Promise<{ ok: boolean; error?: StrollError }>;
  signUp:           (credentials: SignUpCredentials) => Promise<{ ok: boolean; requiresConfirmation?: boolean; error?: StrollError }>;
  signOut:          () => Promise<void>;
  requestReset:     (email: string) => Promise<{ ok: boolean; error?: StrollError }>;
  updatePassword:   (password: string) => Promise<{ ok: boolean; error?: StrollError }>;
  clearError:       () => void;

  // ── Internal ─────────────────────────────────────────────────────────────
  /** Only used by the auth state listener — not for direct UI calls. */
  _setSession:      (user: User | null, session: Session | null) => void;
}

// ─── Store ─────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>((set) => ({
  status:  'loading',
  user:    null,
  session: null,
  error:   null,

  // ── Initialize ─────────────────────────────────────────────────────────────
  initialize: async () => {
    try {
      const result = await getSession();

      if (!result.ok) {
        set({ status: 'unauthenticated', user: null, session: null });
        return;
      }

      const session = result.data;

      if (session?.user) {
        set({ status: 'authenticated', user: session.user, session });
      } else {
        set({ status: 'unauthenticated', user: null, session: null });
      }
    } catch (err) {
      logError('authStore.initialize', err);
      set({ status: 'unauthenticated', user: null, session: null });
    }
  },

  // ── Sign In ────────────────────────────────────────────────────────────────
  signIn: async (credentials) => {
    set({ error: null });

    const result = await signIn(credentials);

    if (!result.ok) {
      set({ error: result.error });
      return { ok: false, error: result.error };
    }

    set({
      status:  'authenticated',
      user:    result.data.user,
      session: result.data.session,
      error:   null,
    });

    return { ok: true };
  },

  // ── Sign Up ────────────────────────────────────────────────────────────────
  signUp: async (credentials) => {
    set({ error: null });

    const result = await signUp(credentials);

    if (!result.ok) {
      set({ error: result.error });
      return { ok: false, error: result.error };
    }

    const { user, session, requiresConfirmation } = result.data as SignUpResult;

    if (!requiresConfirmation && session && user) {
      // Email confirmation is disabled — user is immediately signed in.
      set({ status: 'authenticated', user, session, error: null });
    }
    // If requiresConfirmation, we leave status as 'unauthenticated' and let
    // the UI show the "check your email" message.

    return { ok: true, requiresConfirmation };
  },

  // ── Sign Out ───────────────────────────────────────────────────────────────
  signOut: async () => {
    await signOut();
    // Clear any app-level persisted data that belongs to the user.
    await storage.remove(STORAGE_KEYS.selectedCity);
    await storage.remove(STORAGE_KEYS.onboardingComplete);
    await storage.remove(STORAGE_KEYS.selectedInterests);
    set({ status: 'unauthenticated', user: null, session: null, error: null });
  },

  // ── Request Password Reset ─────────────────────────────────────────────────
  requestReset: async (email) => {
    set({ error: null });
    const result = await requestPasswordReset(email);

    if (!result.ok) {
      set({ error: result.error });
      return { ok: false, error: result.error };
    }

    return { ok: true };
  },

  // ── Update Password ────────────────────────────────────────────────────────
  updatePassword: async (password) => {
    set({ error: null });
    const result = await updatePassword(password);

    if (!result.ok) {
      set({ error: result.error });
      return { ok: false, error: result.error };
    }

    return { ok: true };
  },

  // ── Clear Error ────────────────────────────────────────────────────────────
  clearError: () => set({ error: null }),

  // ── Internal: set session (used by auth state listener) ───────────────────
  _setSession: (user, session) => {
    if (user && session) {
      set({ status: 'authenticated', user, session });
    } else {
      set({ status: 'unauthenticated', user: null, session: null });
    }
  },
}));

// ─── Auth State Listener ───────────────────────────────────────────────────────
// Initialized once at app startup (in AuthProvider). Automatically keeps
// the store in sync when Supabase refreshes the token or detects sign-out.

let _unsubscribeListener: (() => void) | null = null;

export function startAuthListener(): void {
  if (_unsubscribeListener) return; // Already running.

  _unsubscribeListener = onAuthStateChange((event, session) => {
    const { _setSession } = useAuthStore.getState();

    switch (event) {
      case 'SIGNED_IN':
      case 'TOKEN_REFRESHED':
      case 'USER_UPDATED':
        _setSession(session?.user ?? null, session);
        break;
      case 'SIGNED_OUT':
        _setSession(null, null);
        break;
      // INITIAL_SESSION is handled by initialize() — ignore here to avoid
      // a double-render on startup.
      default:
        break;
    }
  });
}

export function stopAuthListener(): void {
  _unsubscribeListener?.();
  _unsubscribeListener = null;
}

// ─── Selector Helpers ──────────────────────────────────────────────────────────
// Pre-composed selectors for the most common read patterns.
// Use these instead of reading the whole store to minimize re-renders.

export const selectIsAuthenticated = (s: AuthState): boolean =>
  s.status === 'authenticated';

export const selectIsLoading = (s: AuthState): boolean =>
  s.status === 'loading';

export const selectUser = (s: AuthState): User | null => s.user;

export const selectAuthError = (s: AuthState): StrollError | null => s.error;
