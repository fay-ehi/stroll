/**
 * Stroll — Saved Tab
 * app/(app)/(tabs)/saved.tsx
 *
 * Sprint 5 — Prompt 4. Personal bookmarks over Experiences and
 * Collections — separate from the Collections domain (see this
 * prompt's own doc: "Saved is not Collections... Saving an item never
 * modifies its ownership or contents"). Replaces the Sprint 4
 * placeholder ("Want To Visit" list) — that PRD §8.9 concept predates
 * this codebase's Core Product Architecture ADR ("Users save
 * Experiences, not Places"), so this screen saves Experiences and
 * Collections, not Places.
 *
 * ── Layout ──
 * Requirement #5 asks for two sections — "Saved Experiences" and "Saved
 * Collections" — each with its own grid, pull-to-refresh, pagination,
 * and empty state. Sprint 5 Prompt 4 follow-up: switched from a static
 * tap-only tab switch to a real swipeable pager — the same For You /
 * Following pattern Discover uses (tap the label OR swipe the content).
 * `SavedExperiencesPanel`/`SavedCollectionsPanel` below are each their
 * own independent FlatList (own pagination cursor, own scroll position),
 * mounted side by side inside `<SwipeableTabs>` (generic, reused as-is —
 * see its own module doc) so the drag feels continuous. The shared
 * header — title + `<SwipeUnderlineTabs>` — renders ONCE above the
 * pager, per that pairing's own "never duplicate the shared chrome
 * inside both panels" rule (see DiscoverTabs.tsx/SwipeableTabs.tsx).
 *
 * Both sections render via the existing reusable cards — ExperienceCard
 * and CollectionCard (requirement #5's "using the existing Experience
 * Card" / "using the existing Collection Card") — at a fixed 2-column
 * grid width (requirement #5's "Grid layout"), computed the same way
 * Profile's own creator grid computes `tileSize`. ExperienceCard renders
 * with `variant="compact"` here specifically — 'standard' is built for a
 * full-width single-column feed and its 3-line story preview wraps
 * awkwardly at a 2-column cell's ~160-180px width; 'compact' (added
 * alongside this same change, see ExperienceCard.tsx's own doc) drops
 * the story preview and tightens padding while keeping the same cover,
 * title, location, and creator/like footer.
 *
 * ── Removing a saved item ──
 * Requirement #6 asks for removal from the Saved screen itself.
 * ExperienceCard only renders its own bookmark button when
 * `source === 'saved'` (see that component's doc — everywhere else the
 * button was removed by product direction, "it's enough being in the
 * details"), which is exactly the source this screen passes — so the
 * bookmark here still doubles as the remove-from-Saved action, with the
 * same optimistic-update behavior (the item disappears from this grid
 * immediately) useSaved.ts's mutations already provide. CollectionCard's
 * own bookmark button is unchanged and still renders everywhere,
 * including here. Removal from Experience Detail and Collection Detail
 * is wired in those screens directly (see app/(app)/experience/[id].tsx
 * and app/(app)/collections/[id].tsx).
 *
 * ── Loading / empty / error / offline ──
 * Requirement #10's five states map onto the existing per-screen
 * pattern this codebase already uses (see app/(app)/collections/[id].tsx
 * for the same shape): an offline banner-style EmptyState takes priority
 * while offline, then a skeleton grid while a panel's first page is
 * loading, then a retryable EmptyState on a query error, then the
 * panel's own empty copy. "Synchronization failures" (part of
 * requirement #10) isn't a distinct visual state — a failed refetch
 * after cross-device sync surfaces through this exact same error branch,
 * and a failed save/unsave surfaces through useSaved.ts's own error
 * toast (see that file's module doc for why there's no separate offline
 * mutation queue).
 */

