/**
 * Stroll — Photo Library Hook
 * src/hooks/usePhotoLibrary.ts
 *
 * Powers the in-app photo grid on the 'photos' step of Experience
 * Creation (see PhotoGridPicker.tsx) — browsing the device's own photo
 * library inline, Instagram/TikTok "New Post" style, instead of handing
 * off to the OS's own picker sheet. expo-image-picker's
 * `launchImageLibraryAsync` is still used elsewhere (e.g. the onboarding
 * avatar picker, and this same screen's camera tile —
 * `launchCameraAsync`) for a single one-off pick where an inline browser
 * would be overkill; this hook is specifically for browsing many photos
 * at once without leaving the screen.
 *
 * Wraps expo-media-library, which is a device capability, not server
 * state — no TanStack Query here, the same reasoning
 * useNetworkStatus/useKeyboard (src/hooks/index.ts) already use for
 * other native-module-backed hooks.
 *
 * Permission is requested automatically on mount (if not already
 * granted or previously denied) — matching the moment a real
 * Instagram/TikTok composer prompts for it: as soon as you open the
 * photo picker, not behind an extra "Allow Access" tap first.
 * `accessPrivileges === 'limited'` (iOS's "select photos" partial
 * access) counts as granted — the library only ever shows what the OS
 * actually returns, so there is nothing extra to handle for that case.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as MediaLibrary from 'expo-media-library';

const PAGE_SIZE = 60;

/** `currentAlbumId` value meaning "every photo, not scoped to one album" — expo-media-library's own convention for `AssetsOptions.album`. */
export const RECENTS_ALBUM_ID = null;

export interface PhotoLibraryAsset {
  id: string;
  uri: string;
  width: number;
  height: number;
}

export interface PhotoLibraryAlbum {
  id: string;
  title: string;
}

export type PhotoLibraryPermissionState = 'checking' | 'granted' | 'denied';

export interface UsePhotoLibraryResult {
  permissionState: PhotoLibraryPermissionState;
  /** Re-prompts — the right call for a "Grant Access" button after an initial denial. */
  requestPermission: () => Promise<void>;

  /** Every non-empty album on the device, for the album switcher. Empty until permission is granted. */
  albums: PhotoLibraryAlbum[];
  /** `null` (RECENTS_ALBUM_ID) means "all photos", not one specific album. */
  currentAlbumId: string | null;
  currentAlbumTitle: string;
  selectAlbum: (albumId: string | null) => void;

