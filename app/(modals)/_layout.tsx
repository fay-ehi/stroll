/**
 * Stroll — Modals Group Layout
 * app/(modals)/_layout.tsx
 *
 * PRD §8 "Modals & Bottom Sheets": Add To Collection, Comment Sheet,
 * Place Search, Share — plus Create Experience (PRD §8.7, opened via the
 * center "+" tab button) and Create Collection (PRD §8.10).
 *
 * Design System §39 — Bottom Sheets are preferred over full-screen modals
 * for secondary tasks; rounded top corners, drag to dismiss. §40 — Modals
 * are reserved for critical confirmations / destructive actions / important
 * decisions. Comments and Place Search read as bottom-sheet-appropriate
 * (secondary, contextual tasks); Create Experience and Create Collection
 * are full creation flows and read better as full-screen modals.
 *
 * Sprint 4 scope: routing + presentation style only. The actual bottom
 * sheet behavior (drag-to-dismiss, rounded top corners per §39's 28px
 * radius token) is a future sprint once a bottom sheet library is chosen
 * — that's a real dependency decision (e.g. @gorhom/bottom-sheet) that
 * shouldn't be introduced silently inside a navigation-architecture sprint.
 * For now, every modal route uses React Navigation's native 'modal'
 * presentation so the shell and routes are correct; the visual treatment
 * (sheet vs. full screen) gets refined when each modal gets real content.
 */

import React from 'react';
import { Stack } from 'expo-router';
import { theme } from '@/theme';

export default function ModalsLayout() {
  return (
    <Stack
      screenOptions={{
        presentation: 'modal',
        headerShown: false,
        contentStyle: {
          backgroundColor: theme.colors.neutral.background,
        },
      }}
    >
      <Stack.Screen name="create-experience" />
      <Stack.Screen name="create-collection" />
      <Stack.Screen name="add-to-collection" />
      <Stack.Screen name="comments/[experienceId]" />
      <Stack.Screen name="place-search" />
      <Stack.Screen name="share" />
    </Stack>
  );
}
