/**
 * Stroll — Experience Detail Skeleton
 * src/components/experience-detail/ExperienceDetailSkeleton.tsx
 *
 * Requirement #12 — Loading States: "dedicated skeleton layouts for the
 * Experience Details page. Include skeletons for: Hero image, Title,
 * Metadata, Description, Related experiences. Reuse existing Skeleton
 * components."
 *
 * Shown only for the very first load of a given experience id (no cached
 * data at all yet) — a background refetch of an already-displayed
 * experience never falls back to this, same convention as the Discover
 * feed's skeleton vs. its toast-on-refetch-failure split.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '@/theme';
import { Skeleton, SkeletonText, SkeletonCircle } from '@/components/ui';

export function ExperienceDetailSkeleton() {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {/* Hero image */}
      <Skeleton style={styles.hero} borderRadius={0} />

      <View style={styles.body}>
        {/* Title + category badge */}
        <SkeletonText width="70%" />
        <Skeleton width={90} height={28} borderRadius={theme.radius.full} style={styles.badge} />

        {/* Creator row */}
        <View style={styles.creatorRow}>
          <SkeletonCircle diameter={32} />
          <SkeletonText width="35%" />
        </View>

        {/* Metadata row */}
        <View style={styles.metaRow}>
          <Skeleton width={80} height={28} borderRadius={theme.radius.full} />
          <Skeleton width={100} height={28} borderRadius={theme.radius.full} />
        </View>

        {/* Description */}
        <View style={styles.description}>
          <SkeletonText width="100%" />
          <SkeletonText width="95%" />
          <SkeletonText width="80%" />
        </View>

        {/* Related experiences */}
        <View style={styles.relatedRow}>
          <Skeleton width={160} height={200} />
          <Skeleton width={160} height={200} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    width: '100%',
    height: 320,
  },
  body: {
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  badge: {
    marginTop: theme.spacing.xxs,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  description: {
    gap: theme.spacing.xs,
  },
  relatedRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
});
