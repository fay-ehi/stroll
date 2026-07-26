/**
 * Stroll — Profile Hooks
 * src/hooks/useProfile.ts
 *
 * The profile domain's public API. Every screen that reads or writes the
 * current user's profile should go through one of these hooks — never
 * `profileService` or `supabase` directly (architecture rule: UI screens →
 * hooks → stores → services → Supabase).
 *
 * Exposes:
 *   useProfile()        — the current user's profile, cached via TanStack Query.
 *                          Auto-creates a profile row if one doesn't exist yet.
 *   useUpdateProfile()   — mutate displayName/bio/city/interests, optimistically.
 *   useRefreshProfile()  — force a background refresh (pull-to-refresh).
 *   useUploadAvatar()    — pick an image, validate it, upload it, save it.
 *   useRemoveAvatar()    — clear the current avatar.
 *
 * Caching strategy:
 *   - Query key: queryKeys.users.me() (already reserved for this in
 *     src/lib/queryKeys.ts — no new key factory needed).
 *   - staleTime keeps repeat screen visits from re-fetching needlessly;
 *     refetchOnReconnect (set globally in src/lib/queryClient.ts) covers
 *     "background refresh" after the device was offline.
 *   - Mutations write the server response straight into the cache via
 *     setQueryData, so a successful edit never triggers a redundant
 *     refetch of the user's own profile.
 */

import { useCallback, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';

import { useAuthStore } from '@/stores/authStore';
import { useProfileStore, type AvatarUploadStage } from '@/stores/profileStore';
import { useNetworkStatus } from '@/hooks';
import { queryKeys } from '@/lib/queryKeys';
import { showToast } from '@/stores/toastStore';
import { normalizeError, type StrollError, type ErrorCode } from '@/lib/errors';
import { IMAGE_CONFIG } from '@/constants/app';
import {
  ensureProfile,
  getProfile,
  updateProfile,
  uploadAvatar,
  removeAvatar,
  type UpdateProfilePayload,
} from '@/services/profileService';
import {
  toProfileModel,
  validateProfileUpdate,
  hasValidationErrors,
  validateAvatarAsset,
  type ProfileModel,
  type ProfileUpdateInput,
} from '@/types/profile';
// Sprint 6 Prompt 1 — usePublicProfilePage composes across these
// sibling hook files the same way useNearbyExperiences.ts already
// composes usePlaces.ts's useNearbyPlaces, or useExperienceCreation.ts
// composes useExperienceDetail.ts — an established cross-file hook
// composition pattern in this codebase, not a new one.
import { useUserGallery, type UseUserGalleryResult } from '@/hooks/useUserGallery';
import { useMyCollections, type UseMyCollectionsResult } from '@/hooks/useCollections';
import { useFollowCounts } from '@/hooks/useFollows';

// ─── Shared Helpers ────────────────────────────────────────────────────────────

/** Builds an already-normalized StrollError for guard clauses inside this file. */
function buildStrollError(code: ErrorCode, message: string): StrollError {
  return { code, devMessage: message, userMessage: message, isRetryable: code === 'NETWORK_ERROR' };
}

const OFFLINE_MESSAGE = "You're offline. Connect to the internet and try again.";
const NOT_SIGNED_IN_MESSAGE = 'Please sign in to continue.';

// ─── useProfile ────────────────────────────────────────────────────────────────

export interface UseProfileResult {
  profile:      ProfileModel | null;
  isLoading:    boolean;
  isRefetching: boolean;
  isError:      boolean;
  error:        StrollError | null;
  isOffline:    boolean;
  refetch:      () => void;
}

/**
 * The current user's profile. Fetches on mount, creates the row
 * automatically if it doesn't exist yet (new users, edge cases where
 * onboarding didn't finish cleanly), and keeps it cached across the app.
 */
export function useProfile(): UseProfileResult {
  const user = useAuthStore((s) => s.user);
  const { isConnected } = useNetworkStatus();

  const query = useQuery<ProfileModel, StrollError>({
    queryKey: queryKeys.users.me(),
    enabled:  !!user,
    queryFn: async () => {
      if (!user) throw buildStrollError('UNAUTHORIZED', NOT_SIGNED_IN_MESSAGE);

      const fallbackDisplayName =
        (user.user_metadata?.['display_name'] as string | undefined) ?? undefined;

      const result = await ensureProfile(user.id, user.email, fallbackDisplayName);
      if (!result.ok) throw result.error;
      return toProfileModel(result.data);
    },
    // Auth and validation failures won't resolve themselves on retry —
    // only network/server/unknown errors are worth another attempt.
    retry: (failureCount, error) =>
      error.isRetryable && failureCount < 2,
  });

  return {
    profile:      query.data ?? null,
    isLoading:    query.isLoading,
    isRefetching: query.isRefetching,
    isError:      query.isError,
    error:        query.error,
    isOffline:    !isConnected,
    refetch:      () => { void query.refetch(); },
  };
}

// ─── useRefreshProfile ─────────────────────────────────────────────────────────

export interface UseRefreshProfileResult {
  refresh:      () => Promise<void>;
  isRefreshing: boolean;
}

/**
 * Forces a background refresh of the cached profile — for pull-to-refresh.
 * Separate from `useProfile().refetch` so screens can show a dedicated
 * "refreshing" indicator without depending on TanStack Query's internal
 * `isRefetching` flag (which also fires for automatic background refetches).
 */
export function useRefreshProfile(): UseRefreshProfileResult {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await queryClient.refetchQueries({ queryKey: queryKeys.users.me(), type: 'active' });
    } finally {
      setIsRefreshing(false);
    }
  }, [queryClient]);

  return { refresh, isRefreshing };
}

