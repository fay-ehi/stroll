/**
 * Stroll — Collections Carousel Hook
 * src/hooks/useCollectionsCarousel.ts
 *
 * STATUS: Real as of Sprint 5 Prompt 3 — backed by
 * collectionsService.ts's fetchPublicCollectionsFeed(), a real, cursor-
 * paginated query over public collections (see that function's own doc).
 * Previously a skeleton built on a mock (see collectionsService.ts's
 * module doc for the full history) — this hook's shape is unchanged from
 * that skeleton, exactly as its own prior doc comment anticipated: "the
 * eventual real version is a near copy-paste of that hook's pattern,
 * just pointed at collectionsService instead of experiencesService."
 *
 * Deliberately mirrors useFeaturedExperiences() / useContinueExploring()
 * in useDiscoverFeed.ts — a single-page, non-infinite rail (a Discover
 * carousel doesn't paginate the way the main vertical feed does), even
 * though the underlying service function IS keyset-paginated (so a
 * future "All Collections" directory screen can page further into the
 * exact same query — see fetchPublicCollectionsFeed()'s own doc).
 *
 * Query key: `queryKeys.collections.feed(city)` — folded into
 * queryKeys.ts proper this sprint, exactly as this hook's own prior doc
 * comment called for ("Fold `collections.forCity(city)` into
 * queryKeys.ts proper when this becomes real").
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { logError, type StrollError } from '@/lib/errors';
import { fetchPublicCollectionsFeed } from '@/services/collectionsService';
import { toCollectionCardModel, type CollectionCardModel } from '@/types/collection';

const STALE_TIME = 60_000;
const CAROUSEL_PAGE_SIZE = 10;

function isRetryableStrollError(failureCount: number, error: StrollError): boolean {
  return error.isRetryable && failureCount < 2;
}

export interface UseCollectionsCarouselParams {
  city?: string;
}

export interface UseCollectionsCarouselResult {
  collections: CollectionCardModel[];
  isLoading: boolean;
  isError: boolean;
  /** Pull-to-refresh hook-up — see app/(app)/(tabs)/discover.tsx's combined refresh handler. */
  refetch: () => void;
}

export function useCollectionsCarousel(
  params: UseCollectionsCarouselParams = {},
): UseCollectionsCarouselResult {
  const { city } = params;

  const query = useQuery({
    queryKey: queryKeys.collections.feed(city),
    queryFn: async () => {
      const result = await fetchPublicCollectionsFeed({ city, limit: CAROUSEL_PAGE_SIZE });
      if (!result.ok) throw result.error;
      return result.data.rows;
    },
    staleTime: STALE_TIME,
    retry: isRetryableStrollError,
  });

  const collections = useMemo(() => {
    if (!query.data) return [];
    const models: CollectionCardModel[] = [];
    for (const row of query.data) {
      const model = toCollectionCardModel(row);
      if (model) {
        models.push(model);
      } else {
        logError('useCollectionsCarousel', new Error(`Collection ${row.id} is missing its owner — dropped.`));
      }
    }
    return models;
  }, [query.data]);

  return {
    collections,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: () => {
      void query.refetch();
    },
  };
}
