/**
 * Stroll — Notification Navigation
 * src/lib/notificationNavigation.ts
 *
 * Sprint 8 Prompt 2 (Notification Center UI). Maps a NotificationModel
 * to the route it should open when tapped, per the prompt's own
 * "Navigation" table:
 *
 *   Follow                    → User Profile
 *   Experience Like            → Experience Detail
 *   Collaboration Invitation   → Invitation / Collaboration Flow
 *   Collaboration Accepted     → Collection Detail
 *   System                     → Configured destination (if applicable)
 *
 * `collaboration_invitation` always resolves to the existing My
 * Invitations screen (app/(modals)/collection-invitations.tsx) —
 * ROUTES.modals.collectionInvitations — since that's the only surface
 * with real Accept/Decline actions; a per-invitation deep link isn't
 * needed to satisfy "Invitation / Collaboration Flow." Every other type
 * (including `system`, when it carries a real entityType/entityId, and
 * the future-ready `collaboration_removed` — see notificationsService.ts's
 * notifyCollaborationRemoved doc) resolves generically off entityType/
 * entityId, so a `system` notification pointing at a real Experience/
 * Collection/User still navigates correctly without a type-specific
 * branch. Returns null when there's nowhere sensible to go (e.g. a
 * `system` notification with no entity) — the caller should just mark
 * it read and stay put.
 */

import { ROUTES } from '@/constants/routes';
import type { NotificationModel } from '@/types/notification';

export function resolveNotificationRoute(notification: NotificationModel): string | null {
  const { type, entityType, entityId } = notification;

  if (type === 'collaboration_invitation') {
    return ROUTES.modals.collectionInvitations;
  }

  if (!entityId) return null;

  switch (entityType) {
    case 'user':
      return ROUTES.app.otherUserProfile(entityId);
    case 'experience':
      return ROUTES.app.experienceDetail(entityId);
    case 'collection':
      return ROUTES.app.collectionDetail(entityId);
    default:
      return null;
  }
}
