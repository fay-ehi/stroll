/**
 * Stroll — Collections Hooks
 * src/hooks/useCollections.ts
 *
 * Sprint 5 — Prompt 1. The Collections domain's public API — screens go
 * through these hooks, never collectionsService or supabase directly
 * (architecture rule: UI screens → hooks → stores → services →
 * Supabase). No Zustand store here for the same reason usePlaces.ts has
 * none: every piece of state below is server state (TanStack Query) or
 * ephemeral, screen-local UI state (form drafts, a picked-but-not-yet-
 * uploaded cover image) that plain component state already handles —
 * nothing here needs to be read from a different part of the component
 * tree the way, say, avatarUploadStage does in profileStore.
 *
 * Exposes:
 *   useCollection()                    — a single Collection by id.
 *   useMyCollections()                 — the signed-in user's own
 *                                         Collections (Profile pill row,
 *                                         Add-to-Collection picker).
 *   useCollectionExperiences()         — a Collection's paginated
 *                                         Experience list.
 *   useCollectionDetailPage()          — screen-level composition of the
 *                                         two above, what
 *                                         app/(app)/collections/[id].tsx
 *                                         calls.
 *   useCollectionsContainingExperience() — which of the user's own
 *                                         Collections already contain a
 *                                         given Experience (Add-to-
 *                                         Collection modal's pre-checked
 *                                         state).
 *   useCreateCollection()              — create, optionally with a cover.
 *   useUpdateCollection()              — rename / edit description.
 *   useDeleteCollection()              — delete (never touches Experiences).
 *   useUploadCollectionCover()         — set/replace a custom cover.
 *   useRemoveCollectionCover()         — clear a custom cover.
 *   useAddExperienceToCollection()     — add one of your own Experiences.
 *   useRemoveExperienceFromCollection() — remove one.
 *   useReorderCollectionExperiences()  — persist a new manual order.
 */

import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient, useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';

import { queryKeys } from '@/lib/queryKeys';
import { makeError, normalizeError, logError, type StrollError } from '@/lib/errors';
import { showToast } from '@/stores/toastStore';
import { useAuthStore } from '@/stores/authStore';
import { useNetworkStatus, useDebounce } from '@/hooks';
import { IMAGE_CONFIG, TIMEOUTS } from '@/constants/app';
import { validateAvatarAsset } from '@/types/profile';
import {
  getCollection,
  getMyCollections,
  createCollection,
  updateCollection,
  deleteCollection,
  uploadCollectionCover,
  removeCollectionCover,
  addExperienceToCollection,
  removeExperienceFromCollection,
  reorderCollectionExperiences,
  getCollectionsContainingExperience,
  getCollectionExperiences,
  searchCollections,
  type CreateCollectionInput,
  type UpdateCollectionInput,
  type CollectionExperiencesPage,
} from '@/services/collectionsService';
import {
  toCollectionModel,
  toCollectionCardModel,
  type CollectionModel,
  type CollectionCardModel,
  type CollectionDetailRow,
} from '@/types/collection';
import { toExperienceCardModel, type ExperienceCardModel } from '@/types/experience';

// ─── Shared ─────────────────────────────────────────────────────────────────────

const STALE_TIMES = {
  detail: 60 * 1000,
  mine: 60 * 1000,
  experiences: 60 * 1000,
  containing: 30 * 1000,
  search: 30 * 1000,
} as const;

const NOT_SIGNED_IN_MESSAGE = 'Please sign in to continue.';
const OFFLINE_MESSAGE = "You're offline. Connect to the internet and try again.";

function isRetryableStrollError(failureCount: number, error: StrollError): boolean {
  return error.isRetryable && failureCount < 2;
}

function mapDetail(row: CollectionDetailRow, context: string): CollectionModel | null {
  const model = toCollectionModel(row);
  if (!model) {
    logError(context, new Error(`Collection ${row.id} is missing its owner — dropped.`));
  }
  return model;
}