// ─── useUpdateProfile ──────────────────────────────────────────────────────────

interface UpdateProfileContext {
  previous: ProfileModel | undefined;
}

/**
 * Updates displayName / bio / city / interests. Applies the change to the
 * cache optimistically so the UI feels instant, and rolls back automatically
 * if the request fails.
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const { isConnected } = useNetworkStatus();

  return useMutation<ProfileModel, StrollError, ProfileUpdateInput, UpdateProfileContext>({
    mutationFn: async (input) => {
      if (!user) throw buildStrollError('UNAUTHORIZED', NOT_SIGNED_IN_MESSAGE);
      if (!isConnected) throw buildStrollError('NETWORK_ERROR', OFFLINE_MESSAGE);

      const errors = validateProfileUpdate(input);
      if (hasValidationErrors(errors)) {
        const firstMessage = Object.values(errors).find((m) => m !== undefined);
        throw buildStrollError('VALIDATION_ERROR', firstMessage ?? 'Please check your information and try again.');
      }

      const payload: UpdateProfilePayload = {};
      if (input.displayName !== undefined) payload.display_name = input.displayName.trim();
      if (input.bio !== undefined) payload.bio = input.bio.trim();
      if (input.city !== undefined) payload.city = input.city;
      if (input.interests !== undefined) payload.interests = input.interests;

      const result = await updateProfile(user.id, payload);
      if (!result.ok) throw result.error;
      return toProfileModel(result.data);
    },

    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.users.me() });
      const previous = queryClient.getQueryData<ProfileModel>(queryKeys.users.me());

      if (previous) {
        queryClient.setQueryData<ProfileModel>(queryKeys.users.me(), {
          ...previous,
          ...(input.displayName !== undefined && { displayName: input.displayName }),
          ...(input.bio !== undefined && { bio: input.bio }),
          ...(input.city !== undefined && { city: input.city }),
          ...(input.interests !== undefined && { interests: input.interests }),
        });
      }

      return { previous };
    },

    onError: (error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.users.me(), context.previous);
      }
      showToast({ type: 'error', message: normalizeError(error).userMessage });
    },

    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.users.me(), data);
      queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(data.id) });
      showToast({ type: 'success', message: 'Profile updated.' });
    },
  });
}

// ─── useUploadAvatar ───────────────────────────────────────────────────────────

export interface UseUploadAvatarResult {
  /** Opens the native image picker, validates, uploads, and saves the result. Returns true on success. */
  pickAndUpload: () => Promise<boolean>;
  isUploading:   boolean;
  stage:         AvatarUploadStage;
}

