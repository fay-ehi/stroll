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
 * the SAME `dragProgress` shared value to both — see this file's own
 * `dragProgress` doc below and SwipeableTabs.tsx's module doc for the
 * full "why", including the earlier double-header bug this pairing
 * fixed.
 *
 * Sprint 5 Prompt 4 follow-up: the measured-layout + sliding-underline
 * implementation this component used to own directly now lives in
 * SwipeUnderlineTabs.tsx (generic — Saved's own Experiences/Collections
 * switch needed the identical behavior). This file is now a thin typed
 * wrapper around it: `DiscoverFeedTab`, `DiscoverTabsProps`, and this
 * component's own exported name are all unchanged, so discover.tsx
 * needed no edits for this refactor.
 */

import React from 'react';
import type { SharedValue } from 'react-native-reanimated';
import { SwipeUnderlineTabs } from './SwipeUnderlineTabs';

export type DiscoverFeedTab = 'for-you' | 'following';

export interface DiscoverTabsProps {
  activeTab: DiscoverFeedTab;
  onChange: (tab: DiscoverFeedTab) => void;
  /** Shared with the paired <SwipeableTabs> — see module doc. 0 = For You, 1 = Following, continuous in between during a drag. */
  dragProgress: SharedValue<number>;
}

const TABS = [
  { id: 'for-you', label: 'For You' },
  { id: 'following', label: 'Following' },
] as const;

export function DiscoverTabs({ activeTab, onChange, dragProgress }: DiscoverTabsProps) {
  return (
    <SwipeUnderlineTabs
      tabs={TABS}
      activeId={activeTab}
      onChange={(id) => onChange(id as DiscoverFeedTab)}
      dragProgress={dragProgress}
    />
  );
}
