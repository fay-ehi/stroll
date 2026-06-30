/**
 * Stroll — Collection Detail
 * app/(app)/collections/[id].tsx
 *
 * PRD §8.10 — Cover image, title, description, creator, Follow Collection
 * action, and the feed of Experiences inside it (collections contain
 * Experiences, not Places directly). Sprint 4: placeholder only.
 */

import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { PlaceholderScreen } from '@/components/placeholder/PlaceholderScreen';

export default function CollectionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <PlaceholderScreen
      title="Collection Detail"
      description={`Experiences inside collection "${id ?? 'unknown'}" will appear here.`}
    />
  );
}
