/**
 * Stroll — Place Card / List Skeletons
 * src/components/places/PlaceCardSkeleton.tsx
 *
 * Design System §34 — Loading States: "Skeletons should resemble the final
 * layout." §25 — Place Card contains: Cover Image, Place Name, Category,
 * Location, Experience Count. This approximates that shape so whichever
 * future sprint builds the real PlaceCard can drop this in as its loading
 * state immediately, matching the pattern already established for
 * SkeletonCircle/SkeletonText in src/components/ui/Loading.tsx (whose own
 * comment anticipated this: "product-specific skeletons ... built in a
 * future sprint once the real card components exist").
 *
 * Built entirely from the existing Skeleton primitives, so reduced-motion
 * support (useReducedMotion, see Loading.tsx) comes for free.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '@/theme';
import { Skeleton, SkeletonText } from '@/components/ui';

// Approximates the eventual Place Card's cover image height. Skeletons
// don't need to be pixel-perfect responsive — just close enough to
// "resemble the final layout" per the Design System guidance above.
const CARD_IMAGE_HEIGHT = 160;

export function PlaceCardSkeleton() {
  return (
    <View style={styles.card}>
      <Skeleton height={CARD_IMAGE_HEIGHT} borderRadius={theme.radius.card} />
      <View style={styles.textBlock}>
        <SkeletonText width="70%" />
        <SkeletonText width="45%" />
        <SkeletonText width="35%" />
      </View>
    </View>
  );
}

export interface PlacesListSkeletonProps {
  /** How many card skeletons to render. Defaults to 3. */
  count?: number;
}

export function PlacesListSkeleton({ count = 3 }: PlacesListSkeletonProps) {
  return (
    <View
      style={styles.list}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {Array.from({ length: count }, (_, index) => (
        <PlaceCardSkeleton key={index} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: theme.spacing.lg,
  },
  card: {
    gap: theme.spacing.sm,
  },
  textBlock: {
    gap: theme.spacing.xxs,
  },
});
