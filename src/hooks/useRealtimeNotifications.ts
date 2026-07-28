/**
 * Stroll — Realtime Notifications
 * src/hooks/useRealtimeNotifications.ts
 *
 * Sprint 8 Prompt 3 (Real-Time Notifications & Badge System). The one
 * caller of src/services/notificationsRealtimeService.ts — owns every
 * *policy* decision the raw channel doesn't: which cache to patch, how
 * to dedupe, when to reconnect, when to resync. Mounted exactly once,
 * app-wide, from src/components/shell/AuthProvider.tsx (see that file's
 * own diff this sprint) — "Single active subscription per authenticated
 * user" (this sprint's own Performance section) is true by construction
 * because there's only ever one call site, not because this hook
 * enforces it itself.
 *
 * Builds entirely on Sprint 8 Prompt 1/2's existing cache shape —
 * useNotifications.ts's `NotificationListCache` and
 * queryKeys.notifications.* — and never bypasses it: every live event
 * this hook processes ends up in the exact same TanStack Query cache
 * the list screen and the badge already read from, so neither of them
 * needs to know Realtime exists.
 *
 * ── The three ways new data enters here ──
 * 1. A live INSERT event (handleRealtimeInsert) — one row, hydrated via
 *    notificationsService.getNotificationById() before merging, so it
 *    never renders "flash" without an avatar (this sprint's own "Avoid
 *    flashing or reloading the entire list").
 * 2. A resync (resyncRecentNotifications) — a small batch fetch
 *    (notificationsService.getNotifications(), one page, no cursor),
 *    triggered after a reconnect or an app-foreground return. Merges
 *    and dedupes the same way, plus does a real unread-count refetch
 *    (see that function's own doc for why a resync recomputes the count
 *    from the server instead of guessing a delta).
 * 3. Never a full paginated refetch of everything already loaded —
 *    "Avoid reloading the full notification history unnecessarily"
 *    (this sprint's own Background Synchronization section) is why
 *    neither path above ever calls the list's own
 *    `refetch()`/`fetchNextPage()`.
 *
 * ── Duplicate protection ──
 * `seenIdsRef` is a small, bounded, in-memory set of notification ids
 * this hook has already applied this session — checked (and written to)
 * BEFORE the async getNotificationById() round trip starts for a live
 * INSERT, not after it resolves, so two near-simultaneous deliveries of
 * the same id (a real Realtime behavior after a reconnect) can't both
 * pass the check and double-apply. A resync marks every row it finds as
 * seen too, so a live event for a row the resync already picked up
 * doesn't trigger a second, redundant fetch.
 *
 * ── Reconnection ──
 * connect()/disconnect() guarantee at most one open channel at a time.
 * A channel entering 'error' or 'closed' schedules a single backoff
 * retry (scheduleReconnect) — capped, not indefinite-immediate-retry, so
 * a real outage doesn't turn into a request storm. `isActiveRef` is set
 * false the instant disconnect() runs (intentional teardown — logout,
 * user switch, unmount) so a status callback that fires *after* that
 * point (the channel closing asynchronously in response to our own
 * teardown) can never schedule a reconnect for a session that no longer
 * wants one.
 */

import { useEffect, useRef } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';

import { useAuthStore } from '@/stores/authStore';
import { useAppState, useNetworkStatus, useStableCallback } from '@/hooks';
import { queryKeys } from '@/lib/queryKeys';
import { PAGINATION } from '@/constants/app';
import { getNotificationById, getNotifications } from '@/services/notificationsService';
import { subscribeToNotificationInserts } from '@/services/notificationsRealtimeService';
import type { NotificationListCache } from './useNotifications';
import type { NotificationWithActorRow } from '@/types/notification';

// ─── Duplicate-protection bound ─────────────────────────────────────────────────
// Notifications are a low-volume domain (follows/likes/invites, not a
// chat firehose) — a few hundred ids comfortably covers a long session
// without unbounded growth. `Map` preserves insertion order, so evicting
// the oldest entry when over budget is a plain `.keys().next()`.

const MAX_SEEN_IDS = 300;

// ─── Reconnect backoff ───────────────────────────────────────────────────────────

const RECONNECT_BASE_DELAY_MS = 2000;
const RECONNECT_MAX_DELAY_MS = 30000;

// ─── Cache merge (shared by live-insert and resync paths) ───────────────────────

function sortNewestFirst(a: NotificationWithActorRow, b: NotificationWithActorRow): number {
  if (a.created_at !== b.created_at) return a.created_at > b.created_at ? -1 : 1;
  // Server timestamps, not client ones, per this sprint's own "Event
  // Ordering" — `id` is only ever a tiebreaker for two rows sharing one
  // created_at value.
  return a.id > b.id ? -1 : 1;
}

