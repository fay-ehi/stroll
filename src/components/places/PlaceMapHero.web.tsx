/**
 * Stroll — Place Map Hero (Web)
 * src/components/places/PlaceMapHero.web.tsx
 *
 * Metro's automatic web counterpart to PlaceMapHero.native.tsx (see that
 * file's doc for the full ADR-001 hero rationale). `react-native-maps`
 * has no web implementation, and this app does build for web (app.json's
 * `web` block + the react-native-web dependency) — so rather than let a
 * web bundle try and fail to resolve a native-only module, the web build
 * never imports react-native-maps at all; it gets this file instead,
 * which renders the same honest static fallback PlaceMapHero.native.tsx
 * uses for its own invalid-coordinates case.
 */

import React from 'react';
import { PlaceMapFallback } from './PlaceMapFallback';

export interface PlaceMapHeroProps {
  latitude: number;
  longitude: number;
  name: string;
}

export function PlaceMapHero(_props: PlaceMapHeroProps) {
  return <PlaceMapFallback label="Map preview is available in the Stroll mobile app" />;
}
