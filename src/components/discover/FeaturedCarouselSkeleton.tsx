/**
 * Stroll — Featured Carousel Skeleton
 * src/components/discover/FeaturedCarouselSkeleton.tsx
 *
 * Loading state for the Featured section — a static row of
 * ExperienceCardSkeleton ('featured' variant), sized identically to
 * FeaturedCarousel's real cards so the layout doesn't jump when the
 * query resolves. Not scrollable (nothing to scroll to yet), and hidden
 * from screen readers the same way ExperienceFeedSkeleton is — a loading
 * placeholder has nothing meaningful to announce.
 */

import React from 'react';
import { ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { theme } from '@/theme';
import { ExperienceCardSkeleton } from './ExperienceCardSkeleton';

const CARD_WIDTH_RATIO = 0.82;

export function FeaturedCarouselSkeleton() {
  const { width: windowWidth } = useWindowDimensions();
  const cardWidth = windowWidth * CARD_WIDTH_RATIO;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      scrollEnabled={false}
      contentContainerStyle={styles.content}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {[0, 1].map((index) => (
        <ExperienceCardSkeleton key={index} variant="featured" width={cardWidth} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    gap: theme.spacing.md,
  },
});
