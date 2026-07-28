/**
 * Stroll — Notifications Service
 * src/services/notificationsService.ts
 *
 * Sprint 8 Prompt 1 (Notification Infrastructure). Supabase operations
 * for the Notification domain, backed by the new `notifications` table
 * (see supabase/migrations/sprint8_prompt1_notifications.sql). Pure
 * async functions — no UI, no Zustand, no navigation. Mirrors the
 * Result-type pattern established in followsService.ts / likesService.ts
 * / collaborationService.ts exactly.
 *
 * This is the ONLY file that talks to the `notifications` table directly
 * — screens/hooks go through src/hooks/useNotifications.ts (architecture
 * rule: UI Screens → Hooks → Stores → Repositories → Supabase). This
 * sprint ships no Notification UI (see the prompt doc's own "Stop
 * Here"), so useNotifications.ts currently has no screen calling it —
 * both files exist so Sprint 8 Prompt 2/3 can build directly on a
 * working, tested backend rather than scaffolding one alongside the UI.
 *
 * ── Two responsibilities in this one file ──
 * 1. The six repository primitives the prompt doc names verbatim:
 *    createNotification / getNotifications / markAsRead /
 *    markAllAsRead / deleteNotification / getUnreadCount — plus
 *    getNotificationById, a Sprint 8 Prompt 3 addition for hydrating a
 *    single Realtime INSERT payload (see that function's own doc).
 * 2. The "Automatic Notification Creation" bridge —
 *    createNotificationFromDomainEvent() — the real implementation
 *    src/lib/domainEvents.ts's emitDomainEvent() now calls instead of
 *    only devLog-ing (see that file's own module doc, written back in
 *    Sprint 5 Prompt 2, literally describing this exact swap in
 *    advance). This is what makes "A user follows another user" /
 *    "A user likes an experience" / "A collaboration invitation is
 *    sent/accepted" automatically produce a notification without
 *    useFollows.ts/useLikes.ts/useCollaboration.ts's mutations knowing
 *    anything about the `notifications` table — they only ever call
 *    emit*() (already the case for Likes/Collections; this sprint adds
 *    the same for Follow — see useFollows.ts's own diff).
 *
 * ── Why title/actor/entity-title resolution lives HERE, not at each
 *    emit*() call site ──
 * Every domain event payload (CollectionDomainEventPayloads,
 * ExperienceDomainEventPayloads, the new `user_followed` below) carries
 * only ids — never a display name or an Experience/Collection title.
 * Rather than growing every payload shape (and every existing emit*()
 * call site across useFollows.ts/useLikes.ts/useCollaboration.ts) to
 * also carry human-readable strings the mutation may not even have on
 * hand, each notify*() helper below resolves what it needs (actor
 * display name, Experience/Collection title, the invitation row id) with
 * one or two small selects of its own before writing the notification
 * row. This is a write triggered by a rare user action (a like, a
 * follow, an invite) — not a hot read path — so the extra round trip is
 * the right tradeoff for keeping every existing call site (and every
 * existing domain event payload) completely unchanged.
 *
 * ── Failure handling ──
 * Every notify*() helper, and createNotificationFromDomainEvent() itself,
 * swallows and logs its own errors rather than throwing — a failed
 * notification insert must never surface to the user or undo the follow/
 * like/invite that triggered it (this sprint's own Error Handling
 * section: "Handle gracefully: Failed notification creation... Never
 * expose technical errors to users."). The six repository primitives
 * above are the exception — those DO return a normal
 * NotificationsResult, since a screen calling markAsRead() directly
 * needs to know if it failed.
 */

import { supabase } from '@/lib/supabase';
import { normalizeError, makeError, logError, type StrollError } from '@/lib/errors';
import { PAGINATION } from '@/constants/app';
import { NOTIFICATION_TITLES, NOTIFICATION_PREFERENCE_CATEGORIES } from '@/constants/notifications';
import type { NotificationType, NotificationWithActorRow } from '@/types/notification';
import type { DomainEventName, DomainEventPayloads } from '@/lib/domainEvents';
import type { Json } from '@/types/database';

export type NotificationsResult<T> = { ok: true; data: T } | { ok: false; error: StrollError };

