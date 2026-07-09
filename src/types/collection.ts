/**
 * Stroll — Collection Domain Types
 * src/types/collection.ts
 *
 * STATUS: Skeleton only — scaffolded ahead of a future sprint per product
 * direction (nothing renders this on any live screen yet). Not backed by
 * a real table: this repo has no Supabase migrations checked in, so
 * whether a `collections` table already exists server-side is unknown.
 * When that sprint starts, the actual next steps are:
 *   1. Confirm/create the `collections` + `collection_experiences` +
 *      `collection_collaborators` tables (see the shape implied by
 *      CollectionFeedRow below — this is a proposed shape, not a
 *      confirmed schema).
 *   2. Replace src/services/collectionsService.ts's mock implementation
 *      with real Supabase queries (same SELECT-with-embeds pattern
 *      experiencesService.ts already uses for Discover).
 *   3. Un-comment the <CollectionCarousel> slot in discover.tsx's For You
 *      header.
 *
 * Same two-shapes-one-mapper pattern as src/types/experience.ts:
 *   1. `CollectionFeedRow` — the raw joined row shape a future
 *      collectionsService.ts query would return.
 *   2. `CollectionCardModel` — the canonical camelCase model the
 *      carousel/card renders. `toCollectionCardModel()` is the only
 *      place that translates between them.
 *
 * Collaboration: a collection can have one owner and zero or more
 * collaborators (PRD ask: "cozy cafes to eat in Abuja" owned by one user
 * OR jointly maintained). Modeled as `owner: CreatorPreview` (always
 * present — every collection has exactly one owner) plus
 * `collaborators: CreatorPreview[]` (everyone else with edit access).
 * Reuses CreatorPreview from the Experience domain rather than defining
 * a near-duplicate — a collection's owner/collaborators need exactly the
 * same "who is this person" slice an Experience Card's creator does.
 */

import { truncate } from '@/utils';
import type { CreatorPreview, ImagePreview } from './experience';

// ─── Raw Row Shape ───────────────────────────────────────────────────────────
// Proposed shape for a future collectionsService.ts query — see module doc.
// Mirrors ExperienceFeedRow's embed style (owner/collaborators/cover image
// all joined in one round trip) so the eventual real query can follow the
// exact same Supabase `.select()` pattern experiencesService.ts already
// establishes.

export interface CollectionCollaboratorRow {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  is_verified: boolean;
}

export interface CollectionFeedRow {
  id: string;
  title: string;
  description: string | null;
  city: string | null;
  cover_image_url: string | null;
  experience_count: number;
  created_at: string;
  updated_at: string;
  /** Null only if the owner's profile row is missing/inaccessible — same convention as ExperienceFeedRow.creator. */
  owner: CollectionCollaboratorRow | null;
  /** Empty for a single-owner collection — populated once one or more people have been added as collaborators. */
  collaborators: CollectionCollaboratorRow[];
}

// ─── Canonical Domain Model ──────────────────────────────────────────────────

const CARD_DESCRIPTION_CHAR_BUDGET = 100;

export interface CollectionCardModel {
  id: string;
  title: string;
  /** Truncated to a card-friendly length — use the untruncated field on a future CollectionModel (detail screen) if/when that's built. */
  descriptionPreview: string | null;
  city: string | null;
  coverImage: ImagePreview | null;
  owner: CreatorPreview;
  /** Empty for a single-owner collection. */
  collaborators: CreatorPreview[];
  /** True once there's at least one collaborator — the exact "owned by one user or multiple" distinction from the product ask. */
  isCollaborative: boolean;
  experienceCount: number;
  createdAt: string;
}

// ─── Mapper ───────────────────────────────────────────────────────────────────

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
    owner: toCreatorPreview(row.owner),
    collaborators: row.collaborators.map(toCreatorPreview),
    isCollaborative: row.collaborators.length > 0,
    experienceCount: row.experience_count,
    createdAt: row.created_at,
  };
}