// ─── pickCollectionCoverAsset ────────────────────────────────────────────────
// A plain async function, not a hook — permission request → launch the
// system picker → validate, identical for both callers that need a
// Collection cover image: app/(modals)/create-collection.tsx (picks
// before the Collection exists, holds the result in local state) and
// app/(app)/collections/[id].tsx's "Change Cover" management action
// (picks, then immediately calls useUploadCollectionCover). Reuses
// validateAvatarAsset (src/types/profile.ts) rather than a near-
// duplicate "validateCollectionCoverAsset" — its mime-type/file-size
// checks are generic image validation, not actually avatar-specific;
// useExperienceCreation.ts already reuses it the same way for photo
// uploads. 4:3 aspect crop, matching CollectionDetailHeader.tsx's cover
// aspect ratio — unlike an avatar's 1:1.
export async function pickCollectionCoverAsset(): Promise<{ uri: string; mimeType: string } | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    showToast({ type: 'info', message: 'Photo access is needed to set a cover photo.' });
    return null;
  }

  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [4, 3],
    quality: IMAGE_CONFIG.COMPRESSION_QUALITY,
  });

  if (picked.canceled || !picked.assets[0]) return null;
  const asset = picked.assets[0];

  const validation = validateAvatarAsset({
    uri: asset.uri,
    mimeType: asset.mimeType,
    fileSize: asset.fileSize,
  });
  if (!validation.valid) {
    showToast({ type: 'error', message: validation.message ?? 'This image cannot be used.' });
    return null;
  }

  return { uri: asset.uri, mimeType: asset.mimeType ?? 'image/jpeg' };
}

// ─── useCollection ────────────────────────────────────────────────────────────

export interface UseCollectionResult {
  collection: CollectionModel | null;
  isLoading: boolean;
  isRefetching: boolean;
  isError: boolean;
  error: StrollError | null;
  refetch: () => void;
}

export function useCollection(id: string | undefined): UseCollectionResult {
  const query = useQuery<CollectionModel | null, StrollError>({
    queryKey: queryKeys.collections.detail(id ?? ''),
    enabled: !!id,
    queryFn: async () => {
      if (!id) throw makeError('VALIDATION_ERROR', 'No collection id provided.');

      const result = await getCollection(id);
      if (!result.ok) throw result.error;
      if (!result.data) throw makeError('NOT_FOUND', `No collection found with id ${id}.`);

      return mapDetail(result.data, 'useCollection');
    },
    staleTime: STALE_TIMES.detail,
    retry: isRetryableStrollError,
  });

  return {
    collection: query.data ?? null,
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    isError: query.isError,
    error: query.error,
    refetch: () => {
      void query.refetch();
    },
  };
}

// ─── useMyCollections ─────────────────────────────────────────────────────────
// A single generous page, not useInfiniteQuery — both current callers
// (the Profile pill row, the Add-to-Collection modal's picker) render a
// bounded personal list, not a feed; `limit` defaults high enough that
// pagination realistically never kicks in for either. getMyCollections()
// itself still supports a cursor (see collectionsService.ts) for a
// future "All My Collections" screen that would need it.

export interface UseMyCollectionsResult {
  collections: CollectionModel[];
  isLoading: boolean;
  isRefetching: boolean;
  isError: boolean;
  refetch: () => void;
}

export function useMyCollections(
  userId: string | undefined,
  options?: { limit?: number },
): UseMyCollectionsResult {
  const limit = options?.limit ?? 50;

  const query = useQuery({
    queryKey: [...queryKeys.collections.byUser(userId ?? ''), limit] as const,
    enabled: !!userId,
    queryFn: async () => {
      const result = await getMyCollections({ creatorId: userId!, limit });
      if (!result.ok) throw result.error;
      return result.data;
    },
    staleTime: STALE_TIMES.mine,
    retry: isRetryableStrollError,
  });

  const collections = useMemo(() => {
    if (!query.data) return [];
    const models: CollectionModel[] = [];
    for (const row of query.data.rows) {
      const model = mapDetail(row, 'useMyCollections');
      if (model) models.push(model);
    }
    return models;
  }, [query.data]);

  return {
    collections,
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    isError: query.isError,
    refetch: () => {
      void query.refetch();
    },
  };
}

// ─── useCollectionExperiences ────────────────────────────────────────────────

function mapExperienceRows(rows: CollectionExperiencesPage['rows'], context: string): ExperienceCardModel[] {
  const cards: ExperienceCardModel[] = [];
  for (const row of rows) {
    const card = toExperienceCardModel(row);
    if (card) {
      cards.push(card);
    } else {
      logError(context, new Error(`Experience ${row.id} is missing its creator or place — dropped.`));
    }
  }
  return cards;
}