/**
 * Merges `incoming` rows into the first page of the cached notification
 * list, de-duplicated against every already-cached page (not just page
 * one — a row realtime already inserted at the front of page one could
 * otherwise also exist in an older page after enough pagination). A
 * no-op (returns []) if the list has never been fetched this session —
 * there's nothing to patch, and the next real fetch will include these
 * rows naturally since they're now just normal rows in the table.
 * Returns the rows that were actually new, so callers can decide
 * whether an unread-count adjustment is warranted.
 */
function mergeNotificationsIntoCache(
  queryClient: QueryClient,
  userId: string,
  incoming: NotificationWithActorRow[],
): NotificationWithActorRow[] {
  if (incoming.length === 0) return [];

  const listKey = queryKeys.notifications.list(userId);
  const previous = queryClient.getQueryData<NotificationListCache>(listKey);
  if (!previous) return [];

  const firstPage = previous.pages[0];
  if (!firstPage) return [];

  const existingIds = new Set(previous.pages.flatMap((page) => page.notifications.map((n) => n.id)));
  const newRows = incoming.filter((row) => !existingIds.has(row.id));
  if (newRows.length === 0) return [];

  const mergedFirstPage = [...newRows, ...firstPage.notifications].sort(sortNewestFirst);

  queryClient.setQueryData<NotificationListCache>(listKey, {
    ...previous,
    pages: previous.pages.map((page, index) =>
      index === 0 ? { ...page, notifications: mergedFirstPage } : page,
    ),
  });

  return newRows;
}

/** Bumps the cached unread count by exactly one — used only for a single live INSERT, where we know precisely what changed. A resync uses a real refetch instead (see resyncRecentNotifications's own doc). */
function incrementUnreadCount(queryClient: QueryClient, userId: string): void {
  const countKey = queryKeys.notifications.unreadCount(userId);
  const previousCount = queryClient.getQueryData<number>(countKey);
  if (typeof previousCount === 'number') {
    queryClient.setQueryData<number>(countKey, previousCount + 1);
  } else {
    // Nothing cached yet to increment — let the query establish its own
    // correct value once it mounts/fetches, rather than inventing one.
    void queryClient.invalidateQueries({ queryKey: countKey });
  }
}

// ─── The hook ─────────────────────────────────────────────────────────────────────

/**
 * Subscribes the current user to their own live notification inserts
 * for as long as they're signed in. No return value — this is a
 * side-effect-only hook (same shape as useAppState's own AppState-
 * listener side effect). Safe to call regardless of auth state; it's a
 * no-op while signed out.
 */
