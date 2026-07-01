/**
 * Stroll — Auth Provider
 * src/components/shell/AuthProvider.tsx
 *
 * Initializes authentication state on app launch and keeps it
 * in sync with Supabase's session changes for the lifetime of the app.
 *
 * Responsibilities:
 *   1. Call authStore.initialize() once on mount — restores persisted session.
 *   2. Start the Supabase auth state listener — auto-refreshes tokens,
 *      detects remote sign-outs.
 *   3. Show the AppLoader while auth status is 'loading' so no screen
 *      flashes before we know if the user is signed in.
 *
 * Placed inside the root layout, wrapping the route Stack, so it runs
 * before any screen renders.
 *
 * Usage in app/_layout.tsx:
 *   <AuthProvider>
 *     <Stack ... />
 *   </AuthProvider>
 */

import React, { useEffect } from 'react';
import {
  useAuthStore,
  startAuthListener,
  stopAuthListener,
  selectIsLoading,
} from '@/stores/authStore';
import { AppLoader } from '@/components/loading/AppLoader';

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const initialize   = useAuthStore((s) => s.initialize);
  const isLoading    = useAuthStore(selectIsLoading);

  useEffect(() => {
    // Start the listener before initialize() so we don't miss any events
    // that fire during the async session restoration.
    startAuthListener();
    initialize();

    return () => {
      stopAuthListener();
    };
  }, [initialize]);

  // Show a full-screen loader while checking the persisted session.
  // This prevents a flash of the wrong screen (e.g. briefly showing the
  // auth welcome screen for a user who is actually signed in).
  if (isLoading) {
    return <AppLoader />;
  }

  return <>{children}</>;
}
