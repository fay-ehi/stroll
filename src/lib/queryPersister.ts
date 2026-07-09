/**
 * Stroll — Query Persister
 * src/lib/queryPersister.ts
 *
 * Requirement #4 — Offline Experience: "Cached Discover feed, Cached
 * Experience Details." TanStack Query already keeps successful queries
 * in memory for the life of the app (so going offline mid-session
 * already shows the last-fetched data — see the `isOffline` handling in
 * discover.tsx and experience/[id].tsx, which fall through to cached
 * data before ever considering the offline empty state). What's missing
 * without this file is surviving an app restart while offline: an
 * in-memory cache is gone the moment the process dies.
 *
 * `asyncStoragePersister` below persists the QueryClient's cache to
 * AsyncStorage (via the raw AsyncStorage module directly, NOT the
 * `storage` wrapper in lib/storage.ts — `createAsyncStoragePersister`
 * needs the raw get/set/removeItem(string) contract AsyncStorage already
 * provides; `storage`'s automatic JSON parse/stringify would double up).
 * Wired into `<PersistQueryClientProvider>` in app/_layout.tsx.
 *
 * `shouldPersistQuery` scopes persistence to exactly what this
 * requirement asks for — the `experiences` query family (Discover feed +
 * Experience Details + related/recommended) — rather than persisting
 * every query in the app indiscriminately. Profile, places, and anything
 * added later stay in-memory-only until a requirement asks for them too.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import type { Query } from '@tanstack/react-query';

const PERSIST_KEY = 'stroll:query-cache';

export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: PERSIST_KEY,
  // Coalesces rapid successive cache writes (e.g. several feed pages
  // loading in quick succession) into one AsyncStorage write per second,
  // rather than one per query settling.
  throttleTime: 1000,
});

/** Persisted data older than this is discarded on restore rather than shown as if fresh — see PersistQueryClientProvider's `maxAge` in app/_layout.tsx. */
export const PERSIST_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function shouldPersistQuery(query: Query): boolean {
  const [rootKey] = query.queryKey;
  return rootKey === 'experiences' && query.state.status === 'success';
}
