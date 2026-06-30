/**
 * Stroll — Experience Detail
 * app/(app)/experience/[id].tsx
 *
 * PRD §8.6 — Full view of an Experience post: photos, story, metadata,
 * vibe tags, engagement, comments. Sprint 4: placeholder only.
 */

import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { PlaceholderScreen } from '@/components/placeholder/PlaceholderScreen';

export default function ExperienceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <PlaceholderScreen
      title="Experience Detail"
      description={`The full story for experience "${id ?? 'unknown'}" will appear here.`}
    />
  );
}
