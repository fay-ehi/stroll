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

import React, { useState } from 'react';
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
// visually dominant"), derived from layout.buttonHeight rather than an
// arbitrary literal. Previously buttonHeight + spacing.xs (56px) — sized
// down to buttonHeight alone (48px) per feedback that 56px read as too
// large relative to the other tab icons to feel like part of the same
// row.
const CREATE_BUTTON_DIAMETER = theme.layout.buttonHeight; // 48

// Bug fix #5 (button closer to Search than Saved, and sitting higher
// than the other tabs): this used to reserve a deliberate "raise" —
// extra space in `container.paddingTop` so the button's circle poked up
// above the row like a floating FAB. That visually read as the button
// sitting noticeably higher than, rather than level with, the other
// four tab icons, which isn't what this design wants ("it's higher than
// all the other tabs. It's meant to be aligned"). Removed entirely —
// `createButtonWrapper` below now centers the button within the row's
// natural height instead, the same way every tab icon is already
// centered within its own item.

// Bug fix #6 (button sitting a bit lower than the other tabs, even after
// fix #5's centering): each tab item centers a [icon, gap, label] BLOCK
// within the row — which pulls the icon itself above the row's true
// vertical center, since the label sits below it as part of that same
// centered block. The Create button has no label, so centering it alone
// lands its icon exactly at true center — visibly lower than the other
// tabs' icons, which sit above center by construction. This is that same
// offset, computed from the real tab-item metrics rather than eyeballed,
// so a future change to icon size/label size/gap keeps this in sync
// instead of silently drifting out of alignment again.
const TAB_ICON_HEIGHT = 24; // Icon size="lg" — see theme/utils.ts's iconSizeToPx
const TAB_CONTENT_HEIGHT = TAB_ICON_HEIGHT + theme.spacing.xxs + theme.typography.lineHeights.caption;
// The geometric center-of-icon-vs-center-of-block math above gets close
// but doesn't fully account for how a filled rounded-square button
// actually READS relative to a thin-stroke line icon — a solid shape's
// optical center tends to sit slightly lower than its true geometric
// center to the eye. This small extra lift is that perceptual
// correction, layered on top of (not replacing) the derived value above
// so the reasoning stays traceable rather than collapsing back into one
// unexplained magic number.
const CREATE_BUTTON_PERCEPTUAL_ADJUSTMENT = theme.spacing.xxs; // 4
const CREATE_BUTTON_VERTICAL_NUDGE =
  TAB_CONTENT_HEIGHT / 2 - TAB_ICON_HEIGHT / 2 + CREATE_BUTTON_PERCEPTUAL_ADJUSTMENT;

// Fixed width reserved for the button in the middle of the row — wider
// than the button itself so the adjacent tab items' labels never crowd
// its edges (Design System §37: the center action should read as
// visually distinct, not merely inserted into the row).
const CENTER_GAP_WIDTH = CREATE_BUTTON_DIAMETER + theme.spacing.lg;

