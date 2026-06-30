/**
 * Stroll UI — Badge
 * src/components/ui/Badge.tsx
 *
 * Design System §31 — Badges:
 *   Used sparingly. Examples: Featured, New, Trending, Verified,
 *   Editor's Pick, Future Premium.
 *   Badges should communicate meaning, not decoration.
 *
 * Badges are small, non-interactive status labels — unlike Chips (§28),
 * which are interactive and used for filtering/selection. This distinction
 * is preserved by Badge having no onPress and no selected state.
 */

import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { theme } from '@/theme';
import { Tiny } from './Typography';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type BadgeVariant = 'neutral' | 'primary' | 'success' | 'warning' | 'error';

export interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
}

// ─── Variant Map ───────────────────────────────────────────────────────────────
// Each variant uses a tinted background (low-opacity semantic color isn't a
// token, so we use the neutral background + colored text + colored border
// for sufficient contrast while staying restrained, per Design Philosophy
// §16: "If everything is orange, nothing is important." Badges stay subtle.

const VARIANT_MAP: Record<BadgeVariant, { background: string; text: string; border: string }> = {
  neutral: {
    background: theme.colors.neutral.backgroundSecondary,
    text:       theme.colors.text.secondary,
    border:     theme.colors.neutral.border,
  },
  primary: {
    background: theme.colors.neutral.background,
    text:       theme.colors.brand.primary,
    border:     theme.colors.brand.primary,
  },
  success: {
    background: theme.colors.neutral.background,
    text:       theme.colors.semantic.success,
    border:     theme.colors.semantic.success,
  },
  warning: {
    background: theme.colors.neutral.background,
    text:       theme.colors.semantic.warning,
    border:     theme.colors.semantic.warning,
  },
  error: {
    background: theme.colors.neutral.background,
    text:       theme.colors.semantic.error,
    border:     theme.colors.semantic.error,
  },
};

// ─── Component ─────────────────────────────────────────────────────────────────

export function Badge({ label, variant = 'neutral', style }: BadgeProps) {
  const colors = VARIANT_MAP[variant];

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: colors.background,
          borderColor:     colors.border,
        },
        style,
      ]}
      accessibilityRole="text"
    >
      <Tiny color={colors.text} style={styles.label}>
        {label}
      </Tiny>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

// Badge vertical padding is intentionally tighter than the spacing scale's
// smallest token (xxs=4px) to keep badges compact and pill-shaped at the
// Tiny text size. Named explicitly rather than `theme.spacing.xxs / 2` so
// the value isn't hidden inside arithmetic.
const BADGE_PADDING_VERTICAL = 2;

const styles = StyleSheet.create({
  base: {
    flexDirection:     'row',
    alignItems:        'center',
    alignSelf:         'flex-start',
    paddingHorizontal: theme.spacing.xs,
    paddingVertical:   BADGE_PADDING_VERTICAL,
    borderRadius:      theme.radius.full,
    borderWidth:       theme.borders.width,
  },
  label: {
    fontWeight: theme.typography.weights.semiBold,
    letterSpacing: theme.typography.letterSpacings.wide,
    textTransform: 'uppercase',
  },
});
