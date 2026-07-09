/**
 * Stroll — Collection Carousel (Skeleton)
 * src/components/discover/CollectionCarousel.tsx
 *
 * STATUS: Built, tested (type-checked), and NOT rendered anywhere yet —
 * see src/types/collection.ts's module doc for the full picture and the
 * concrete steps to make this live.
 *
 * Structurally a near-copy of ExperienceRail.tsx (horizontal FlatList of
 * cards, titled, own loading skeleton, renders nothing if empty) — kept
 * as its own component rather than a generic "Rail<T>" because
 * CollectionCard's layout (image + title + city + owner/collaborator
 * avatars + spot count) is different enough from ExperienceCard that a
 * shared generic rail would need to know too much about both card
 * shapes to stay simple.
 *
 * ── How to turn this on (future sprint) ──
 * In app/(app)/(tabs)/discover.tsx's `forYouHeader`, replace the
 * "Collections carousel slot" comment with:
 *
 *   const { collections, isLoading } = useCollectionsCarousel({ city });
 *   ...
 *   <CollectionCarousel
 *     collections={collections}
 *     isLoading={isLoading}
 *   />
 *
 * (import useCollectionsCarousel from '@/hooks/useCollectionsCarousel',
 * CollectionCarousel from '@/components/discover'.) That's the entire
 * wiring — everything else (types, mock data, hook, card, this rail) is
 * already built and type-checked.
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
