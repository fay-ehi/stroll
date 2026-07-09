/**
 * Stroll — User Gallery Hook
 * src/hooks/useUserGallery.ts
 *
 * Backs the redesigned Profile screen's gallery of the user's own
 * published experiences. Real, Supabase-backed data — not a skeleton —
 * reusing fetchExperiencesByUser() (experiencesService.ts) and
 * queryKeys.experiences.byUser(userId), a key already reserved for
 * exactly this ("Experiences authored by a specific user").
 *
 * Deliberately its own small file rather than folded into useProfile.ts:
 * useProfile.ts owns the profile *record* (avatar, bio, display name);
 * this owns a paginated *list* of a different domain's rows (experiences)
 * that happen to be filtered by that profile's id — the same "own file
 * per domain, hooks compose across them" shape useDiscoverFeed.ts and
 * useProfile.ts already establish as siblings rather than one merged
 * mega-hook file.
 */

import { useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryKeys';
import { fetchExperiencesByUser, type UserExperiencesPage } from '@/services/experiencesService';
import { toExperienceCardModel, type ExperienceCardModel } from '@/types/experience';
import type { StrollError } from '@/lib/errors';

const STALE_TIME = 60 * 1000;

export interface UseUserGalleryResult {
  experiences: ExperienceCardModel[];
  isLoading: boolean;
  isError: boolean;
  error: StrollError | null;
  refetch: () => void;
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
}

export function useUserGallery(userId: string | undefined): UseUserGalleryResult {
  const query = useInfiniteQuery<UserExperiencesPage, StrollError>({
    queryKey: queryKeys.experiences.byUser(userId ?? ''),
    queryFn: async ({ pageParam }) => {
      const result = await fetchExperiencesByUser({
        userId: userId!,
        cursor: (pageParam as string | null) ?? null,
      });
      if (!result.ok) throw result.error;
      return result.data;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!userId,
    staleTime: STALE_TIME,
  });

  const experiences = useMemo(() => {
    if (!query.data) return [];
    return query.data.pages.flatMap((page) =>
      page.rows
        .map(toExperienceCardModel)
        .filter((card): card is ExperienceCardModel => card !== null),
    );
  }, [query.data]);

  return {
    experiences,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: () => {
      void query.refetch();
    },
    fetchNextPage: () => {
      void query.fetchNextPage();
    },
    hasNextPage: !!query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
  };
}
