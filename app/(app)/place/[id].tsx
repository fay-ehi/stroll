/**
 * Stroll — Place Detail
 * app/(app)/place/[id].tsx
 *
 * PRD §8.8 — Place pages are community-generated surfaces, not directory
 * listings. Reachable only via an Experience's place tag, a Collection,
 * or Saved Places — never publicly searchable. Sprint 4: placeholder only.
 */

import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { PlaceholderScreen } from '@/components/placeholder/PlaceholderScreen';

export default function PlaceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <PlaceholderScreen
      title="Place Detail"
      description={`Community experiences for place "${id ?? 'unknown'}" will appear here.`}
    />
  );
}
