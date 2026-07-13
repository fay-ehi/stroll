/**
 * Stroll — For You Feed Panel
 * src/components/discover/ForYouFeed.tsx
 *
 * Extracted from app/(app)/(tabs)/discover.tsx so it can live inside one
 * fixed-width panel of <SwipeableTabs> alongside <FollowingFeed> — see
 * that file's doc for why both panels need to be separately mountable
 * pieces rather than one screen that branches its whole return value.
 *
 * Owns: the main vertical experience feed, its loading/empty/error
 * states, pull-to-refresh, and pagination. `listHeader` is ONLY this
 * panel's own content above the list (Continue Exploring rail, future
 * Collections carousel) — the top bar and For You/Following tabs are NOT
 * part of it; DiscoverScreen renders those once, above the whole pager,
 * so they're never duplicated across panels. See discover.tsx's module
 * doc for why that split matters.
 *
 * `edges={['bottom']}` on every ScreenContainer here: the top safe-area
 * inset is handled once by DiscoverScreen's own SafeAreaView, above the
 * pager — this panel must not also apply a top inset.
 */

import React, { useCallback } from 'react';
import { FlatList, RefreshControl, ScrollView, View, StyleSheet } from 'react-native';
import { AlertCircle, Compass, TrendingUp, WifiOff } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import { theme } from '@/theme';
import { EmptyState, Spinner, Caption, Chip, ScreenContainer, OfflineBanner } from '@/components/ui';
import {
  ExperienceCard,
  ExperienceFeedSkeleton,
  NearbyExperienceCard,
  LocationPermissionCard,
  CitySwitchSuggestionBanner,
} from '@/components/discover';
import type { DiscoverSortMode } from '@/types/experience';
import type { StrollError } from '@/lib/errors';
import type { UseDiscoverFeedResult, DiscoverFeedItem } from '@/hooks/useDiscoverFeed';

interface ForYouEmptyState {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; onPress: () => void };
}

function resolveEmptyState(params: {
  isOffline: boolean;
  isError: boolean;
  error: StrollError | null;
  sort: DiscoverSortMode;
  city: string | undefined;
  onRetry: () => void;
}): ForYouEmptyState {
  const { isOffline, isError, error, sort, city, onRetry } = params;

  if (isOffline) {
    return {
      icon: WifiOff,
      title: "You're offline",
      description: 'Connect to the internet to discover new experiences.',
      action: { label: 'Try Again', onPress: onRetry },
    };
  }

  if (isError) {
    return {
      icon: AlertCircle,
      title: "We couldn't load Discover",
      description: error?.userMessage ?? 'Something went wrong. Please try again.',
      action: { label: 'Try Again', onPress: onRetry },
    };
  }

  if (sort === 'trending') {
    return {
      icon: TrendingUp,
      title: 'Nothing trending yet',
      description: `No experiences in ${city ?? 'your city'} have picked up likes yet — check back soon, or switch to Newest.`,
    };
  }

  return {
    icon: Compass,
    title: 'No experiences yet',
    description: `Be the first to share an experience in ${city ?? 'your city'}.`,
  };
}

export interface ForYouFeedProps {
  feed: UseDiscoverFeedResult['feed'];
  sort: DiscoverSortMode;
  refresh: () => Promise<void>;
  isRefreshing: boolean;
  isOffline: boolean;
  city: string | undefined;
  listHeader: React.ReactElement;
  loadingHeader: React.ReactElement;
  /**
   * Sprint 4 Prompt 2 — feed.experiences with nearby cards / the
   * permission ask spliced in (see useDiscoverFeed.ts's
   * buildDiscoverFeedItems). Identical to feed.experiences, item for
   * item, whenever the feature has nothing to add — see that function's
   * own doc.
   */
  items: DiscoverFeedItem[];
  onEnableLocation: () => void;
  onDismissLocationAsk: () => void;
  /** The active mismatch to show as a banner, or null to hide it entirely. */
  citySwitchSuggestion: { city: string } | null;
  onSwitchCity: () => void;
  onDismissCitySwitch: () => void;
}

