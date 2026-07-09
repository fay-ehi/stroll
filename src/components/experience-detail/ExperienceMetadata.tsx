/**
 * Stroll — Experience Metadata
 * src/components/experience-detail/ExperienceMetadata.tsx
 *
 * Requirement #7 — Experience Metadata: "Category, Tags, Difficulty (if
 * applicable), Budget level, Best time to visit, Accessibility
 * indicators, Family friendly indicators. Only display fields that
 * exist. Avoid placeholder text for missing values."
 *
 * Taken literally: Difficulty, Best time to visit, and Accessibility
 * indicators have no backing field anywhere in this schema (neither
 * `experiences` nor `places` — see supabase/migrations/0002_experiences.sql
 * and src/types/place.ts) and this sprint's brief doesn't introduce any,
 * so none of the three are rendered — inventing UI for a field that
 * can't hold real data would be exactly the "placeholder text for
 * missing values" this requirement says to avoid.
 *
 * What DOES map onto real fields:
 *   - Category            → place.category (CategoryPreview)
 *   - Budget level         → experience.amountSpent (AMOUNT_SPENT_OPTIONS)
 *   - Tags                 → experience.goodForTags + vibeTags
 *   - "Family friendly"    → already expressible as a tag value
 *     ('Families' in goodForTags, 'Family Friendly' in vibeTags) rather
 *     than a separate boolean field — see constants/app.ts. No dedicated
 *     row is rendered for it; it simply appears in Tags like any other
 *     tag when a creator selected it.
 *
 * Visit type isn't explicitly named in this requirement's list, but it's
 * a real, populated field (PRD §8.7) with nowhere else on this page to
 * live, so it's included here alongside budget.
 *
 * Uses Badge, not Chip, for every value below — these are read-only
 * labels, not interactive filters/selections, which is exactly the
 * distinction Chip's own doc draws ("Do not use chips for navigation";
 * its accessibilityRole is always "button", which would be misleading
 * for a value that does nothing when pressed).
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '@/theme';
import { H5, Label, Badge } from '@/components/ui';
import type { ExperienceDetailModel } from '@/types/experience';

export interface ExperienceMetadataProps {
  experience: ExperienceDetailModel;
}

export function ExperienceMetadata({ experience }: ExperienceMetadataProps) {
  const { category, amountSpent, visitType, goodForTags, vibeTags } = experience;
  const tags = [...goodForTags, ...vibeTags];

  const hasAnyField = !!category || !!amountSpent || !!visitType || tags.length > 0;
  if (!hasAnyField) return null;

  return (
    <View style={styles.container}>
      <H5>Details</H5>

      {category || amountSpent || visitType ? (
        <View style={styles.row}>
          {category ? (
            <Badge label={`${category.emoji} ${category.label}`} variant="neutral" />
          ) : null}
          {visitType ? <Badge label={visitType} variant="neutral" /> : null}
          {amountSpent ? <Badge label={amountSpent} variant="neutral" /> : null}
        </View>
      ) : null}

      {tags.length > 0 ? (
        <View style={styles.tagsBlock}>
          <Label>Tags</Label>
          <View style={styles.row}>
            {tags.map((tag) => (
              <Badge key={tag} label={tag} variant="neutral" />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.sm,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  tagsBlock: {
    gap: theme.spacing.xs,
  },
});
