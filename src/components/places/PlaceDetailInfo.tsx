/**
 * Stroll — Place Detail Info
 * src/components/places/PlaceDetailInfo.tsx
 *
 * Renders directly below PlaceMapHero — ADR-001's order is Map → Name →
 * (optional) Category → Community Experiences → Collections, no separate
 * boxed "Address / City / State" block. Per the user's own request this
 * stays a single minimal, seamless line rather than a bulky info card.
 *
 * Category badge mirrors ExperienceDetailHeader.tsx's exact treatment
 * (`Badge` with `${emoji} ${label}`, variant="neutral") for visual
 * consistency between the two detail pages.
 *
 * Deliberately does NOT show rating, price level, opening hours,
 * verified/featured flags — types/place.ts's own module doc explains why
 * (PRD §8.8 "Intentionally Not Shown"; "Places are infrastructure,
 * Experiences are the hero").
 *
 * Only address + city are rendered, not "state" — the current `places`
 * table has no `state` column (see types/database.ts / PlaceRow), so
 * there's nothing to show yet. If a State field is wanted, it needs a
 * real migration + PlaceModel/PlaceRow field first, not a hardcoded UI
 * placeholder.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MapPin } from 'lucide-react-native';

import { theme } from '@/theme';
import { H2, Caption, Badge, Icon } from '@/components/ui';
import { getPlaceCategory } from '@/constants/places';
import type { PlaceModel } from '@/types/place';

export interface PlaceDetailInfoProps {
  place: PlaceModel;
}

export function PlaceDetailInfo({ place }: PlaceDetailInfoProps) {
  const category = getPlaceCategory(place.category);
  const locationLine = place.address ? `${place.address} · ${place.city}` : place.city;

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <H2 style={styles.title}>{place.name}</H2>
        {category ? <Badge label={`${category.emoji} ${category.label}`} variant="neutral" /> : null}
      </View>

      <View style={styles.metaRow}>
        <Icon icon={MapPin} size="xs" color={theme.colors.text.tertiary} />
        <Caption numberOfLines={1} style={styles.metaText} color={theme.colors.text.tertiary}>
          {locationLine}
        </Caption>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.xs,
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
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xxs,
  },
  metaText: {
    flexShrink: 1,
  },
});
