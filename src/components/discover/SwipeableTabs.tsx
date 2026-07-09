/**
 * Stroll — Swipeable Tabs
 * src/components/discover/SwipeableTabs.tsx
 *
 * Generic two-panel horizontal pager, purpose-built for Discover's
 * For You / Following tabs (Instagram/TikTok-style: tap the label OR
 * swipe the content to switch). Kept generic (panels passed as props,
 * no knowledge of "for-you"/"following") so it isn't tangled up with
 * Discover's feed-fetching logic — it only owns the gesture + animation.
 *
 * Why not a library pager (e.g. react-native-pager-view): the two panels
 * here have very different shapes (one's a paginated FlatList, the other
 * a static empty state) and Discover already needs fine control over
 * when each is mounted — react-native-gesture-handler + reanimated are
 * already dependencies, so a small local implementation avoids adding a
 * new one for what's fundamentally one horizontal drag.
 *
 * Both panels stay mounted simultaneously (side by side inside a 2x-wide
 * row) rather than swapping content on switch — this is what makes the
 * drag feel continuous instead of jumping. `activeIndex` is fully
 * controlled by the parent so tapping DiscoverTabs' labels and swiping
 * the content stay in sync through the same piece of state.
 *
 * IMPORTANT — what belongs in `first`/`second`: only the content that's
 * genuinely different per tab (the feed itself). Any chrome shared by
 * both tabs (top bar, the DiscoverTabs control itself) must be rendered
 * ONCE by the parent, ABOVE this component — never duplicated inside
 * both panels. (An earlier version of Discover got this wrong: it built
 * a full header — top bar + tabs — separately for each panel, so with
 * both panels mounted side by side the user saw two of everything at
 * once mid-swipe. `dragProgress` below exists specifically so that
 * shared header can still show a live swipe-tracking indicator without
 * needing to live inside the pager.)
 *
 * `dragProgress` (optional): a Reanimated SharedValue<number> the parent
 * creates via `useSharedValue(0)` and passes in. This component drives
 * it — 0 = fully showing `first`, 1 = fully showing `second`, and every
 * value in between while a drag is in progress. A sibling header (e.g.
 * DiscoverTabs) reads the same shared value to animate its underline in
 * lockstep with the actual drag, entirely on the UI thread — no React
 * re-renders, no risk of the indicator lagging the finger.
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
  type SharedValue,
} from 'react-native-reanimated';

export interface SwipeableTabsProps {
  activeIndex: 0 | 1;
  onChangeIndex: (index: 0 | 1) => void;
  first: React.ReactNode;
  second: React.ReactNode;
  /** Disables the pan gesture (swipe) while still allowing controlled index changes — e.g. while the first panel's own inner FlatList needs sole ownership of horizontal gestures, or during a nested horizontal rail's own drag. Defaults to false. */
  swipeDisabled?: boolean;
  /** See module doc — lets an external header (DiscoverTabs) track the live drag position for its underline. Optional so this component works standalone without one. */
  dragProgress?: SharedValue<number>;
}

// How far (as a fraction of screen width) a drag has to travel, or how
// fast it has to be flung, before it counts as a deliberate tab switch
// rather than a scroll/tap that should snap back.
const COMMIT_DISTANCE_RATIO = 0.32;
const COMMIT_VELOCITY = 800;

export function SwipeableTabs({
  activeIndex,
  onChangeIndex,
  first,
  second,
  swipeDisabled = false,
  dragProgress,
}: SwipeableTabsProps) {
  const { width } = useWindowDimensions();
  const translateX = useSharedValue(-activeIndex * width);
  // Always call this hook (Rules of Hooks) — a `dragProgress ?? useSharedValue(0)`
  // one-liner would skip the hook call whenever a value IS passed in,
  // which changes the hook-call count between renders depending on props.
  // Instead: always create the internal fallback, then just choose which
  // one every subsequent read/write below actually uses.
  const internalProgress = useSharedValue(0);
  const progress = dragProgress ?? internalProgress;

  // Keep both the panel position AND the externally-visible progress in
  // sync when activeIndex changes from outside (tapping a DiscoverTabs
  // label) rather than from this component's own gesture.
  useEffect(() => {
    translateX.value = withSpring(-activeIndex * width, {
      damping: 24,
      stiffness: 220,
    });
    progress.value = withSpring(activeIndex, { damping: 24, stiffness: 220 });
  }, [activeIndex, width, translateX, progress]);

  const commitIndex = (index: 0 | 1) => {
    onChangeIndex(index);
  };

  const pan = Gesture.Pan()
    .enabled(!swipeDisabled)
    // Only claims the gesture once the drag is clearly horizontal —
    // leaves vertical scroll (the feed itself) alone.
    .activeOffsetX([-10, 10])
    .failOffsetY([-10, 10])
    .onUpdate((event) => {
      const base = -activeIndex * width;
      const next = base + event.translationX;
      // Rubber-band past the edges instead of over-dragging past index 0/1.
      const min = -width;
      const max = 0;
      const clamped = Math.min(max, Math.max(min, next));
      translateX.value = clamped;
      // -clamped/width maps [0, width] → [0, 1], matching activeIndex's
      // own 0/1 scale exactly, so the header underline and the panel
      // track move by the same amount at every point in the drag.
      progress.value = -clamped / width;
    })
    .onEnd((event) => {
      const draggedRatio = event.translationX / width;
      const shouldCommitForward =
        activeIndex === 0 &&
        (draggedRatio < -COMMIT_DISTANCE_RATIO || event.velocityX < -COMMIT_VELOCITY);
      const shouldCommitBack =
        activeIndex === 1 &&
        (draggedRatio > COMMIT_DISTANCE_RATIO || event.velocityX > COMMIT_VELOCITY);

      const nextIndex: 0 | 1 = shouldCommitForward ? 1 : shouldCommitBack ? 0 : activeIndex;

      translateX.value = withSpring(-nextIndex * width, { damping: 24, stiffness: 220 });
      progress.value = withSpring(nextIndex, { damping: 24, stiffness: 220 });
      if (nextIndex !== activeIndex) {
        runOnJS(commitIndex)(nextIndex);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.track, { width: width * 2 }, animatedStyle]}>
        <View style={[styles.panel, { width }]}>{first}</View>
        <View style={[styles.panel, { width }]}>{second}</View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  track: {
    flex: 1,
    flexDirection: 'row',
  },
  panel: {
    flex: 1,
  },
});
