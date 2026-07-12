/**
 * Stroll — Location Preview
 * src/components/experience-detail/LocationPreview.tsx
 *
 * Requirement #8 — Location Preview: "Place name, Address, Distance from
 * user (if available), Static preview."
 *
 * Distance from user isn't rendered — there's no geolocation
 * infrastructure anywhere in this app yet (no `expo-location`, no
 * "current position" hook), so it's genuinely "not available" rather
 * than a value being withheld. `PlaceModel.distanceKm` already exists as
 * an optional field for exactly this (populated today only by
 * useNearbyPlaces()); this component accepts it as an optional prop so
 * wiring it in later is additive, not a rewrite.
 *
 * "Static preview" is a real `MapView` (via LocationPreviewMap) centered
 * on `place.latitude/longitude`, with every gesture disabled — pan,
 * pinch-zoom, rotate, and pitch — so it reads as a picture of where the
 * place is, not a navigable map. Tapping the card (map included, since
 * the map itself doesn't intercept touches) navigates to the full Place
 * page, same as before.
 */

import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';

import { theme } from '@/theme';
import { H5, Body, Caption, Icon } from '@/components/ui';
import { ROUTES } from '@/constants/routes';
import { LocationPreviewMap } from './LocationPreviewMap';
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
          <LocationPreviewMap
            latitude={place.latitude}
            longitude={place.longitude}
            name={place.name}
          />
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
    height: 140,
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
