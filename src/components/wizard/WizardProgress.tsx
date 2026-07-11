/**
 * Stroll — Wizard Progress
 * src/components/wizard/WizardProgress.tsx
 *
 * Same segmented-bar visual as components/onboarding/OnboardingProgress,
 * generalized to take `totalSteps` as a prop instead of importing
 * ONBOARDING_STEP_COUNT — so it can drive Experience Creation's wizard
 * (2 steps today, more once Place Search/Photos/Metadata land) or any
 * future multi-step flow without a copy-pasted component per flow.
 * OnboardingProgress itself is left untouched — swapping it for this one
 * is a separate, unrelated change outside this sprint's scope.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '@/theme';

export interface WizardProgressProps {
  /** 0-based index of the current step. */
  currentIndex: number;
  /** Total number of steps in the wizard. */
  totalSteps: number;
}

export function WizardProgress({ currentIndex, totalSteps }: WizardProgressProps) {
  return (
    <View
      style={styles.container}
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${currentIndex + 1} of ${totalSteps}`}
    >
      {Array.from({ length: totalSteps }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.segment,
            i < currentIndex && styles.segmentComplete,
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