export function ForYouFeed({
  feed,
  sort,
  refresh,
  isRefreshing,
  isOffline,
  city,
  listHeader,
  loadingHeader,
  items,
  onEnableLocation,
  onDismissLocationAsk,
  citySwitchSuggestion,
  onSwitchCity,
  onDismissCitySwitch,
}: ForYouFeedProps) {
  const handleEndReached = useCallback(() => {
    if (feed.hasNextPage && !feed.isFetchingNextPage && !feed.isError) {
      feed.fetchNextPage();
    }
  }, [feed.hasNextPage, feed.isFetchingNextPage, feed.isError, feed.fetchNextPage]);

  const renderItem = useCallback(
    ({ item }: { item: DiscoverFeedItem }) => {
      switch (item.kind) {
        case 'experience':
          return (
            <View style={styles.cardWrapper}>
              <ExperienceCard experience={item.experience} />
            </View>
          );
        case 'nearby':
          return (
            <View style={styles.cardWrapper}>
              <NearbyExperienceCard nearby={item.nearby} />
            </View>
          );
        case 'location_permission_ask':
          return (
            <View style={styles.cardWrapper}>
              <LocationPermissionCard onEnable={onEnableLocation} onDismiss={onDismissLocationAsk} />
            </View>
          );
        default:
          return null;
      }
    },
    [onEnableLocation, onDismissLocationAsk],
  );

  const keyExtractor = useCallback((item: DiscoverFeedItem) => item.key, []);

  const listFooter = (() => {
    if (feed.experiences.length === 0) return null;

    if (feed.isFetchingNextPage) {
      return (
        <View style={styles.footer}>
          <Spinner accessibilityLabel="Loading more experiences" />
        </View>
      );
    }

    if (feed.isError) {
      return (
        <View style={[styles.footer, styles.inlineError]}>
          <Caption color={theme.colors.text.tertiary}>Couldn&apos;t load more experiences.</Caption>
          <Chip label="Retry" onPress={feed.fetchNextPage} style={styles.inlineRetryChip} />
        </View>
      );
    }

    if (!feed.hasNextPage) {
      return (
        <View style={styles.footer}>
          <Caption color={theme.colors.text.tertiary}>You&apos;ve reached the end 👣</Caption>
        </View>
      );
    }

    return null;
  })();

  if (feed.experiences.length === 0 && !feed.isLoading) {
    const emptyState = resolveEmptyState({
      isOffline,
      isError: feed.isError,
      error: feed.error,
      sort,
      city,
      onRetry: isOffline ? refresh : feed.refetch,
    });

    // A bare non-scrollable View here (as this used to be) has nowhere to
    // attach a RefreshControl — there's nothing to "pull" against, so the
    // gesture silently does nothing. This is exactly why pull-to-refresh
    // worked on Profile (its gallery's empty state is a ListEmptyComponent
    // INSIDE the same FlatList that always carries the RefreshControl) but
    // not here, where the empty state used to be a totally separate
    // branch with no scrollable/refreshable ancestor at all. A ScrollView
    // with alwaysBounceVertical + a flex-1 centered content container
    // gives the empty state the same "pull down to retry" affordance the
    // main list has, without needing real content to scroll.
    return (
      <ScreenContainer scroll={false} padded={false} edges={["bottom"]}>
        <OfflineBanner />
        <ScrollView
          contentContainerStyle={styles.emptyScrollContent}
          alwaysBounceVertical
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => {
                void refresh();
              }}
              tintColor={theme.colors.brand.primary}
              accessibilityLabel="Pull to refresh Discover"
            />
          }
        >
          {listHeader}
          <View style={styles.emptyBody}>
            <EmptyState
              icon={emptyState.icon}
              title={emptyState.title}
              description={emptyState.description}
              action={emptyState.action}
            />
          </View>
        </ScrollView>
      </ScreenContainer>
    );
  }

  if (feed.isLoading) {
    return (
      <ScreenContainer scroll={false} padded={false} edges={["bottom"]}>
        <OfflineBanner />
        {loadingHeader}
        <View style={styles.feedListPadding}>
          <ExperienceFeedSkeleton />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll={false} padded={false} edges={["bottom"]}>
      <OfflineBanner />
      {citySwitchSuggestion && (
        <CitySwitchSuggestionBanner
          city={citySwitchSuggestion.city}
          onSwitch={onSwitchCity}
          onDismiss={onDismissCitySwitch}
        />
      )}
      <FlatList
        data={items}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        contentContainerStyle={styles.listContent}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
        // Performance (requirement #3) — tuned for a feed that can grow
        // to hundreds of cards deep after repeated "load more"s:
        //   - windowSize: how many screens' worth of content stay mounted
        //     around the visible area (default 21 is generous for a list
        //     this image-heavy; 7 keeps memory bounded without causing
        //     visible pop-in on a normal scroll speed).
        //   - maxToRenderPerBatch / updateCellsBatchingPeriod: renders
        //     fewer cards per batch, more frequently, so a fast fling
        //     doesn't block the JS thread with one huge batch.
        // Stable keys (item.id) and memoized renderItem/ExperienceCard
        // (see ExperienceCard.tsx's own doc) do the rest.
        //
        // Deliberately NOT using removeClippedSubviews: it unmounts
        // offscreen native views entirely, which is a known cause of
        // RefreshControl becoming unresponsive (particularly on Android) —
        // the pull gesture can get lost right as the list sits at scroll
        // offset 0 and its top view is clipped/detached. windowSize +
        // maxToRenderPerBatch + initialNumToRender already bound memory
        // well enough for this feed without that risk; if memory profiling
        // later shows it's still needed, re-enable it together with a
        // scroll-offset guard rather than unconditionally.
        windowSize={7}
        maxToRenderPerBatch={6}
        updateCellsBatchingPeriod={50}
        initialNumToRender={6}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              void refresh();
            }}
            tintColor={theme.colors.brand.primary}
            accessibilityLabel="Pull to refresh Discover"
          />
        }
        accessibilityLabel="Discover feed"
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: theme.spacing['4xl'],
  },
  cardWrapper: {
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    marginTop: theme.spacing.lg,
  },
  inlineError: {
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    alignItems: 'flex-start',
    gap: theme.spacing.xs,
  },
  inlineRetryChip: {
    marginTop: 0,
  },
  footer: {
    paddingVertical: theme.spacing.xl,
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  emptyBody: {
    minHeight: 420,
    justifyContent: 'center',
  },
  emptyScrollContent: {
    flexGrow: 1,
  },
  feedListPadding: {
    marginTop: theme.spacing.lg,
  },
});
