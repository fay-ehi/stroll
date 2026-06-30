/**
 * Stroll — Search Tab
 * app/(app)/(tabs)/search.tsx
 *
 * PRD §8.4 — Searches across Experiences, Collections, and Users.
 * Does not search Places directly (PRD §7: Place pages are not publicly
 * searchable). Sprint 4 scope: placeholder only.
 */

import React from 'react';
import { PlaceholderScreen } from '@/components/placeholder/PlaceholderScreen';

export default function SearchScreen() {
  return (
    <PlaceholderScreen
      title="Search"
      description="Search across Experiences, Collections, and Users will appear here."
    />
  );
}
