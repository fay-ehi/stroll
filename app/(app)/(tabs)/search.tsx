/**
 * Stroll — Search Tab
 * app/(app)/(tabs)/search.tsx
 *
 * Sprint 7 Prompt 1 — Search Foundation. Replaces the Sprint 4
 * placeholder. PRD §8.4 — searches across Experiences, Collections, and
 * Creators; never Places directly (searching a Place's name surfaces
 * Experiences/Collections at that place instead — see
 * experiencesService.ts's searchExperiences doc for how).
 *
 * Screen states, in priority order:
 *   1. No query typed yet        → Recent Searches if any exist,
 *      otherwise the initial "Discover your next experience" empty
 *      state. Works offline — recent searches are local, no network
 *      needed.
 *   2. Query typed, offline      → a dedicated "you're offline" state —
 *      Search has no offline cache to fall back to (unlike Saved's
 *      persisted queries), so this is clearer than letting a request
 *      time out into a generic error.
 *   3. Loading                   → section skeletons, never a blank
 *      screen (Design System §34).
 *   4. Resolved, an error        → error state with Retry.
 *   5. Resolved, zero results    → "No results found."
 *   6. Resolved, some results    → Experiences → Collections → Creators,
 *      in that order; a section with no matches for that domain simply
 *      doesn't render (SearchSection's own behavior).
 *
 * The search bar stays visible while results scroll (`stickyHeaderIndices`
 * on the underlying ScrollView, exposed via ScreenContainer's own
 * `scrollViewProps` passthrough) — a plain built-in React Native
 * capability, not a new component.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { Compass, SearchX, WifiOff } from 'lucide-react-native';

import { theme } from '@/theme';
import { H2, EmptyState, ScreenContainer } from '@/components/ui';
import {
  ExperienceCard,
  ExperienceFeedSkeleton,
  CollectionCard,
  CollectionCardSkeleton,
} from '@/components/discover';
import {
  SearchInput,
  SearchSection,
  CreatorResultRow,
  CreatorResultRowSkeleton,
  RecentSearchesList,
} from '@/components/search';
import { useSearchScreen } from '@/hooks/useSearch';
import { useAuthState } from '@/hooks/useAuth';
import { ROUTES } from '@/constants/routes';
import type { CollectionCardModel } from '@/types/collection';
import type { ExperienceCardModel } from '@/types/experience';
import type { CreatorSearchResult } from '@/types/search';

const COLLECTIONS_GRID_COLUMNS = 2;
const COLLECTIONS_GRID_GAP = theme.spacing.md;

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const { user } = useAuthState();
  const { width: windowWidth } = useWindowDimensions();

  const {
    experiences,
    collections,
    creators,
    hasQuery,
    hasResults,
    isLoading,
    isError,
    isOffline,
    error,
    refetch,
    recentSearches,
  } = useSearchScreen(query);

  const collectionCardWidth = useMemo(
    () =>
      (windowWidth -
        theme.layout.screenPaddingHorizontal * 2 -
        COLLECTIONS_GRID_GAP * (COLLECTIONS_GRID_COLUMNS - 1)) /
      COLLECTIONS_GRID_COLUMNS,
    [windowWidth],
  );

  const handleSelectCollection = useCallback((collection: CollectionCardModel) => {
    router.push(ROUTES.app.collectionDetail(collection.id) as never);
  }, []);

  const handleSelectRecent = useCallback((term: string) => {
    setQuery(term);
  }, []);

  const renderBody = () => {
    if (!hasQuery) {
      if (recentSearches.searches.length > 0) {
        return (
          <RecentSearchesList
            searches={recentSearches.searches}
            onSelect={handleSelectRecent}
            onRemove={recentSearches.remove}
            onClearAll={recentSearches.clear}
          />
        );
      }
      return (
        <EmptyState
          icon={Compass}
          title="Discover your next experience"
          description="Search for experiences, collections, or creators."
        />
      );
    }

    if (isOffline) {
      return (
        <EmptyState
          icon={WifiOff}
          title="You're offline"
          description="Connect to the internet to search Stroll."
        />
      );
    }

    if (isLoading) {
      return (
        <View>
          <ExperienceFeedSkeleton count={2} />
          <View style={styles.collectionsSkeletonRow}>
            <CollectionCardSkeleton width={collectionCardWidth} />
            <CollectionCardSkeleton width={collectionCardWidth} />
          </View>
          <CreatorResultRowSkeleton />
          <CreatorResultRowSkeleton />
        </View>
      );
    }

    if (isError) {
      return (
        <EmptyState
          icon={WifiOff}
          title="Something went wrong"
          description={error?.userMessage ?? 'Please try again.'}
          action={{ label: 'Try Again', onPress: refetch }}
        />
      );
    }

    if (!hasResults) {
      return (
        <EmptyState
          icon={SearchX}
          title="No results found"
          description="Try another keyword or explore similar experiences later."
        />
      );
    }

    return (
      <>
        <SearchSection<ExperienceCardModel>
          title="Experiences"
          items={experiences}
          keyExtractor={(item) => item.id}
          renderItem={(item) => <ExperienceCard experience={item} source="search" />}
        />

        <SearchSection<CollectionCardModel>
          title="Collections"
          items={collections}
          keyExtractor={(item) => item.id}
          columns={2}
          itemWidth={collectionCardWidth}
          renderItem={(item) => (
            <CollectionCard
              collection={item}
              onPress={handleSelectCollection}
              style={{ width: collectionCardWidth, maxWidth: collectionCardWidth }}
            />
          )}
        />

        <SearchSection<CreatorSearchResult>
          title="Creators"
          items={creators}
          keyExtractor={(item) => item.id}
          renderItem={(item) => (
            <CreatorResultRow creator={item} currentUserId={user?.id} />
          )}
        />
      </>
    );
  };

  return (
    <ScreenContainer
      scroll
      scrollViewProps={{ stickyHeaderIndices: [0], keyboardShouldPersistTaps: 'handled' }}
    >
      <View style={styles.headerWrap}>
        <H2 style={styles.title}>Search</H2>
        <SearchInput value={query} onChangeText={setQuery} />
      </View>

      <View style={styles.body}>{renderBody()}</View>
    </ScreenContainer>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  headerWrap: {
    backgroundColor: theme.colors.neutral.background,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  title: {
    marginBottom: theme.spacing.md,
  },
  body: {
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing['4xl'],
  },
  collectionsSkeletonRow: {
    flexDirection: 'row',
    gap: COLLECTIONS_GRID_GAP,
    marginBottom: theme.spacing.xxl,
  },
});
