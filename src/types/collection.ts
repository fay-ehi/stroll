/**
 * Stroll — Collection Domain Types
 * src/types/collection.ts
 *
 * STATUS: Real as of Sprint 5 Prompt 1 — backed by the `collections` /
 * `collection_items` tables (see
 * supabase/migrations/sprint5_prompt1_collections.sql). Previously a
 * skeleton scaffolded ahead of this sprint (see git history for that
 * version's module doc) — the shapes below are that same proposal, now
 * matched to the actual schema and wired to a real service
 * (src/services/collectionsService.ts).
 *
 * Same two-shapes-one-mapper pattern as src/types/experience.ts:
 *   1. `CollectionFeedRow` — the raw joined row shape collectionsService.ts
 *      queries return (a Collection with its creator embedded).
 *   2. `CollectionCardModel` — the canonical camelCase model a Collection
 *      Card (rich card or profile pill) renders.
 *   3. `CollectionDetailRow` / `CollectionModel` — the superset the
 *      Collection Detail screen needs (full description, coverType,
 *      visibility, updatedAt) — mirrors ExperienceDetailRow/
 *      ExperienceModel's relationship to the card versions in
 *      types/experience.ts.
 * `toCollectionCardModel()` / `toCollectionModel()` are the only places
 * that translate between them.
 *
 * ── Collaboration fields — real as of Sprint 5 Prompt 2 ──
 * `creatorId` (`collections.creator_id`) remains the single Collection
 * "owner" of record — Sprint 5 Prompt 2 (Collaborative Collections)
 * layers *membership* on top via a separate `collection_collaborators`
 * table (see src/types/collaboration.ts,
 * src/services/collaborationService.ts,
 * supabase/migrations/sprint5_prompt2_collaborative_collections.sql)
 * rather than changing what "owner" means here. The `owner` /
 * `collaborators` / `isCollaborative` shape below was originally kept,
 * inert, from a pre-Prompt-1 skeleton for exactly this forward
 * compatibility — collectionsService.ts's `attachCollaboratorsToRow(s)`
 * now populates `collaborators` for real (ACCEPTED collaborators only;
 * pending/declined/expired invitations live in
 * src/types/collaboration.ts's `CollaboratorModel` instead, which a
 * management screen reads directly, not through this file).
 * `isCollaborative` (`row.collaborators.length > 0`) already had the
 * right logic — it just needed real data to flip true. Reuses
 * `CreatorPreview` from the Experience domain rather than defining a
 * near-duplicate — a collection's owner (and each of its collaborators)
 * needs exactly the same "who is this person" slice an Experience Card's
 * creator does.
 *
 * ── Featured metadata — real as of Sprint 5 Prompt 3 ──
 * `is_featured` / `featured_order` (`collections.is_featured` /
 * `collections.featured_order`, see
 * supabase/migrations/sprint5_prompt3_collection_discovery.sql) back
 * requirement #6, "Featured Collections Preparation": columns and
 * mapped model fields exist so a future editorial-curation sprint can
 * read/write them, but nothing in this codebase sets `is_featured` yet
 * (no admin UI) and `fetchPublicCollectionsFeed()` in
 * collectionsService.ts does not order by them — ordering by an always-
 * false flag would be a no-op today and premature to encode. Per that
 * requirement: "Do not expose any administrative UI. Do not implement
 * recommendation algorithms."
 */

import { truncate } from '@/utils';
import type { CreatorPreview, ImagePreview } from './experience';

// ─── Raw Row Shapes ────────────────────────────────────────────────────────────

export type CollectionCoverType = 'custom' | 'generated';
export type CollectionVisibility = 'public' | 'private';

export interface CollectionCollaboratorRow {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  is_verified: boolean;
}

