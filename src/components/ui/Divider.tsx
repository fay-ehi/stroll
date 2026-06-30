/**
 * Stroll UI — Divider
 * src/components/ui/Divider.tsx
 *
 * Design System §32 — Dividers:
 *   Purpose: Separate related content.
 *   Default Thickness: 1px
 *   "Use whitespace before introducing additional divider lines."
 *
 * This component is intentionally minimal. Per the Design Philosophy
 * (§13 White Space Philosophy), dividers should be a last resort —
 * spacing (margin/gap) is the preferred separator. Use this only when
 * a visible line genuinely aids comprehension (e.g. list row separators).
 */

import React from 'react';
import { View, type ViewStyle } from 'react-native';
import { theme } from '@/theme';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  /** Color override. Defaults to theme.colors.neutral.divider. */
  color?: string;
  /** Length along the main axis (width for vertical, ignored for horizontal which fills). */
  length?: number;
  /** Spacing applied on either side of the divider, along the cross axis. */
  spacing?: number;
  style?: ViewStyle;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function Divider({
  orientation = 'horizontal',
  color = theme.colors.neutral.divider,
  length,
  spacing,
  style,
}: DividerProps) {
  const isHorizontal = orientation === 'horizontal';

  return (
    <View
      accessibilityRole="none"
      style={[
        {
          backgroundColor: color,
        },
        isHorizontal
          ? {
              height: theme.borders.width,
              width:  '100%',
              marginVertical: spacing,
            }
          : {
              width:  theme.borders.width,
              height: length ?? '100%',
              marginHorizontal: spacing,
            },
        style,
      ]}
    />
  );
}
