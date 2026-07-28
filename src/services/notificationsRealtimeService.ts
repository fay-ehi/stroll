/**
 * Stroll — Notifications Realtime Service
 * src/services/notificationsRealtimeService.ts
 *
 * Sprint 8 Prompt 3 (Real-Time Notifications & Badge System). The one
 * file that talks to Supabase Realtime for the Notification domain —
 * mirrors notificationsService.ts's own "one file, one external
 * concern" convention (that file owns every direct `notifications`
 * table read/write; this one owns the single Realtime channel built on
 * top of it). src/hooks/useRealtimeNotifications.ts is the only caller
 * — it owns caching/dedupe/reconnect *policy*; this file only owns the
 * Supabase Realtime *mechanics* (channel creation, the Postgres Changes
 * filter, translating REALTIME_SUBSCRIBE_STATES into a small status
 * vocabulary the hook can react to without importing
 * @supabase/realtime-js types itself — "keep realtime logic isolated"
 * per this sprint's own Repository Structure section).
 *
 * ── Security ──
 * `filter: recipient_id=eq.${userId}` scopes the subscription client-
 * side; the table's own RLS select policy (Sprint 8 Prompt 1 — "RLS-
 * first design") is what Supabase Realtime actually evaluates server-
 * side before ever broadcasting a change, so a user can only receive
 * postgres_changes events for rows they could already SELECT. Same
 * defense-in-depth relationship every direct Supabase call in
 * notificationsService.ts already keeps with its own RLS backing —
 * this sprint's own "Never receive another user's notifications" is
 * enforced twice, not assumed from the client-side filter alone.
 *
 * ── Why INSERT only, no UPDATE/DELETE ──
 * This sprint's own "Live Notification Delivery" section lists five
 * INSERT-triggering events (follow, like, invitation sent/accepted,
 * system) and says nothing about read-state syncing across devices —
 * mark-as-read/mark-all-read are already fully optimistic locally (see
 * useNotifications.ts's own module doc). Subscribing to UPDATE too
 * would be one more `.on(...)` call, but it's scope this prompt never
 * asks for, and this sprint's own Performance section asks for minimal
 * overhead — so it stays out.
 *
 * ── Why one channel, not one-per-caller ──
 * "Single active subscription per authenticated user" (this sprint's
 * own Performance section) — src/components/shell/AuthProvider.tsx is
 * the ONLY place useRealtimeNotifications() is called (once, app-wide),
 * so this file only ever needs to support one live channel at a time by
 * construction; subscribeToNotificationInserts() doesn't need its own
 * internal single-flight guard on top of that — see the hook's own
 * connect()/disconnect() for the one-channel-at-a-time guarantee.
 */

import { REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { logError } from '@/lib/errors';

/** A small, hook-facing status vocabulary — collapses REALTIME_SUBSCRIBE_STATES' four values down to the three the hook actually branches on. */
export type NotificationRealtimeStatus = 'connected' | 'error' | 'closed';

export interface NotificationInsertPayload {
  id: string;
}

export interface NotificationRealtimeHandlers {
  /** A new `notifications` row was inserted for this user. Payload carries only `id` — Realtime's own payload has no `profiles` join, so the caller re-fetches the full actor-joined row itself (see notificationsService.ts's getNotificationById doc for why). */
  onInsert: (payload: NotificationInsertPayload) => void;
  onStatusChange: (status: NotificationRealtimeStatus) => void;
}

/**
 * Opens a single Realtime channel scoped to one user's own notifications.
 * Returns an unsubscribe function — call it exactly once (on logout,
 * user change, reconnect, or unmount) before ever opening another
 * channel for the same or a different user; nothing in this function
 * itself prevents two channels from coexisting.
 */
export function subscribeToNotificationInserts(
  userId: string,
  handlers: NotificationRealtimeHandlers,
): () => void {
  // Topic includes the user id so two different signed-in sessions on
  // the same device (unlikely, but not impossible mid-account-switch)
  // never collide on the same channel topic.
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `recipient_id=eq.${userId}`,
      },
      (payload) => {
        // Typed narrowly on purpose — see this file's own module doc on
        // why only `id` is ever read off the raw Realtime payload.
        const row = payload.new as { id?: string } | null;
        if (row?.id) handlers.onInsert({ id: row.id });
      },
    )
    .subscribe((status, err) => {
      switch (status) {
        case REALTIME_SUBSCRIBE_STATES.SUBSCRIBED:
          handlers.onStatusChange('connected');
          return;
        case REALTIME_SUBSCRIBE_STATES.TIMED_OUT:
        case REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR:
          if (err) logError('notificationsRealtimeService:subscribe', err);
          handlers.onStatusChange('error');
          return;
        case REALTIME_SUBSCRIBE_STATES.CLOSED:
          handlers.onStatusChange('closed');
          return;
        default:
          return;
      }
    });

  return () => {
    void supabase.removeChannel(channel);
  };
}
