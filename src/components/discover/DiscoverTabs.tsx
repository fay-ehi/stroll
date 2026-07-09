/**
 * Stroll — Discover Tabs
 * src/components/discover/DiscoverTabs.tsx
 *
 * PRD §8.3 — Discover: "Tabs: For You — community-wide discovery.
 * Following — personalised feed." Simple underline-style tab switcher per
 * the provided wireframe — a segmented Chip-style control would be a
 * different pattern than the wireframe's plain text-with-underline tabs,
 * so this is a small dedicated component rather than a Chip reuse.
 *
 * Swipe support: DiscoverScreen pairs this with <SwipeableTabs>, passing
 * the SAME `dragProgress` shared value to both. This is the fix for an
 * earlier version of this pairing that put a full header (top bar +
 * this component) inside EACH swipe panel — since both panels are
 * mounted at once for the drag to feel continuous, that meant the whole
 * header rendered twice, visible simultaneously mid-swipe. The correct
 * split: DiscoverScreen renders ONE DiscoverTabs (and one top bar) above
 * SwipeableTabs, and only the per-tab feed content lives inside the
 * pager's two panels.
 *
 * The underline is a single absolutely-positioned bar (not two static
 * per-tab underlines) that slides continuously between the two tab
 * positions as `dragProgress` moves from 0 (For You) to 1 (Following) —
 * driven entirely on the UI thread via useAnimatedStyle, so it tracks a
 * mid-drag finger with no lag and with no React re-render per frame.
 * Label color still cross-fades with plain React state (isActive) since
 * that only needs to visually settle once the tab is committed, not
 * track every intermediate pixel of the drag the way the bar itself does.
 */

import React, { useState } from 'react';
import { View, Pressable, StyleSheet, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { theme } from '@/theme';
import { H5 } from '@/components/ui';

export type DiscoverFeedTab = 'for-you' | 'following';

export interface DiscoverTabsProps {
  activeTab: DiscoverFeedTab;
  onChange: (tab: DiscoverFeedTab) => void;
  /** Shared with the paired <SwipeableTabs> — see module doc. 0 = For You, 1 = Following, continuous in between during a drag. */
  dragProgress: SharedValue<number>;
}

const TABS: { id: DiscoverFeedTab; label: string }[] = [
  { id: 'for-you', label: 'For You' },
  { id: 'following', label: 'Following' },
];

interface TabLayout {
  x: number;
  width: number;
}

export function DiscoverTabs({ activeTab, onChange, dragProgress }: DiscoverTabsProps) {
  // Measured per-tab x/width (onLayout), so the underline can be sized
  // and positioned to exactly match each label's rendered footprint
  // rather than assuming a fixed/equal split of the row.
  const [layouts, setLayouts] = useState<Partial<Record<DiscoverFeedTab, TabLayout>>>({});

  const handleTabLayout = (id: DiscoverFeedTab) => (event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout;
    setLayouts((prev) => ({ ...prev, [id]: { x, width } }));
  };

  const forYouLayout = layouts['for-you'];
  const followingLayout = layouts.following;
  const bothMeasured = !!forYouLayout && !!followingLayout;

  const underlineStyle = useAnimatedStyle(() => {
    if (!forYouLayout || !followingLayout) {
      return { opacity: 0 };
    }
    const x = forYouLayout.x + dragProgress.value * (followingLayout.x - forYouLayout.x);
    const width =
      forYouLayout.width + dragProgress.value * (followingLayout.width - forYouLayout.width);
    return {
      opacity: 1,
      transform: [{ translateX: x }],
      width,
    };
  }, [forYouLayout, followingLayout]);

  return (
    <View style={styles.row} accessibilityRole="tablist">
      {TABS.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <Pressable
            key={tab.id}
            onPress={() => onChange(tab.id)}
            onLayout={handleTabLayout(tab.id)}
            style={styles.tab}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={tab.label}
          >
            <H5 color={isActive ? theme.colors.text.primary : theme.colors.text.tertiary}>
              {tab.label}
            </H5>
          </Pressable>
        );
      })}
      {/* One sliding bar, not per-tab underlines — see module doc. Hidden
          (opacity 0) until both tabs have reported a layout, so it can't
          flash at the wrong position/width on first mount. */}
      <Animated.View
        style={[styles.underline, underlineStyle, !bothMeasured && styles.underlineHidden]}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    position: 'relative',
  },
  tab: {
    paddingBottom: theme.spacing.xs,
  },
  underline: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    height: 2,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.brand.primary,
  },
  underlineHidden: {
    opacity: 0,
  },
});
