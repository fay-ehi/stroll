/**
 * Stroll — Experience Rail
 * src/components/discover/ExperienceRail.tsx
 *
 * Sprint 2 Prompt 3 extraction: a horizontally scrolling rail of
 * ExperienceCards, titled, with its own loading skeleton, generalized out
 * of Sprint 2 Prompt 2's `RelatedExperiences` component so "Continue
 * Exploring" (this sprint's requirement #2) can reuse the exact same UI
 * instead of a second near-identical component. `RelatedExperiences.tsx`
 * (src/components/experience-detail/) now wraps this with its own fixed
 * title/source — its own public props are unchanged, so nothing
 * upstream of it (app/(app)/experience/[id].tsx) needed to change.
 *
 * Lives in `components/discover/`, not a shared/cross-domain folder,
 * following the same precedent `ExperienceCard` itself already set —
 * that's the one component `experience-detail/` imports FROM `discover/`
 * (never the reverse), and this rail is built directly on it the same
 * way. Keeping every experience-card-consuming rail in one place avoids
 * needing a third "shared" location just for this.
 *
 * If there's nothing to show, this renders nothing at all rather than an
 * empty state — a titled section with zero content and no fix-it action
 * is just noise on a page/screen that's otherwise fully loaded.
 *
 * Gesture note (Discover swipe update): this rail can now sit inside
 * DiscoverScreen's <SwipeableTabs>, whose own horizontal pan gesture
 * lives on an ancestor view. Nothing extra is needed here on this
 * component's side to make that work correctly — SwipeableTabs' Pan
 * gesture is scoped with `.activeOffsetX([-10, 10]).failOffsetY([-10,
 * 10])`, and react-native-gesture-handler resolves competing gestures by
 * which one's activation criteria are met first as a touch moves; a
 * plain `FlatList`'s own built-in scroll responder still wins drags that
 * start on it in the ordinary case. If real-device testing turns up the
 * pager "stealing" drags that start on this rail, the fix belongs on
 * SwipeableTabs (e.g. `Gesture.Pan().blocksExternalGesture(...)` or a
 * simultaneous-handler ref to this rail), not here — keeping this
 * component's own gesture footprint at zero is what lets it work
 * standalone (e.g. on the Experience Detail screen's Related Experiences)
 * without pulling in a pager dependency it doesn't otherwise need.
 */

import React, { useCallback } from 'react';
import { View, FlatList, useWindowDimensions, StyleSheet } from 'react-native';
import { theme } from '@/theme';
import { H5 } from '@/components/ui';
import { ExperienceCard } from './ExperienceCard';
import { ExperienceCardSkeleton } from './ExperienceCardSkeleton';
import type { ExperienceCardModel } from '@/types/experience';
import type { ExperienceCardSource } from './ExperienceCard';

const CARD_WIDTH_RATIO = 0.6;

export interface ExperienceRailProps {
  title: string;
  experiences: ExperienceCardModel[];
  isLoading: boolean;
  /** Attached to each card's `experience_opened` analytics event — see ExperienceCard's doc. */
  source: ExperienceCardSource;
  /** Falls back to `title` if omitted — only affects the FlatList's own accessibility label, not anything visible. */
  accessibilityLabel?: string;
}

export function ExperienceRail({
  title,
  experiences,
  isLoading,
  source,
  accessibilityLabel,
}: ExperienceRailProps) {
  const { width: windowWidth } = useWindowDimensions();
  const cardWidth = windowWidth * CARD_WIDTH_RATIO;

  const renderItem = useCallback(
    ({ item }: { item: ExperienceCardModel }) => (
      <View style={{ width: cardWidth, marginRight: theme.spacing.md }}>
        <ExperienceCard experience={item} source={source} />
      </View>
    ),
    [cardWidth, source],
  );

  const keyExtractor = useCallback((item: ExperienceCardModel) => item.id, []);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <H5 style={styles.title}>{title}</H5>
        <View
          style={[styles.listContent, styles.skeletonRow]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <ExperienceCardSkeleton width={cardWidth} />
          <ExperienceCardSkeleton width={cardWidth} />
        </View>
      </View>
    );
  }

  if (experiences.length === 0) return null;

  return (
    <View style={styles.container}>
      <H5 style={styles.title}>{title}</H5>
      <FlatList
        data={experiences}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        // Performance (requirement #3) — a rail is short (≤10 items) and
        // entirely off the initial vertical viewport when it's the
        // Continue Exploring section, so there's no benefit to
        // incremental batch rendering here the way there is on the main
        // vertical feed; rendering it in one pass avoids a visible
        // pop-in as the user scrolls the rail itself.
        initialNumToRender={experiences.length}
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
});
