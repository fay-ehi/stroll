/**
 * Stroll — App Initialization Loader
 * src/components/loading/AppLoader.tsx
 *
 * Shown during the app initialization phase — font loading, auth state
 * check, initial data prefetch. Wraps the existing Spinner component
 * (Sprint 3) with the full-screen container treatment.
 *
 * Design System §34: "Never show blank pages. Use skeleton loaders."
 * For the very first load (before any layout is known), a centered
 * spinner is the appropriate treatment since there's nothing to skeleton.
 *
 * Usage:
 *   if (!isReady) return <AppLoader />;
 *   return <Stack />;
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { FullScreenLoading } from '@/components/ui';
import { theme } from '@/theme';

interface AppLoaderProps {
  /** Optional label shown beneath the spinner. Keep very short. */
  label?: string;
}

export function AppLoader({ label }: AppLoaderProps) {
  return (
    <View style={styles.container}>
      <FullScreenLoading label={label} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: theme.colors.neutral.background,
  },
});
