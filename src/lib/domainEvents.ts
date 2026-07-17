/**
 * Stroll — Collection Collaboration Domain Events
 * src/lib/domainEvents.ts
 *
 * Sprint 5 Prompt 2, requirement #9 (Notifications Preparation):
 * "Prepare the architecture for future notifications... Collaboration
 * events should emit reusable domain events... Do not build the
 * Notifications UI or push delivery yet."
 *
 * Deliberately its own file, not folded into lib/analytics.ts —
 * analytics.ts is a one-way product-instrumentation stream (impressions,
 * funnel steps, nothing reads it back); the events here represent state
 * transitions a future *notification* (in-app bell, push) would need to
 * react to and deliver to a specific recipient — a different consumer,
 * even though the "typed event + one seam function" shape is identical
 * to trackEvent()'s. Swap emitDomainEvent()'s body for a real call (e.g.
 * insert into a future `notifications` table, enqueue a push) and every
 * call site below keeps working unchanged.
 *
 * Called from src/hooks/useCollaboration.ts's mutation onSuccess
 * handlers — the same "tracking calls live in the hook, not the
 * service" placement lib/analytics.ts's own call sites already use
 * (see useUserGallery.ts's trackExperienceDeleted, useExperienceCreation.ts's
 * trackExperiencePublished).
 */

import { devLog } from '@/lib/config';

// ─── Event Vocabulary ────────────────────────────────────────────────────────────

export type CollectionDomainEventName =
  | 'collection_invitation_sent'
  | 'collection_invitation_accepted'
  | 'collection_invitation_declined'
  | 'collection_collaborator_added'
  | 'collection_collaborator_removed';

export interface CollectionDomainEventPayloads {
  collection_invitation_sent: { collectionId: string; invitedUserId: string; invitedBy: string };
  collection_invitation_accepted: { collectionId: string; userId: string };
  collection_invitation_declined: { collectionId: string; userId: string };
  /** Fired once an accepted invitation makes someone a collaborator — the "join" counterpart to collection_invitation_accepted, kept as its own event since a future notification recipient list differs (every existing collaborator, not just the inviter). */
  collection_collaborator_added: { collectionId: string; userId: string };
  /** `reason` distinguishes an owner-initiated removal from a self-initiated "Leave Collection" so a future notification can word each differently. */
  collection_collaborator_removed: { collectionId: string; userId: string; reason: 'removed_by_owner' | 'left' };
}

// ─── Core ──────────────────────────────────────────────────────────────────────

function emitDomainEvent<TName extends CollectionDomainEventName>(
  name: TName,
  payload: CollectionDomainEventPayloads[TName],
): void {
  devLog(`[domain-event] ${name}`, payload);
}

// ─── Per-Event Helpers ───────────────────────────────────────────────────────────

export function emitCollectionInvitationSent(
  payload: CollectionDomainEventPayloads['collection_invitation_sent'],
): void {
  emitDomainEvent('collection_invitation_sent', payload);
}

export function emitCollectionInvitationAccepted(
  payload: CollectionDomainEventPayloads['collection_invitation_accepted'],
): void {
  emitDomainEvent('collection_invitation_accepted', payload);
}

export function emitCollectionInvitationDeclined(
  payload: CollectionDomainEventPayloads['collection_invitation_declined'],
): void {
  emitDomainEvent('collection_invitation_declined', payload);
}

export function emitCollectionCollaboratorAdded(
  payload: CollectionDomainEventPayloads['collection_collaborator_added'],
): void {
  emitDomainEvent('collection_collaborator_added', payload);
}

export function emitCollectionCollaboratorRemoved(
  payload: CollectionDomainEventPayloads['collection_collaborator_removed'],
): void {
  emitDomainEvent('collection_collaborator_removed', payload);
}
