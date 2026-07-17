/**
 * Stroll — Collection Pill
 * src/components/profile/CollectionPill.tsx
 *
 * Sprint 5 — Prompt 1. ADR-001's "Compact horizontally scrollable
 * pill-style items on Profile pages" — the Profile screen's Collections
 * row (see CollectionsRow.tsx) renders one of these per Collection.
 * Title only, per requirement #8 ("Do not display cover images in this
 * row").
 *
 * Deliberately its own component, not a reuse of `Chip`
 * (src/components/ui/Chip.tsx) — Design System §28 is explicit that
 * chips are for "Filtering, Categorisation, Quick selections" and "Do
 * not use chips for navigation", and tapping this pill navigates to
 * Collection Detail. Visually mirrors Chip's proportions (height,
 * border radius, horizontal padding) for a consistent pill language
 * across the app, without reusing a component whose own doc says it's
 * for a different purpose.
 * Sprint 5 Prompt 2 addition: a third `variant="invite"` — CollectionsRow
 * renders one of these (not a Collection, not "+ New") when the
 * signed-in user has pending Collection invitations, filled rather than
 * outlined so it reads as something needing a response rather than just
 * another item in the row.
 */

import React from 'react';
import { Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { theme } from '@/theme';
import { hitSlop as computeHitSlop } from '@/theme/utils';
import { BodySmall } from '@/components/ui';

export interface CollectionPillProps {
  label: string;
  onPress: () => void;
  /** Visually distinct "+ New" leading pill (see CollectionsRow.tsx) — same tap target, different fill so it doesn't read as an existing Collection. `'invite'` is the pending-invitations pill, filled to stand out as actionable. */
  variant?: 'default' | 'create' | 'invite';
  style?: ViewStyle;
}

// Matches Chip.tsx's own CHIP_HEIGHT — see that file's comment for why
// 36px (below the 44px WCAG minimum touch target, hitSlop compensates).
const PILL_HEIGHT = 36;

export function CollectionPill({ label, onPress, variant = 'default', style }: CollectionPillProps) {
  const isCreate = variant === 'create';
  const isInvite = variant === 'invite';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={isCreate ? 'Create a new collection' : label}
      hitSlop={computeHitSlop(PILL_HEIGHT)}
      style={({ pressed }) => [
        styles.base,
        isCreate ? styles.create : isInvite ? styles.invite : styles.default,
        { opacity: pressed ? 0.85 : 1 },
        style,
      ]}
    >
      <BodySmall color={isCreate ? theme.colors.brand.primary : isInvite ? theme.colors.static.white : theme.colors.text.primary} numberOfLines={1}>
        {isCreate ? `+ ${label}` : label}
      </BodySmall>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing.md,
    height: PILL_HEIGHT,
    borderRadius: theme.radius.full,
    borderWidth: theme.borders.width,
    maxWidth: 200,
  },
  default: {
    backgroundColor: theme.colors.neutral.background,
    borderColor: theme.colors.neutral.border,
  },
  create: {
    backgroundColor: theme.colors.neutral.background,
    borderColor: theme.colors.brand.primary,
    borderStyle: 'dashed',
  },
  invite: {
    backgroundColor: theme.colors.brand.primary,
    borderColor: theme.colors.brand.primary,
  },
});