export interface UseCollectionExperiencesResult {
  experiences: ExperienceCardModel[];
  isLoading: boolean;
  isError: boolean;
  error: StrollError | null;
  refetch: () => void;
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
}

export function useCollectionExperiences(collectionId: string | undefined): UseCollectionExperiencesResult {
  const query = useInfiniteQuery<CollectionExperiencesPage, StrollError>({
    queryKey: queryKeys.experiences.byCollection(collectionId ?? ''),
    queryFn: async ({ pageParam }) => {
      const result = await getCollectionExperiences({
        collectionId: collectionId!,
        cursor: (pageParam as string | null) ?? null,
      });
      if (!result.ok) throw result.error;
      return result.data;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!collectionId,
    staleTime: STALE_TIMES.experiences,
  });

  const experiences = useMemo(() => {
    if (!query.data) return [];
    return query.data.pages.flatMap((page) => mapExperienceRows(page.rows, 'useCollectionExperiences'));
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

// ─── useCollectionDetailPage ──────────────────────────────────────────────────

export interface UseCollectionDetailPageResult {
  collection: UseCollectionResult;
  experiences: UseCollectionExperiencesResult;
  /** Refreshes both the collection record and its experience list together — what the screen's pull-to-refresh calls. */
  refresh: () => Promise<void>;
  isRefreshing: boolean;
}

export function useCollectionDetailPage(id: string | undefined): UseCollectionDetailPageResult {
  const collection = useCollection(id);
  const experiences = useCollectionExperiences(id);
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    if (!id) return;
    setIsRefreshing(true);
    try {
      await Promise.all([
        queryClient.refetchQueries({ queryKey: queryKeys.collections.detail(id) }),
        queryClient.refetchQueries({ queryKey: queryKeys.experiences.byCollection(id) }),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  }, [id, queryClient]);

  return { collection, experiences, refresh, isRefreshing };
}

// ─── useCollectionsContainingExperience ──────────────────────────────────────
// Backs the Add-to-Collection modal's pre-checked rows.

export function useCollectionsContainingExperience(
  userId: string | undefined,
  experienceId: string | undefined,
): { collectionIds: Set<string>; isLoading: boolean } {
  const query = useQuery({
    queryKey: queryKeys.collections.containing(userId ?? '', experienceId ?? ''),
    enabled: !!userId && !!experienceId,
    queryFn: async () => {
      const result = await getCollectionsContainingExperience(userId!, experienceId!);
      if (!result.ok) throw result.error;
      return result.data;
    },
    staleTime: STALE_TIMES.containing,
  });

  const collectionIds = useMemo(() => new Set(query.data ?? []), [query.data]);
  return { collectionIds, isLoading: query.isLoading };
}

// ─── useSearchCollections ─────────────────────────────────────────────────────
// Sprint 5 Prompt 3, requirement #3 (Search Integration) — architecture
// preparation only. Title and creator-name matching over public
// Collections, returning the same CollectionCardModel shape
// useCollectionsCarousel does so a future Search screen can render
// results with the exact same <CollectionCard> component, no new
// mapping needed. Debounces internally, matching this codebase's
// established convention for a live-typing search hook (see
// usePlaceSearch / useGooglePlaceSearch in usePlaces.ts) — a caller
// just passes the raw input value, not an already-debounced one.
//
// Not called from any screen yet — app/(app)/(tabs)/search.tsx remains a
// placeholder (Search itself is out of this prompt's scope; see the
// prompt doc's "Do Not Build Yet"). Exported and ready the same way
// CollectionCard/CollectionCarousel sat ready-but-unmounted ahead of
// this prompt's own Discover wiring.

export interface UseSearchCollectionsResult {
  collections: CollectionCardModel[];
  isLoading: boolean;
  isError: boolean;
  error: StrollError | null;
}

export function useSearchCollections(query: string): UseSearchCollectionsResult {
  const debouncedQuery = useDebounce(query.trim(), TIMEOUTS.SEARCH_DEBOUNCE_MS);

  const searchQuery = useQuery<CollectionDetailRow[], StrollError>({
    queryKey: queryKeys.collections.search(debouncedQuery),
    enabled: debouncedQuery.length > 0,
    queryFn: async () => {
      const result = await searchCollections({ query: debouncedQuery });
      if (!result.ok) throw result.error;
      return result.data;
    },
    staleTime: STALE_TIMES.search,
    retry: isRetryableStrollError,
  });

  const collections = useMemo(() => {
    if (!searchQuery.data) return [];
    const models: CollectionCardModel[] = [];
    for (const row of searchQuery.data) {
      const model = toCollectionCardModel(row);
      if (model) {
        models.push(model);
      } else {
        logError('useSearchCollections', new Error(`Collection ${row.id} is missing its owner — dropped.`));
      }
    }
    return models;
  }, [searchQuery.data]);

  return {
    collections,
    isLoading: debouncedQuery.length > 0 && searchQuery.isLoading,
    isError: searchQuery.isError,
    error: searchQuery.error,
  };
}

// ─── useCreateCollection ──────────────────────────────────────────────────────
// Creates the row first, then — only if the caller passed a picked cover
// image — uploads it and flips cover_type to 'custom'. See
// collectionsService.ts's createCollection() doc for why cover upload
// can't happen before the row exists (the storage path is
// `${creatorId}/${collectionId}.${ext}`).

export interface CreateCollectionParams {
  title: string;
  description?: string | null;
  /** A picked-but-not-yet-uploaded cover, if the user chose one in the Create Collection form. */
  cover?: { uri: string; mimeType?: string } | null;
}

export function useCreateCollection() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const { isConnected } = useNetworkStatus();

  return useMutation<CollectionModel, StrollError, CreateCollectionParams>({
    mutationFn: async (params) => {
      if (!user) throw makeError('UNAUTHORIZED', NOT_SIGNED_IN_MESSAGE);
      if (!isConnected) throw makeError('NETWORK_ERROR', OFFLINE_MESSAGE);

      const input: CreateCollectionInput = {
        creatorId: user.id,
        title: params.title,
        description: params.description,
      };

      const createResult = await createCollection(input);
      if (!createResult.ok) throw createResult.error;

      let finalRow = createResult.data;

      if (params.cover) {
        const uploadResult = await uploadCollectionCover(
          finalRow.id,
          user.id,
          params.cover.uri,
          params.cover.mimeType ?? 'image/jpeg',
        );
        // A cover upload failure doesn't undo the Collection itself —
        // it's already created with a generated (empty, since it has no
        // Experiences yet) cover; surface the upload failure via its own
        // toast rather than throwing and losing the newly created
        // Collection from the caller's perspective.
        if (uploadResult.ok) {
          finalRow = uploadResult.data;
        } else {
          showToast({ type: 'error', message: 'Collection created, but the cover photo failed to upload.' });
        }
      }

      const model = toCollectionModel(finalRow);
      if (!model) throw makeError('UNKNOWN', 'Collection was created but could not be loaded.');
      return model;
    },

    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.collections.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: queryKeys.collections.byUser(data.owner.id) });
      showToast({ type: 'success', message: 'Collection created.' });
    },

    onError: (error) => {
      logError('useCreateCollection', error);
      showToast({ type: 'error', message: normalizeError(error).userMessage });
    },
  });
}

// ─── useUpdateCollection ──────────────────────────────────────────────────────

interface UpdateCollectionContext {
  previous: CollectionModel | undefined;
}

export function useUpdateCollection(collectionId: string) {
  const queryClient = useQueryClient();
  const { isConnected } = useNetworkStatus();

  return useMutation<CollectionModel, StrollError, UpdateCollectionInput, UpdateCollectionContext>({
    mutationFn: async (patch) => {
      if (!isConnected) throw makeError('NETWORK_ERROR', OFFLINE_MESSAGE);

      const result = await updateCollection(collectionId, patch);
      if (!result.ok) throw result.error;

      const model = toCollectionModel(result.data);
      if (!model) throw makeError('UNKNOWN', 'Collection was updated but could not be loaded.');
      return model;
    },

    onMutate: async (patch) => {
      const key = queryKeys.collections.detail(collectionId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<CollectionModel>(key);

      if (previous) {
        queryClient.setQueryData<CollectionModel>(key, {
          ...previous,
          ...(patch.title !== undefined && { title: patch.title }),
          ...(patch.description !== undefined && { description: patch.description }),
        });
      }

      return { previous };
    },

    onError: (error, _patch, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.collections.detail(collectionId), context.previous);
      }
      logError('useUpdateCollection', error);
      showToast({ type: 'error', message: normalizeError(error).userMessage });
    },

    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.collections.detail(collectionId), data);
      queryClient.invalidateQueries({ queryKey: queryKeys.collections.byUser(data.owner.id) });
      showToast({ type: 'success', message: 'Collection updated.' });
    },
  });
}

