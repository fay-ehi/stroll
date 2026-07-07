/**
 * Stroll — Discover Tab
 * app/(app)/(tabs)/discover.tsx
 *
 * PRD §8.3 — Discover: the user's primary home screen after onboarding.
 *
 * Sprint 2 Prompt 1 scope: the full Discover *browsing* experience —
 * greeting, Featured Carousel, Categories Row (display-only), and the
 * paginated Experience Feed (newest / trending). Explicitly NOT in scope
 * per this sprint's brief: experience creation, maps, saving, collections,
 * likes, comments, following, search, notifications, settings — those are
 * later sprints, and nothing on this screen depends on them.
 *
 * Uses a single top-level FlatList as the whole screen's scroll container
 * (not ScreenContainer's ScrollView) — the Experience Feed needs real
 * FlatList virtualization for infinite scroll, and nesting a virtualized
 * list inside another scrollable is an anti-pattern RN explicitly warns
 * about. The greeting, Featured Carousel, and Categories Row become the
 * FlatList's `ListHeaderComponent` instead, so the whole screen scrolls
 * as one unit.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, RefreshControl, View, StyleSheet } from 'react-native';
import { AlertCircle, Compass, WifiOff } from 'lucide-react-native';

import { theme } from '@/theme';
import { EmptyState, H5, Spinner, Caption, Chip, ScreenContainer } from '@/components/ui';
import {
  DiscoverHeader,
  FeaturedCarousel,
  FeaturedCarouselSkeleton,
  CategoriesRow,
  CategoriesRowSkeleton,
  ExperienceCard,
  ExperienceFeedSkeleton,
} from '@/components/discover';
import { useDiscoverFeed } from '@/hooks/useDiscoverFeed';
import { useProfile } from '@/hooks/useProfile';
import { useNetworkStatus } from '@/hooks';
import { showToast } from '@/stores/toastStore';
import type { ExperienceCardModel, DiscoverSortMode } from '@/types/experience';
import type { PlaceCategoryId } from '@/constants/places';

export default function DiscoverScreen() {
  const { profile, isLoading: isProfileLoading } = useProfile();
  const network = useNetworkStatus();
  const isOffline = !network.isConnected || network.isInternetReachable === false;

  const city = profile?.city ?? undefined;
  const { featured, feed, sort, setSort, refresh, isRefreshing } = useDiscoverFeed({ city });

  // Categories Row selection is page-local, display-only UI state — see
  // CategoriesRow's module doc for why this isn't wired to the feed yet.
  const [selectedCategoryId, setSelectedCategoryId] = useState<PlaceCategoryId | null>(null);

  // A page-fetch failure (scrolling past the last loaded page) shouldn't
  // blow away an already-populated feed — surface it as a toast instead of
  // an EmptyState, exactly like every other mutation/query failure in this
  // app. Fires once per new failure, not on every re-render while the
  // error persists.
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

  const handleEndReached = useCallback(() => {
    if (feed.hasNextPage && !feed.isFetchingNextPage && !feed.isError) {
      feed.fetchNextPage();
    }
  }, [feed.hasNextPage, feed.isFetchingNextPage, feed.isError, feed.fetchNextPage]);

  const handleSortChange = useCallback(
    (nextSort: DiscoverSortMode) => {
      if (nextSort !== sort) setSort(nextSort);
    },
    [sort, setSort],
  );

  const renderItem = useCallback(
    ({ item }: { item: ExperienceCardModel }) => (
      <View style={styles.cardWrapper}>
        <ExperienceCard experience={item} />
      </View>
    ),
    [],
  );

  const keyExtractor = useCallback((item: ExperienceCardModel) => item.id, []);

  // ── Header: greeting + Featured + Categories + feed section title ──────────
  const listHeader = useMemo(
    () => (
      <View style={styles.headerStack}>
        <DiscoverHeader
          displayName={profile?.displayName ?? null}
          city={profile?.city ?? null}
          isLoading={isProfileLoading}
        />

        <View style={styles.section}>
          <H5 style={styles.sectionTitle}>Featured</H5>
          {featured.isLoading ? (
            <FeaturedCarouselSkeleton />
          ) : featured.isError ? (
            <View style={styles.inlineError}>
              <Caption color={theme.colors.text.tertiary}>
                {featured.error?.userMessage ?? "Couldn't load featured experiences."}
              </Caption>
              <Chip label="Retry" onPress={featured.refetch} style={styles.inlineRetryChip} />
            </View>
          ) : featured.experiences.length > 0 ? (
            <FeaturedCarousel experiences={featured.experiences} />
          ) : null}
        </View>

        <View style={styles.section}>
          <H5 style={styles.sectionTitle}>Categories</H5>
          {isProfileLoading ? (
            <CategoriesRowSkeleton />
          ) : (
            <CategoriesRow
              selectedCategoryId={selectedCategoryId}
              onSelect={setSelectedCategoryId}
            />
          )}
        </View>

        <View style={[styles.section, styles.feedHeaderRow]}>
          <H5 style={styles.sectionTitle}>
            {sort === 'newest' ? 'Latest Experiences' : 'Trending Now'}
          </H5>
          <View style={styles.sortToggle}>
            <Chip
              label="Newest"
              selected={sort === 'newest'}
              onPress={() => handleSortChange('newest')}
            />
            <Chip
              label="Trending"
              selected={sort === 'trending'}
              onPress={() => handleSortChange('trending')}
            />
          </View>
        </View>
      </View>
    ),
    [
      profile?.displayName,
      profile?.city,
      isProfileLoading,
      featured.isLoading,
      featured.isError,
      featured.error,
      featured.experiences,
      featured.refetch,
      selectedCategoryId,
      sort,
      handleSortChange,
    ],
  );

  // ── Footer: pagination spinner, end-of-feed indicator, or retry ────────────
  const listFooter = useMemo(() => {
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
  }, [
    feed.experiences.length,
    feed.isFetchingNextPage,
    feed.isError,
    feed.hasNextPage,
    feed.fetchNextPage,
  ]);

  // ── Empty body states — offline, error, or genuinely empty ─────────────────
  // Only take over the whole screen when there's no data at all yet; a
  // failure with existing data is handled by the toast + footer above instead.
  if (feed.experiences.length === 0 && !feed.isLoading) {
    let emptyState: React.ReactNode;

    if (isOffline) {
      emptyState = (
        <EmptyState
          icon={WifiOff}
          title="You're offline"
          description="Connect to the internet to discover new experiences."
          action={{ label: 'Try Again', onPress: refresh }}
        />
      );
    } else if (feed.isError) {
      emptyState = (
        <EmptyState
          icon={AlertCircle}
          title="We couldn't load Discover"
          description={feed.error?.userMessage ?? 'Something went wrong. Please try again.'}
          action={{ label: 'Try Again', onPress: feed.refetch }}
        />
      );
    } else {
      emptyState = (
        <EmptyState
          icon={Compass}
          title="No experiences yet"
          description={`Be the first to share an experience in ${city ?? 'your city'}.`}
        />
      );
    }

    return (
      <ScreenContainer scroll={false} padded={false}>
        {listHeader}
        <View style={styles.emptyBody}>{emptyState}</View>
      </ScreenContainer>
    );
  }

  // ── Initial loading — full skeleton screen, never a blank page ──────────────
  if (feed.isLoading) {
    return (
      <ScreenContainer scroll={false} padded={false}>
        <View style={styles.headerStack}>
          <DiscoverHeader displayName={null} city={profile?.city ?? null} isLoading />
          <View style={styles.section}>
            <H5 style={styles.sectionTitle}>Featured</H5>
            <FeaturedCarouselSkeleton />
          </View>
          <View style={styles.section}>
            <H5 style={styles.sectionTitle}>Categories</H5>
            <CategoriesRowSkeleton />
          </View>
          <View style={styles.section}>
            <H5 style={styles.sectionTitle}>Latest Experiences</H5>
          </View>
        </View>
        <View style={styles.feedListPadding}>
          <ExperienceFeedSkeleton />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll={false} padded={false}>
      <FlatList
        data={feed.experiences}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        contentContainerStyle={styles.listContent}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              void refresh();
            }}
            tintColor={theme.colors.brand.primary}
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
  headerStack: {
    gap: theme.spacing.xl,
    paddingTop: theme.spacing.sm,
  },
  section: {
    gap: theme.spacing.sm,
  },
  sectionTitle: {
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
  },
  feedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
  },
  sortToggle: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
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
    flex: 1,
  },
  feedListPadding: {
    marginTop: theme.spacing.lg,
  },
});
