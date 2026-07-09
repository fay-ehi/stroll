/**
 * Stroll — Location Preview
 * src/components/experience-detail/LocationPreview.tsx
 *
 * Requirement #8 — Location Preview: "Place name, Address, Distance from
 * user (if available), Static preview. Do not build the interactive map
 * yet. Provide a clean architecture so Sprint 4 can replace this section
 * with a live map."
 *
 * Distance from user isn't rendered — there's no geolocation
 * infrastructure anywhere in this app yet (no `expo-location`, no
 * "current position" hook), so it's genuinely "not available" rather
 * than a value being withheld. `PlaceModel.distanceKm` already exists as
 * an optional field for exactly this (populated today only by
 * useNearbyPlaces()); this component accepts it as an optional prop so
 * wiring it in later is additive, not a rewrite.
 *
 * "Static preview" here is an honest placeholder box, not a screenshot —
 * faking a map image would be misleading. Tapping through to the full
 * Place page (which DOES exist as a route already) is real navigation,
 * not a placeholder — PRD §8: "Place pages are accessible only through:
 * An Experience (tapping the place tag)..." — this is exactly that tap.
 *
 * Clean architecture for Sprint 4: this component's public contract is
 * just `{ place, distanceKm? }` — the same props a `<PlaceMapPreview>`
 * (rendering a real `MapView` centered on `place.latitude/longitude`)
 * would need. Sprint 4 can add that component and swap which one
 * app/(app)/experience/[id].tsx renders without touching any prop shape
 * here or anywhere upstream of it.
 */

import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { MapPin, ChevronRight } from 'lucide-react-native';

import { theme } from '@/theme';
import { H5, Body, Caption, Icon } from '@/components/ui';
import { ROUTES } from '@/constants/routes';
import type { PlaceSummary } from '@/types/experience';

export interface LocationPreviewProps {
  place: PlaceSummary;
  /** Kilometers from the user's current position. Omitted whenever there's no location fix — see module doc. */
  distanceKm?: number;
}

export function LocationPreview({ place, distanceKm }: LocationPreviewProps) {
  const handlePress = () => {
    router.push(ROUTES.app.placeDetail(place.id) as never);
  };

  return (
    <View style={styles.container}>
      <H5>Location</H5>

      <Pressable
        onPress={handlePress}
        style={styles.card}
        accessibilityRole="button"
        accessibilityLabel={`View ${place.name} on its Place page`}
      >
        <View style={styles.mapPlaceholder}>
          <Icon icon={MapPin} size="lg" color={theme.colors.text.tertiary} />
          <Caption color={theme.colors.text.tertiary}>Map view coming soon</Caption>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.info}>
            <Body numberOfLines={1}>{place.name}</Body>
            {place.address ? (
              <Caption numberOfLines={1} color={theme.colors.text.tertiary}>
                {place.address}
              </Caption>
            ) : null}
            {distanceKm !== undefined ? (
              <Caption color={theme.colors.text.tertiary}>{distanceKm.toFixed(1)} km away</Caption>
            ) : null}
          </View>
          <Icon icon={ChevronRight} size="sm" color={theme.colors.text.tertiary} />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.sm,
  },
  card: {
    borderRadius: theme.radius.card,
    borderWidth: theme.borders.width,
    borderColor: theme.colors.neutral.border,
    overflow: 'hidden',
  },
  mapPlaceholder: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xxs,
    backgroundColor: theme.colors.neutral.backgroundSecondary,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  info: {
    flex: 1,
    gap: theme.spacing.xxs,
  },
});