export function BottomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  // Plain boolean state + onPressIn/onPressOut, rather than Pressable's
  // `style={(state) => ...}` function-prop — see bug-fix #3/#4 in the
  // module doc below: that pattern was silently not being applied at
  // all in this project (the Pressable rendered at its unstyled
  // intrinsic content size — just the icon — instead of filling its
  // parent), most likely due to this project's NativeWind/css-interop
  // JSX wrapping. Plain state + a plain conditional style array element
  // is a completely ordinary, statically-analyzable style — no function
  // for anything to fail to invoke.
  const [createButtonPressed, setCreateButtonPressed] = useState(false);

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
          screen's content — see the bug-fix notes in the module doc.

          Bug fix #4 (icon rendered top-left instead of centered, and
          only that small area was tappable — reported after fix #3):
          fix #3 correctly moved the background/shadow out of a
          function-style prop, but the inner touch layer STILL used one
          (`style={({ pressed }) => [...]}`) — just narrowed to only
          toggling opacity. Turns out this project doesn't apply
          Pressable's function-style prop AT ALL: with no style
          resolved, the Pressable fell back to its unstyled intrinsic
          size (just wrapping the Icon, ~24×24) instead of filling the
          circle — explaining both the off-center icon and the
          tap-target being limited to that small area. Root cause is
          almost certainly this project's NativeWind/css-interop JSX
          wrapping (every component render is wrapped by
          `react-native-css-interop`'s `wrap-jsx.js` — visible in
          Metro's own error stack traces) not reconciling that pattern.
          Fix: `style` is now always a plain array of static style
          objects — `onPressIn`/`onPressOut` flip a plain `useState`
          boolean instead of Pressable computing anything itself. No
          function is ever passed as a `style` prop anywhere in this
          component now. */}
      <View style={styles.createButtonWrapper} pointerEvents="box-none">
        <View style={styles.createButtonShape}>
          <Pressable
            onPress={handleCreatePress}
            onPressIn={() => setCreateButtonPressed(true)}
            onPressOut={() => setCreateButtonPressed(false)}
            accessibilityRole="button"
            accessibilityLabel="Create Experience"
            android_ripple={{ color: theme.colors.brand.interactive, borderless: false }}
            style={[styles.createButtonTouchable, createButtonPressed && styles.createButtonPressed]}
          >
            <Icon icon={Plus} size="lg" color={theme.colors.static.white} />
          </Pressable>
        </View>
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
    paddingTop:        theme.spacing.sm,
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
  // Bug fix #5 (button closer to Search than Saved, and sitting higher
  // than the other tabs): previously positioned with `left: '50%'` +
  // `marginLeft: -(diameter / 2)` — percentage-based `left` on an
  // absolutely positioned view is resolved against the parent's box in
  // a way that's easy to get subtly wrong (and, per fix #3/#4's pattern
  // in this exact file, this project has already shown it doesn't
  // always apply style values the way plain RN would), and the
  // top-of-container placement relied on a separately reserved "raise"
  // that pushed it visibly above the other tabs' level rather than
  // matching it.
  //
  // Fix: span the ENTIRE container (`top/bottom/left/right: 0`, no
  // percentage math at all) and let flexbox's `alignItems`/
  // `justifyContent: 'center'` center the button both horizontally AND
  // vertically within the row's actual bounds — the same mechanism
  // already centering every tab icon, so the button now sits in the
  // same vertical band as the rest of the row instead of an
  // independently-computed offset.
  createButtonWrapper: {
    position:       'absolute',
    top:             0,
    bottom:          0,
    left:            0,
    right:           0,
    alignItems:      'center',
    justifyContent:  'center',
    // Defensive stacking on top of the container's own children — not
    // load-bearing now that this lives inside the tab bar itself, but
    // cheap insurance against any future sibling added after it.
    zIndex:      10,
    elevation:   10,
  },
  // Always-visible shape — fully static (background/shadow never
  // change), so nothing about its own visibility depends on press state
  // or any per-render computation. See bug-fix #3/#4 in the module doc.
  // Rounded SQUARE, not a circle — `radius.card` (18px, Design System
  // §9) rather than `radius.full`, per design: a floating action button
  // that reads as "distinct" without going all the way to a perfect
  // circle, consistent with every other surface in the app (cards,
  // images, dialogs) using the same family of corner radii instead of
  // full-circle treatment (which this design system reserves
  createButtonShape: {
  width: CREATE_BUTTON_DIAMETER,
  height: CREATE_BUTTON_DIAMETER,
  borderRadius: 10, // less rounded
  backgroundColor: theme.colors.brand.primary,
  overflow: 'hidden',
  marginTop: -(CREATE_BUTTON_VERTICAL_NUDGE + 9), // lift slightly
  ...createButtonShadow,
},
  // Touch layer filling the shape exactly — explicit width/height
  // (100%) rather than relying on `flex: 1` alone, since this is
  // exactly the kind of sizing that silently failed to apply before
  // (see bug-fix #4) — belt-and-suspenders now that it's at least a
  // plain, statically-analyzable style rather than a function result.
  createButtonTouchable: {
    width:          '100%',
    height:         '100%',
    alignItems:     'center',
    justifyContent: 'center',
  },
  createButtonPressed: {
    opacity: theme.opacity.heavy,
  },
});
