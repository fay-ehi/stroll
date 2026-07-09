/**
 * Stroll — Collections Carousel Hook
 * src/hooks/useCollectionsCarousel.ts
 *
 * STATUS: Skeleton only, built on the mock src/services/collectionsService.ts
 * — see that file and src/types/collection.ts for the full picture of
 * what's real vs. scaffolded. Deliberately mirrors useContinueExploring's
 * shape in useDiscoverFeed.ts (a single-page, non-infinite rail — a
 * carousel doesn't paginate the way the main feed does) so the eventual
 * real version is a near copy-paste of that hook's pattern, just pointed
 * at collectionsService instead of experiencesService.
 *
 * Query key: kept in its own small local factory, not queryKeys.ts, so
 * this skeleton doesn't require editing a file relied on by the parts of
 * the app that ARE live yet. Fold `collections.forCity(city)` into
 * queryKeys.ts proper when this becomes real.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchCollectionsForCity } from '@/services/collectionsService';
import { toCollectionCardModel, type CollectionCardModel } from '@/types/collection';

const collectionsQueryKeys = {
  forCity: (city: string | undefined) => ['collections', 'carousel', city ?? 'all'] as const,
};

export interface UseCollectionsCarouselParams {
  city?: string;
}

export interface UseCollectionsCarouselResult {
  collections: CollectionCardModel[];
  isLoading: boolean;
  isError: boolean;
}

export function useCollectionsCarousel(
  params: UseCollectionsCarouselParams = {},
): UseCollectionsCarouselResult {
  const { city } = params;

  const query = useQuery({
    queryKey: collectionsQueryKeys.forCity(city),
    queryFn: async () => {
      const result = await fetchCollectionsForCity({ city });
      if (!result.ok) throw result.error;
      return result.data;
    },
    // Mock data never goes stale, but keeping a real staleTime here (rather
    // than Infinity) means this behaves like every other query in the app
    // the moment it's pointed at a real table — nothing to remember to
    // change later.
    staleTime: 60_000,
  });

  const collections = useMemo(() => {
    if (!query.data) return [];
    return query.data
      .map(toCollectionCardModel)
      .filter((c): c is CollectionCardModel => c !== null);
  }, [query.data]);

  return {
    collections,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
