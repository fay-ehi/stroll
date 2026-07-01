/**
 * Stroll — Auth Group Layout
 * app/(auth)/_layout.tsx
 *
 * Route guard: authenticated users who land here (e.g. via a stale deep
 * link or back-navigation) are immediately redirected to the app.
 *
 * This prevents signed-in users from seeing the Welcome/Sign In screens.
 */

import React from 'react';
import { Redirect, Stack } from 'expo-router';
import { useAuthStore, selectIsAuthenticated } from '@/stores/authStore';
import { ROUTES } from '@/constants/routes';
import { theme } from '@/theme';

export default function AuthLayout() {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);

  if (isAuthenticated) {
    return <Redirect href={ROUTES.tabs.discover as never} />;
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
      <Stack.Screen name="welcome" />
      <Stack.Screen name="sign-up" />
      <Stack.Screen name="log-in" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="reset-password" />
    </Stack>
  );
}
