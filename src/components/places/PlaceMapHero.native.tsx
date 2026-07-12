/**
 * Stroll — Place Map Hero (iOS / Android)
 * src/components/places/PlaceMapHero.native.tsx
 *
 * ADR-001 "Place Pages": "The map itself becomes the visual header of
 * the page ... occupies the ⅓ top portion ... similar to modern
 * transportation/navigation applications (e.g. Bolt), though Stroll's
 * implementation does not need the same level of complexity." This
 * supersedes the original PRD's cover-image hero — see this repo's
 * ADR-001 PDF, the project's highest source of truth. Replaces
 * LocationPreview.tsx's "Map view coming soon" placeholder box, exactly
 * the swap-in point that component's own doc comment reserved for
 * Sprint 4.
 *
 * `.native.tsx` (not plain `.tsx`) so Metro only ever includes
 * react-native-maps — a real native module with no web implementation —
 * in the iOS/Android bundles. PlaceMapHero.web.tsx is Metro's automatic
 * counterpart for the web bundle; see that file's doc for why. Screens
 * import plain `./PlaceMapHero` and never know which one they got.
 *
 * A genuine `MapView`, not a static image — pan, pinch-zoom, and rotate
 * all work (react-native-maps' defaults; nothing disabled here). One
 * known trade-off worth flagging: this hero sits inside the Place Detail
 * screen's outer FlatList (app/(app)/place/[id].tsx), and a touch that
 * starts directly on the map can be captured by the map's own pan
 * gesture instead of the list's vertical scroll — a common, well-known
 * nesting quirk with any interactive map embedded in a scrolling page,
 * not a bug specific to this component. If that ever reads as more
 * annoying than delightful in practice, the fix is a one-line change
 * here (`scrollEnabled={false} zoomEnabled={false}`) rather than a
 * rearchitecture.
 *
 * Invalid/missing coordinates (`validateCoordinates()`, already defined
 * in types/place.ts) render PlaceMapFallback instead of handing MapView
 * a NaN region — requirement #9 (Error Handling).
 *
 * Memoized (`React.memo`) and `initialRegion` is itself memoized on
 * `[latitude, longitude]` — requirement #10 (Performance: "Avoid
 * unnecessary map rerenders").
 */

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { theme } from '@/theme';
import { validateCoordinates } from '@/types/place';
import { PlaceMapFallback, MAP_HERO_ASPECT_RATIO } from './PlaceMapFallback';

export interface PlaceMapHeroProps {
  latitude: number;
  longitude: number;
  /** Used for the marker title and accessibility labels — the screen renders the name as its own text below the map, this is just for the map/marker's own a11y contract. */
  name: string;
}

// A single place pin doesn't need much surrounding context — small
// enough to read as "here", not a whole neighborhood.
const INITIAL_DELTA = 0.01;

function PlaceMapHeroComponent({ latitude, longitude, name }: PlaceMapHeroProps) {
  const validation = useMemo(
    () => validateCoordinates(latitude, longitude),
    [latitude, longitude],
  );

  const initialRegion = useMemo(
    () => ({
      latitude,
      longitude,
      latitudeDelta: INITIAL_DELTA,
      longitudeDelta: INITIAL_DELTA,
    }),
    [latitude, longitude],
  );

  if (!validation.valid) {
    return <PlaceMapFallback label="Map location unavailable" />;
  }

  return (
    <View style={styles.container}>
      <MapView
        style={StyleSheet.absoluteFillObject}
        initialRegion={initialRegion}
        showsUserLocation={false}
        accessibilityLabel={`Map showing ${name}'s location`}
      >
        <Marker
          coordinate={{ latitude, longitude }}
          title={name}
          accessibilityLabel={`${name} location pin`}
        />
      </MapView>
    </View>
  );
}

export const PlaceMapHero = React.memo(PlaceMapHeroComponent);

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: MAP_HERO_ASPECT_RATIO,
    overflow: 'hidden',
    backgroundColor: theme.colors.neutral.backgroundSecondary,
  },
});
