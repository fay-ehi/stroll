/**
 * Stroll — Place Map Fallback
 * src/components/places/PlaceMapFallback.tsx
 *
 * Shared static "no map" presentation for PlaceMapHero's two cases:
 * invalid/missing coordinates (native) and web (no react-native-maps
 * web support — see PlaceMapHero.web.tsx). Kept as its own tiny file
 * rather than duplicated in both platform variants of PlaceMapHero.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MapPin } from 'lucide-react-native';

import { theme } from '@/theme';
import { Icon, Caption } from '@/components/ui';

// Matches ImageGallery.tsx's GALLERY_ASPECT_RATIO — every hero section in
// the app shares one proportions convention, and 4:3 comfortably
// approximates ADR-001's "top ⅓ of the page" guidance across common
// phone screen sizes without hardcoding a device-specific pixel height.
export const MAP_HERO_ASPECT_RATIO = 4 / 3;

export interface PlaceMapFallbackProps {
  label: string;
}

export function PlaceMapFallback({ label }: PlaceMapFallbackProps) {
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
    aspectRatio: MAP_HERO_ASPECT_RATIO,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xxs,
    backgroundColor: theme.colors.neutral.backgroundSecondary,
  },
});