// ─── useDeleteCollection ──────────────────────────────────────────────────────
// Doesn't navigate away itself — the caller (Collection Detail's manage
// action) does that on success, the same division of responsibility
// useDeleteExperience leaves to its own caller.

export function useDeleteCollection() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation<
    void,
    StrollError,
    { id: string; coverImageUrl: string | null; coverType: 'custom' | 'generated' }
  >({
    mutationFn: async ({ id, coverImageUrl, coverType }) => {
      const result = await deleteCollection(id, coverImageUrl, coverType);
      if (!result.ok) throw result.error;
    },

    onSuccess: (_data, variables) => {
      queryClient.removeQueries({ queryKey: queryKeys.collections.detail(variables.id) });
      if (user) {
        queryClient.invalidateQueries({ queryKey: queryKeys.collections.byUser(user.id) });
      }
      showToast({ type: 'success', message: 'Collection deleted.' });
    },

    onError: (error) => {
      logError('useDeleteCollection', error);
      showToast({ type: 'error', message: normalizeError(error).userMessage });
    },
  });
}

// ─── useUploadCollectionCover / useRemoveCollectionCover ─────────────────────
// Pure upload/remove mutations — no picking. app/(modals)/create-collection.tsx
// picks locally (the Collection doesn't exist yet, so there's nothing to
// upload to until after creation — see useCreateCollection above);
// app/(app)/collections/[id].tsx's "Change Cover" management action picks
// via expo-image-picker directly, then calls this mutation with the result.

