/**
 * Stroll — Domain Events
 * src/lib/domainEvents.ts
 *
 * Originally the Collection Collaboration domain's events only (Sprint 5
 * Prompt 2, requirement #9 — Notifications Preparation: "Collaboration
 * events should emit reusable domain events... Do not build the
 * Notifications UI or push delivery yet."). Sprint 6 Prompt 2
 * (requirement #12) adds Likes' own event — `experience.liked` —
 * alongside the Collection vocabulary rather than as a parallel file, so
 * a future notification system still has exactly ONE stream to consume.
 * (Sprint 6 Prompt 1's Follow domain deliberately did NOT emit through
 * here — see the project brief's Collaborative Collections section —
 * this sprint's own prompt doc explicitly asks for it, so Likes does.)
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
 * Naming note: Collection events use snake_case
 * ('collection_invitation_sent', ...) matching lib/analytics.ts's own
 * vocabulary; the prompt doc for Likes names its event with a dot
 * ('experience.liked') explicitly, so that one event keeps its literal
 * name rather than being silently renamed to 'experience_liked' (which
 * is lib/analytics.ts's own, separate, differently-named tracking event
 * for the same action — see trackExperienceLiked there). The two
 * naming conventions are allowed to coexist in this one vocabulary;
 * `DomainEventName` below is a plain union of both, not a shared format.
 *
 * Called from mutation onSuccess handlers — src/hooks/useCollaboration.ts
 * for the Collection events, src/hooks/useLikes.ts's useLike() for the
 * new one — the same "tracking calls live in the hook, not the service"
 * placement lib/analytics.ts's own call sites already use (see
 * useUserGallery.ts's trackExperienceDeleted, useExperienceCreation.ts's
 * trackExperiencePublished).
 */

import { devLog } from '@/lib/config';

// ─── Event Vocabulary — Collections (Sprint 5 Prompt 2) ─────────────────────────

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

// ─── Event Vocabulary — Likes (Sprint 6 Prompt 2) ───────────────────────────────

export type ExperienceDomainEventName = 'experience.liked';

export interface ExperienceDomainEventPayloads {
  /**
   * Fired only on a genuine Like (never on Unlike — see useLikes.ts's
   * useLike() onSuccess, which only calls this when the pre-toggle state
   * was "not liked"). `likedBy` / `creatorId` are deliberately separate
   * fields (not just `userId`) so a future notification recipient
   * (`creatorId`) is never confused with the actor (`likedBy`) — the
   * same distinction collection_collaborator_removed's `reason` field
   * exists to make explicit rather than implicit.
   */
  'experience.liked': { experienceId: string; likedBy: string; creatorId: string };
}

// ─── Core ──────────────────────────────────────────────────────────────────────

export type DomainEventName = CollectionDomainEventName | ExperienceDomainEventName;

export interface DomainEventPayloads
  extends CollectionDomainEventPayloads,
    ExperienceDomainEventPayloads {}

function emitDomainEvent<TName extends DomainEventName>(
  name: TName,
  payload: DomainEventPayloads[TName],
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

export function emitExperienceLiked(
  payload: ExperienceDomainEventPayloads['experience.liked'],
): void {
  emitDomainEvent('experience.liked', payload);
}
