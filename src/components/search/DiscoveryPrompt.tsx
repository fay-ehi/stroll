/**
 * Stroll — Discovery Prompt
 * src/components/search/DiscoveryPrompt.tsx
 *
 * Sprint 7 Prompt 2 — Smart Search & Discovery, "Empty Search Enhancement":
 * "When no query exists, show inspiration instead of an empty screen...
 * Continue Exploring, Recently Saved Collections, Suggested Experiences...
 * This should encourage discovery before the user even searches."
 *
 * Data comes entirely from `useSearchInspiration()` (hooks/useSearch.ts),
 * which itself composes three hooks this app already has — see that
 * hook's own doc for exactly which. This component's only job is
 * deciding what to render with what that hook returns:
 *   - Any section with items renders (heading + a short, vertical stack
 *     — NOT the horizontal ExperienceRail/CollectionCarousel components,
 *     which are built for the unpadded, full-bleed screens they already
 *     appear on (Discover, Experience Detail); nesting one inside this
 *     screen's own padded ScreenContainer would double the horizontal
 *     inset. A vertical stack matches how this same screen's own
 *     SearchSection results already render, so the whole screen reads
 *     as one consistent layout whether or not a query is active).
 *   - A section still loading (and not yet known to be empty) is left
 *     out rather than reserving space for it — with three independent
 *     hooks resolving at different times, showing/hiding sections as
 *     each one settles reads as content arriving, not layout jumping
 *     (loading only shows once, for the very first section to resolve,
 *     never a stacked skeleton per section).
 *   - If every section is empty (a brand new account: no interests, no
 *     recent categories, no saved Collections) once ALL three have
 *     settled, this falls back to Sprint 7 Prompt 1's original static
 *     empty state — a person with genuinely nothing to be inspired by
 *     yet still sees a clear, honest prompt rather than a blank gap.
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { Compass } from 'lucide-react-native';

import { theme } from '@/theme';
import { H5, EmptyState } from '@/components/ui';
import { ExperienceCard, CollectionCard, ExperienceFeedSkeleton } from '@/components/discover';
import { useSearchInspiration } from '@/hooks/useSearch';
import { ROUTES } from '@/constants/routes';
import { getCollectionCardWidth } from './collectionGridWidth';
import type { CollectionCardModel } from '@/types/collection';

const PREVIEW_EXPERIENCE_COUNT = 3;

export function DiscoveryPrompt() {
  const { continueExploring, suggestedExperiences, savedCollections } = useSearchInspiration();
  const { width: windowWidth } = useWindowDimensions();
  const collectionCardWidth = useMemo(() => getCollectionCardWidth(windowWidth), [windowWidth]);

  const isLoading =
    continueExploring.isLoading || suggestedExperiences.isLoading || savedCollections.isLoading;
  const hasAnyContent =
    continueExploring.experiences.length > 0 ||
    suggestedExperiences.experiences.length > 0 ||
    savedCollections.collections.length > 0;

  const handleSelectCollection = (collection: CollectionCardModel) => {
    router.push(ROUTES.app.collectionDetail(collection.id));
  };

  if (isLoading && !hasAnyContent) {
    return <ExperienceFeedSkeleton count={2} />;
  }

  if (!isLoading && !hasAnyContent) {
    return (
      <EmptyState
        icon={Compass}
        title="Discover your next experience"
        description="Search for experiences, collections, or creators."
      />
    );
  }

  return (
    <View>
      {continueExploring.experiences.length > 0 ? (
        <View style={styles.section}>
          <H5 style={styles.header}>Continue Exploring</H5>
          <View style={styles.stack}>
            {continueExploring.experiences.slice(0, PREVIEW_EXPERIENCE_COUNT).map((experience) => (
              <ExperienceCard key={experience.id} experience={experience} source="continue_exploring" />
            ))}
          </View>
        </View>
      ) : null}

      {savedCollections.collections.length > 0 ? (
        <View style={styles.section}>
          <H5 style={styles.header}>Recently Saved Collections</H5>
          <View style={styles.wrap}>
            {savedCollections.collections.map((collection) => (
              <CollectionCard
                key={collection.id}
                collection={collection}
                onPress={handleSelectCollection}
                style={{ width: collectionCardWidth, maxWidth: collectionCardWidth }}
              />
            ))}
          </View>
        </View>
      ) : null}

      {suggestedExperiences.experiences.length > 0 ? (
        <View style={styles.section}>
          <H5 style={styles.header}>Suggested Experiences</H5>
          <View style={styles.stack}>
            {suggestedExperiences.experiences.slice(0, PREVIEW_EXPERIENCE_COUNT).map((experience) => (
              <ExperienceCard key={experience.id} experience={experience} source="discover_feed" />
            ))}
          </View>
        </View>
      ) : null}
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
});
