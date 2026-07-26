/**
 * Stroll — Swipe Underline Tabs
 * src/components/discover/SwipeUnderlineTabs.tsx
 *
 * Sprint 5 Prompt 4 follow-up. Extracted out of DiscoverTabs.tsx, which
 * had exactly this measured-layout + sliding-underline implementation
 * already, just hardcoded to the 'for-you'/'following' tab pair. The
 * Saved tab's own Experiences/Collections switch (this same pass) needed
 * the identical swipe-synced underline behavior — "just like what I have
 * between for you and following" — so this generic version now backs
 * BOTH: DiscoverTabs.tsx is a thin typed wrapper around it (its own
 * public props/exports are unchanged, so discover.tsx needed no edits),
 * and app/(app)/(tabs)/saved.tsx uses it directly.
 *
 * Pairs with <SwipeableTabs> exactly the way DiscoverTabs.tsx's own doc
 * describes: the parent creates ONE `dragProgress` shared value and
 * hands it to both this component (to animate the underline) and
 * <SwipeableTabs> (which drives it during a drag) — rendered ONCE above
 * the pager, never duplicated inside either panel.
 */

import React, { useState } from 'react';
import { View, Pressable, StyleSheet, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { theme } from '@/theme';
import { H5 } from '@/components/ui';

export interface SwipeUnderlineTab {
  id: string;
  label: string;
}

export interface SwipeUnderlineTabsProps {
  tabs: readonly [SwipeUnderlineTab, SwipeUnderlineTab];
  activeId: string;
  onChange: (id: string) => void;
  /** Shared with the paired <SwipeableTabs> — see module doc. 0 = tabs[0], 1 = tabs[1], continuous in between during a drag. */
  dragProgress: SharedValue<number>;
}

interface TabLayout {
  x: number;
  width: number;
}

export function SwipeUnderlineTabs({ tabs, activeId, onChange, dragProgress }: SwipeUnderlineTabsProps) {
  // Measured per-tab x/width (onLayout), so the underline can be sized
  // and positioned to exactly match each label's rendered footprint
  // rather than assuming a fixed/equal split of the row.
  const [layouts, setLayouts] = useState<Partial<Record<string, TabLayout>>>({});

  const handleTabLayout = (id: string) => (event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout;
    setLayouts((prev) => ({ ...prev, [id]: { x, width } }));
  };

  const firstLayout = layouts[tabs[0].id];
  const secondLayout = layouts[tabs[1].id];
  const bothMeasured = !!firstLayout && !!secondLayout;

  const underlineStyle = useAnimatedStyle(() => {
    if (!firstLayout || !secondLayout) {
      return { opacity: 0 };
    }
    const x = firstLayout.x + dragProgress.value * (secondLayout.x - firstLayout.x);
    const width = firstLayout.width + dragProgress.value * (secondLayout.width - firstLayout.width);
    return {
      opacity: 1,
      transform: [{ translateX: x }],
      width,
    };
  }, [firstLayout, secondLayout]);

  return (
    <View style={styles.row} accessibilityRole="tablist">
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
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
