/**
 * Stroll — App Group Layout
 * app/(app)/_layout.tsx
 *
 * Sprint 1 Prompt 2 update: adds onboarding guard.
 *
 * Logic:
 *   - Unauthenticated → (auth)/welcome
 *   - Authenticated + onboarding incomplete → (onboarding)/city
 *   - Authenticated + onboarding complete → show app stack normally
 *
 * The onboarding check uses useOnboardingGuard which:
 *   1. Checks AsyncStorage first (fast, no network)
 *   2. Falls back to Supabase profile check
 *   Shows AppLoader while resolving.
 */

import React from 'react';
import { Redirect, Stack } from 'expo-router';
import { useAuthStore, selectIsAuthenticated } from '@/stores/authStore';
import { useOnboardingGuard } from '@/hooks/useOnboarding';
import { AppLoader } from '@/components/loading/AppLoader';
import { ROUTES } from '@/constants/routes';
import { theme } from '@/theme';

export default function AppLayout() {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const { status }      = useOnboardingGuard();

  // Not authenticated — go to auth flow.
  if (!isAuthenticated) {
    return <Redirect href={ROUTES.auth.welcome as never} />;
  }

  // Still checking onboarding status.
  if (status === 'loading') {
    return <AppLoader />;
  }

  // Authenticated but onboarding not done — go to onboarding.
  if (status === 'show_onboarding') {
    return <Redirect href="/(onboarding)/city" />;
  }

  // Authenticated + onboarding complete — show the app.
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: theme.colors.neutral.background,
        },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="place/[id]" />
      <Stack.Screen name="experience/[id]" />
      <Stack.Screen name="collections/index" />
      <Stack.Screen name="collections/[id]" />
      <Stack.Screen name="profile/[id]" />
      <Stack.Screen name="profile/edit" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}
