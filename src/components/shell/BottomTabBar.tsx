/**
 * Stroll — Bottom Tab Bar
 * src/components/shell/BottomTabBar.tsx
 *
 * Design System §37 — Bottom Navigation:
 *   Contains five items: Discover, Search, Create, Saved, Profile.
 *   Maximum of five primary destinations.
 *   The active item uses the brand orange.
 *   Icons remain paired with labels.
 *
 * PRD §7 — Bottom Navigation (exact spec):
 *   Discover | Search | Create | Saved | Profile
 *   "Create" → Primary creation action — opens Create Experience Centre
 *   "＋" button (PRD's own notation) — visually distinct from the other
 *   four, which are plain tab/label pairs.
 *
 * Architecture decision: this is a CUSTOM tab bar component, not the
 * default expo-router Tabs styling, because "Create" is not a real route
 * with its own screen — it's an action button that opens a modal
 * (PRD §8.7: "Accessed via the centre Create button in the bottom
 * navigation"). Expo Router's built-in <Tabs> assumes every tab maps to
 * a screen; intercepting one tab's press to open a modal instead requires
 * a custom tabBar render function. This keeps the four real tabs on
 * Expo Router's native tab navigation (so swipe/back gestures, deep
 * linking, and state preservation all work for free) while giving the
 * center button fully custom behavior.
 *
 * Bug fix (post-Sprint-2 report — Create button invisible/squished):
 * The Create button used to be rendered as a SIBLING of <Tabs> in
 * app/(app)/(tabs)/_layout.tsx, absolutely positioned by guessing the
 * screen's bottom-safe-area offset. That had two problems:
 *   1. Z-order — the actual tab bar (and each screen) is rendered INSIDE
 *      <Tabs>'s own navigator layer, which can end up compositing above
 *      a plain sibling View. The button's Pressable hit-area still
 *      existed (tapping the empty spot worked), but its circle/icon
 *      didn't reliably paint on top.
 *   2. No reserved space — the 4 real tab items used flex:1 and filled
 *      the row edge-to-edge, so the floating button just overlapped
 *      directly on top of the Search/Saved icons underneath it.
 *
 * Fix: the Create button is now rendered INSIDE this component — the
 * exact component React Navigation renders as the tab bar (guaranteed
 * to sit above the active screen, since that's the tab bar's job) — and
 * the 4 real tabs are split into a left group and a right group with a
 * fixed-width gap reserved between them for the button's footprint, so
 * nothing overlaps. `CreateTabButton` (the old standalone export) has
 * been removed; app/(app)/(tabs)/_layout.tsx no longer renders it
 * separately.
 *
 * Bug fix #2 (button vanished entirely after fix #1 — invisible AND
 * unclickable): the button's wrapper used a NEGATIVE `top` offset plus
 * `overflow: 'visible'` on this component's own container to make the
 * circle "poke above" the bar. That only stops THIS component's View
 * from clipping its own children — it does nothing about React
 * Navigation's own tab-bar wrapper, which sizes itself to the bar's
 * natural content height and clips anything positioned outside it. On
 * iOS in particular, hit-testing checks point-inside-parent-bounds
 * first, so a subview positioned outside its direct parent's bounds is
 * skipped for touches regardless of overflow/clipsToBounds — explaining
 * why the button was both invisible AND untappable.
 *
 * Fix: reserve the raise as REAL layout space (container.paddingTop
 * grows by CREATE_BUTTON_RAISE) instead of letting the button escape its
 * parent's bounds via negative offset. The wrapper's `top` is now 0 —
 * it sits fully inside the container's actual (now taller) bounds, so
 * every ancestor's clipping/hit-testing works normally, and the circle
 * still visually reads as "floating above" the row of tab items because
 * the tab items themselves don't start until after the extra padding.
 */

