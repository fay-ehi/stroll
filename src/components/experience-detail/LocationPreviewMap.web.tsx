/**
 * Stroll — Location Preview Map (Web)
 * src/components/experience-detail/LocationPreviewMap.web.tsx
 *
 * Metro's automatic web counterpart to LocationPreviewMap.native.tsx —
 * `react-native-maps` has no web implementation, so the web bundle never
 * imports it; it gets this static fallback instead. Mirrors
 * PlaceMapHero.web.tsx's same pattern for the Place Detail hero.
 */

import React from 'react';
import { LocationPreviewMapFallback } from './LocationPreviewMapFallback';

export interface LocationPreviewMapProps {
  latitude: number;
  longitude: number;
  name: string;
}

export function LocationPreviewMap(_props: LocationPreviewMapProps) {
  return <LocationPreviewMapFallback label="Map preview is available in the Stroll mobile app" />;
}