export function useUploadAvatar(): UseUploadAvatarResult {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const { isConnected } = useNetworkStatus();
  const stage = useProfileStore((s) => s.avatarUploadStage);
  const setStage = useProfileStore((s) => s.setAvatarUploadStage);

  const pickAndUpload = useCallback(async (): Promise<boolean> => {
    if (!user) {
      showToast({ type: 'error', message: NOT_SIGNED_IN_MESSAGE });
      return false;
    }
    if (!isConnected) {
      showToast({ type: 'error', message: OFFLINE_MESSAGE });
      return false;
    }

    try {
      setStage('picking');
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showToast({ type: 'info', message: 'Photo access is needed to update your profile picture.' });
        return false;
      }

      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: IMAGE_CONFIG.COMPRESSION_QUALITY,
      });

      if (picked.canceled || !picked.assets[0]) return false;
      const asset = picked.assets[0];

      setStage('validating');
      const validation = validateAvatarAsset({
        uri:      asset.uri,
        mimeType: asset.mimeType,
        fileSize: asset.fileSize,
      });
      if (!validation.valid) {
        showToast({ type: 'error', message: validation.message ?? 'This image cannot be used.' });
        return false;
      }

      setStage('uploading');
      const uploadResult = await uploadAvatar(user.id, asset.uri, asset.mimeType ?? 'image/jpeg');
      if (!uploadResult.ok) {
        showToast({ type: 'error', message: uploadResult.error.userMessage });
        return false;
      }

      setStage('saving');
      const updateResult = await updateProfile(user.id, { avatar_url: uploadResult.data });
      if (!updateResult.ok) {
        showToast({ type: 'error', message: updateResult.error.userMessage });
        return false;
      }

      const mapped = toProfileModel(updateResult.data);
      queryClient.setQueryData(queryKeys.users.me(), mapped);
      queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(user.id) });
      showToast({ type: 'success', message: 'Profile photo updated.' });
      return true;
    } catch (err) {
      showToast({ type: 'error', message: normalizeError(err).userMessage });
      return false;
    } finally {
      setStage('idle');
    }
  }, [user, isConnected, queryClient, setStage]);

  return { pickAndUpload, isUploading: stage !== 'idle', stage };
}

// ─── useRemoveAvatar ───────────────────────────────────────────────────────────

export function useRemoveAvatar() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const { isConnected } = useNetworkStatus();
  const setStage = useProfileStore((s) => s.setAvatarUploadStage);

  return useMutation<ProfileModel, StrollError, string | null>({
    mutationFn: async (currentAvatarUrl) => {
      if (!user) throw buildStrollError('UNAUTHORIZED', NOT_SIGNED_IN_MESSAGE);
      if (!isConnected) throw buildStrollError('NETWORK_ERROR', OFFLINE_MESSAGE);

      setStage('saving');
      const result = await removeAvatar(user.id, currentAvatarUrl);
      if (!result.ok) throw result.error;
      return toProfileModel(result.data);
    },

    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.users.me(), data);
      queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(data.id) });
      showToast({ type: 'success', message: 'Profile photo removed.' });
    },

    onError: (error) => {
      showToast({ type: 'error', message: normalizeError(error).userMessage });
    },

    onSettled: () => setStage('idle'),
  });
}

// ─── usePublicProfile (Sprint 6 Prompt 1) ──────────────────────────────────────