import React from 'react';
import { View, Pressable, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { theme } from '@/theme';
import { Caption, Icon } from '@/components/ui';
import { Compass, Search, Plus, Bookmark, User } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { MODAL_ROUTES } from '@/constants/routes';

// ─── Tab Icon Map ──────────────────────────────────────────────────────────────
// Maps each real route name (the expo-router screen name within the tab
// group) to its Lucide icon. "create" intentionally has no entry here —
// it's rendered as a separate, special-cased button, not a navigation state.

const TAB_ICONS: Record<string, LucideIcon> = {
  discover: Compass,
  search:   Search,
  saved:    Bookmark,
  profile:  User,
};

// Center button diameter — large enough to read as the visually dominant
// primary action (Design System §21: "Primary buttons should remain
// visually dominant"), derived from layout.buttonHeight + spacing rather
// than an arbitrary literal.
const CREATE_BUTTON_DIAMETER = theme.layout.buttonHeight + theme.spacing.xs; // 48 + 8 = 56

// How much of the button pokes above the row of tab items — derived
// from the diameter (roughly half) so it reads as "elevated" without
// floating so high it looks disconnected from the bar. This amount is
// now reserved as real space in `container.paddingTop` (see fix #2
// above) rather than achieved via negative offset.
const CREATE_BUTTON_RAISE = CREATE_BUTTON_DIAMETER * 0.5;

// Fixed width reserved for the button in the middle of the row — wider
// than the button itself so the adjacent tab items' labels never crowd
// its edges (Design System §37: the center action should read as
// visually distinct, not merely inserted into the row).
const CENTER_GAP_WIDTH = CREATE_BUTTON_DIAMETER + theme.spacing.lg;

export function BottomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  // PRD §7's exact order is Discover | Search | Create | Saved | Profile —
  // the 4 real routes are declared in that same left-to-right order in
  // app/(app)/(tabs)/_layout.tsx, so splitting the route list at its
  // midpoint reproduces that order with Create sitting dead-center.
  const midpoint = Math.ceil(state.routes.length / 2);
  const leftRoutes = state.routes.slice(0, midpoint);
  const rightRoutes = state.routes.slice(midpoint);

  const renderTabItem = (route: (typeof state.routes)[number]) => {
    const index = state.routes.findIndex((r) => r.key === route.key);
    const { options } = descriptors[route.key]!;
    const isFocused = state.index === index;
    const IconComponent = TAB_ICONS[route.name];

    // Defensive — shouldn't happen given the (tabs) folder only contains
    // the four real screens, but fails safe rather than crashing on an
    // unrecognized route name.
    if (!IconComponent) return null;

    const label =
      typeof options.tabBarLabel === 'string'
        ? options.tabBarLabel
        : (options.title ?? route.name);

    const color = isFocused ? theme.colors.brand.primary : theme.colors.text.tertiary;

    const onPress = () => {
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });

      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    };

    return (
      <Pressable
        key={route.key}
        onPress={onPress}
        accessibilityRole="tab"
        accessibilityState={{ selected: isFocused }}
        accessibilityLabel={label}
        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        style={styles.tabItem}
      >
        <Icon icon={IconComponent} size="lg" color={color} />
        <Caption color={color} style={styles.tabLabel}>
          {label}
        </Caption>
      </Pressable>
    );
  };

  const handleCreatePress = () => {
    router.push(MODAL_ROUTES.createExperience as never);
  };

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: Math.max(insets.bottom, theme.spacing.sm) },
      ]}
    >
      <View style={styles.sideGroup}>{leftRoutes.map(renderTabItem)}</View>

      {/* Reserved, non-interactive gap — keeps the side groups' labels
          from ever crowding the floating button's footprint. */}
      <View style={styles.centerGap} pointerEvents="none" />

      <View style={styles.sideGroup}>{rightRoutes.map(renderTabItem)}</View>

      {/* Floating "Create" button — rendered as part of THIS component
          (the actual tab bar React Navigation displays), not as a
          sibling of <Tabs>, so it's guaranteed to paint above every
          screen's content — see the bug-fix notes in the module doc. */}
      <View style={styles.createButtonWrapper} pointerEvents="box-none">
        <Pressable
          onPress={handleCreatePress}
          accessibilityRole="button"
          accessibilityLabel="Create Experience"
          style={({ pressed }) => [
            styles.createButton,
            { backgroundColor: pressed ? theme.colors.brand.interactive : theme.colors.brand.primary },
          ]}
        >
          <Icon icon={Plus} size="lg" color={theme.colors.static.white} />
        </Pressable>
      </View>
    </View>
  );
}

// Platform-correct shadow for the create button (consistent with the
// pattern already established in Card.tsx and EmptyState.tsx).
const createButtonShadow =
  Platform.OS === 'android'
    ? { elevation: theme.shadows.medium.elevation }
    : {
        shadowColor:   theme.shadows.medium.shadowColor,
        shadowOffset:  theme.shadows.medium.shadowOffset,
        shadowOpacity: theme.shadows.medium.shadowOpacity,
        shadowRadius:  theme.shadows.medium.shadowRadius,
      };

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection:    'row',
    backgroundColor:  theme.colors.neutral.background,
    borderTopWidth:   theme.borders.width,
    borderTopColor:   theme.colors.neutral.border,
    // Reserve the button's raise as REAL height instead of letting it
    // escape via negative `top` — React Navigation's tab bar wrapper
    // clips children to its own bounds regardless of this container's
    // `overflow: visible`, so the button must live inside actual space
    // (see bug-fix #2 in the module doc).
    paddingTop:       theme.spacing.sm + CREATE_BUTTON_RAISE,
    paddingHorizontal: theme.spacing.md,
    // Kept for defensive safety — no longer load-bearing for the
    // button's own visibility now that it lives within real bounds,
    // but harmless to leave in case anything else in this row ever
    // needs to render slightly outside it.
    overflow: 'visible',
  },
  sideGroup: {
    flex:           1,
    flexDirection:  'row',
    justifyContent: 'space-around',
  },
  centerGap: {
    width: CENTER_GAP_WIDTH,
  },
  tabItem: {
    flex:              1,
    alignItems:        'center',
    justifyContent:    'center',
    minHeight:         theme.layout.touchTargetMin,
    gap:               theme.spacing.xxs,
  },
  tabLabel: {
    fontWeight: theme.typography.weights.medium,
  },
  createButtonWrapper: {
    position:    'absolute',
    left:        '50%',
    marginLeft:  -(CREATE_BUTTON_DIAMETER / 2),
    // Sits at the top of the reserved space (see container.paddingTop
    // above) instead of a negative offset — stays inside the parent's
    // real bounds, so it's never clipped or skipped during hit-testing.
    top:         0,
    // Defensive stacking on top of the container's own children — not
    // load-bearing now that this lives inside the tab bar itself, but
    // cheap insurance against any future sibling added after it.
    zIndex:      10,
    elevation:   10,
  },
  createButton: {
    width:            CREATE_BUTTON_DIAMETER,
    height:           CREATE_BUTTON_DIAMETER,
    borderRadius:     theme.radius.full,
    alignItems:       'center',
    justifyContent:   'center',
    ...createButtonShadow,
  },
});
