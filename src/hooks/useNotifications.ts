/**
 * Stroll — Notifications Hooks
 * src/hooks/useNotifications.ts
 *
 * Sprint 8 Prompt 1 (Notification Infrastructure). The Notification
 * domain's public API — screens/components go through these hooks,
 * never notificationsService or supabase directly (architecture rule:
 * UI Screens → Hooks → Stores → Repositories → Supabase). Built on
 * src/services/notificationsService.ts (see that file's own module doc).
 *
 * This sprint ships no Notification UI (see the prompt doc's own "Stop
 * Here" — no screen, no cards, no badge component), so nothing calls
 * these hooks yet. They exist, fully wired and optimistic, so Sprint 8
 * Prompt 2/3 can build the screen and the DiscoverTopBar bell badge
 * directly against a working hook layer rather than starting from
 * notificationsService calls inline in a component.
 *
 * Exposes:
 *   useNotifications()            — a user's paginated notification list.
 *   useUnreadNotificationCount()  — the badge count.
 *   useMarkNotificationAsRead()   — mark one notification read, optimistic.
 *   useMarkAllNotificationsAsRead() — mark every notification read, optimistic.
 *   useDeleteNotification()       — dismiss/delete one notification, optimistic.
 *
 * Also exports `NotificationListCache` (the raw-row infinite-query
 * cache shape) — a Sprint 8 Prompt 3 addition, purely a type export, so
 * useRealtimeNotifications.ts can read/patch this same cache from a
 * live Realtime event without redefining the shape a second time.
 *
 * ── Why the list cache holds raw rows, not NotificationModel ──
 * Same shape useFollows.ts's useFollowListQuery / useSaved.ts's list
 * hooks already use: notificationsService.getNotifications() returns
 * NotificationWithActorRow pages (snake_case, exactly what Supabase
 * returned), cached as-is, and mapped to camelCase NotificationModel at
 * READ time inside this hook's own `useMemo` — so every mutation below
 * (mark-read, mark-all-read, delete) can patch the cache by matching on
 * `is_read`/`id` directly against the same raw shape the network
 * response already had, with no extra round-trip translation.
 *
 * ── Why there's no offline mutation queue ──
 * Same established convention as useFollows.ts's / useLikes.ts's own
 * toggle mutations — a mark-as-read or delete attempted while offline
 * fails fast with a clear NETWORK_ERROR toast instead of being queued.
 */

import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryKeys';
import { makeError, normalizeError, logError, type StrollError } from '@/lib/errors';
import { showToast } from '@/stores/toastStore';
import { useAuthStore } from '@/stores/authStore';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  type NotificationListPage,
} from '@/services/notificationsService';
import { toNotificationModel, type NotificationModel, type NotificationWithActorRow } from '@/types/notification';

// ─── Shared ─────────────────────────────────────────────────────────────────────

const STALE_TIMES = {
  list: 30 * 1000,
  unreadCount: 30 * 1000,
} as const;

const NOT_SIGNED_IN_MESSAGE = 'Please sign in to continue.';

function isRetryableStrollError(failureCount: number, error: StrollError): boolean {
  return error.isRetryable && failureCount < 2;
}

type NotificationListCache = InfiniteData<NotificationListPage>;
export type { NotificationListCache };

/** Patches every cached page's `notifications` array in place — the shared cache-walk every mutation below (mark-one, mark-all, delete) builds on, same "one small generic helper, not three near-identical copies" reasoning useLikes.ts's patchExperienceLikeCounts() uses. */
function mapCachedNotifications(
  cache: NotificationListCache,
  fn: (notifications: NotificationWithActorRow[]) => NotificationWithActorRow[],
): NotificationListCache {
  return {
    ...cache,
    pages: cache.pages.map((page) => ({ ...page, notifications: fn(page.notifications) })),
  };
}

// ─── useNotifications (paginated list) ──────────────────────────────────────────

export interface UseNotificationsResult {
  notifications: NotificationModel[];
  isLoading: boolean;
  isRefetching: boolean;
  isError: boolean;
  error: StrollError | null;
  refetch: () => void;
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
}

