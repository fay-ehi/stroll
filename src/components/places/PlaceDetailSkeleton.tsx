/**
 * Stroll — Place Detail Skeleton
 * src/components/places/PlaceDetailSkeleton.tsx
 *
 * Requirement #8 — Loading States: "Loading Place, Loading Experiences."
 * Shown only for the very first load of a given place id (no cached data
 * at all yet) — same convention as ExperienceDetailSkeleton.tsx, which
 * this mirrors section-for-section (map hero, title/category, community
 * experiences list) rather than a single generic spinner.
 *
 * Built entirely from existing Skeleton primitives + the Discover
 * domain's own ExperienceFeedSkeleton (reused as-is, not duplicated) for
 * the "Loading Experiences" portion — requirement #12's "reuse existing
 * Loading components."
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';

import { theme } from '@/theme';
import { Skeleton, SkeletonText } from '@/components/ui';
import { ExperienceFeedSkeleton } from '@/components/discover';
import { MAP_HERO_ASPECT_RATIO } from './PlaceMapFallback';

export function PlaceDetailSkeleton() {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {/* Map hero */}
      <Skeleton style={styles.mapHero} borderRadius={0} />

      <View style={styles.info}>
        {/* Title + category badge */}
        <View style={styles.titleRow}>
          <SkeletonText width="60%" />
          <Skeleton width={90} height={28} borderRadius={theme.radius.full} />
        </View>
        {/* Address / city line */}
        <SkeletonText width="45%" />
      </View>

      {/* Community Experiences */}
      <View style={styles.sectionHeader}>
        <SkeletonText width="55%" />
      </View>
      <ExperienceFeedSkeleton count={2} />
    </View>
  );
}

const styles = StyleSheet.create({
  mapHero: {
    width: '100%',
    aspectRatio: MAP_HERO_ASPECT_RATIO,
  },
  info: {
    padding: theme.layout.screenPaddingHorizontal,
    gap: theme.spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  sectionHeader: {
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
});
