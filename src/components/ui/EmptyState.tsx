/**
 * Stroll UI — EmptyState
 * src/components/ui/EmptyState.tsx
 *
 * Design System §33 — Empty States:
 *   Every empty state should contain: Illustration or subtle icon,
 *   Headline, Short explanation, Primary action.
 *   Example: "No saved places yet." / "Start exploring and save places
 *   you'd love to visit." / Button: "Explore Experiences"
 *   "Empty states should encourage rather than apologise."
 *
 * The illustration slot accepts any ReactNode so product sprints can later
 * pass a custom SVG illustration. Until illustrations exist, a Lucide icon
 * inside a soft circular backdrop is used as the "subtle icon" fallback
 * explicitly permitted by the Design System wording ("Illustration OR
 * subtle icon").
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '@/theme';
import { H4, Body } from './Typography';
import { Button, type ButtonProps } from './Button';
import { Icon } from './Icon';
import type { LucideIcon } from 'lucide-react-native';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface EmptyStateProps {
  /** Headline — keep short and encouraging, e.g. "No saved places yet." */
  title: string;
  /** Short explanation — one sentence, action-oriented. */
  description?: string;
  /** Subtle icon fallback when no custom illustration is provided. */
  icon?: LucideIcon;
  /** Custom illustration node — overrides the icon fallback entirely. */
  illustration?: React.ReactNode;
  /** Optional primary action, e.g. { label: "Explore Experiences", onPress } */
  action?: {
    label: string;
    onPress: () => void;
    variant?: ButtonProps['variant'];
  };
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function EmptyState({
  title,
  description,
  icon,
  illustration,
  action,
}: EmptyStateProps) {
  return (
    <View style={styles.container} accessibilityRole="text">
      <View style={styles.visualSlot}>
        {illustration ? (
          illustration
        ) : icon ? (
          <View style={styles.iconBackdrop}>
            <Icon icon={icon} size="xl" color={theme.colors.text.tertiary} />
          </View>
        ) : null}
      </View>

      <H4 align="center" style={styles.title}>
        {title}
      </H4>

      {description ? (
        <Body align="center" color={theme.colors.text.secondary} style={styles.description}>
          {description}
        </Body>
      ) : null}

      {action ? (
        <View style={styles.actionWrapper}>
          <Button
            label={action.label}
            onPress={action.onPress}
            variant={action.variant ?? 'primary'}
          />
        </View>
      ) : null}
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

// Icon backdrop diameter: derived from theme.spacing['8xl'] (80px) so the
// "xl" icon (32px) sits comfortably centered. Defined as a named constant
// rather than inlined so the relationship to the spacing scale stays
// explicit and auditable.
const ICON_BACKDROP_DIAMETER = theme.spacing['8xl'];

// Description max-width keeps body copy at a readable line length inside
// a centered empty state (Design System §13: "Maximum Content Width —
// Readable without edge-to-edge text"). No exact px value is specified,
// so this is derived from spacing tokens (7 × theme.spacing['5xl']) rather
// than an arbitrary literal, and named so the intent is explicit.
const DESCRIPTION_MAX_WIDTH = theme.spacing['5xl'] * 5; // 56 × 5 = 280

const styles = StyleSheet.create({
  container: {
    alignItems:        'center',
    justifyContent:    'center',
    paddingHorizontal: theme.layout.sectionPaddingLarge,
    paddingVertical:   theme.spacing['4xl'],
  },
  visualSlot: {
    marginBottom: theme.spacing.lg,
  },
  iconBackdrop: {
    width:            ICON_BACKDROP_DIAMETER,
    height:           ICON_BACKDROP_DIAMETER,
    borderRadius:     theme.radius.full,
    backgroundColor:  theme.colors.neutral.backgroundSecondary,
    alignItems:       'center',
    justifyContent:   'center',
  },
  title: {
    marginBottom: theme.spacing.xs,
  },
  description: {
    marginBottom: theme.spacing.lg,
    maxWidth: DESCRIPTION_MAX_WIDTH,
  },
  actionWrapper: {
    marginTop: theme.spacing.xs,
  },
});
