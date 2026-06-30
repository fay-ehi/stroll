/**
 * Stroll — Place Search
 * app/(modals)/place-search.tsx
 *
 * PRD §8.7 — Used during Experience creation. Users search and select
 * from the external provider database (Google Places API / Mapbox);
 * they cannot freely type a place name. Sprint 4: placeholder only.
 */

import React from 'react';
import { PlaceholderScreen } from '@/components/placeholder/PlaceholderScreen';

export default function PlaceSearchModal() {
  return (
    <PlaceholderScreen
      title="Search for a Place"
      description="Search results from the place provider database will appear here."
    />
  );
}
