/**
 * Stroll — Location Preview Map Fallback
 * src/components/experience-detail/LocationPreviewMapFallback.tsx
 *
 * Shared static "no map" box for LocationPreviewMap's two edge cases:
 * invalid/missing coordinates (native) and web (no react-native-maps web
 * support). Mirrors places/PlaceMapFallback.tsx's same pattern, kept as
 * its own file for the same reason — one shared box instead of
 * duplicating it in both platform variants.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MapPin } from 'lucide-react-native';

import { theme } from '@/theme';
import { Icon, Caption } from '@/components/ui';

export interface LocationPreviewMapFallbackProps {
  label: string;
}

export function LocationPreviewMapFallback({ label }: LocationPreviewMapFallbackProps) {
  return (
    <View style={styles.fallback} accessible accessibilityRole="image" accessibilityLabel={label}>
      <Icon icon={MapPin} size="lg" color={theme.colors.text.tertiary} />
      <Caption color={theme.colors.text.tertiary}>{label}</Caption>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xxs,
    backgroundColor: theme.colors.neutral.backgroundSecondary,
  },
});
