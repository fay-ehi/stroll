/**
 * Stroll — App Group Layout
 * app/(app)/_layout.tsx
 *
 * This is the authenticated application shell. It contains:
 *   - (tabs) — the 5-tab bottom navigation (PRD §7)
 *   - All stack-presented secondary screens reachable FROM those tabs:
 *     Place Detail, Experience Detail, Collections (feed + detail),
 *     other-user Profile, Edit Profile, Settings
 *
 * Per PRD §7: Place pages and Collections are explicitly NOT bottom nav
 * items — they're reached by tapping through from Discover, Search, or
 * Profile. That's exactly what stack screens nested under (app) provide:
 * push/pop navigation that layers on top of whichever tab the user came
 * from, with the tab bar correctly hidden (headerShown handled per-screen
 * since these are detail/content screens, not shell chrome).
 */

import React from 'react';
import { Stack } from 'expo-router';
import { theme } from '@/theme';

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: theme.colors.neutral.background,
        },
      }}
    >
      {/* The 4-tab + Create shell — see (tabs)/_layout.tsx */}
      <Stack.Screen name="(tabs)" />

      {/* Place Detail — PRD §8.8, reachable only via Experience/Collection/Saved */}
      <Stack.Screen name="place/[id]" />

      {/* Experience Detail — PRD §8.6 */}
      <Stack.Screen name="experience/[id]" />

      {/* Collections — PRD §8.10. Not a tab; reached via Discover carousel,
          Search results, or a Profile's Collections tab. */}
      <Stack.Screen name="collections/index" />
      <Stack.Screen name="collections/[id]" />

      {/* Other User Profile — PRD §8.11 */}
      <Stack.Screen name="profile/[id]" />
      <Stack.Screen name="profile/edit" />

      {/* Settings — PRD §8 Utility screen category */}
      <Stack.Screen name="settings" />
    </Stack>
  );
}