export function useUploadCollectionCover(collectionId: string) {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation<CollectionModel, StrollError, { uri: string; mimeType?: string }>({
    mutationFn: async ({ uri, mimeType }) => {
      if (!user) throw makeError('UNAUTHORIZED', NOT_SIGNED_IN_MESSAGE);

      const result = await uploadCollectionCover(collectionId, user.id, uri, mimeType ?? 'image/jpeg');
      if (!result.ok) throw result.error;

      const model = toCollectionModel(result.data);
      if (!model) throw makeError('UNKNOWN', 'Cover was uploaded but the collection could not be loaded.');
      return model;
    },

    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.collections.detail(collectionId), data);
      showToast({ type: 'success', message: 'Cover updated.' });
    },

    onError: (error) => {
      logError('useUploadCollectionCover', error);
      showToast({ type: 'error', message: normalizeError(error).userMessage });
    },
  });
}

export function useRemoveCollectionCover(collectionId: string) {
  const queryClient = useQueryClient();

  return useMutation<CollectionModel, StrollError, { currentCoverUrl: string | null }>({
    mutationFn: async ({ currentCoverUrl }) => {
      const result = await removeCollectionCover(collectionId, currentCoverUrl);
      if (!result.ok) throw result.error;

      const model = toCollectionModel(result.data);
      if (!model) throw makeError('UNKNOWN', 'Cover was removed but the collection could not be loaded.');
      return model;
    },

    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.collections.detail(collectionId), data);
      showToast({ type: 'success', message: 'Cover removed.' });
    },

    onError: (error) => {
      logError('useRemoveCollectionCover', error);
      showToast({ type: 'error', message: normalizeError(error).userMessage });
    },
  });
}

// ─── useAddExperienceToCollection / useRemoveExperienceFromCollection ────────
// Both used by the Add-to-Collection modal's instant-toggle rows (tap a
// row → add or remove immediately, no separate "Confirm" step — see
// app/(modals)/add-to-collection.tsx) and by Collection Detail's own
// "Remove from Collection" management action.

