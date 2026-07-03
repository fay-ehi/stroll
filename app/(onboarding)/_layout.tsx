/**
 * Stroll — Onboarding Group Layout
 * app/(onboarding)/_layout.tsx
 *
 * Stack wrapper for the 5-step onboarding flow.
 * Only authenticated users who haven't completed onboarding reach here.
 * Route guard logic lives in app/(app)/_layout.tsx and app/index.tsx.
 */

import React from 'react';
import { Stack } from 'expo-router';
import { theme } from '@/theme';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: theme.colors.neutral.background,
        },
        // Slide animation between steps feels natural for a multi-step flow.
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="city" />
      <Stack.Screen name="interests" />
      <Stack.Screen name="avatar" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="suggested-users" />
    </Stack>
  );
}
