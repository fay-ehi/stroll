/**
 * Stroll — Onboarding Progress Bar
 * src/components/onboarding/OnboardingProgress.tsx
 *
 * Segmented progress indicator showing how far through onboarding the
 * user is. Each segment fills solidly when that step is complete.
 * Matches the Design Philosophy's calm, minimal aesthetic.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '@/theme';
import { ONBOARDING_STEP_COUNT } from '@/constants/onboarding';

interface OnboardingProgressProps {
  /** 0-based index of the current step. */
  currentIndex: number;
}

export function OnboardingProgress({ currentIndex }: OnboardingProgressProps) {
  return (
    <View style={styles.container} accessibilityRole="progressbar"
      accessibilityLabel={`Step ${currentIndex + 1} of ${ONBOARDING_STEP_COUNT}`}
    >
      {Array.from({ length: ONBOARDING_STEP_COUNT }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.segment,
            i < currentIndex  && styles.segmentComplete,
            i === currentIndex && styles.segmentActive,
          ]}
        />
      ))}
    </View>
  );
}

const SEGMENT_HEIGHT = 3;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap:           theme.spacing.xxs,
  },
  segment: {
    flex:          1,
    height:        SEGMENT_HEIGHT,
    borderRadius:  SEGMENT_HEIGHT,
    backgroundColor: theme.colors.neutral.border,
  },
  segmentComplete: {
    backgroundColor: theme.colors.brand.primary,
  },
  segmentActive: {
    backgroundColor: theme.colors.brand.primary,
    opacity: theme.opacity.heavy,
  },
});
