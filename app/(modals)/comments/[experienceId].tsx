/**
 * Stroll — Comment Sheet
 * app/(modals)/comments/[experienceId].tsx
 *
 * PRD §8 Modals — View and add comments on an Experience.
 * Sprint 4: placeholder only.
 */

import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { PlaceholderScreen } from '@/components/placeholder/PlaceholderScreen';

export default function CommentsModal() {
  const { experienceId } = useLocalSearchParams<{ experienceId: string }>();

  return (
    <PlaceholderScreen
      title="Comments"
      description={`Comments for experience "${experienceId ?? 'unknown'}" will appear here.`}
    />
  );
}
