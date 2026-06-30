/**
 * Stroll — Discover Tab
 * app/(app)/(tabs)/discover.tsx
 *
 * PRD §8.3 — Default landing screen after onboarding. Two tabs in the
 * real implementation: For You (community-wide) and Following
 * (personalised). Sprint 4 scope: placeholder only.
 */

import React from 'react';
import { PlaceholderScreen } from '@/components/placeholder/PlaceholderScreen';

export default function DiscoverScreen() {
  return (
    <PlaceholderScreen
      title="Discover"
      description="The default landing screen — For You and Following feeds will appear here."
    />
  );
}