import React, { useCallback, useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { WifiOff, AlertCircle, Bookmark } from 'lucide-react-native';
import { useSharedValue } from 'react-native-reanimated';

import { theme } from '@/theme';
import { ScreenContainer, H2, EmptyState, Spinner, Caption } from '@/components/ui';
import {
  ExperienceCard,
  ExperienceCardSkeleton,
  CollectionCard,
  CollectionCardSkeleton,
  SwipeableTabs,
  SwipeUnderlineTabs,
} from '@/components/discover';
import { useAuthState } from '@/hooks/useAuth';
import { useNetworkStatus } from '@/hooks';
import {
  useSavedLibrary,
  type UseSavedExperiencesResult,
  type UseSavedCollectionsResult,
} from '@/hooks/useSaved';
import { ROUTES } from '@/constants/routes';
import type { ExperienceCardModel } from '@/types/experience';
import type { CollectionCardModel } from '@/types/collection';

// ─── Grid sizing ────────────────────────────────────────────────────────────────
// Same formula as Profile's own creator grid (`tileSize` in
// app/(app)/(tabs)/profile.tsx), just 2 columns instead of 3 — a rich
// ExperienceCard/CollectionCard needs more width per cell than a bare
// square photo tile.

const GRID_COLUMNS = 2;
const GRID_GAP = theme.spacing.md;
const SKELETON_COUNT = 4;

type SavedSectionTab = 'experiences' | 'collections';

const SAVED_TABS = [
  { id: 'experiences', label: 'Experiences' },
  { id: 'collections', label: 'Collections' },
] as const;

// ─── Saved Experiences Panel ─────────────────────────────────────────────────

interface SavedExperiencesPanelProps {
  state: UseSavedExperiencesResult;
  cardWidth: number;
  isOffline: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
}

function SavedExperiencesPanel({ state, cardWidth, isOffline, isRefreshing, onRefresh }: SavedExperiencesPanelProps) {
  const handleEndReached = useCallback(() => {
    if (state.hasNextPage && !state.isFetchingNextPage && !state.isError) {
      state.fetchNextPage();
    }
  }, [state]);

  const renderItem = useCallback(
    ({ item }: { item: ExperienceCardModel }) => (
      <View style={{ width: cardWidth, maxWidth: cardWidth }}>
        <ExperienceCard experience={item} variant="compact" source="saved" width={cardWidth} />
      </View>
    ),
    [cardWidth],
  );

  const keyExtractor = useCallback((item: ExperienceCardModel) => item.id, []);

  const handleExplore = useCallback(() => {
    router.push(ROUTES.tabs.discover as never);
  }, []);

  const listEmpty = renderSavedEmptyState({
    isOffline,
    isLoading: state.isLoading,
    isError: state.isError,
    errorMessage: state.error?.userMessage,
    onRetry: state.refetch,
    skeleton: (
      <View style={styles.skeletonGrid}>
        {Array.from({ length: SKELETON_COUNT }, (_, index) => (
          <ExperienceCardSkeleton key={index} variant="compact" width={cardWidth} />
        ))}
      </View>
    ),
    icon: Bookmark,
    title: 'No saved experiences yet',
    description: 'Open any experience and tap Save to keep it here.',
    onExplore: handleExplore,
  });

  const paginationFooter = renderPaginationFooter(state, state.experiences.length);

  return (
    <FlatList
      data={state.experiences}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      numColumns={GRID_COLUMNS}
      columnWrapperStyle={styles.gridRow}
      ListEmptyComponent={listEmpty}
      ListFooterComponent={paginationFooter}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.5}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.screenPadding}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor={theme.colors.brand.primary}
          accessibilityLabel="Pull to refresh your saved experiences"
        />
      }
      accessibilityLabel="Saved Experiences"
    />
  );
}

// ─── Saved Collections Panel ──────────────────────────────────────────────────

interface SavedCollectionsPanelProps {
  state: UseSavedCollectionsResult;
  cardWidth: number;
  isOffline: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
}

function SavedCollectionsPanel({ state, cardWidth, isOffline, isRefreshing, onRefresh }: SavedCollectionsPanelProps) {
  const handleSelectCollection = useCallback((collection: CollectionCardModel) => {
    router.push(ROUTES.app.collectionDetail(collection.id) as never);
  }, []);

  const handleEndReached = useCallback(() => {
    if (state.hasNextPage && !state.isFetchingNextPage && !state.isError) {
      state.fetchNextPage();
    }
  }, [state]);

  const renderItem = useCallback(
    ({ item }: { item: CollectionCardModel }) => (
      <CollectionCard
        collection={item}
        onPress={handleSelectCollection}
        style={{ width: cardWidth, maxWidth: cardWidth }}
      />
    ),
    [cardWidth, handleSelectCollection],
  );

  const keyExtractor = useCallback((item: CollectionCardModel) => item.id, []);

  const handleExplore = useCallback(() => {
    router.push(ROUTES.tabs.discover as never);
  }, []);

  const listEmpty = renderSavedEmptyState({
    isOffline,
    isLoading: state.isLoading,
    isError: state.isError,
    errorMessage: state.error?.userMessage,
    onRetry: state.refetch,
    skeleton: (
      <View style={styles.skeletonGrid}>
        {Array.from({ length: SKELETON_COUNT }, (_, index) => (
          <CollectionCardSkeleton key={index} width={cardWidth} />
        ))}
      </View>
    ),
    icon: Bookmark,
    title: 'No saved collections yet',
    description: 'Tap the bookmark icon on any collection to save it here.',
    onExplore: handleExplore,
  });

  const paginationFooter = renderPaginationFooter(state, state.collections.length);

  return (
    <FlatList
      data={state.collections}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      numColumns={GRID_COLUMNS}
      columnWrapperStyle={styles.gridRow}
      ListEmptyComponent={listEmpty}
      ListFooterComponent={paginationFooter}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.5}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.screenPadding}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor={theme.colors.brand.primary}
          accessibilityLabel="Pull to refresh your saved collections"
        />
      }
      accessibilityLabel="Saved Collections"
    />
  );
}

