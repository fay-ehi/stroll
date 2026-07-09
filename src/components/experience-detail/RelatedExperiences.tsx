/**
 * Stroll — Related Experiences
 * src/components/experience-detail/RelatedExperiences.tsx
 *
 * Requirement #10 — Related Experiences: "Horizontally scrolling list of
 * related experiences. Reuse: ExperienceCard, Repository layer, Query
 * architecture."
 *
 * Sprint 2 Prompt 3 update: this is now a thin wrapper around the
 * generalized `ExperienceRail` (src/components/discover/ExperienceRail.tsx),
 * extracted once "Continue Exploring" needed the identical horizontal-
 * rail UI. This component's own props/behavior are unchanged — the
 * screen that renders it (app/(app)/experience/[id].tsx) didn't need any
 * changes for this refactor.
 */

import React from 'react';
import { ExperienceRail } from '@/components/discover';
import type { ExperienceCardModel } from '@/types/experience';

export interface RelatedExperiencesProps {
  experiences: ExperienceCardModel[];
  isLoading: boolean;
}

export function RelatedExperiences({ experiences, isLoading }: RelatedExperiencesProps) {
  return (
    <ExperienceRail
      title="More like this"
      experiences={experiences}
      isLoading={isLoading}
      source="related"
      accessibilityLabel="Related experiences"
    />
  );
}
