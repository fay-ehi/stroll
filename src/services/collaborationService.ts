/**
 * Stroll — Collection Collaboration Service
 * src/services/collaborationService.ts
 *
 * Sprint 5 — Prompt 2 (Collaborative Collections). This is the ONLY file
 * that talks to the `collection_collaborators` table directly — screens/
 * hooks go through src/hooks/useCollaboration.ts, same layering
 * collectionsService.ts already established for `collections` /
 * `collection_items`. Mirrors that file's Result-type pattern.
 *
 * ── Authorization ──
 * Every write below is also enforced at the database layer by the RLS
 * policies in
 * supabase/migrations/sprint5_prompt2_collaborative_collections.sql — the
 * checks in this file (e.g. filtering out users who are already
 * collaborators before an invite) exist to produce a specific, friendly
 * error/empty-result rather than a raw permission-denied response, not as
 * the actual security boundary. A client bypassing this file entirely
 * still can't do anything RLS wouldn't allow.
 */

import { supabase } from '@/lib/supabase';
import { normalizeError, makeError, type StrollError } from '@/lib/errors';
import type { CollectionCollaboratorRow } from '@/types/collection';
import type { CollaboratorStatus, CollectionCollaboratorLinkRow, MyInvitationRow } from '@/types/collaboration';
import type { CreatorPreview } from '@/types/experience';

export type CollaborationResult<T> = { ok: true; data: T } | { ok: false; error: StrollError };

function ok<T>(data: T): CollaborationResult<T> {
  return { ok: true, data };
}

function fail(err: unknown): CollaborationResult<never> {
  return { ok: false, error: normalizeError(err) };
}

const PROFILE_PREVIEW_COLUMNS = 'id, username, display_name, avatar_url, is_verified';

const COLLABORATOR_LINK_SELECT = `
  id, collection_id, user_id, status, role, invited_by, invited_at, responded_at, joined_at,
  user:profiles!collection_collaborators_user_id_fkey(${PROFILE_PREVIEW_COLUMNS})
`;

const MY_INVITATION_SELECT = `
  id, collection_id, status, invited_by, invited_at, responded_at,
  inviter:profiles!collection_collaborators_invited_by_fkey(${PROFILE_PREVIEW_COLUMNS}),
  collection:collections(id, title, cover_image_url)
`;

// A generous cap — an invite search is a live-typing autocomplete, not a
// paginated list; requirement #2 doesn't ask for "load more" here.
const SEARCH_RESULT_LIMIT = 20;
const MIN_SEARCH_QUERY_LENGTH = 2;

// ─── Search Invitable Users ─────────────────────────────────────────────────────
// Requirement #2: "User search, Username lookup... Prevent inviting:
// Yourself, Existing collaborators, Users with pending invitations."
// Reuses the same `.ilike()` username-lookup pattern
// checkUsernameAvailable() (profileService.ts) already established for
// this table, extended to also match display_name and to return a full
// preview row rather than a boolean.

export async function searchInvitableUsers(params: {
  query: string;
  collectionId: string;
  currentUserId: string;
}): Promise<CollaborationResult<CreatorPreview[]>> {
  try {
    const query = params.query.trim();
    if (query.length < MIN_SEARCH_QUERY_LENGTH) return ok([]);

    const [profilesResult, existingLinksResult] = await Promise.all([
      supabase
        .from('profiles')
        .select(PROFILE_PREVIEW_COLUMNS)
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
        .neq('id', params.currentUserId)
        .limit(SEARCH_RESULT_LIMIT),
      supabase
        .from('collection_collaborators')
        .select('user_id, status')
        .eq('collection_id', params.collectionId)
        .in('status', ['pending', 'accepted']),
    ]);

    if (profilesResult.error) return fail(profilesResult.error);
    if (existingLinksResult.error) return fail(existingLinksResult.error);

    const blockedUserIds = new Set(
      ((existingLinksResult.data ?? []) as unknown as { user_id: string }[]).map((row) => row.user_id),
    );

    const rows = (profilesResult.data ?? []) as unknown as CollectionCollaboratorRow[];
    const eligible = rows.filter((row) => !blockedUserIds.has(row.id));

    return ok(
      eligible.map((row) => ({
        id: row.id,
        username: row.username,
        displayName: row.display_name,
        avatarUrl: row.avatar_url,
        isVerified: row.is_verified,
      })),
    );
  } catch (err) {
    return fail(err);
  }
}