function ok<T>(data: T): NotificationsResult<T> {
  return { ok: true, data };
}

function fail(err: unknown): NotificationsResult<never> {
  return { ok: false, error: normalizeError(err) };
}

const DEFAULT_LIMIT = PAGINATION.DEFAULT_PAGE_SIZE;

const ACTOR_PREVIEW_COLUMNS = 'id, username, display_name, avatar_url, is_verified';

// Explicit `!notifications_actor_id_fkey` hint — `notifications` has TWO
// foreign keys into `profiles` (recipient_id, actor_id), same
// disambiguation followsService.ts needs for follower_id/following_id.
const SELECT_COLUMNS = `
  id, recipient_id, actor_id, notification_type, title, message,
  entity_type, entity_id, metadata, is_read, created_at, updated_at,
  actor:profiles!notifications_actor_id_fkey(${ACTOR_PREVIEW_COLUMNS})
`;

// ─── Create ──────────────────────────────────────────────────────────────────────

export interface CreateNotificationInput {
  recipientId: string;
  /** Omit or pass null for a `system` notification — every other type requires an actor. */
  actorId?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: 'user' | 'experience' | 'collection' | 'system' | null;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * The one place that inserts a `notifications` row. Guards
 * actor === recipient client-side (a friendly no-op rather than the raw
 * `notifications_actor_not_recipient` check-constraint error — same
 * "produce a specific error, RLS/constraints are the real boundary"
 * relationship followsService.ts's self-follow guard has with
 * `follows_no_self_follow`) — most callers go through the notify*()
 * helpers below, which already skip calling this in that case, but a
 * future direct caller (e.g. a `system` broadcast) still gets the same
 * protection.
 *
 * ── Why this does NOT `.select(...).single()` after the insert ──
 * `notifications_select_own` (the migration's RLS SELECT policy) only
 * allows `auth.uid() = recipient_id`. Every notify*() helper below
 * inserts a row where the CURRENT user is the actor, not the recipient
 * (Ada follows Bob → Ada's client inserts a row for Bob) — so an
 * `INSERT ... RETURNING` chained with `.select().single()` has its
 * RETURNING output filtered by that same SELECT policy and comes back
 * empty, which `.single()` turns into a client-side "0 rows" error even
 * though the row was inserted and committed successfully (the recipient
 * really does have it — Postgres RLS only hid it from the *inserter's*
 * own read-back, it didn't roll back the write). That false failure was
 * getting logged and swallowed by createNotificationLogged() below on
 * literally every automatic notification. Nothing currently consumes the
 * returned row anyway (see createNotificationLogged's own doc), so this
 * just confirms the write succeeded and stops there.
 */
export async function createNotification(input: CreateNotificationInput): Promise<NotificationsResult<void>> {
  try {
    if (input.actorId && input.actorId === input.recipientId) {
      return fail(makeError('VALIDATION_ERROR', 'Cannot create a notification where the actor and recipient are the same user.'));
    }

    const { error } = await supabase.from('notifications').insert({
      recipient_id: input.recipientId,
      actor_id: input.actorId ?? null,
      notification_type: input.type,
      title: input.title,
      message: input.message,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      // `Record<string, unknown>` isn't structurally assignable to the
      // generated `Json` union (same reason every other jsonb-typed
      // insert in this codebase — e.g. places' `opening_hours` — either
      // takes `Json` directly or casts) — every value passed in here is
      // already a plain JSON-serializable object (see the notify*()
      // helpers below), so this cast is safe.
      metadata: (input.metadata ?? {}) as unknown as Json,
    });

    if (error) return fail(error);
    return ok(undefined);
  } catch (err) {
    return fail(err);
  }
}

// ─── Read (paginated list) ───────────────────────────────────────────────────────
// Same keyset (cursor) pagination shape as followsService.ts's
// getFollowers()/getFollowing() — cursor helpers stay local to this file,
// per that file's own established convention, rather than a shared import.

interface NotificationCursor {
  createdAt: string;
  id: string;
}

function encodeCursor(payload: NotificationCursor): string {
  return encodeURIComponent(JSON.stringify(payload));
}

function decodeCursor(cursor: string): NotificationCursor | null {
  try {
    return JSON.parse(decodeURIComponent(cursor)) as NotificationCursor;
  } catch {
    return null;
  }
}

function buildKeysetFilter(columns: { name: string; value: string | number }[]): string {
  const branches: string[] = [];
  for (let i = 0; i < columns.length; i++) {
    const strictColumn = columns[i]!;
    const equalPrefix = columns.slice(0, i).map((c) => `${c.name}.eq.${c.value}`);
    const clause = [...equalPrefix, `${strictColumn.name}.lt.${strictColumn.value}`];
    branches.push(clause.length === 1 ? clause[0]! : `and(${clause.join(',')})`);
  }
  return branches.join(',');
}

export interface NotificationListPage {
  notifications: NotificationWithActorRow[];
  nextCursor: string | null;
}

/** A user's own notifications, newest-first, paginated. Pagination-ready per this sprint's Performance section, even though no screen calls it yet. */
export async function getNotifications(params: {
  userId: string;
  cursor?: string | null;
  limit?: number;
}): Promise<NotificationsResult<NotificationListPage>> {
  try {
    const limit = params.limit ?? DEFAULT_LIMIT;
    let query = supabase
      .from('notifications')
      .select(SELECT_COLUMNS)
      .eq('recipient_id', params.userId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false });

    if (params.cursor) {
      const cursor = decodeCursor(params.cursor);
      if (cursor) {
        query = query.or(
          buildKeysetFilter([
            { name: 'created_at', value: cursor.createdAt },
            { name: 'id', value: cursor.id },
          ]),
        );
      }
    }

    // Fetch one extra row to know whether a next page exists without a
    // separate count query — same trick followsService.ts's
    // getFollowers()/getFollowing() use.
    const { data, error } = await query.limit(limit + 1);
    if (error) return fail(error);

    const rows = (data ?? []) as unknown as NotificationWithActorRow[];
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const last = page[page.length - 1];
    const nextCursor = hasMore && last ? encodeCursor({ createdAt: last.created_at, id: last.id }) : null;

    return ok({ notifications: page, nextCursor });
  } catch (err) {
    return fail(err);
  }
}

/**
 * Sprint 8 Prompt 3 (Real-Time Notifications). A single actor-joined
 * `notifications` row, by id. Supabase Realtime's own Postgres Changes
 * payload only ever carries the raw table row (no `profiles` join —
 * Realtime doesn't evaluate embeds), so
 * useRealtimeNotifications.ts calls this once per live INSERT event to
 * get the same actor-hydrated shape getNotifications() already returns,
 * before inserting it into the list cache — see that hook's own doc for
 * why hydrating BEFORE inserting (rather than inserting a
 * partial/no-avatar row and patching it in afterward) is what keeps a
 * newly-arrived notification's insertion "smooth" per this sprint's own
 * "Avoid flashing or reloading the entire list."
 *
 * `.maybeSingle()`, not `.single()` — the row can legitimately be gone
 * by the time this resolves (deleted between the event firing and this
 * fetch completing); the caller treats a null/failed result as "nothing
 * to show," never as an error to surface.
 */
export async function getNotificationById(
  notificationId: string,
  userId: string,
): Promise<NotificationsResult<NotificationWithActorRow | null>> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select(SELECT_COLUMNS)
      .eq('id', notificationId)
      .eq('recipient_id', userId)
      .maybeSingle();

    if (error) return fail(error);
    return ok((data as unknown as NotificationWithActorRow | null) ?? null);
  } catch (err) {
    return fail(err);
  }
}

// ─── Unread Count ────────────────────────────────────────────────────────────────
// `{ unreadCount: number }` per this sprint's own "Unread Count" section
// — head-count query (no rows transferred), same shape
// followsService.ts's getFollowerCount()/getFollowingCount() use, backed
// by the partial `notifications_recipient_unread_idx` index (see the
// migration) so this stays cheap regardless of a user's total
// notification history.

export async function getUnreadCount(userId: string): Promise<NotificationsResult<{ unreadCount: number }>> {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', userId)
      .eq('is_read', false);

    if (error) return fail(error);
    return ok({ unreadCount: count ?? 0 });
  } catch (err) {
    return fail(err);
  }
}

// ─── Read Status ─────────────────────────────────────────────────────────────────
// Both scoped by `.eq('recipient_id', userId)` in addition to `.eq('id', ...)`
// — defense-in-depth alongside RLS's `notifications_update_own` policy
// (the actual boundary — see the migration's own comment), same
// relationship every other service in this codebase keeps between its
// own client-side checks and the RLS policy backing them.

export async function markAsRead(notificationId: string, userId: string): Promise<NotificationsResult<void>> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('recipient_id', userId);

