/**
 * Stroll — Collection Collaboration Domain Types
 * src/types/collaboration.ts
 *
 * Sprint 5 — Prompt 2 (Collaborative Collections). Backed by the new
 * `collection_collaborators` table (see
 * supabase/migrations/sprint5_prompt2_collaborative_collections.sql).
 * Same two-shapes-one-mapper pattern as src/types/collection.ts and
 * src/types/experience.ts.
 *
 * ── Distinct from CollectionCollaboratorRow (types/collection.ts) ──
 * That shape is a bare, ACCEPTED-only profile preview
 * (id/username/displayName/avatarUrl/isVerified) — exactly what a
 * Collection Card or the Collection Detail header's Contributors line
 * renders, and it's what collectionsService.ts's `attachCollaboratorsToRow(s)`
 * now populates for real (see that file's Sprint 5 Prompt 2 update).
 * `CollaboratorModel` below is the superset a collaboration
 * *management* screen needs instead: invitation status, who invited
 * whom, and when — every status (pending / accepted / declined /
 * expired), not just accepted ones.
 */

import type { CreatorPreview } from './experience';
import type { CollectionCollaboratorRow } from './collection';

export type CollaboratorStatus = 'pending' | 'accepted' | 'declined' | 'expired';

// ─── Raw Row Shapes ────────────────────────────────────────────────────────────

/**
 * A `collection_collaborators` row joined with the invited/collaborating
 * user's profile — the shape collaborationService.ts's management-list
 * query returns. Used for both "all of this Collection's collaborators +
 * pending invites" (owner/collaborator management screen).
 */
export interface CollectionCollaboratorLinkRow {
  id: string;
  collection_id: string;
  user_id: string;
  status: CollaboratorStatus;
  /** Reserved for a future role-based-permissions sprint — always null this sprint. */
  role: string | null;
  invited_by: string;
  invited_at: string;
  responded_at: string | null;
  joined_at: string | null;
  /** Null only if the invited user's profile row is missing/inaccessible. */
  user: CollectionCollaboratorRow | null;
}

/**
 * A `collection_collaborators` row from the *invited user's own*
 * viewpoint — embeds who sent the invite and which Collection it's for,
 * rather than the (redundant, it's the caller) invited user's own
 * profile. Backs "My Invitations" (useMyPendingInvitations).
 */
export interface MyInvitationRow {
  id: string;
  collection_id: string;
  status: CollaboratorStatus;
  invited_by: string;
  invited_at: string;
  responded_at: string | null;
  /** Null only if the inviting user's profile row is missing/inaccessible. */
  inviter: CollectionCollaboratorRow | null;
  /** Null only if the Collection was deleted between the invite and this fetch. */
  collection: { id: string; title: string; cover_image_url: string | null } | null;
}

// ─── Canonical Domain Models ──────────────────────────────────────────────────

export interface CollaboratorModel {
  /** The `collection_collaborators` row id — pass this to accept/decline/cancel/remove, not a user id. */
  id: string;
  collectionId: string;
  status: CollaboratorStatus;
  /** Reserved for a future role-based-permissions sprint — always null this sprint. */
  role: string | null;
  user: CreatorPreview;
  invitedById: string;
  invitedAt: string;
  respondedAt: string | null;
  joinedAt: string | null;
}

export interface PendingInvitationModel {
  /** The `collection_collaborators` row id — pass this to accept/decline. */
  id: string;
  collectionId: string;
  collectionTitle: string;
  collectionCoverUrl: string | null;
  invitedBy: CreatorPreview;
  invitedAt: string;
}

// ─── Mappers ───────────────────────────────────────────────────────────────────

function toCreatorPreview(row: CollectionCollaboratorRow): CreatorPreview {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    isVerified: row.is_verified,
  };
}

/** Returns null for a malformed row (missing user profile), same convention as toCollectionCardModel / toExperienceCardModel. */
export function toCollaboratorModel(row: CollectionCollaboratorLinkRow): CollaboratorModel | null {
  if (!row.user) return null;

  return {
    id: row.id,
    collectionId: row.collection_id,
    status: row.status,
    role: row.role,
    user: toCreatorPreview(row.user),
    invitedById: row.invited_by,
    invitedAt: row.invited_at,
    respondedAt: row.responded_at,
    joinedAt: row.joined_at,
  };
}

/** Returns null for a malformed row (missing inviter profile or deleted collection). */
export function toPendingInvitationModel(row: MyInvitationRow): PendingInvitationModel | null {
  if (!row.inviter || !row.collection) return null;

  return {
    id: row.id,
    collectionId: row.collection.id,
    collectionTitle: row.collection.title,
    collectionCoverUrl: row.collection.cover_image_url,
    invitedBy: toCreatorPreview(row.inviter),
    invitedAt: row.invited_at,
  };
}