export interface UsePublicProfileResult {
  profile: ProfileModel | null;
  isLoading: boolean;
  isError: boolean;
  error: StrollError | null;
  refetch: () => void;
}

/**
 * Any user's profile by id — the Public Profile screen's own query.
 * Reuses profileService.getProfile() (already the function
 * ensureProfile() above calls internally) rather than adding a new
 * repository method — "fetch a profile by id" was already exactly what
 * that function does; useProfile() above just always passes the
 * signed-in user's own id.
 *
 * Keyed under queryKeys.users.detail(id) — a key already reserved for
 * exactly this (see that key's own comment in queryKeys.ts), and
 * already the key useUpdateProfile()/useUploadAvatar()/
 * useRemoveAvatar() above invalidate on a successful edit to the
 * SIGNED-IN user's own profile. So if the person you're viewing through
 * this hook edits their own profile elsewhere while you're looking at
 * it, this query is already wired to pick that up.
 *
 * Unlike useProfile(), this never creates a profile row on a miss — a
 * missing profile here means "this user doesn't exist" (surfaced as
 * NOT_FOUND), not "create one," since the viewer isn't that user.
 */
export function usePublicProfile(userId: string | undefined): UsePublicProfileResult {
  const query = useQuery<ProfileModel, StrollError>({
    queryKey: queryKeys.users.detail(userId ?? ''),
    enabled: !!userId,
    queryFn: async () => {
      const result = await getProfile(userId!);
      if (!result.ok) throw result.error;
      if (!result.data) {
        throw buildStrollError('NOT_FOUND', `No profile found for user ${userId}.`);
      }
      return toProfileModel(result.data);
    },
    staleTime: 60_000,
    retry: (failureCount, error) => error.isRetryable && failureCount < 2,
  });

  return {
    profile: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: () => {
      void query.refetch();
    },
  };
}

// ─── usePublicProfilePage (Sprint 6 Prompt 1) ──────────────────────────────────
// Screen-level composition for app/(app)/profile/[id].tsx — mirrors the
// shape useCollectionDetailPage() (useCollections.ts) / useSavedLibrary()
// (useSaved.ts) already establish: one hook pulling together everything
// a single screen needs, plus one combined refresh() so a single
// pull-to-refresh gesture updates all three domains together, even
// though the underlying data spans three separate hooks that already
// exist independently elsewhere (a profile record, a paginated
// Experience gallery, and a Collections list — the exact same three
// pieces the Profile tab itself already composes inline).

export interface UsePublicProfilePageResult {
  profile: UsePublicProfileResult;
  gallery: UseUserGalleryResult;
  collections: UseMyCollectionsResult;
  followerCount: number;
  followingCount: number;
  refresh: () => Promise<void>;
  isRefreshing: boolean;
}

export function usePublicProfilePage(userId: string | undefined): UsePublicProfilePageResult {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const profile = usePublicProfile(userId);
  const gallery = useUserGallery(profile.profile?.id);
  const collections = useMyCollections(profile.profile?.id);
  const { followerCount, followingCount } = useFollowCounts(profile.profile?.id);

  const refresh = useCallback(async () => {
    const id = profile.profile?.id;
    if (!id) return;
    setIsRefreshing(true);
    try {
      await Promise.all([
        queryClient.refetchQueries({ queryKey: queryKeys.users.detail(id), type: 'active' }),
        queryClient.refetchQueries({ queryKey: queryKeys.experiences.byUser(id), type: 'active' }),
        queryClient.refetchQueries({ queryKey: queryKeys.collections.byUser(id), type: 'active' }),
        queryClient.refetchQueries({
          queryKey: [...queryKeys.users.followers(id), 'counts'],
          type: 'active',
        }),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  }, [profile.profile?.id, queryClient]);

  return { profile, gallery, collections, followerCount, followingCount, refresh, isRefreshing };
}
