/**
 * Stroll — Recommended Results
 * src/components/search/RecommendedResults.tsx
 *
 * Sprint 7 Prompt 2 — Smart Search & Discovery. Renders the "you might
 * like" content backing three related requirements at once:
 *   - "Recommended Collections" / "Recommended Experiences" — shown when
 *     that section has no exact matches.
 *   - The "Suggested Results" entry in the prompt's own required Search
 *     Sections order (Experiences → Collections → Creators → Suggested
 *     Results) — this component IS that fourth section, appended after
 *     Creators whenever there's anything left to recommend.
 *   - "No Results Enhancement" — reused as the main content of the
 *     enhanced no-results state (search.tsx passes a different
 *     title/description in that case; the item rendering is identical).
 *
 * Deliberately reuses ExperienceCard/CollectionCard directly (the same
 * components SearchSection's results already render) rather than a
 * lighter/different card treatment — this codebase's Design System §24
 * is explicit that ExperienceCard "is the most important reusable
 * component... every screen displaying experiences should use
 * [it]", and a recommendation is still exactly that: an Experience.
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { theme } from '@/theme';
import { H5, BodySmall } from '@/components/ui';
import { ExperienceCard, CollectionCard } from '@/components/discover';
import { router } from 'expo-router';
import { ROUTES } from '@/constants/routes';
import { getCollectionCardWidth } from './collectionGridWidth';
import type { ExperienceCardModel } from '@/types/experience';
import type { CollectionCardModel } from '@/types/collection';

export interface RecommendedResultsProps {
  /** Section heading — "You might also like" alongside real results, or a friendlier no-results framing when this is the only content on screen (see search.tsx). Pass an empty string to render no heading at all — used when a surrounding EmptyState already supplies the framing. */
  title?: string;
  experiences: ExperienceCardModel[];
  collections: CollectionCardModel[];
}

export function RecommendedResults({
  title = 'You might also like',
  experiences,
  collections,
}: RecommendedResultsProps) {
  const { width: windowWidth } = useWindowDimensions();
  const collectionCardWidth = useMemo(() => getCollectionCardWidth(windowWidth), [windowWidth]);

  if (experiences.length === 0 && collections.length === 0) return null;

  const handleSelectCollection = (collection: CollectionCardModel) => {
    router.push(ROUTES.app.collectionDetail(collection.id));
  };

  return (
    <View style={styles.section}>
      {title ? (
        <View style={styles.header}>
          <H5>{title}</H5>
        </View>
      ) : null}

      {experiences.length > 0 ? (
        <View style={styles.stack}>
          {experiences.map((experience) => (
            <ExperienceCard key={experience.id} experience={experience} source="search" />
          ))}
        </View>
      ) : null}

      {collections.length > 0 ? (
        <View style={[styles.wrap, experiences.length > 0 && styles.wrapSpacing]}>
          {collections.map((collection) => (
            <CollectionCard
              key={collection.id}
              collection={collection}
              onPress={handleSelectCollection}
              style={{ width: collectionCardWidth, maxWidth: collectionCardWidth }}
            />
          ))}
        </View>
      ) : null}

      <BodySmall color={theme.colors.text.tertiary} style={styles.footnote}>
        Based on what's related to your search.
      </BodySmall>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: theme.spacing.xxl,
  },
  header: {
    marginBottom: theme.spacing.sm,
  },
  stack: {
    gap: theme.spacing.md,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  wrapSpacing: {
    marginTop: theme.spacing.md,
  },
  footnote: {
    marginTop: theme.spacing.sm,
  },
});
