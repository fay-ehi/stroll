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
 *
 * Icon + label are wrapped in their own `content` row View instead of
 * relying on `styles.base`'s flexDirection/alignItems. `styles.base`
 * sits at the front of the Pressable's style array, which ends with
 * whatever `style` prop the caller passes in (see CollectionsRow.tsx) —
 * anything in that external style capable of touching cross-axis layout
 * would silently win and could stack the icon above the label instead
 * of beside it. Giving icon+label their own dedicated row container
 * makes that layout independent of whatever the caller passes to
 * `style`.
 *
 * Default variant's fill uses a pill-local PILL_FILL_GREY rather than
 * the shared theme.colors.neutral.border token — border (#E6E6E6) is
 * only ~10% off the screen's white background and reads as a genuine
 * button surface, not just an outline color.
 */

import React from 'react';
import { Platform, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { Album } from 'lucide-react-native';
import { theme } from '@/theme';
import { hitSlop as computeHitSlop } from '@/theme/utils';
import { BodySmall, Icon } from '@/components/ui';

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

// Local to this component — deliberately more visible than
// theme.colors.neutral.border (#E6E6E6, only ~10% off white). Chosen to
// read as a solid grey button fill against theme.colors.neutral.background
// (#FFFFFF) without darkening the shared border token used elsewhere.
const PILL_FILL_GREY = '#D6D6D6';

// Same platform split Card.tsx uses for its own shadow — iOS needs the
// individual shadow* props, Android needs `elevation` instead.
const pillShadow: ViewStyle =
  Platform.OS === 'android'
    ? { elevation: theme.shadows.small.elevation }
    : {
        shadowColor: theme.shadows.small.shadowColor,
        shadowOffset: theme.shadows.small.shadowOffset,
        shadowOpacity: theme.shadows.small.shadowOpacity,
        shadowRadius: theme.shadows.small.shadowRadius,
      };

export function CollectionPill({ label, onPress, variant = 'default', style }: CollectionPillProps) {
  const isCreate = variant === 'create';
  const isInvite = variant === 'invite';
  const isDefault = !isCreate && !isInvite;

  const labelColor = isCreate
    ? theme.colors.brand.primary
    : isInvite
      ? theme.colors.static.white
      : theme.colors.text.primary;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={isCreate ? 'Create a new collection' : label}
      hitSlop={computeHitSlop(PILL_HEIGHT)}
      style={({ pressed }) => [
        styles.base,
        isCreate ? styles.create : isInvite ? styles.invite : styles.default,
        isDefault ? pillShadow : undefined,
        { opacity: pressed ? 0.85 : 1 },
        style,
      ]}
    >
      <View style={styles.content}>
        {isDefault ? (
          <Icon icon={Album} size="sm" color={theme.colors.text.primary} />
        ) : null}
        <BodySmall color={labelColor} numberOfLines={1} style={styles.label}>
          {isCreate ? `+ ${label}` : label}
        </BodySmall>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
    height: PILL_HEIGHT,
    borderRadius: theme.radius.full,
    maxWidth: 200,
  },
  content: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    gap: theme.spacing.xxs,
  },
  label: {
    flexShrink: 1,
  },
  default: {
    backgroundColor: PILL_FILL_GREY,
  },
  create: {
    backgroundColor: theme.colors.neutral.background,
    borderWidth: theme.borders.width,
    borderColor: theme.colors.brand.primary,
    borderStyle: 'dashed',
  },
  invite: {
    backgroundColor: theme.colors.brand.primary,
  },
});
