/**
 * Stroll — Experience Detail Header
 * src/components/experience-detail/ExperienceDetailHeader.tsx
 *
 * Requirement #3 — Experience Header: "Cover image, Title, Category
 * badge, Creator preview, Location, Created date, Estimated duration (if
 * available), Price indicator (if applicable)."
 *
 * Two fields are deliberately not here:
 *   - Cover image: ImageGallery (requirement #4) already renders the
 *     full-width hero + swipeable gallery immediately above this header
 *     on the detail screen. A second, separate cover image here would
 *     just repeat the first photo in the gallery.
 *   - Estimated duration / Price indicator: neither `ExperienceModel` nor
 *     `PlaceModel` has a backing field for either. types/place.ts's own
 *     PRD-alignment note explains why price (`priceLevel`) specifically
 *     is modeled but intentionally never surfaced in any Place UI (PRD
 *     §8.8 lists it under "Intentionally Not Shown"). Per this sprint's
 *     "only display fields that exist, avoid placeholder text for
 *     missing values" — both are simply omitted rather than faked.
 *
 * The creator mention here is intentionally a compact single line (small
 * avatar + name + verified badge) — the only creator identity shown on
 * this screen. A fuller block (bio, total experiences) used to repeat
 * lower on the page but was removed as redundant; this one is enough.
 */

import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { MapPin } from 'lucide-react-native';

import { theme } from '@/theme';
import { H2, Body, Caption, Badge, Avatar, Icon } from '@/components/ui';
import { formatDate } from '@/utils';
import type { ExperienceDetailModel } from '@/types/experience';

export interface ExperienceDetailHeaderProps {
  experience: ExperienceDetailModel;
  /** Called when the inline creator mention is tapped — a placeholder until Public Profile is built. */
  onCreatorPress?: () => void;
}

export function ExperienceDetailHeader({
  experience,
  onCreatorPress,
}: ExperienceDetailHeaderProps) {
  const { title, category, creator, place, createdAt } = experience;

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <H2 style={styles.title}>{title}</H2>
        {category ? (
          <Badge label={`${category.emoji} ${category.label}`} variant="neutral" />
        ) : null}
      </View>

      <Pressable
        onPress={onCreatorPress}
        style={styles.creatorRow}
        accessibilityRole={onCreatorPress ? 'button' : undefined}
        accessibilityLabel={`By ${creator.displayName}`}
      >
        <Avatar
          source={creator.avatarUrl ? { uri: creator.avatarUrl } : undefined}
          name={creator.displayName}
          size="sm"
        />
        <Body numberOfLines={1} style={styles.creatorName}>
          {creator.displayName}
        </Body>
      </Pressable>

      <View style={styles.metaRow}>
        <Icon icon={MapPin} size="xs" color={theme.colors.text.tertiary} />
        <Caption numberOfLines={1} style={styles.metaText}>
          {place.name} · {place.city}
        </Caption>
      </View>

      <Caption color={theme.colors.text.tertiary}>Shared {formatDate(createdAt)}</Caption>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  title: {
    flex: 1,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  creatorName: {
    flexShrink: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xxs,
  },
  metaText: {
    flexShrink: 1,
  },
});