/**
 * The shape collectionsService.ts's list/detail queries return — a
 * `collections` row with its creator embedded as `owner` (Supabase
 * `.select()` alias, same embed style ExperienceFeedRow.creator uses).
 * `collaborators` is never populated by a real query yet — see this
 * file's module doc — service functions attach `[]` by hand when
 * building this shape.
 */
export interface CollectionFeedRow {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  city: string | null;
  cover_image_url: string | null;
  cover_type: CollectionCoverType;
  visibility: CollectionVisibility;
  experience_count: number;
  created_at: string;
  updated_at: string;
  /** Sprint 5 Prompt 3 — see module doc's "Featured metadata" section. Always `false`/`null` today (no admin UI sets these yet). */
  is_featured: boolean;
  featured_order: number | null;
  /** Null only if the owner's profile row is missing/inaccessible — same convention as ExperienceFeedRow.creator. */
  owner: CollectionCollaboratorRow | null;
  /** ACCEPTED collaborators only, as of Sprint 5 Prompt 2 — see module doc. */
  collaborators: CollectionCollaboratorRow[];
}

/** Superset of CollectionFeedRow — nothing extra at the row level yet (unlike ExperienceDetailRow, the detail query needs no extra joins), kept as its own alias so callers/mappers read the same way experience.ts's do. */
export type CollectionDetailRow = CollectionFeedRow;

// ─── Canonical Domain Models ──────────────────────────────────────────────────

const CARD_DESCRIPTION_CHAR_BUDGET = 100;

export interface CollectionCardModel {
  id: string;
  title: string;
  /** Truncated to a card-friendly length — use CollectionModel.description (detail screen) for the untruncated field. */
  descriptionPreview: string | null;
  city: string | null;
  coverImage: ImagePreview | null;
  coverType: CollectionCoverType;
  owner: CreatorPreview;
  /** ACCEPTED collaborators only, as of Sprint 5 Prompt 2 — see module doc. */
  collaborators: CreatorPreview[];
  /** True once at least one accepted collaborator exists. */
  isCollaborative: boolean;
  experienceCount: number;
  createdAt: string;
  /** Sprint 5 Prompt 3 — see module doc. Not surfaced in any UI yet; ready for a future editorial-curation sprint to read. */
  isFeatured: boolean;
  featuredOrder: number | null;
}

/** Superset of CollectionCardModel — adds the fields the Collection Detail screen needs. */
export interface CollectionModel extends CollectionCardModel {
  /** Untruncated — use this on the detail screen instead of descriptionPreview. */
  description: string | null;
  visibility: CollectionVisibility;
  updatedAt: string;
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

/** Maps a raw joined collection row into the lean shape a Collection Card renders. Returns null for a malformed row (missing owner), same convention as toExperienceCardModel. */
export function toCollectionCardModel(row: CollectionFeedRow): CollectionCardModel | null {
  if (!row.owner) return null;

  return {
    id: row.id,
    title: row.title,
    descriptionPreview: row.description
      ? truncate(row.description, CARD_DESCRIPTION_CHAR_BUDGET)
      : null,
    city: row.city,
    coverImage: row.cover_image_url ? { url: row.cover_image_url, position: 0 } : null,
    coverType: row.cover_type,
    owner: toCreatorPreview(row.owner),
    collaborators: row.collaborators.map(toCreatorPreview),
    isCollaborative: row.collaborators.length > 0,
    experienceCount: row.experience_count,
    createdAt: row.created_at,
    isFeatured: row.is_featured,
    featuredOrder: row.featured_order,
  };
}

/** Maps a raw detail row into the full shape the Collection Detail screen renders. Returns null under the same condition toCollectionCardModel does — a detail row is a superset, so this reuses that mapper for every shared field rather than duplicating the owner/collaborator logic. */
export function toCollectionModel(row: CollectionDetailRow): CollectionModel | null {
  const base = toCollectionCardModel(row);
  if (!base) return null;

  return {
    ...base,
    description: row.description,
    visibility: row.visibility,
    updatedAt: row.updated_at,
  };
}