// ─── Invite Collaborators ───────────────────────────────────────────────────────
// Requirement #2: "Selecting multiple users, Sending invitations." Each
// invite is either a fresh 'pending' insert, or — if this pair
// previously existed and was 'declined'/'expired' — an UPDATE of that
// same row back to 'pending' (the `unique(collection_id, user_id)`
// constraint means a second insert would fail; re-inviting has to reuse
// the row). A user who's currently 'pending' or 'accepted' is silently
// skipped rather than erroring the whole batch — the invite modal's own
// searchInvitableUsers() call already keeps them out of the pickable
// list, so reaching this function with one already means a race, not a
// user error worth interrupting the rest of the batch for.

export async function inviteCollaborators(params: {
  collectionId: string;
  userIds: string[];
  invitedBy: string;
}): Promise<CollaborationResult<{ invited: string[]; skipped: string[] }>> {
  try {
    const { data: existing, error: existingError } = await supabase
      .from('collection_collaborators')
      .select('id, user_id, status')
      .eq('collection_id', params.collectionId)
      .in('user_id', params.userIds);

    if (existingError) return fail(existingError);

    const existingRows = (existing ?? []) as unknown as { id: string; user_id: string; status: CollaboratorStatus }[];
    const existingByUser = new Map(existingRows.map((row) => [row.user_id, row]));

    const invited: string[] = [];
    const skipped: string[] = [];
    const toInsert: { collection_id: string; user_id: string; invited_by: string; status: 'pending' }[] = [];
    const toReinvite: string[] = [];

    for (const userId of params.userIds) {
      const existingRow = existingByUser.get(userId);
      if (!existingRow) {
        toInsert.push({ collection_id: params.collectionId, user_id: userId, invited_by: params.invitedBy, status: 'pending' });
        invited.push(userId);
      } else if (existingRow.status === 'declined' || existingRow.status === 'expired') {
        toReinvite.push(existingRow.id);
        invited.push(userId);
      } else {
        skipped.push(userId);
      }
    }

    if (toInsert.length > 0) {
      const { error } = await supabase.from('collection_collaborators').insert(toInsert);
      if (error) return fail(error);
    }

    if (toReinvite.length > 0) {
      const results = await Promise.all(
        toReinvite.map((id) =>
          supabase
            .from('collection_collaborators')
            .update({
              status: 'pending',
              invited_by: params.invitedBy,
              invited_at: new Date().toISOString(),
              responded_at: null,
              joined_at: null,
            })
            .eq('id', id),
        ),
      );
      const firstError = results.find((r) => r.error)?.error;
      if (firstError) return fail(firstError);
    }

    if (invited.length === 0) {
      return fail(makeError('CONFLICT', 'Everyone selected is already invited or collaborating.'));
    }

    return ok({ invited, skipped });
  } catch (err) {
    return fail(err);
  }
}

// ─── Respond to / Manage a Single Invitation ────────────────────────────────────

export async function acceptInvitation(collaboratorId: string): Promise<CollaborationResult<void>> {
  try {
    const { error } = await supabase
      .from('collection_collaborators')
      .update({ status: 'accepted' })
      .eq('id', collaboratorId);
    if (error) return fail(error);
    return ok(undefined);
  } catch (err) {
    return fail(err);
  }
}

export async function declineInvitation(collaboratorId: string): Promise<CollaborationResult<void>> {
  try {
    const { error } = await supabase
      .from('collection_collaborators')
      .update({ status: 'declined' })
      .eq('id', collaboratorId);
    if (error) return fail(error);
    return ok(undefined);
  } catch (err) {
    return fail(err);
  }
}

/** Owner-only — cancels a still-pending invitation (requirement #7). */
export async function cancelInvitation(collaboratorId: string): Promise<CollaborationResult<void>> {
  try {
    const { error } = await supabase.from('collection_collaborators').delete().eq('id', collaboratorId);
    if (error) return fail(error);
    return ok(undefined);
  } catch (err) {
    return fail(err);
  }
}

/** Owner-only — removes an accepted collaborator (requirement #7). Same delete as cancelInvitation; kept as its own named export since callers reason about them as distinct actions (an in-flight invite vs. an active collaborator). */
export async function removeCollaborator(collaboratorId: string): Promise<CollaborationResult<void>> {
  try {
    const { error } = await supabase.from('collection_collaborators').delete().eq('id', collaboratorId);
    if (error) return fail(error);
    return ok(undefined);
  } catch (err) {
    return fail(err);
  }
}

