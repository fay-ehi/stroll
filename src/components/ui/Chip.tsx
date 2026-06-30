/**
 * Stroll UI — Chip
 * src/components/ui/Chip.tsx
 *
 * Design System §28 — Chips:
 *   Purpose: Filtering, Categorisation, Quick selections.
 *   Variants: Filled, Outlined, Selected, Disabled.
 *   Rules: Maximum of one row before horizontal scrolling.
 *          Do not use chips for navigation.
 *
 * This component is interactive (unlike Badge) and supports two
 * independent concerns:
 *   1. Selection state (selected / not selected) — for filter chips
 *   2. Removability (a trailing × to remove the chip) — for active filter
 *      summaries, tag inputs, etc.
 * Both can be combined or used independently.
 */

import React from 'react';
import { Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { theme } from '@/theme';
import { hitSlop as computeHitSlop } from '@/theme/utils';
import { BodySmall } from './Typography';
import { Icon } from './Icon';
import { X } from 'lucide-react-native';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface ChipProps {
  label: string;
  /** Whether the chip is in the selected/active visual state. */
  selected?: boolean;
  /** Shows a trailing remove (×) control. Fires onRemove when tapped. */
  removable?: boolean;
  /** Disables interaction and applies the disabled visual treatment. */
  disabled?: boolean;
  /** Called when the chip body is tapped (selection toggle, filter apply, etc.). */
  onPress?: () => void;
  /** Called when the remove (×) control is tapped. Required if removable=true. */
  onRemove?: () => void;
  style?: ViewStyle;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function Chip({
  label,
  selected = false,
  removable = false,
  disabled = false,
  onPress,
  onRemove,
  style,
}: ChipProps) {
  const backgroundColor = disabled
    ? theme.colors.neutral.backgroundSecondary
    : selected
      ? theme.colors.brand.primary
      : theme.colors.neutral.background;

  const borderColor = disabled
    ? theme.colors.neutral.border
    : selected
      ? theme.colors.brand.primary
      : theme.colors.neutral.border;

  const textColor = disabled
    ? theme.colors.text.disabled
    : selected
      ? theme.colors.static.white
      : theme.colors.text.primary;

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled, selected }}
      accessibilityLabel={label}
      // CHIP_HEIGHT (36px) is below the 44px WCAG minimum touch target —
      // hitSlop expands the tappable area without affecting visual size.
      hitSlop={computeHitSlop(CHIP_HEIGHT)}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor,
          borderColor,
          opacity: pressed && !disabled ? 0.85 : 1,
        },
        style,
      ]}
    >
      <BodySmall color={textColor} numberOfLines={1}>
        {label}
      </BodySmall>

      {removable ? (
        <Pressable
          onPress={disabled ? undefined : onRemove}
          disabled={disabled}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${label}`}
          style={styles.removeButton}
        >
          <Icon icon={X} size="xs" color={textColor} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

// Chip height is not explicitly specified in the Design System (§28 covers
// purpose and variants only). 36px is derived as a value between the 44px
// touch target minimum and typical compact chip proportions seen in similar
// pill-shaped components (cf. Badge's smaller scale). Defined here as a
// named constant — never inlined — so the design intent is explicit and
// auditable, and any future System update only requires one edit.
const CHIP_HEIGHT = 36;

const styles = StyleSheet.create({
  base: {
    flexDirection:     'row',
    alignItems:        'center',
    alignSelf:         'flex-start',
    paddingHorizontal: theme.spacing.md,
    height:            CHIP_HEIGHT,
    borderRadius:      theme.radius.full,
    borderWidth:       theme.borders.width,
  },
  removeButton: {
    marginLeft: theme.spacing.xs,
  },
});
