/**
 * Stroll — Categories Row Skeleton
 * src/components/discover/CategoriesRowSkeleton.tsx
 *
 * Loading state for CategoriesRow — a static row of pill-shaped
 * skeletons at roughly chip width/height. Not scrollable and hidden from
 * screen readers, same reasoning as the other Discover skeletons.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '@/theme';
import { Skeleton } from '@/components/ui';

const CHIP_WIDTHS = [48, 96, 88, 104, 80, 92];
const CHIP_HEIGHT = 36;

export function CategoriesRowSkeleton() {
  return (
    <View
      style={styles.row}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {CHIP_WIDTHS.map((width, index) => (
        <Skeleton key={index} width={width} height={CHIP_HEIGHT} borderRadius={theme.radius.full} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    gap: theme.spacing.sm,
    overflow: 'hidden',
  },
});
