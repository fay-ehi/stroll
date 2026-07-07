/**
 * Stroll — Experience Card Skeleton
 * src/components/discover/ExperienceCardSkeleton.tsx
 *
 * Design System §34 — Loading States: "Skeletons should resemble the
 * final layout." Approximates ExperienceCard's shape (cover image,
 * location line, title, two lines of story, creator row) the same way
 * PlaceCardSkeleton approximates PlaceCard — built entirely from the
 * existing Skeleton primitives, so reduced-motion support comes for free.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '@/theme';
import { Card, Skeleton, SkeletonCircle, SkeletonText } from '@/components/ui';
import type { ExperienceCardVariant } from './ExperienceCard';

// Fixed pixel heights, not aspectRatio — same reasoning as
// PlaceCardSkeleton's CARD_IMAGE_HEIGHT: a skeleton just needs to
// "resemble the final layout" (Design System §34), not be pixel-perfect
// responsive, and a fixed height composes safely with Skeleton's own
// default numeric height prop (aspectRatio + an explicit height together
// would make Yoga ignore the aspectRatio entirely).
const COVER_HEIGHT: Record<ExperienceCardVariant, number> = {
  standard: 220,
  featured: 200,
};

export interface ExperienceCardSkeletonProps {
  variant?: ExperienceCardVariant;
  width?: number;
}

export function ExperienceCardSkeleton({
  variant = 'standard',
  width,
}: ExperienceCardSkeletonProps) {
  return (
    <View style={{ width }}>
      <Card variant="elevated" padding={0} style={styles.card}>
        <Skeleton height={COVER_HEIGHT[variant]} borderRadius={0} />
        <View style={styles.content}>
          <SkeletonText width="40%" />
          <SkeletonText width="70%" />
          <SkeletonText width="90%" />
          <SkeletonText width="55%" />
          <View style={styles.creatorRow}>
            <SkeletonCircle diameter={32} />
            <SkeletonText width="35%" />
          </View>
        </View>
      </Card>
    </View>
  );
}

export interface ExperienceFeedSkeletonProps {
  /** How many card skeletons to render. Defaults to 3. */
  count?: number;
}

/** A vertical stack of feed-card skeletons — the Discover screen's initial loading state for the feed section. */
export function ExperienceFeedSkeleton({ count = 3 }: ExperienceFeedSkeletonProps) {
  return (
    <View
      style={styles.list}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {Array.from({ length: count }, (_, index) => (
        <ExperienceCardSkeleton key={index} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
  content: {
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xxs,
  },
  list: {
    gap: theme.spacing.lg,
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
  },
});
