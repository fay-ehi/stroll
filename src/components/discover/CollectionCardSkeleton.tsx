/**
 * Stroll — Collection Card Skeleton
 * src/components/discover/CollectionCardSkeleton.tsx
 *
 * Sprint 5 Prompt 4. Approximates CollectionCard's shape (cover image,
 * title, city, owner/meta row) the same way ExperienceCardSkeleton
 * approximates ExperienceCard — built entirely from the existing
 * Skeleton primitives, per Design System §34 ("Skeletons should resemble
 * the final layout"), so reduced-motion support comes for free.
 *
 * Didn't exist before this sprint because CollectionCard's only mount
 * (the Discover carousel, Sprint 5 Prompt 3) deliberately "renders
 * nothing if empty" and has no dedicated loading state of its own (see
 * CollectionCarousel.tsx / useCollectionsCarousel.ts). The Saved tab's
 * Collections section is different — requirement #10 explicitly asks for
 * "Loading saved items" as its own state, not a silent skip.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '@/theme';
import { Card, Skeleton, SkeletonCircle, SkeletonText } from '@/components/ui';

// Fixed pixel height, not aspectRatio — same reasoning as
// ExperienceCardSkeleton's own COVER_HEIGHT: Skeleton's default numeric
// height prop (16) composes safely with an explicit height override, but
// an aspectRatio passed via `style` alongside it would make Yoga ignore
// the aspectRatio entirely once a numeric height is also present.
// Approximates CollectionCard's own 16:10 cover at a typical two-column
// grid card width.
const COVER_HEIGHT = 120;

export interface CollectionCardSkeletonProps {
  width?: number;
}

export function CollectionCardSkeleton({ width }: CollectionCardSkeletonProps) {
  return (
    <View style={{ width }}>
      <Card variant="elevated" padding={0} style={styles.card}>
        <Skeleton height={COVER_HEIGHT} borderRadius={0} />
        <View style={styles.body}>
          <SkeletonText width="70%" />
          <SkeletonText width="40%" />
          <View style={styles.metaRow}>
            <SkeletonCircle diameter={32} />
            <SkeletonText width="45%" />
          </View>
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
  body: {
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xxs,
  },
});