/** A collaborator (not the original creator) leaving a Collection they no longer want to co-curate (requirement #7). */
export async function leaveCollection(collectionId: string, userId: string): Promise<CollaborationResult<void>> {
  try {
    const { error } = await supabase
      .from('collection_collaborators')
      .delete()
      .eq('collection_id', collectionId)
      .eq('user_id', userId);
    if (error) return fail(error);
    return ok(undefined);
  } catch (err) {
    return fail(err);
  }
}

// ─── Get Collection Collaborators (management view — every status) ─────────────
// Backs the Manage Collaborators screen — both the owner (invite/cancel/
// remove) and an accepted collaborator (read-only list + Leave) open the
// same screen; RLS's collection_collaborators_select policy already scopes
// what each of them can see.

export async function getCollectionCollaborators(
  collectionId: string,
): Promise<CollaborationResult<CollectionCollaboratorLinkRow[]>> {
  try {
    const { data, error } = await supabase
      .from('collection_collaborators')
      .select(COLLABORATOR_LINK_SELECT)
      .eq('collection_id', collectionId)
      .order('invited_at', { ascending: true });

    if (error) return fail(error);
    return ok((data ?? []) as unknown as CollectionCollaboratorLinkRow[]);
  } catch (err) {
    return fail(err);
  }
}

// ─── Get Accepted Collaborators for Many Collections (internal) ────────────────
// Backs collectionsService.ts's attachCollaboratorsToRows() — batched across
// every Collection id on a feed/list page rather than one query per card,
// the same "fetch once, group in TS" shape
// getCollectionsContainingExperience() already uses.

export async function getAcceptedCollaboratorsForCollections(
  collectionIds: string[],
): Promise<CollaborationResult<Map<string, CollectionCollaboratorRow[]>>> {
  try {
    if (collectionIds.length === 0) return ok(new Map());

    const { data, error } = await supabase
      .from('collection_collaborators')
      .select(`collection_id, user:profiles!collection_collaborators_user_id_fkey(${PROFILE_PREVIEW_COLUMNS})`)
      .in('collection_id', collectionIds)
      .eq('status', 'accepted');

    if (error) return fail(error);

    const rows = (data ?? []) as unknown as { collection_id: string; user: CollectionCollaboratorRow | null }[];
    const grouped = new Map<string, CollectionCollaboratorRow[]>();
    for (const row of rows) {
      if (!row.user) continue;
      const existing = grouped.get(row.collection_id) ?? [];
      existing.push(row.user);
      grouped.set(row.collection_id, existing);
    }

    return ok(grouped);
  } catch (err) {
    return fail(err);
  }
}

// ─── Get My Pending Invitations ─────────────────────────────────────────────────
// Backs the Profile screen's "Invitations" entry point (CollectionsRow)
// and app/(modals)/collection-invitations.tsx's list.

export async function getMyPendingInvitations(userId: string): Promise<CollaborationResult<MyInvitationRow[]>> {
  try {
    const { data, error } = await supabase
      .from('collection_collaborators')
      .select(MY_INVITATION_SELECT)
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('invited_at', { ascending: false });

    if (error) return fail(error);
    return ok((data ?? []) as unknown as MyInvitationRow[]);
  } catch (err) {
    return fail(err);
  }
}

// ─── Get My Collaborations (accepted, for Profile / Add-to-Collection) ─────────
// Which Collections `userId` is an ACCEPTED collaborator on but did NOT
// create — collectionsService.ts's getMyCollections() merges this in
// alongside owned Collections, so the Profile pill row and the
// Add-to-Collection picker both surface Collections a collaborator can
// contribute to, not just ones they created.

export async function getMyCollaborationCollectionIds(userId: string): Promise<CollaborationResult<string[]>> {
  try {
    const { data, error } = await supabase
      .from('collection_collaborators')
      .select('collection_id')
      .eq('user_id', userId)
      .eq('status', 'accepted');

    if (error) return fail(error);
    const rows = (data ?? []) as unknown as { collection_id: string }[];
    return ok(rows.map((row) => row.collection_id));
  } catch (err) {
    return fail(err);
  }
}
