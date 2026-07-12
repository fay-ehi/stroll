/**
 * Stroll — Place Detail
 * app/(app)/place/[id].tsx
 *
 * Sprint 4 Prompt 1 — the first real version of the Place page. Replaces
 * the "Sprint 4: placeholder only" PlaceholderScreen this route rendered
 * before. Reached from an Experience's Place Card (LocationPreview.tsx,
 * unchanged by this prompt — it already linked here) with only the
 * place's id, the same "always fetch fresh, never trust a passed object"
 * convention app/(app)/experience/[id].tsx already establishes.
 *
 * Layout order follows ADR-001 "Place Pages" (this repo's highest source
 * of truth, superseding the original PRD's cover-image hero): Map →
 * Name → (optional) Category → Community Experiences → Collections
 * Featuring This Place. See PlaceMapHero's own doc for the interactive
 * map itself, and types/place.ts's module doc for why rating/price
 * level/opening hours are deliberately never shown here.
 *
 * The whole page is one FlatList (not a ScrollView wrapping a separate
 * horizontal rail, unlike Experience Detail) — Community Experiences is
 * the page's own paginated, pull-to-refreshable list, so the map/name/
 * category info lives in ListHeaderComponent and Collections Featuring
 * This Place lives in ListFooterComponent, exactly ForYouFeed.tsx's
 * established shape for a paginated list with header content above it.
 * This also gives requirement #7's "back navigation must preserve scroll
 * position" for free — expo-router's Stack keeps the previous screen
 * mounted on push, and there's no unusual navigation here (BackButton
 * below just calls router.back()).
 *
 * Not built this sprint, per the brief's explicit scope: Nearby
 * discovery, Place search, Place categories browsing, Reviews, Ratings,
 * Directions, real Collections, Saved Places, Following Places, deep
 * links. Collections Featuring This Place is a real, reserved section
 * with an honest empty state (see CollectionsFeaturingPlace.tsx) — not
 * fake-disabled UI, same philosophy as Experience Detail's action bar.
 */

import React, { useCallback } from 'react';
import { View, FlatList, Pressable, RefreshControl, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, WifiOff, AlertCircle, SearchX, Compass } from 'lucide-react-native';

import { theme } from '@/theme';
import { EmptyState, ScreenContainer, OfflineBanner, Spinner, Caption, Chip, H5 } from '@/components/ui';
import { ExperienceCard, ExperienceFeedSkeleton } from '@/components/discover';
import {
  PlaceMapHero,
  PlaceDetailInfo,
  CollectionsFeaturingPlace,
  PlaceDetailSkeleton,
} from '@/components/places';
import { usePlaceDetailPage } from '@/hooks/usePlaceExperiences';
import { useNetworkStatus } from '@/hooks';
import type { ExperienceCardModel } from '@/types/experience';

function BackButton() {
  return (
    <Pressable
      onPress={() => router.back()}
      style={styles.backButton}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel="Go back"
    >
      <View style={styles.backButtonScrim} />
      <ArrowLeft size={20} color={theme.colors.static.white} />
    </Pressable>
  );
}

