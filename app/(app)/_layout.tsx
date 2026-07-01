/**
 * Stroll — App Group Layout
 * app/(app)/_layout.tsx
 *
 * Route guard: unauthenticated users who land here (e.g. via a deep link
 * to a place or experience before signing in) are redirected to welcome.
 *
 * This protects all app routes without needing a guard on every screen.
 */

import React from 'react';
import { Redirect, Stack } from 'expo-router';
import { useAuthStore, selectIsAuthenticated } from '@/stores/authStore';
import { ROUTES } from '@/constants/routes';
import { theme } from '@/theme';

export default function AppLayout() {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);

  if (!isAuthenticated) {
    return <Redirect href={ROUTES.auth.welcome as never} />;
  }

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
