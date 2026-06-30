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

export function BottomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: Math.max(insets.bottom, theme.spacing.sm) },
      ]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key]!;
        const isFocused = state.index === index;
        const IconComponent = TAB_ICONS[route.name];

        // Skip rendering a normal tab button for any route not in our icon
        // map (defensive — shouldn't happen given the (tabs) folder only
        // contains the four real screens, but fails safe rather than
        // crashing on an unrecognized route name).
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
      })}
    </View>
  );
}

// ─── Center Create Button ──────────────────────────────────────────────────────
// Rendered by the (tabs) layout alongside <Tabs tabBar={BottomTabBar} />,
// absolutely positioned to overlap the tab bar's center. Exported
// separately because it needs to sit visually above the bar (Design
// System: the "＋" button reads as elevated/primary, not flush with the
// other four icons).

export function CreateTabButton() {
  const insets = useSafeAreaInsets();

  const handlePress = () => {
    router.push(MODAL_ROUTES.createExperience as never);
  };

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.createButtonWrapper,
        { bottom: Math.max(insets.bottom, theme.spacing.sm) + theme.spacing.lg },
      ]}
    >
      <Pressable
        onPress={handlePress}
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
    paddingTop:       theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
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
    position:       'absolute',
    alignSelf:       'center',
    left:            '50%',
    marginLeft:      -(CREATE_BUTTON_DIAMETER / 2),
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