// ─── Shared empty/loading/error state builder ────────────────────────────────
// Both panels above need the exact same offline → loading → error → empty
// branching (see module doc's "Loading / empty / error / offline"), so
// it's one function instead of two copy-pasted IIFEs.

function renderSavedEmptyState(params: {
  isOffline: boolean;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  onRetry: () => void;
  skeleton: React.ReactElement;
  icon: typeof Bookmark;
  title: string;
  description: string;
  onExplore: () => void;
}): React.ReactElement | null {
  if (params.isOffline) {
    return (
      <View style={styles.emptyWrap}>
        <EmptyState
          icon={WifiOff}
          title="You're offline"
          description="Connect to the internet to view your saved items."
          action={{ label: 'Try Again', onPress: params.onRetry }}
        />
      </View>
    );
  }

  if (params.isLoading) {
    return params.skeleton;
  }

  if (params.isError) {
    return (
      <View style={styles.emptyWrap}>
        <EmptyState
          icon={AlertCircle}
          title="Couldn't load your saved items"
          description={params.errorMessage ?? 'Something went wrong. Please try again.'}
          action={{ label: 'Try Again', onPress: params.onRetry }}
        />
      </View>
    );
  }

  return (
    <View style={styles.emptyWrap}>
      <EmptyState
        icon={params.icon}
        title={params.title}
        description={params.description}
        action={{ label: 'Explore Discover', onPress: params.onExplore }}
      />
    </View>
  );
}

function renderPaginationFooter(
  state: { hasNextPage: boolean; isFetchingNextPage: boolean },
  itemCount: number,
): React.ReactElement | null {
  if (itemCount === 0) return null;

  if (state.isFetchingNextPage) {
    return (
      <View style={styles.footer}>
        <Spinner accessibilityLabel="Loading more saved items" />
      </View>
    );
  }

  if (!state.hasNextPage) {
    return (
      <View style={styles.footer}>
        <Caption color={theme.colors.text.tertiary}>You&apos;ve reached the end 👣</Caption>
      </View>
    );
  }

  return null;
}

// ─── Screen ─────────────────────────────────────────────────────────────────────

export default function SavedScreen() {
  const { user } = useAuthState();
  const network = useNetworkStatus();
  const isOffline = !network.isConnected || network.isInternetReachable === false;
  const { width: windowWidth } = useWindowDimensions();

  const [activeTab, setActiveTab] = useState<SavedSectionTab>('experiences');
  // Shared with <SwipeUnderlineTabs> (reads it, for the sliding
  // underline) and <SwipeableTabs> (writes it, during a drag) — same
  // pairing discover.tsx uses for For You/Following, see
  // SwipeUnderlineTabs.tsx's own module doc.
  const dragProgress = useSharedValue(0);
  const library = useSavedLibrary(user?.id);

  const cardWidth =
    (windowWidth - theme.layout.screenPaddingHorizontal * 2 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;

  const handleRefresh = useCallback(() => {
    void library.refresh();
  }, [library]);

  return (
    <ScreenContainer scroll={false} padded={false}>
      <View style={styles.headerWrap}>
        <H2>Saved</H2>
      </View>

      <SwipeUnderlineTabs
        tabs={SAVED_TABS}
        activeId={activeTab}
        onChange={(id) => setActiveTab(id as SavedSectionTab)}
        dragProgress={dragProgress}
      />

      <SwipeableTabs
        activeIndex={activeTab === 'experiences' ? 0 : 1}
        onChangeIndex={(index) => setActiveTab(index === 0 ? 'experiences' : 'collections')}
        dragProgress={dragProgress}
        first={
          <SavedExperiencesPanel
            state={library.experiences}
            cardWidth={cardWidth}
            isOffline={isOffline}
            isRefreshing={library.isRefreshing}
            onRefresh={handleRefresh}
          />
        }
        second={
          <SavedCollectionsPanel
            state={library.collections}
            cardWidth={cardWidth}
            isOffline={isOffline}
            isRefreshing={library.isRefreshing}
            onRefresh={handleRefresh}
          />
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screenPadding: {
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing['4xl'],
  },
  headerWrap: {
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    marginBottom: theme.spacing.md,
  },
  gridRow: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  emptyWrap: {
    minHeight: 320,
    justifyContent: 'center',
  },
  footer: {
    paddingVertical: theme.spacing.xl,
    alignItems: 'center',
  },
});
