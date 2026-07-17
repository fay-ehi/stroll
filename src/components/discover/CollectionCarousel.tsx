/**
 * Stroll — Collection Carousel
 * src/components/discover/CollectionCarousel.tsx
 *
 * Mounted in the Discover feed as of Sprint 5 Prompt 3 — see
 * app/(app)/(tabs)/discover.tsx's `forYouHeader`, which renders this
 * fed by useCollectionsCarousel({ city }).
 *
 * Structurally a near-copy of ExperienceRail.tsx (horizontal FlatList of
 * cards, titled, own loading skeleton, renders nothing if empty) — kept
 * as its own component rather than a generic "Rail<T>" because
 * CollectionCard's layout (image + title + city + owner/collaborator
 * avatars + spot count) is different enough from ExperienceCard that a
 * shared generic rail would need to know too much about both card
 * shapes to stay simple. "Renders nothing if empty" is a deliberate,
 * silent degrade for a home-screen rail — matches ExperienceRail's own
 * behavior and requirement #10's "Repository failures / Supabase
 * failures / Network failures" for this surface: useCollectionsCarousel
 * surfaces `isError` too, but a home-screen carousel failing shouldn't
 * block or alarm the rest of Discover, so an errored fetch degrades to
 * the same empty `collections = []` render as "no public collections
 * yet" rather than its own error banner.
 */

import React, { useCallback } from 'react';
import { View, FlatList, useWindowDimensions, StyleSheet } from 'react-native';
import { theme } from '@/theme';
import { H5 } from '@/components/ui';
import { CollectionCard } from './CollectionCard';
import type { CollectionCardModel } from '@/types/collection';

const CARD_WIDTH_RATIO = 0.72;

export interface CollectionCarouselProps {
  title?: string;
  collections: CollectionCardModel[];
  isLoading: boolean;
  onSelectCollection?: (collection: CollectionCardModel) => void;
  accessibilityLabel?: string;
}

export function CollectionCarousel({
  title = 'Collections',
  collections,
  isLoading,
  onSelectCollection,
  accessibilityLabel,
}: CollectionCarouselProps) {
  const { width: windowWidth } = useWindowDimensions();
  const cardWidth = windowWidth * CARD_WIDTH_RATIO;

  const renderItem = useCallback(
    ({ item }: { item: CollectionCardModel }) => (
      <CollectionCard
        collection={item}
        onPress={onSelectCollection}
        style={{ width: cardWidth, marginRight: theme.spacing.md }}
      />
    ),
    [cardWidth, onSelectCollection],
  );

  const keyExtractor = useCallback((item: CollectionCardModel) => item.id, []);

  if (isLoading) {
    // Reuses the same skeleton block shape ExperienceRail's loading state
    // uses (two placeholder-width boxes) rather than a dedicated
    // CollectionCardSkeleton — revisit if/when this ships for real and a
    // pixel-accurate skeleton matters.
    return (
      <View style={styles.container}>
        <H5 style={styles.title}>{title}</H5>
        <View
          style={[styles.listContent, styles.skeletonRow]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <View style={[styles.skeletonBlock, { width: cardWidth }]} />
          <View style={[styles.skeletonBlock, { width: cardWidth }]} />
        </View>
      </View>
    );
  }

  if (collections.length === 0) return null;

  return (
    <View style={styles.container}>
      <H5 style={styles.title}>{title}</H5>
      <FlatList
        data={collections}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        initialNumToRender={collections.length}
        accessibilityLabel={accessibilityLabel ?? title}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.sm,
  },
  title: {
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
  },
  listContent: {
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
  },
  skeletonRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  skeletonBlock: {
    height: 180,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.neutral.border,
  },
});