    if (error) return fail(error);
    return ok(undefined);
  } catch (err) {
    return fail(err);
  }
}

export async function markAllAsRead(userId: string): Promise<NotificationsResult<void>> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('recipient_id', userId)
      .eq('is_read', false);

    if (error) return fail(error);
    return ok(undefined);
  } catch (err) {
    return fail(err);
  }
}

// ─── Delete ─────────────────────────────────────────────────────────────────────
// Deleting a notification that's already gone is a no-op, not an error —
// same convention as savedService.ts's unsaveItem() /
// collaborationService.ts's cancelInvitation().

export async function deleteNotification(notificationId: string, userId: string): Promise<NotificationsResult<void>> {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('recipient_id', userId);

    if (error) return fail(error);
    return ok(undefined);
  } catch (err) {
    return fail(err);
  }
}

// ─── Preferences (future-ready seam) ────────────────────────────────────────────
// This sprint builds no preferences table/UI (see the prompt doc's own
// "Do NOT build the settings UI"). shouldNotify() is the single seam
// every notify*() helper below already calls before inserting — it
// always returns true today, but once a real `notification_preferences`
// table/screen exists, only THIS function's body needs to change (a
// lookup instead of a constant) — see constants/notifications.ts's own
// module doc for the category grouping this keys off.