export function useAddExperienceToCollection() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation<void, StrollError, { collectionId: string; experienceId: string }>({
    mutationFn: async ({ collectionId, experienceId }) => {
      if (!user) throw makeError('UNAUTHORIZED', NOT_SIGNED_IN_MESSAGE);

      const result = await addExperienceToCollection(collectionId, experienceId, user.id);
      if (!result.ok) throw result.error;
    },

    onSuccess: (_data, { collectionId, experienceId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.collections.detail(collectionId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.experiences.byCollection(collectionId) });
      if (user) {
        queryClient.invalidateQueries({ queryKey: queryKeys.collections.containing(user.id, experienceId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.collections.byUser(user.id) });
      }
      showToast({ type: 'success', message: 'Added to collection.' });
    },

    onError: (error) => {
      logError('useAddExperienceToCollection', error);
      showToast({ type: 'error', message: normalizeError(error).userMessage });
    },
  });
}

export function useRemoveExperienceFromCollection() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation<void, StrollError, { collectionId: string; experienceId: string }>({
    mutationFn: async ({ collectionId, experienceId }) => {
      const result = await removeExperienceFromCollection(collectionId, experienceId);
      if (!result.ok) throw result.error;
    },

    onMutate: async ({ collectionId, experienceId }) => {
      const key = queryKeys.experiences.byCollection(collectionId);
      await queryClient.cancelQueries({ queryKey: key });

      const previous = queryClient.getQueryData<InfiniteData<CollectionExperiencesPage>>(key);
      if (previous) {
        queryClient.setQueryData<InfiniteData<CollectionExperiencesPage>>(key, {
          ...previous,
          pages: previous.pages.map((page) => ({
            ...page,
            rows: page.rows.filter((row) => row.id !== experienceId),
          })),
        });
      }

      return { previous };
    },

    onError: (error, { collectionId }, context) => {
      const ctx = context as { previous: InfiniteData<CollectionExperiencesPage> | undefined } | undefined;
      if (ctx?.previous) {
        queryClient.setQueryData(queryKeys.experiences.byCollection(collectionId), ctx.previous);
      }
      logError('useRemoveExperienceFromCollection', error);
      showToast({ type: 'error', message: normalizeError(error).userMessage });
    },

    onSuccess: (_data, { collectionId, experienceId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.collections.detail(collectionId) });
      if (user) {
        queryClient.invalidateQueries({ queryKey: queryKeys.collections.containing(user.id, experienceId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.collections.byUser(user.id) });
      }
      showToast({ type: 'success', message: 'Removed from collection.' });
    },
  });
}

// ─── useReorderCollectionExperiences ─────────────────────────────────────────
// Optimistically reorders the cached list immediately (a Move Up/Move
// Down tap should feel instant), rolling back on failure.

export function useReorderCollectionExperiences(collectionId: string) {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    StrollError,
    string[],
    { previous: InfiniteData<CollectionExperiencesPage> | undefined }
  >({
    mutationFn: async (orderedExperienceIds) => {
      const result = await reorderCollectionExperiences(collectionId, orderedExperienceIds);
      if (!result.ok) throw result.error;
    },

    onMutate: async (orderedExperienceIds) => {
      const key = queryKeys.experiences.byCollection(collectionId);
      await queryClient.cancelQueries({ queryKey: key });

      const previous = queryClient.getQueryData<InfiniteData<CollectionExperiencesPage>>(key);
      if (previous) {
        const byId = new Map(previous.pages.flatMap((page) => page.rows).map((row) => [row.id, row]));
        const reorderedRows = orderedExperienceIds
          .map((id) => byId.get(id))
          .filter((row): row is CollectionExperiencesPage['rows'][number] => row !== undefined);

        queryClient.setQueryData<InfiniteData<CollectionExperiencesPage>>(key, {
          ...previous,
          pages: [{ rows: reorderedRows, nextCursor: null }],
          pageParams: [null],
        });
      }

      return { previous };
    },

    onError: (error, _ids, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.experiences.byCollection(collectionId), context.previous);
      }
      logError('useReorderCollectionExperiences', error);
      showToast({ type: 'error', message: normalizeError(error).userMessage });
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.experiences.byCollection(collectionId) });
    },
  });
}
