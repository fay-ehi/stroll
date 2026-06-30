/**
 * Stroll — Placeholder Screen
 * src/components/placeholder/PlaceholderScreen.tsx
 *
 * Sprint 4 scope: navigation architecture only — no real screens yet.
 * Every route that doesn't have a real implementation renders this
 * component with route-specific title/description text.
 *
 * Per the prompt: "Each should display only: Screen Title, Short
 * description. Nothing else." This is intentionally minimal — it exists
 * purely to prove the route resolves, renders inside ScreenContainer
 * (so safe-area/background/padding are already correct for whenever real
 * content replaces it), and uses the established Typography components.
 *
 * This is NOT a reusable UI primitive (doesn't belong in components/ui) —
 * it's scaffolding for this sprint only, scoped to components/placeholder
 * so it's easy to delete entirely once every route has a real screen.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ScreenContainer, H2, Body } from '@/components/ui';
import { theme } from '@/theme';

export interface PlaceholderScreenProps {
  /** The screen's name, e.g. "Discover", "Place Detail". */
  title: string;
  /** One short sentence describing what this screen will eventually do. */
  description: string;
}

export function PlaceholderScreen({ title, description }: PlaceholderScreenProps) {
  return (
    <ScreenContainer scroll={false}>
      <View style={styles.content}>
        <H2 align="center" style={styles.title}>
          {title}
        </H2>
        <Body align="center" color={theme.colors.text.secondary}>
          {description}
        </Body>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex:              1,
    alignItems:        'center',
    justifyContent:    'center',
    paddingHorizontal: theme.spacing.xl,
  },
  title: {
    marginBottom: theme.spacing.xs,
  },
});
