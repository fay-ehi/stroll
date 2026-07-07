/**
 * Stroll — Featured Carousel
 * src/components/discover/FeaturedCarousel.tsx
 *
 * The Discover screen's Featured section (this sprint's requirement #6):
 * horizontal scrolling, snapping, pagination indicators. Built on
 * ExperienceCard's 'featured' variant — no new card component, per this
 * sprint's "reuse existing... do not duplicate" architecture rule.
 *
 * Snap geometry: each card is 82% of the screen width so the next card
 * visibly peeks in from the edge (a standard carousel affordance that
 * signals "there's more" without needing a hint label).
 */

import React, { useCallback, useRef, useState } from 'react';
import { View, FlatList, StyleSheet, useWindowDimensions, type ViewToken } from 'react-native';

import { theme } from '@/theme';
import { ExperienceCard } from './ExperienceCard';
import type { ExperienceCardModel } from '@/types/experience';

const CARD_WIDTH_RATIO = 0.82;
const CARD_GAP = theme.spacing.md;

export interface FeaturedCarouselProps {
  experiences: ExperienceCardModel[];
}

export function FeaturedCarousel({ experiences }: FeaturedCarouselProps) {
  const { width: windowWidth } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);

  const cardWidth = windowWidth * CARD_WIDTH_RATIO;
  const snapInterval = cardWidth + CARD_GAP;

  // FlatList requires a stable reference for onViewableItemsChanged —
  // a new function identity on every render triggers a dev-time warning
  // and can silently stop viewability tracking from working at all.
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const firstVisible = viewableItems[0];
    if (firstVisible?.index != null) setActiveIndex(firstVisible.index);
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  const renderItem = useCallback(
    ({ item }: { item: ExperienceCardModel }) => (
      <View style={{ width: cardWidth, marginRight: CARD_GAP }}>
        <ExperienceCard experience={item} variant="featured" />
      </View>
    ),
    [cardWidth],
  );

  if (experiences.length === 0) return null;

  return (
    <View>
      <FlatList
        data={experiences}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={snapInterval}
        decelerationRate="fast"
        snapToAlignment="start"
        contentContainerStyle={styles.listContent}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        accessibilityLabel="Featured experiences"
      />

      {experiences.length > 1 ? (
        <View
          style={styles.dots}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {experiences.map((item, index) => (
            <View key={item.id} style={[styles.dot, index === activeIndex && styles.dotActive]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.xxs,
    marginTop: theme.spacing.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.neutral.border,
  },
  dotActive: {
    width: 18,
    backgroundColor: theme.colors.brand.primary,
  },
});
