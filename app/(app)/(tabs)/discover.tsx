/**
 * Stroll — Discover Tab
 * app/(app)/(tabs)/discover.tsx
 *
 * PRD §8.3 — Discover: the user's primary home screen after onboarding.
 * Layout follows the product-provided wireframe:
 *   [📍 city selector]     Stroll     [🔔 notifications]
 *   For You | Following
 *   Experience Card
 *   Experience Card
 *   ...
 *
 * "Continue Exploring" (a horizontal rail that used to sit above the
 * feed) has been removed entirely per product direction — the For You
 * panel's list header is now empty (see `forYouListHeader` below), left
 * in place only as a slot for whatever panel-specific content comes
 * next (e.g. the Collections carousel).
 *
 * Swipe-between-tabs, corrected structure: the top bar and the
 * For You/Following tab control are shared chrome — rendered EXACTLY
 * ONCE here, above <SwipeableTabs>. Only the content that's genuinely
 * different per tab (the feed itself) lives inside the pager's two
 * panels (<ForYouFeed>, <FollowingFeed>).
 *
 * This replaces an earlier version that built the top bar + tabs
 * separately inside EACH panel's own header. That looked fine with one
 * tab open, but since a pager needs both panels mounted side by side for
 * the drag to feel continuous (not a hard cut), it meant the top bar and
 * tabs were rendered twice and visible simultaneously mid-swipe — "I see
 * everything twice" while dragging. The fix is this file: one top bar,
 * one <DiscoverTabs>, sitting above the pager, never duplicated.
 *
 * `dragProgress` (a Reanimated SharedValue<number>, 0 = For You,
 * 1 = Following) is created once here and handed to both <DiscoverTabs>
 * (to animate its sliding underline) and <SwipeableTabs> (which drives
 * it during a drag) — this is the ONLY thing that connects the header to
 * the pager below it now; no header content is duplicated into panels.
 *
 * Collections carousel: intentionally NOT added to the header yet — see
 * src/components/discover/CollectionCarousel.tsx's doc. That component
 * exists as a ready-to-wire skeleton (Sprint N placeholder) per product
 * direction: build the shape now, connect real data + turn it on for a
 * future sprint once the collections table/service exists.
 *
 * Sprint 2 Prompt 3 (Personalization & Refinement) changes, on top of
 * Prompt 1's layout:
 *   - The feed is personalized (requirement #1) — see
 *     useInfiniteDiscoverFeed's doc in useDiscoverFeed.ts. Nothing about
 *     this screen changed to support it; `interests` is just one more
 *     param passed to useDiscoverFeed().
 *   - Offline indicator (requirement #4) — <OfflineBanner /> pinned above
 *     each panel's own list (loading/empty/main), reusing
 *     useNetworkStatus internally rather than each screen re-deriving
 *     `isOffline`.
 *   - Differentiated empty states (requirement #5) — see ForYouFeed's
 *     `resolveEmptyState()`.
 *   - FlatList performance tuning (requirement #3) — see ForYouFeed.tsx.
 *   - `feed_refreshed` fires from useDiscoverFeed()'s `refresh` itself,
 *     not here — see that hook for why (screen-agnostic, so any other
 *     surface that reuses it later gets correct tracking for free).
 */

import React, { useMemo, useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSharedValue } from 'react-native-reanimated';

import { theme } from '@/theme';
import {
  DiscoverTopBar,
  DiscoverTabs,
  SwipeableTabs,
  ForYouFeed,
  FollowingFeed,
  type DiscoverFeedTab,
} from '@/components/discover';
import { useDiscoverFeed } from '@/hooks/useDiscoverFeed';
import { useProfile } from '@/hooks/useProfile';
import { useNetworkStatus } from '@/hooks';
import { showToast } from '@/stores/toastStore';
import type { DiscoverSortMode } from '@/types/experience';

export default function DiscoverScreen() {
  const { profile } = useProfile();
  const network = useNetworkStatus();
  const isOffline = !network.isConnected || network.isInternetReachable === false;

  const [feedTab, setFeedTab] = useState<DiscoverFeedTab>('for-you');
  // Shared with both DiscoverTabs (reads it, for the sliding underline)
  // and SwipeableTabs (writes it, during a drag) — see module doc.
  const dragProgress = useSharedValue(0);

  const city = profile?.city ?? undefined;
  const interests = profile?.interests ?? [];
  const { feed, sort, refresh, isRefreshing } = useDiscoverFeed({
    city,
    interests,
  });

  // A page-fetch failure (scrolling past the last loaded page) shouldn't
  // blow away an already-populated feed — surface it as a toast instead of
  // an EmptyState. Fires once per new failure, not on every re-render
  // while the error persists.
  const previousFeedError = useRef(feed.error);
  useEffect(() => {
    const hasNewError = feed.isError && feed.error !== previousFeedError.current;
    if (hasNewError && feed.experiences.length > 0) {
      showToast({
        type: 'error',
        message: feed.error?.userMessage ?? 'Failed to load more experiences.',
      });
    }
    previousFeedError.current = feed.error;
  }, [feed.isError, feed.error, feed.experiences.length]);

  // For You panel's own list header — Continue Exploring was removed
  // entirely per product direction; nothing panel-specific remains here
  // today. Kept as its own memoized element (rather than folded away)
  // so a future rail/carousel has an obvious slot to land in, same as
  // emptyListHeader below.
  const forYouListHeader = useMemo(() => <View style={styles.forYouHeaderStack} />, []);

  // Following has no panel-specific header content today — passing an
  // empty element (rather than null) keeps ForYouFeed/FollowingFeed's
  // `listHeader` prop non-optional and simple, and gives a future
  // "Following"-only rail somewhere to slot in later.
  const emptyListHeader = useMemo(() => <View />, []);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <DiscoverTopBar city={profile?.city ?? null} />
      <DiscoverTabs activeTab={feedTab} onChange={setFeedTab} dragProgress={dragProgress} />

      <SwipeableTabs
        activeIndex={feedTab === 'for-you' ? 0 : 1}
        onChangeIndex={(index) => setFeedTab(index === 0 ? 'for-you' : 'following')}
        dragProgress={dragProgress}
        first={
          <ForYouFeed
            feed={feed}
            sort={sort as DiscoverSortMode}
            refresh={refresh}
            isRefreshing={isRefreshing}
            isOffline={isOffline}
            city={city}
            listHeader={forYouListHeader}
            loadingHeader={emptyListHeader}
          />
        }
        second={<FollowingFeed listHeader={emptyListHeader} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.neutral.background,
    paddingTop: theme.spacing.sm,
    gap: theme.spacing.lg,
  },
  forYouHeaderStack: {
    gap: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
  },
});
