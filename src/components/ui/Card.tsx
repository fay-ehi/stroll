/**
 * Stroll UI — Card
 * src/components/ui/Card.tsx
 *
 * Design System §45 — Cards:
 *   Cards never touch each other. 16px spacing minimum.
 *   Cards should never exceed two levels of information. Avoid visual clutter.
 *
 * Design System §9 — Corner Radius: Cards → 18px
 * Design System §10 — Shadows: Shadow Medium for elevated cards
 *
 * Variants:
 *   default  — flat white surface, no shadow, no border (relies on whitespace)
 *   elevated — white surface + Shadow Medium (the most common card treatment)
 *   outlined — white surface + 1px border, no shadow (for dense list contexts)
 *
 * This is a layout primitive. Product-specific cards (ExperienceCard, PlaceCard,
 * CollectionCard — defined in Design System §24–26) will be built in a future
 * sprint on top of this component. This sprint only delivers the foundation.
 */

import React from 'react';
import { View, type ViewProps, type ViewStyle, StyleSheet, Platform } from 'react-native';
import { theme } from '@/theme';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type CardVariant = 'default' | 'elevated' | 'outlined';

export interface CardProps extends ViewProps {
  variant?: CardVariant;
  /** Internal padding. Defaults to theme.spacing.md (16px). Pass 0 for edge-to-edge content (e.g. an image). */
  padding?: number;
  style?: ViewStyle;
  children?: React.ReactNode;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function Card({
  variant = 'default',
  padding = theme.spacing.md,
  style,
  children,
  ...rest
}: CardProps) {
  return (
    <View
      style={[
        styles.base,
        { padding },
        variant === 'elevated' ? elevatedShadow : undefined,
        variant === 'outlined' ? styles.outlined : undefined,
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  base: {
    backgroundColor: theme.colors.neutral.surface,
    borderRadius:    theme.radius.card,
  },
  outlined: {
    borderWidth: theme.borders.width,
    borderColor: theme.colors.neutral.border,
  },
});

// Shadow props must be applied via spread (iOS) vs elevation (Android) —
// computed once at module load since the medium shadow token is static.
const elevatedShadow: ViewStyle =
  Platform.OS === 'android'
    ? { elevation: theme.shadows.medium.elevation }
    : {
        shadowColor:   theme.shadows.medium.shadowColor,
        shadowOffset:  theme.shadows.medium.shadowOffset,
        shadowOpacity: theme.shadows.medium.shadowOpacity,
        shadowRadius:  theme.shadows.medium.shadowRadius,
      };
