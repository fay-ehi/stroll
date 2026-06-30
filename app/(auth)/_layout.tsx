/**
 * Stroll — Auth Group Layout
 * app/(auth)/_layout.tsx
 *
 * PRD §8.1 Authentication: Welcome/Landing, Sign Up, Log In,
 * Forgot Password. Sprint 4 scope: routing structure + placeholders only
 * — no real authentication logic, no Supabase calls (per prompt rules).
 */

import React from 'react';
import { Stack } from 'expo-router';
import { theme } from '@/theme';

export default function AuthLayout() {
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
    </Stack>
  );
}
