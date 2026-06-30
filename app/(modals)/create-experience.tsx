/**
 * Stroll — Create Experience
 * app/(modals)/create-experience.tsx
 *
 * PRD §8.7 — The most important creation flow. Opened via the center
 * Create button in the bottom navigation. Workflow: Search Place → Select
 * Place → Upload Photos → Write Experience → Add Metadata → Add To
 * Collection → Publish. Sprint 4: placeholder only.
 */

import React from 'react';
import { PlaceholderScreen } from '@/components/placeholder/PlaceholderScreen';

export default function CreateExperienceModal() {
  return (
    <PlaceholderScreen
      title="Create Experience"
      description="Search a place, add photos, and write your experience here."
    />
  );
}