  assets: PhotoLibraryAsset[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  loadMore: () => void;
}

function toLibraryAsset(asset: MediaLibrary.Asset): PhotoLibraryAsset {
  return { id: asset.id, uri: asset.uri, width: asset.width, height: asset.height };
}

export function usePhotoLibrary(): UsePhotoLibraryResult {
  const [permissionState, setPermissionState] = useState<PhotoLibraryPermissionState>('checking');
  const [albums, setAlbums] = useState<PhotoLibraryAlbum[]>([]);
  const [currentAlbumId, setCurrentAlbumId] = useState<string | null>(RECENTS_ALBUM_ID);

  const [assets, setAssets] = useState<PhotoLibraryAsset[]>([]);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  // Mirrors isLoading/isLoadingMore but updates synchronously, unlike
  // React state — needed because FlatList's onEndReached can fire more
  // than once in the same tick (a well-known quirk, especially on fast
  // scroll or right after layout). Two overlapping calls both reading
  // `isLoadingMore` from state would both see `false` and both fetch the
  // same page, appending it twice and producing duplicate asset ids as
  // FlatList keys — this ref is checked-and-set in the same synchronous
  // breath a state update can't guarantee.
  const isFetchingRef = useRef(false);

  // ── Permission ─────────────────────────────────────────────────────────────
  // `['photo']` here matters on Android 13+: with no `granularPermissions`
  // argument, expo-media-library defaults to requesting photo + video +
  // audio all at once — and this app's Android manifest only declares the
  // photos permission (see app.json's expo-media-library plugin config),
  // since this hook only ever reads MediaType.photo assets. Requesting the
  // default set crashes with "AUDIO permission... not declared in
  // AndroidManifest" rather than just granting the one permission that's
  // actually configured.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const existing = await MediaLibrary.getPermissionsAsync(false, ['photo']);
      if (existing.granted || existing.accessPrivileges === 'limited') {
        if (!cancelled) setPermissionState('granted');
        return;
      }
      const requested = await MediaLibrary.requestPermissionsAsync(false, ['photo']);
      if (cancelled) return;
      setPermissionState(
        requested.granted || requested.accessPrivileges === 'limited' ? 'granted' : 'denied'
      );
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const requestPermission = useCallback(async () => {
    const result = await MediaLibrary.requestPermissionsAsync(false, ['photo']);
    setPermissionState(result.granted || result.accessPrivileges === 'limited' ? 'granted' : 'denied');
  }, []);

  // ── Albums ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (permissionState !== 'granted') return;
    let cancelled = false;
    (async () => {
      const result = await MediaLibrary.getAlbumsAsync({ includeSmartAlbums: true });
      if (cancelled) return;
      // Only albums that actually have something in them are worth
      // showing in the switcher — an empty smart album (e.g. "Panoramas"
      // on a device with none) would just be a dead end to tap into.
      setAlbums(result.filter((a) => a.assetCount > 0).map((a) => ({ id: a.id, title: a.title })));
    })();
    return () => {
      cancelled = true;
    };
  }, [permissionState]);

  const currentAlbumTitle = useMemo(() => {
    if (currentAlbumId === RECENTS_ALBUM_ID) return 'Recents';
    return albums.find((a) => a.id === currentAlbumId)?.title ?? 'Recents';
  }, [currentAlbumId, albums]);

  const selectAlbum = useCallback((albumId: string | null) => {
    setCurrentAlbumId(albumId);
  }, []);

  // ── Assets ─────────────────────────────────────────────────────────────────
  // Photos only (`MediaType.photo`) — the publish pipeline
  // (uploadExperiencePhoto, useExperienceCreation.ts) only ever handles
  // still images, so video assets are filtered out at the source rather
  // than picked and rejected later.
  //
  // `generationRef` guards a narrower race than isFetchingRef above: if
  // the user switches albums while a `loadMore` for the PREVIOUS album
  // is still in flight, that old request's `fetchPage` closure still
  // correctly queries the old album (it captured `currentAlbumId` at
  // call time) — the risk is its result landing after the reset effect
  // has already started the new album's list, silently merging old-album
  // photos into it. Every reset bumps the generation; a page result only
  // commits if its generation is still the current one.
  const generationRef = useRef(0);

  const fetchPage = useCallback(
    async (after: string | undefined, replace: boolean, generation: number) => {
      const page = await MediaLibrary.getAssetsAsync({
        first: PAGE_SIZE,
        after,
        mediaType: MediaLibrary.MediaType.photo,
        sortBy: [MediaLibrary.SortBy.creationTime],
        album: currentAlbumId ?? undefined,
      });
      if (generation !== generationRef.current) return;

      const mapped = page.assets.map(toLibraryAsset);
      setAssets((prev) => {
        if (replace) return mapped;
        // De-duplicated by id, not just appended — a defensive merge in
        // case the underlying provider ever returns an asset already
        // seen on a previous page (this has been observed at page
        // boundaries on some Android devices), independent of the
        // isFetchingRef guard above, which covers the "same page fetched
        // twice" case rather than this "provider returned an overlapping
        // asset" case.
        const seen = new Set(prev.map((a) => a.id));
        return [...prev, ...mapped.filter((a) => !seen.has(a.id))];
      });
      setCursor(page.endCursor);
      setHasMore(page.hasNextPage);
    },
    [currentAlbumId]
  );

  // Re-fetches from scratch whenever permission first grants or the
  // selected album changes — a stale `cursor` from a different album
  // would otherwise page in the wrong album's photos.
  useEffect(() => {
    if (permissionState !== 'granted') return;
    const generation = ++generationRef.current;
    let cancelled = false;
    isFetchingRef.current = true;
    setIsLoading(true);
    setHasMore(true);
    fetchPage(undefined, true, generation).finally(() => {
      isFetchingRef.current = false;
      if (!cancelled) setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [permissionState, fetchPage]);

  const loadMore = useCallback(() => {
    if (isFetchingRef.current || !hasMore) return;
    isFetchingRef.current = true;
    setIsLoadingMore(true);
    fetchPage(cursor, false, generationRef.current).finally(() => {
      isFetchingRef.current = false;
      setIsLoadingMore(false);
    });
  }, [hasMore, cursor, fetchPage]);

  return {
    permissionState,
    requestPermission,
    albums,
    currentAlbumId,
    currentAlbumTitle,
    selectAlbum,
    assets,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
  };
}