async function shouldNotify(
  _recipientId: string,
  _category: (typeof NOTIFICATION_PREFERENCE_CATEGORIES)[NotificationType],
): Promise<boolean> {
  return true;
}

// ─── Small Resolution Helpers ───────────────────────────────────────────────────
// Each notify*() helper below needs a small amount of human-readable
// context (an actor's display name, an Experience/Collection's title)
// that its domain event payload doesn't carry — see this file's own
// module doc for why that resolution happens here rather than growing
// every payload shape. These stay private/unexported — narrow, single-
// purpose lookups, not general-purpose repository methods other files
// should call.

async function getActorDisplayName(actorId: string): Promise<string | null> {
  const { data } = await supabase.from('profiles').select('display_name').eq('id', actorId).maybeSingle();
  return (data as unknown as { display_name: string } | null)?.display_name ?? null;
}

async function getExperienceTitle(experienceId: string): Promise<string | null> {
  const { data } = await supabase.from('experiences').select('title').eq('id', experienceId).maybeSingle();
  return (data as unknown as { title: string } | null)?.title ?? null;
}

async function getCollectionTitle(collectionId: string): Promise<string | null> {
  const { data } = await supabase.from('collections').select('title').eq('id', collectionId).maybeSingle();
  return (data as unknown as { title: string } | null)?.title ?? null;
}