export default function PlaceDetailScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  // Falls through to usePlace()'s own VALIDATION_ERROR/NOT_FOUND handling
  // (see usePlaces.ts) rather than special-casing a missing param here —
  // an empty/malformed id surfaces as the same "Place unavailable" state
  // a garbled deep link would, matching Experience Detail's own reasoning.
  const id = rawId ?? '';

  const network = useNetworkStatus();
  const isOffline = !network.isConnected || network.isInternetReachable === false;

  const { place, experiences, refresh, isRefreshing } = usePlaceDetailPage(id);

  const handleEndReached = useCallback(() => {
    if (experiences.hasNextPage && !experiences.isFetchingNextPage && !experiences.isError) {
      experiences.fetchNextPage();
    }
  }, [experiences.hasNextPage, experiences.isFetchingNextPage, experiences.isError, experiences.fetchNextPage]);

  const renderItem = useCallback(
    ({ item }: { item: ExperienceCardModel }) => (
      <View style={styles.cardWrapper}>
        <ExperienceCard experience={item} source="place_detail" />
      </View>
    ),
    [],
  );

  const keyExtractor = useCallback((item: ExperienceCardModel) => item.id, []);

  // ── Initial loading (no cached place yet) ─────────────────────────────────
  if (place.isLoading) {
    return (
      <ScreenContainer scroll={false} padded={false}>
        <OfflineBanner />
        <PlaceDetailSkeleton />
        <BackButton />
      </ScreenContainer>
    );
  }

  // ── Empty/error states — offline, not found, invalid id, or other failure ──
  if (!place.place) {
    let emptyState: React.ReactNode;

    if (isOffline) {
      emptyState = (
        <EmptyState
          icon={WifiOff}
          title="You're offline"
          description="Connect to the internet to view this place."
          action={{ label: 'Try Again', onPress: place.refetch }}
        />
      );
    } else if (place.error?.code === 'NOT_FOUND') {
      emptyState = (
        <EmptyState
          icon={SearchX}
          title="Place unavailable"
          description="This place may have been removed."
        />
      );
    } else if (place.error?.code === 'VALIDATION_ERROR') {
      emptyState = (
        <EmptyState
          icon={SearchX}
          title="Place unavailable"
          description="This link doesn't point to a valid place."
        />
      );
    } else {
      emptyState = (
        <EmptyState
          icon={AlertCircle}
          title="We couldn't load this place"
          description={place.error?.userMessage ?? 'Something went wrong. Please try again.'}
          action={{ label: 'Try Again', onPress: place.refetch }}
        />
      );
    }

    return (
      <ScreenContainer scroll={false} padded={false}>
        <OfflineBanner />
        <View style={styles.emptyBody}>{emptyState}</View>
        <BackButton />
      </ScreenContainer>
    );
  }

  const placeModel = place.place;

  const listHeader = (
    <View>
      <PlaceMapHero
        latitude={placeModel.latitude}
        longitude={placeModel.longitude}
        name={placeModel.name}
      />
      <View style={styles.infoWrapper}>
        <PlaceDetailInfo place={placeModel} />
      </View>
      <View style={styles.sectionHeader}>
        <H5>Community Experiences</H5>
      </View>
    </View>
  );

  const listEmpty = (() => {
    if (experiences.isLoading) {
      return <ExperienceFeedSkeleton count={2} />;
    }
    if (experiences.isError) {
      return (
        <View style={styles.emptyExperiences}>
          <EmptyState
            icon={AlertCircle}
            title="Couldn't load experiences"
            description={experiences.error?.userMessage ?? 'Something went wrong. Please try again.'}
            action={{ label: 'Try Again', onPress: experiences.refetch }}
          />
        </View>
      );
    }
    return (
      <View style={styles.emptyExperiences}>
        <EmptyState
          icon={Compass}
          title="No experiences yet"
          description={`Be the first to share an experience at ${placeModel.name}.`}
        />
      </View>
    );
  })();

  const paginationFooter = (() => {
    if (experiences.experiences.length === 0) return null;

    if (experiences.isFetchingNextPage) {
      return (
        <View style={styles.footer}>
          <Spinner accessibilityLabel="Loading more experiences" />
        </View>
      );
    }

    if (experiences.isError) {
      return (
        <View style={[styles.footer, styles.inlineError]}>
          <Caption color={theme.colors.text.tertiary}>Couldn&apos;t load more experiences.</Caption>
          <Chip label="Retry" onPress={experiences.fetchNextPage} style={styles.inlineRetryChip} />
        </View>
      );
    }

    if (!experiences.hasNextPage) {
      return (
        <View style={styles.footer}>
          <Caption color={theme.colors.text.tertiary}>You&apos;ve reached the end 👣</Caption>
        </View>
      );
    }

    return null;
  })();

  return (
    <ScreenContainer scroll={false} padded={false}>
      <OfflineBanner />
      <FlatList
        data={experiences.experiences}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        ListFooterComponent={
          <View>
            {paginationFooter}
            <CollectionsFeaturingPlace />
          </View>
        }
        contentContainerStyle={styles.listContent}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
        // Performance (requirement #10) — same tuning rationale as
        // ForYouFeed.tsx's own comment: bounded memory on a list that can
        // grow deep after repeated "load more"s, without
        // removeClippedSubviews (known to break RefreshControl,
        // particularly on Android).
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
            accessibilityLabel="Pull to refresh this place"
          />
        }
        accessibilityLabel={`${placeModel.name} details`}
      />
      <BackButton />
    </ScreenContainer>
  );
}

const BACK_BUTTON_DIAMETER = 40;

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: theme.spacing['4xl'],
  },
  infoWrapper: {
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    paddingTop: theme.spacing.md,
  },
  sectionHeader: {
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.sm,
  },
  cardWrapper: {
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    marginTop: theme.spacing.md,
  },
  emptyExperiences: {
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    minHeight: 240,
    justifyContent: 'center',
  },
  footer: {
    paddingVertical: theme.spacing.xl,
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  inlineError: {
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    alignItems: 'flex-start',
    gap: theme.spacing.xs,
  },
  inlineRetryChip: {
    marginTop: 0,
  },
  emptyBody: {
    flex: 1,
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: theme.spacing.md,
    left: theme.spacing.md,
    width: BACK_BUTTON_DIAMETER,
    height: BACK_BUTTON_DIAMETER,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  backButtonScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.static.black,
    opacity: theme.opacity.heavy,
  },
});
