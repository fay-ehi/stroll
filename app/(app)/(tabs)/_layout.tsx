/**
 * Stroll — Tabs Layout
 * app/(app)/(tabs)/_layout.tsx
 *
 * PRD §7 Bottom Navigation — exact 5 items: Discover, Search, Create,
 * Saved, Profile. Only 4 are real screens; Create is a center action
 * button rendered as part of the custom tab bar itself (see
 * BottomTabBar.tsx's doc comment for the full architecture rationale,
 * including a bug-fix note on why it lives inside BottomTabBar rather
 * than as a sibling here).
 *
 * tabBarLabel strings are the PRD's literal tab names — do not change
 * without checking the PRD's Navigation Architecture (§7) first.
 */

import React from 'react';
import { Tabs } from 'expo-router';
import { BottomTabBar } from '@/components/shell/BottomTabBar';

export default function TabsLayout() {
  return (
    <Tabs
      // eslint-disable-next-line react/no-unstable-nested-components -- expo-router requires a render-prop here; BottomTabBar itself is a stable, module-level component, only this wrapper closure is "new" per render, which is the documented pattern for custom tab bars.
      tabBar={(props) => <BottomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="discover" options={{ tabBarLabel: 'Discover' }} />
      <Tabs.Screen name="search" options={{ tabBarLabel: 'Search' }} />
      <Tabs.Screen name="saved" options={{ tabBarLabel: 'Saved' }} />
      <Tabs.Screen name="profile" options={{ tabBarLabel: 'Profile' }} />
    </Tabs>
  );
}
