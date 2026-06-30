/**
 * Stroll UI — Loading Indicators
 * src/components/ui/Loading.tsx
 *
 * Design System §34 — Loading States:
 *   Never show blank pages. Use skeleton loaders.
 *   Skeletons should resemble the final layout.
 *   Avoid unnecessary loading animations.
 *
 * Design Philosophy §38 — Performance Philosophy:
 *   Fast products feel polished. Images should load progressively.
 *
 * Three components:
 *   Spinner            — small inline loading indicator (button-adjacent, lazy loads)
 *   Skeleton            — a single shimmering placeholder block (compose to build layouts)
 *   FullScreenLoading   — centered spinner for full-page loading states
 *
 * Motion respects the Design System's reduced-motion guidance — the skeleton
 * shimmer uses theme.animation durations and honours useReducedMotion by
 * falling back to a static (non-animated) opacity pulse-free block.
 */

import React, { useEffect, useRef } from 'react';
import { View, ActivityIndicator, Animated, StyleSheet, type ViewStyle } from 'react-native';
import { theme } from '@/theme';
import { useReducedMotion } from '@/theme/animation';
import { BodySmall } from './Typography';

// ─── Spinner ───────────────────────────────────────────────────────────────────

export type SpinnerSize = 'small' | 'large';

export interface SpinnerProps {
  size?: SpinnerSize;
  color?: string;
  accessibilityLabel?: string;
}

export function Spinner({
  size = 'small',
  color = theme.colors.brand.primary,
  accessibilityLabel = 'Loading',
}: SpinnerProps) {
  return (
    <ActivityIndicator
      size={size}
      color={color}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
    />
  );
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────

export interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  /** Defaults to theme.radius.card. Pass theme.radius.full for circular skeletons (avatars). */
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = theme.radius.card,
  style,
}: SkeletonProps) {
  const shouldReduceMotion = useReducedMotion();
  const opacityAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (shouldReduceMotion) {
      // Static placeholder — no animation — respects accessibility preference.
      opacityAnim.setValue(0.65);
      return;
    }

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: theme.animation.durations.slow,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.5,
          duration: theme.animation.durations.slow,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, [shouldReduceMotion, opacityAnim]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: theme.colors.neutral.border,
          opacity: opacityAnim,
        },
        style,
      ]}
    />
  );
}

// ─── Skeleton composites ───────────────────────────────────────────────────────
// Common skeleton shapes used across product cards. Kept minimal and generic —
// product-specific skeletons (e.g. ExperienceCardSkeleton) are built in a
// future sprint once the real card components exist.

export function SkeletonCircle({ diameter = 44 }: { diameter?: number }) {
  return <Skeleton width={diameter} height={diameter} borderRadius={theme.radius.full} />;
}

export function SkeletonText({ width = '80%' }: { width?: SkeletonProps['width'] }) {
  // Small radius appropriate for thin text-line skeletons — derived from
  // theme.spacing.xxs (4px), not an arbitrary literal.
  return <Skeleton width={width} height={14} borderRadius={theme.spacing.xxs} />;
}

// ─── FullScreenLoading ─────────────────────────────────────────────────────────

export interface FullScreenLoadingProps {
  /** Optional label shown below the spinner. */
  label?: string;
}

export function FullScreenLoading({ label }: FullScreenLoadingProps) {
  return (
    <View style={styles.fullScreen} accessibilityRole="progressbar" accessibilityLabel={label ?? 'Loading'}>
      <Spinner size="large" />
      {label ? (
        <View style={styles.fullScreenLabel}>
          {/* Imported lazily to avoid a circular dep with Typography in some bundlers */}
          <FullScreenLoadingLabel>{label}</FullScreenLoadingLabel>
        </View>
      ) : null}
    </View>
  );
}

// Small internal helper component (kept inline — not exported) so Loading.tsx
// only depends on Typography for this one optional case.
function FullScreenLoadingLabel({ children }: { children: string }) {
  return (
    <BodySmall color={theme.colors.text.secondary} align="center">
      {children}
    </BodySmall>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  fullScreen: {
    flex:            1,
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: theme.colors.neutral.background,
    gap:             theme.spacing.md,
  },
  fullScreenLabel: {
    marginTop: theme.spacing.xs,
  },
});