/** A user's own notifications, newest-first, paginated — the future Notification screen's own data source. */
export function useNotifications(userId: string | undefined): UseNotificationsResult {
  const query = useInfiniteQuery<NotificationListPage, StrollError>({
    queryKey: userId ? queryKeys.notifications.list(userId) : ['notifications', 'list', 'disabled'],
    queryFn: async ({ pageParam }) => {
      const cursor = (pageParam as string | null) ?? null;
      const result = await getNotifications({ userId: userId!, cursor });
      if (!result.ok) throw result.error;
      return result.data;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!userId,
    staleTime: STALE_TIMES.list,
    retry: isRetryableStrollError,
  });

  const notifications = useMemo(() => {
    if (!query.data) return [];
    return query.data.pages.flatMap((page) => page.notifications.map(toNotificationModel));
  }, [query.data]);

  return {
    notifications,
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
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

// ─── useUnreadNotificationCount ─────────────────────────────────────────────────
// The bell badge's own data source (DiscoverTopBar.tsx currently shows a
// static "Notifications are coming soon." toast on press — see that
// file's own doc — a future prompt wires this hook's return value into
// its badge dot/count).

export function useUnreadNotificationCount(userId: string | undefined): number {
  const query = useQuery({
    queryKey: userId ? queryKeys.notifications.unreadCount(userId) : ['notifications', 'unread-count', 'disabled'],
    queryFn: async () => {
      const result = await getUnreadCount(userId!);
      if (!result.ok) throw result.error;
      return result.data.unreadCount;
    },
    enabled: !!userId,
    staleTime: STALE_TIMES.unreadCount,
    retry: isRetryableStrollError,
  });

  return query.data ?? 0;
}

// ─── useMarkNotificationAsRead ───────────────────────────────────────────────────

interface NotificationMutationContext {
  previousList?: NotificationListCache;
  previousCount?: number;
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation<void, StrollError, { notificationId: string }, NotificationMutationContext>({
    mutationFn: async ({ notificationId }) => {
      if (!user) throw makeError('UNAUTHORIZED', NOT_SIGNED_IN_MESSAGE);
      const result = await markAsRead(notificationId, user.id);
      if (!result.ok) throw result.error;
    },

    onMutate: async ({ notificationId }) => {
      if (!user) return {};
      const listKey = queryKeys.notifications.list(user.id);
      const countKey = queryKeys.notifications.unreadCount(user.id);

      await queryClient.cancelQueries({ queryKey: listKey });

      const previousList = queryClient.getQueryData<NotificationListCache>(listKey);
      const previousCount = queryClient.getQueryData<number>(countKey);

      let wasUnread = false;
      if (previousList) {
        queryClient.setQueryData<NotificationListCache>(
          listKey,
          mapCachedNotifications(previousList, (notifications) =>
            notifications.map((n) => {
              if (n.id !== notificationId) return n;
              if (!n.is_read) wasUnread = true;
              return { ...n, is_read: true };
            }),
          ),
        );
      }

      if (wasUnread && typeof previousCount === 'number') {
        queryClient.setQueryData<number>(countKey, Math.max(0, previousCount - 1));
      }

      return { previousList, previousCount };
    },

    onError: (error, _vars, context) => {
      if (user) {
        if (context?.previousList) {
          queryClient.setQueryData(queryKeys.notifications.list(user.id), context.previousList);
        }
        if (typeof context?.previousCount === 'number') {
          queryClient.setQueryData(queryKeys.notifications.unreadCount(user.id), context.previousCount);
        }
      }
      logError('useMarkNotificationAsRead', error);
      showToast({ type: 'error', message: normalizeError(error).userMessage });
    },

    onSuccess: () => {
      if (user) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount(user.id) });
      }
    },
  });
}

// ─── useMarkAllNotificationsAsRead ───────────────────────────────────────────────

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation<void, StrollError, void, NotificationMutationContext>({
    mutationFn: async () => {
      if (!user) throw makeError('UNAUTHORIZED', NOT_SIGNED_IN_MESSAGE);
      const result = await markAllAsRead(user.id);
      if (!result.ok) throw result.error;
    },

    onMutate: async () => {
      if (!user) return {};
      const listKey = queryKeys.notifications.list(user.id);
      const countKey = queryKeys.notifications.unreadCount(user.id);

      await queryClient.cancelQueries({ queryKey: listKey });

      const previousList = queryClient.getQueryData<NotificationListCache>(listKey);
      const previousCount = queryClient.getQueryData<number>(countKey);

      if (previousList) {
        queryClient.setQueryData<NotificationListCache>(
          listKey,
          mapCachedNotifications(previousList, (notifications) =>
            notifications.map((n) => (n.is_read ? n : { ...n, is_read: true })),
          ),
        );
      }
      queryClient.setQueryData<number>(countKey, 0);

      return { previousList, previousCount };
    },

    onError: (error, _vars, context) => {
      if (user) {
        if (context?.previousList) {
          queryClient.setQueryData(queryKeys.notifications.list(user.id), context.previousList);
        }
        if (typeof context?.previousCount === 'number') {
          queryClient.setQueryData(queryKeys.notifications.unreadCount(user.id), context.previousCount);
        }
      }
      logError('useMarkAllNotificationsAsRead', error);
      showToast({ type: 'error', message: normalizeError(error).userMessage });
    },

    onSuccess: () => {
      showToast({ type: 'success', message: 'All notifications marked as read.' });
    },
  });
}

// ─── useDeleteNotification ───────────────────────────────────────────────────────

export function useDeleteNotification() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation<void, StrollError, { notificationId: string }, NotificationMutationContext>({
    mutationFn: async ({ notificationId }) => {
      if (!user) throw makeError('UNAUTHORIZED', NOT_SIGNED_IN_MESSAGE);
      const result = await deleteNotification(notificationId, user.id);
      if (!result.ok) throw result.error;
    },

    onMutate: async ({ notificationId }) => {
      if (!user) return {};
      const listKey = queryKeys.notifications.list(user.id);
      const countKey = queryKeys.notifications.unreadCount(user.id);

      await queryClient.cancelQueries({ queryKey: listKey });

      const previousList = queryClient.getQueryData<NotificationListCache>(listKey);
      const previousCount = queryClient.getQueryData<number>(countKey);

      let removedWasUnread = false;
      if (previousList) {
        queryClient.setQueryData<NotificationListCache>(
          listKey,
          mapCachedNotifications(previousList, (notifications) =>
            notifications.filter((n) => {
              if (n.id !== notificationId) return true;
              if (!n.is_read) removedWasUnread = true;
              return false;
            }),
          ),
        );
      }

      if (removedWasUnread && typeof previousCount === 'number') {
        queryClient.setQueryData<number>(countKey, Math.max(0, previousCount - 1));
      }

      return { previousList, previousCount };
    },

    onError: (error, _vars, context) => {
      if (user) {
        if (context?.previousList) {
          queryClient.setQueryData(queryKeys.notifications.list(user.id), context.previousList);
        }
        if (typeof context?.previousCount === 'number') {
          queryClient.setQueryData(queryKeys.notifications.unreadCount(user.id), context.previousCount);
        }
      }
      logError('useDeleteNotification', error);
      showToast({ type: 'error', message: normalizeError(error).userMessage });
    },
  });
}