/** The `collection_collaborators` row id for a specific (collection, invited user) pair — this is `metadata.invitationId`, letting a future Notification card's Accept/Decline act without a second lookup (this sprint's own Notification Metadata example). */
async function findInvitationId(collectionId: string, invitedUserId: string): Promise<string | null> {
  const { data } = await supabase
    .from('collection_collaborators')
    .select('id')
    .eq('collection_id', collectionId)
    .eq('user_id', invitedUserId)
    .order('invited_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as unknown as { id: string } | null)?.id ?? null;
}

/** Who invited a now-accepted collaborator — the correct recipient of a "accepted your invitation" notification (the inviter, not necessarily the Collection's `creatorId` — a collaborator can invite others too). */
async function findInviterId(collectionId: string, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('collection_collaborators')
    .select('invited_by')
    .eq('collection_id', collectionId)
    .eq('user_id', userId)
    .maybeSingle();
  return (data as unknown as { invited_by: string } | null)?.invited_by ?? null;
}

/** `createNotification()` returns a Result rather than throwing (see its own doc) — every notify*() helper below is fire-and-forget from its caller's perspective, so this logs a failed insert instead of silently discarding it. */
async function createNotificationLogged(input: CreateNotificationInput, context: string): Promise<void> {
  const result = await createNotification(input);
  if (!result.ok) logError(context, result.error);
}

// ─── Notify Helpers (one per supported notification type) ──────────────────────
// Each one: resolves the human-readable context it needs, checks the
// (currently-always-true) preference gate, and writes exactly one
// notification row. Never throws — every error is caught by the single
// try/catch in createNotificationFromDomainEvent() below, which is the
// only caller of these.

async function notifyFollow(payload: DomainEventPayloads['user_followed']): Promise<void> {
  const { followerId, followingId } = payload;
  if (followerId === followingId) return;
  if (!(await shouldNotify(followingId, NOTIFICATION_PREFERENCE_CATEGORIES.follow))) return;

  const actorName = (await getActorDisplayName(followerId)) ?? 'Someone';
  await createNotificationLogged(
    {
      recipientId: followingId,
      actorId: followerId,
      type: 'follow',
      title: NOTIFICATION_TITLES.follow,
      message: `${actorName} started following you.`,
      entityType: 'user',
      entityId: followerId,
      metadata: {},
    },
    'notifyFollow',
  );
}

async function notifyExperienceLiked(payload: DomainEventPayloads['experience.liked']): Promise<void> {
  const { experienceId, likedBy, creatorId } = payload;
  // Liking your own Experience is normal, expected behavior
  // (likesService.ts's own module doc) — just never notify yourself about it.
  if (likedBy === creatorId) return;
  if (!(await shouldNotify(creatorId, NOTIFICATION_PREFERENCE_CATEGORIES.experience_like))) return;

  const [actorName, experienceTitle] = await Promise.all([
    getActorDisplayName(likedBy),
    getExperienceTitle(experienceId),
  ]);

  await createNotificationLogged(
    {
      recipientId: creatorId,
      actorId: likedBy,
      type: 'experience_like',
      title: NOTIFICATION_TITLES.experience_like,
      message: `${actorName ?? 'Someone'} liked your experience "${experienceTitle ?? 'your experience'}".`,
      entityType: 'experience',
      entityId: experienceId,
      // Matches this sprint's own Notification Metadata example verbatim
      // (`{ "experienceId": "...", "actorId": "..." }`).
      metadata: { experienceId, actorId: likedBy },
    },
    'notifyExperienceLiked',
  );
}

async function notifyCollaborationInvitation(
  payload: DomainEventPayloads['collection_invitation_sent'],
): Promise<void> {
  const { collectionId, invitedUserId, invitedBy } = payload;
  if (invitedUserId === invitedBy) return;
  if (!(await shouldNotify(invitedUserId, NOTIFICATION_PREFERENCE_CATEGORIES.collaboration_invitation))) return;

  const [actorName, collectionTitle, invitationId] = await Promise.all([
    getActorDisplayName(invitedBy),
    getCollectionTitle(collectionId),
    findInvitationId(collectionId, invitedUserId),
  ]);

  await createNotificationLogged(
    {
      recipientId: invitedUserId,
      actorId: invitedBy,
      type: 'collaboration_invitation',
      title: NOTIFICATION_TITLES.collaboration_invitation,
      message: `${actorName ?? 'Someone'} invited you to collaborate on "${collectionTitle ?? 'a collection'}".`,
      entityType: 'collection',
      entityId: collectionId,
      // Matches this sprint's own Notification Metadata example verbatim
      // (`{ "collectionId": "...", "invitationId": "..." }`) — enough for
      // a future Notification card to open Accept/Decline directly.
      metadata: { collectionId, invitationId },
    },
    'notifyCollaborationInvitation',
  );
}

async function notifyCollaborationAccepted(
  payload: DomainEventPayloads['collection_invitation_accepted'],
): Promise<void> {
  const { collectionId, userId } = payload;
  const inviterId = await findInviterId(collectionId, userId);
  // No inviter on record (row missing/already cleaned up) — nothing to notify.
  if (!inviterId || inviterId === userId) return;
  if (!(await shouldNotify(inviterId, NOTIFICATION_PREFERENCE_CATEGORIES.collaboration_accepted))) return;

  const [actorName, collectionTitle] = await Promise.all([
    getActorDisplayName(userId),
    getCollectionTitle(collectionId),
  ]);

  await createNotificationLogged(
    {
      recipientId: inviterId,
      actorId: userId,
      type: 'collaboration_accepted',
      title: NOTIFICATION_TITLES.collaboration_accepted,
      message: `${actorName ?? 'Someone'} accepted your invitation to collaborate on "${collectionTitle ?? 'your collection'}".`,
      entityType: 'collection',
      entityId: collectionId,
      metadata: { collectionId },
    },
    'notifyCollaborationAccepted',
  );
}

/**
 * Future-ready per this sprint's "Collaboration Removed (Future Ready)"
 * section — fully implemented and exported, but intentionally NOT called
 * from createNotificationFromDomainEvent()'s switch below (see that
 * function's own comment on the `collection_collaborator_removed` case).
 * A future prompt wires this in directly from
 * useCollaboration.ts's useRemoveCollaborator/useLeaveCollection
 * onSuccess (the same place emitCollectionCollaboratorRemoved() already
 * fires), or from this file's own switch once that sprint decides to
 * generate this type. Left exported now purely so that call site is a
 * one-line addition later, not a new function to design then.
 */
export async function notifyCollaborationRemoved(payload: {
  collectionId: string;
  userId: string;
  reason: 'removed_by_owner' | 'left';
}): Promise<void> {
  const { collectionId, userId, reason } = payload;
  if (reason === 'left') return; // Leaving is self-initiated — nothing to notify the leaver about.
  if (!(await shouldNotify(userId, NOTIFICATION_PREFERENCE_CATEGORIES.collaboration_removed))) return;

  const collectionTitle = await getCollectionTitle(collectionId);

  await createNotificationLogged(
    {
      recipientId: userId,
      actorId: null,
      type: 'collaboration_removed',
      title: NOTIFICATION_TITLES.collaboration_removed,
      message: `You were removed from "${collectionTitle ?? 'a collection'}".`,
      entityType: 'collection',
      entityId: collectionId,
      metadata: { collectionId },
    },
    'notifyCollaborationRemoved',
  );
}

// ─── Domain Event Bridge ─────────────────────────────────────────────────────────
// The real implementation src/lib/domainEvents.ts's emitDomainEvent()
// calls — see this file's own module doc, and domainEvents.ts's, for the
// full "why" of this seam. Generic over `DomainEventName` so each branch
// below is type-checked against that event's own payload shape with no
// casting.

export async function createNotificationFromDomainEvent<TName extends DomainEventName>(
  name: TName,
  payload: DomainEventPayloads[TName],
): Promise<void> {
  try {
    switch (name) {
      case 'user_followed':
        await notifyFollow(payload as DomainEventPayloads['user_followed']);
        return;

      case 'experience.liked':
        await notifyExperienceLiked(payload as DomainEventPayloads['experience.liked']);
        return;

      case 'collection_invitation_sent':
        await notifyCollaborationInvitation(payload as DomainEventPayloads['collection_invitation_sent']);
        return;

      case 'collection_invitation_accepted':
        await notifyCollaborationAccepted(payload as DomainEventPayloads['collection_invitation_accepted']);
        return;

      // `collection_invitation_declined` and `collection_collaborator_added`
      // aren't in this sprint's Supported Notification Types list (only
      // Invitation *sent*/*accepted* are) — intentionally no-op rather
      // than inventing a notification type the prompt doc doesn't ask for.
      //
      // `collection_collaborator_removed` maps to the future-ready
      // `collaboration_removed` type (see notifyCollaborationRemoved's
      // own doc) — intentionally NOT dispatched yet, per this sprint's
      // "Architecture should support this notification type even if it
      // is not yet generated."
      case 'collection_invitation_declined':
      case 'collection_collaborator_added':
      case 'collection_collaborator_removed':
      default:
        return;
    }
  } catch (err) {
    // Never let a notification failure surface to the user or affect the
    // action that triggered it — see this file's own module doc.
    logError(`createNotificationFromDomainEvent:${name}`, err);
  }
}
