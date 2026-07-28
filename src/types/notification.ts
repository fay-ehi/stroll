/**
 * Stroll — Notification Domain Types
 * src/types/notification.ts
 *
 * Sprint 8 Prompt 1 (Notification Infrastructure). Backed by the new
 * `notifications` table (see
 * supabase/migrations/sprint8_prompt1_notifications.sql). Same
 * two-shapes-one-mapper pattern as src/types/follow.ts,
 * src/types/collaboration.ts, src/types/collection.ts: a raw snake_case
 * `Row` exactly as Supabase returns it, a camelCase `Model` every
 * hook/screen should actually consume, and one `toNotificationModel()`
 * translating between them.
 *
 * This sprint ships no Notification UI (see the prompt doc's own "Stop
 * Here"), so nothing renders `NotificationModel` yet — it exists so
 * src/hooks/useNotifications.ts and Sprint 8 Prompt 2/3's screen can be
 * built directly against a stable camelCase shape without a second
 * mapping pass being invented later.
 */

import type { Tables } from '@/lib/supabase';
import type { CreatorPreview } from './experience';

// ─── Notification Type Vocabulary ───────────────────────────────────────────────
// Mirrors the migration's `notification_type` check constraint exactly —
// keep both in sync. `collaboration_removed` is future-ready (a valid,
// fully-typed member here and a fully-implemented
// notificationsService.notifyCollaborationRemoved()) but nothing calls it
// yet this sprint — see that function's own doc comment.

export type NotificationType =
  | 'follow'
  | 'experience_like'
  | 'collaboration_invitation'
  | 'collaboration_accepted'
  | 'collaboration_removed'
  | 'system';

/** What a notification points at, for navigation — mirrors the migration's `entity_type` check constraint. */
export type NotificationEntityType = 'user' | 'experience' | 'collection' | 'system';

// ─── Raw Row ────────────────────────────────────────────────────────────────────

/** The raw `notifications` table row — snake_case, exactly as stored in Supabase. */
export type NotificationRow = Tables<'notifications'>;

/** The raw joined-profile shape notificationsService.ts's `profiles!notifications_actor_id_fkey(...)` embed returns — same snake_case joined-row shape as follow.ts's `FollowUserRow`, mapped to `CreatorPreview` below rather than reused as-is. */
export interface NotificationActorRow {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  is_verified: boolean;
}

/**
 * A `notifications` row joined with the actor's profile preview (see
 * notificationsService.ts's SELECT_COLUMNS — the
 * `profiles!notifications_actor_id_fkey` embed, disambiguated the same
 * way followsService.ts's `follower`/`following` embeds are, since
 * `notifications` has two FKs into `profiles`). `actor` is null both for
 * `system` notifications (no actor by design) and for the rare case
 * where the acting user's profile has since been deleted
 * (`actor_id` → `on delete set null`).
 */
export interface NotificationWithActorRow extends NotificationRow {
  actor: NotificationActorRow | null;
}

// ─── Canonical Domain Model ────────────────────────────────────────────────────

export interface NotificationModel {
  id: string;
  recipientId: string;
  actor: CreatorPreview | null;
  type: NotificationType;
  title: string;
  message: string;
  entityType: NotificationEntityType | null;
  entityId: string | null;
  /** Type-specific extra ids (e.g. `{ invitationId }` for a `collaboration_invitation`) — see the migration's own module doc for why this exists alongside entityType/entityId. */
  metadata: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Mapper ─────────────────────────────────────────────────────────────────────

function toActorPreview(row: NotificationActorRow | null): CreatorPreview | null {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    isVerified: row.is_verified,
  };
}

/** Maps a raw, actor-joined `notifications` row to the canonical camelCase domain model. Never returns null — unlike toCollaboratorModel/toPendingInvitationModel, a missing actor is a normal, expected state (system notifications) rather than a malformed row. */
export function toNotificationModel(row: NotificationWithActorRow): NotificationModel {
  return {
    id: row.id,
    recipientId: row.recipient_id,
    actor: toActorPreview(row.actor),
    type: row.notification_type as NotificationType,
    title: row.title,
    message: row.message,
    entityType: (row.entity_type as NotificationEntityType | null) ?? null,
    entityId: row.entity_id,
    metadata: (row.metadata as Record<string, unknown> | null) ?? {},
    isRead: row.is_read,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