export function useRealtimeNotifications(): void {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const network = useNetworkStatus();

  const seenIdsRef = useRef<Map<string, true>>(new Map());
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const isActiveRef = useRef(false);
  const hasConnectedOnceRef = useRef(false);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasOnlineRef = useRef(true);

  /** Marks an id seen; returns whether it was ALREADY seen (i.e. this call is a duplicate). Bounded per this file's own module doc. */
  const markSeen = useStableCallback((id: string): boolean => {
    const seen = seenIdsRef.current;
    if (seen.has(id)) return true;
    seen.set(id, true);
    if (seen.size > MAX_SEEN_IDS) {
      const oldest = seen.keys().next().value;
      if (oldest !== undefined) seen.delete(oldest);
    }
    return false;
  });

  /**
   * One fully-hydrated row arrived (live or resynced) — patch both
   * caches. No dedupe check here; callers already own that (see each
   * call site).
   *
   * The unread-count bump is intentionally independent of whether the
   * LIST cache patch found anything to merge. `mergeNotificationsIntoCache`
   * is a no-op (returns []) whenever the Notification Center's own list
   * has never been fetched this session — e.g. the person is sitting on
   * Discover and has never opened the bell yet. That's a fine no-op for
   * the list itself (nothing cached to patch), but the unread-count
   * badge lives in a completely separate query
   * (`queryKeys.notifications.unreadCount`) that Discover's top bar
   * reads directly — gating its update on the list merge (as this used
   * to) meant a live notification arriving while on Discover never
   * bumped the badge at all, and it only ever caught up once opening
   * the Notification Center forced a fresh unread-count fetch.
   */
  const applyIncomingRow = useStableCallback((row: NotificationWithActorRow) => {
    if (!user) return;
    mergeNotificationsIntoCache(queryClient, user.id, [row]);
    if (!row.is_read) {
      incrementUnreadCount(queryClient, user.id);
    }
  });

  /** A live Realtime INSERT fired — hydrate with the actor join, then apply. */
  const handleRealtimeInsert = useStableCallback((payload: { id: string }) => {
    if (!user) return;
    // Mark seen BEFORE the async fetch starts (not after it resolves) —
    // closes the race where two near-simultaneous deliveries of the same
    // id (a real possibility right after a reconnect) both pass the
    // check before either finishes hydrating.
    if (markSeen(payload.id)) return;

    void (async () => {
      const result = await getNotificationById(payload.id, user.id);
      // A failed/missing row (deleted between the event firing and this
      // resolving, or a transient network error) is nothing to recover
      // from or surface — this sprint's own Error Handling: "Never
      // expose technical error messages."
      if (!result.ok || !result.data) return;
      applyIncomingRow(result.data);
    })();
  });

  /**
   * Fetches the most recent page of notifications directly (bypassing
   * the paginated list's own cursor machinery entirely) and merges
   * whatever's new into the cache, then does a REAL unread-count
   * refetch rather than an incremental adjustment — after a stretch
   * offline/backgrounded we don't reliably know how many of the merged
   * rows are unread vs. already read on another device, so recomputing
   * from the server (a cheap head-count query — see
   * notificationsService.getUnreadCount's own doc) is the correct
   * source of truth, not a guess. Never touches pages beyond the first —
   * "Avoid reloading the full notification history unnecessarily."
   */
  const resyncRecentNotifications = useStableCallback(async () => {
    if (!user) return;
    const result = await getNotifications({ userId: user.id, cursor: null, limit: PAGINATION.DEFAULT_PAGE_SIZE });
    if (!result.ok) return; // Best-effort — the next foreground/reconnect trigger will simply try again.

    for (const row of result.data.notifications) markSeen(row.id);
    mergeNotificationsIntoCache(queryClient, user.id, result.data.notifications);
    void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount(user.id) });
  });

  // ── Channel lifecycle ──

  const disconnect = useStableCallback(() => {
    isActiveRef.current = false;
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
  });

  const scheduleReconnect = useStableCallback(() => {
    if (!isActiveRef.current) return; // Torn down intentionally (logout/unmount/user switch) — never reconnect a session that no longer wants one.
    if (reconnectTimerRef.current) return; // A retry is already queued.

    const attempt = reconnectAttemptRef.current;
    const delay = Math.min(RECONNECT_BASE_DELAY_MS * 2 ** attempt, RECONNECT_MAX_DELAY_MS);
    reconnectAttemptRef.current = attempt + 1;
    reconnectTimerRef.current = setTimeout(() => {
      reconnectTimerRef.current = null;
      connect();
    }, delay);
  });

  const connect = useStableCallback(() => {
    if (!user) return;
    disconnect(); // Never allow two live channels for the same user — always start from a clean slate.
    isActiveRef.current = true;

    unsubscribeRef.current = subscribeToNotificationInserts(user.id, {
      onInsert: handleRealtimeInsert,
      onStatusChange: (status) => {
        if (!isActiveRef.current) return; // A status callback arriving after our own intentional teardown — ignore it.

        if (status === 'connected') {
          reconnectAttemptRef.current = 0;
          if (hasConnectedOnceRef.current) {
            // A genuine RE-connect, not the first-ever connect for this
            // session — the socket was down for some stretch, so catch
            // up on whatever arrived while it was (this sprint's own
            // "Fetch missed notifications after reconnecting").
            void resyncRecentNotifications();
          }
          hasConnectedOnceRef.current = true;
          return;
        }

        // 'error' | 'closed'
        scheduleReconnect();
      },
    });
  });

  // ── Subscribe after login, unsubscribe on logout/user switch/unmount ──

  useEffect(() => {
    if (!user?.id) {
      disconnect();
      hasConnectedOnceRef.current = false;
      reconnectAttemptRef.current = 0;
      seenIdsRef.current.clear();
      return;
    }

    hasConnectedOnceRef.current = false; // Fresh sign-in (or account switch) — the very first connect() below should NOT trigger a resync (nothing to "catch up" on yet).
    connect();

    return () => disconnect();
  }, [user?.id, connect, disconnect]);

  // ── Background Synchronization — app returns to the foreground ──
  // The socket may have silently died while backgrounded (the OS
  // suspends JS/network for backgrounded RN apps well before any
  // WebSocket close event would fire) — force a clean resubscribe rather
  // than trust a status callback that might never arrive; connect()'s
  // own onStatusChange('connected') branch runs the actual resync once
  // the fresh channel confirms it's live.

  useAppState({ onForeground: connect });

  // ── Reconnection Handling — network comes back after an outage ──
  // Same clean-resubscribe-then-resync approach as the foreground case.

  useEffect(() => {
    const isOnline = network.isConnected && network.isInternetReachable;
    if (isOnline && !wasOnlineRef.current && user?.id) {
      connect();
    }
    wasOnlineRef.current = isOnline;
  }, [network.isConnected, network.isInternetReachable, user?.id, connect]);
}
