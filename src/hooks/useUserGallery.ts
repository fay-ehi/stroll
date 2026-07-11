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
import { useInfiniteQuery, useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryKeys';
import {
  fetchExperiencesByUser,
  deleteExperience as deleteExperienceRequest,
  deleteExperiencePhoto,
  type UserExperiencesPage,
} from '@/services/experiencesService';
import { toExperienceCardModel, type ExperienceCardModel } from '@/types/experience';
import { makeError, normalizeError, logError, type StrollError } from '@/lib/errors';
import { showToast } from '@/stores/toastStore';
import { trackExperienceDeleted } from '@/lib/analytics';

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

// ─── useDeleteExperience (Sprint 3 Prompt 3 — Delete Experience) ─────────────────

export interface UseDeleteExperienceResult {
  deleteExperience: (experienceId: string) => void;
  isDeleting: boolean;
}

/**
 * Requirement #5 (Delete Experience) + #9 (Optimistic Updates) — removes
 * the row from the creator Profile grid's cache immediately, so the tile
 * disappears the instant the creator confirms, rolling back on failure
 * rather than leaving a wrong-looking grid. Confirmed with a full
 * `experiences.*` invalidation on success (Discover, Experience Details,
 * and this same gallery all live under that prefix — see queryKeys.ts).
 *
 * Deliberately its own hook, not folded into useUserGallery's query above
 * — the same "a query and its mutation are siblings, not one hook" shape
 * usePublishExperience already establishes alongside useExperienceCreation.
 */
export function useDeleteExperience(userId: string | undefined): UseDeleteExperienceResult {
  const queryClient = useQueryClient();

  const mutation = useMutation<
    { photoUrls: string[] },
    StrollError,
    string,
    { previous: InfiniteData<UserExperiencesPage> | undefined }
  >({
    mutationFn: async (experienceId) => {
      if (!userId) throw makeError('UNAUTHORIZED', 'Please sign in to continue.');
      const result = await deleteExperienceRequest(experienceId, userId);
      if (!result.ok) throw result.error;
      return result.data;
    },

    onMutate: async (experienceId) => {
      if (!userId) return { previous: undefined };
      const key = queryKeys.experiences.byUser(userId);

      // Stop any in-flight refetch of this list from clobbering the
      // optimistic removal below with stale (still-including-it) data.
      await queryClient.cancelQueries({ queryKey: key });

      const previous = queryClient.getQueryData<InfiniteData<UserExperiencesPage>>(key);
      if (previous) {
        queryClient.setQueryData<InfiniteData<UserExperiencesPage>>(key, {
          ...previous,
          pages: previous.pages.map((page) => ({
            ...page,
            rows: page.rows.filter((row) => row.id !== experienceId),
          })),
        });
      }
      return { previous };
    },

    onError: (error, _experienceId, context) => {
      logError('useDeleteExperience', error);
      if (userId && context?.previous) {
        queryClient.setQueryData(queryKeys.experiences.byUser(userId), context.previous);
      }
      showToast({
        type: 'error',
        message: `We couldn't delete this experience: ${normalizeError(error).userMessage}`,
      });
    },

    onSuccess: (result, experienceId) => {
      trackExperienceDeleted({ experienceId });

      // Best-effort Storage cleanup — same "fetch what needs cleaning up,
      // delete it, don't block on it" shape as handleDiscard's photo
      // cleanup (useExperienceCreation.ts).
      for (const url of result.photoUrls) void deleteExperiencePhoto(url);

      showToast({ type: 'success', message: 'Experience deleted.' });

      // Confirms the optimistic removal above against the server, and
      // catches Discover / Experience Details up too — see this
      // function's doc.
      void queryClient.invalidateQueries({ queryKey: queryKeys.experiences.all() });
    },
  });

  return {
    deleteExperience: (experienceId: string) => mutation.mutate(experienceId),
    isDeleting: mutation.isPending,
  };
}
