/**
 * Stroll — Location Preview Map (iOS / Android)
 * src/components/experience-detail/LocationPreviewMap.native.tsx
 *
 * Renders the small static map inside LocationPreview's place card (the
 * card on the Experience Detail screen — not to be confused with
 * PlaceMapHero, which is the full interactive map on the Place Detail
 * screen). Replaces the old "Map view coming soon" placeholder box.
 *
 * Deliberately NON-interactive: this is a preview, not a navigable map.
 * All gestures are disabled (scroll/zoom/rotate/pitch), the marker has no
 * callout, and the whole thing sits under a transparent Pressable
 * overlay (the parent LocationPreview card is already one big Pressable
 * that navigates to the Place page) so a stray touch can never pan or
 * zoom the map out from under that tap-through — it just always reads as
 * "here's a picture of where this is."
 *
 * `.native.tsx` (not plain `.tsx`) so Metro only bundles
 * `react-native-maps` — a native-only module — for iOS/Android; see
 * LocationPreviewMap.web.tsx for the web counterpart and
 * PlaceMapHero.native.tsx (the other consumer of this same pattern) for
 * the fuller rationale.
 *
 * Invalid/missing coordinates fall back to the same static box the
 * placeholder used to always show — see LocationPreview.tsx.
 */

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { theme } from '@/theme';
import { validateCoordinates } from '@/types/place';
import { LocationPreviewMapFallback } from './LocationPreviewMapFallback';

export interface LocationPreviewMapProps {
  latitude: number;
  longitude: number;
  name: string;
}

// Tight enough to read as "this specific spot", matching PlaceMapHero's
// own single-pin framing.
const INITIAL_DELTA = 0.01;

function LocationPreviewMapComponent({ latitude, longitude, name }: LocationPreviewMapProps) {
  const validation = useMemo(() => validateCoordinates(latitude, longitude), [latitude, longitude]);

  const region = useMemo(
    () => ({
      latitude,
      longitude,
      latitudeDelta: INITIAL_DELTA,
      longitudeDelta: INITIAL_DELTA,
    }),
    [latitude, longitude],
  );

  if (!validation.valid) {
    return <LocationPreviewMapFallback label="Map location unavailable" />;
  }

  return (
    <View style={styles.container} pointerEvents="none">
      <MapView
        style={StyleSheet.absoluteFillObject}
        region={region}
        // Non-interactive: a static preview, not a navigable map.
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        showsUserLocation={false}
        showsCompass={false}
        toolbarEnabled={false}
        accessibilityLabel={`Static map showing ${name}'s location`}
      >
        <Marker coordinate={{ latitude, longitude }} title={name} tappable={false} />
      </MapView>
    </View>
  );
}

export const LocationPreviewMap = React.memo(LocationPreviewMapComponent);

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.neutral.backgroundSecondary,
  },
});
