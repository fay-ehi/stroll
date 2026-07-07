/**
 * Stroll — Experience Domain Types
 * src/types/experience.ts
 *
 * Same two-shapes-one-mapper pattern as the Place and Profile domains
 * (src/types/place.ts, src/types/profile.ts):
 *   1. `ExperienceFeedRow` — the raw row shape returned by the Discover
 *      queries in src/services/experiencesService.ts. It's not a plain
 *      `Tables<'experiences'>` because every Discover query embeds the
 *      creator (`profiles`), the place (`places`), and the cover photo
 *      (`experience_photos`) in one round trip — see the service for why.
 *   2. `ExperienceCardModel` / `ExperienceModel` — the canonical camelCase
 *      models every hook, store, and screen should use. `ExperienceModel`
 *      is the full shape (adds the fields a future Experience Detail
 *      screen needs); `ExperienceCardModel` is the lighter shape the
 *      Discover feed actually renders. `ExperienceModel` is a superset of
 *      `ExperienceCardModel` so a detail screen can reuse a card's data
 *      as its initial render before its own fetch resolves.
 * `toExperienceCardModel()` / `toExperienceModel()` are the only places
 * that translate between them.
 *
 * ── Why `city` is denormalized (see also the migration's own comment) ──
 * `experiences.city` duplicates `places.city` at write time. This lets
 * every Discover query filter with `.eq('city', ...)` directly on
 * `experiences` instead of an inner-joined filter on the embedded
 * `places` relation, which PostgREST requires (`places!inner(...)`) and
 * which would need re-deriving on every future feed query added to this
 * file. Same tradeoff the codebase already made for
 * `places.experience_count` — a small write-time duplication in exchange
 * for every read staying a single, simple, indexable filter.
 *
 * ── Why the mappers return `null` for a row ──
 * `creator` / `place` are only ever missing if the embedded join genuinely
 * returned nothing for that row (RLS hid it, or the referenced row was
 * deleted without the FK's `on delete cascade` having run yet). Both
 * mappers return `null` in that case instead of throwing, so a single
 * malformed row can be filtered out by the caller without failing the
 * entire feed page (see `experiencesService.ts` / `useDiscoverFeed.ts`).
 */

import { truncate } from '@/utils';
import type { PlaceCategoryId, PlaceCategory } from '@/constants/places';
import { getPlaceCategory, isPlaceCategoryId } from '@/constants/places';

// ─── Raw Row Shapes ────────────────────────────────────────────────────────────
// These describe the shape of the embedded Supabase response used by every
// Discover query (see SELECT_COLUMNS in experiencesService.ts) — not a
// plain `Tables<'experiences'>`, which only has the flat columns.

export interface ExperienceCreatorRow {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  is_verified: boolean;
}

export interface ExperiencePlaceRow {
  id: string;
  name: string;
  slug: string;
  city: string;
  category: string;
  hero_image: string | null;
}

export interface ExperiencePhotoRow {
  photo_url: string;
  position: number;
}

export interface ExperienceFeedRow {
  id: string;
  user_id: string;
  place_id: string;
  city: string;
  story: string;
  would_recommend: boolean | null;
  amount_spent: string | null;
  visit_type: string | null;
  good_for_tags: string[];
  vibe_tags: string[];
  like_count: number;
  comment_count: number;
  featured: boolean;
  created_at: string;
  updated_at: string;
  /** Null only if the creator's profile row is missing/inaccessible — see module doc. */
  creator: ExperienceCreatorRow | null;
  /** Null only if the referenced place row is missing/inaccessible — see module doc. */
  place: ExperiencePlaceRow | null;
  /** May be an empty array — an experience isn't required to have photos yet. */
  experience_photos: ExperiencePhotoRow[] | null;
}

// ─── Canonical Domain Models ────────────────────────────────────────────────────

/** A single image, ordered within its parent experience's photo set. */
export interface ImagePreview {
  url: string;
  position: number;
}

/** The creator info an Experience Card needs — a deliberately small slice of ProfileModel. */
export interface CreatorPreview {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isVerified: boolean;
}

/** Re-exported as its own name in this domain — an Experience Card's "category" IS its place's structural category. */
export type CategoryPreview = PlaceCategory;

// Approximates "never exceed three lines" (PRD Design System §24) as a
// character budget rather than a line count, the same way EmptyState's
// DESCRIPTION_MAX_WIDTH derives a pixel value from a qualitative rule —
// three lines of Body text at typical card width comfortably fits ~140
// characters; truncate() adds the ellipsis if the story runs longer.
const CARD_STORY_PREVIEW_CHAR_BUDGET = 140;

export interface ExperienceCardModel {
  id: string;
  /** The Experience Card's headline — the place's name (PRD §8.7: Experiences don't have their own title field). */
  title: string;
  /** Truncated to ~3 lines per the Design System — use ExperienceModel.story for the untruncated text. */
  storyPreview: string;
  /** Denormalized from the place — see module doc. */
  location: string;
  placeId: string;
  coverImage: ImagePreview | null;
  creator: CreatorPreview;
  /** Null only if the place's stored category isn't a recognized PlaceCategoryId. */
  category: CategoryPreview | null;
  likeCount: number;
  commentCount: number;
  featured: boolean;
  createdAt: string;
}

/** Superset of ExperienceCardModel — adds the fields an Experience Detail screen (later sprint) will need. */
export interface ExperienceModel extends ExperienceCardModel {
  story: string;
  photos: ImagePreview[];
  wouldRecommend: boolean | null;
  amountSpent: string | null;
  visitType: string | null;
  goodForTags: string[];
  vibeTags: string[];
  updatedAt: string;
}

// ─── Mappers ────────────────────────────────────────────────────────────────────

function sortedPhotos(rows: ExperiencePhotoRow[] | null): ImagePreview[] {
  return (rows ?? [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((p) => ({ url: p.photo_url, position: p.position }));
}

function toCategoryPreview(category: string): CategoryPreview | null {
  return isPlaceCategoryId(category) ? (getPlaceCategory(category) ?? null) : null;
}

function toCreatorPreview(row: ExperienceCreatorRow): CreatorPreview {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    isVerified: row.is_verified,
  };
}

/** Maps a raw joined Discover row into the lean shape the Experience Card renders. Returns null for a malformed row — see module doc. */
export function toExperienceCardModel(row: ExperienceFeedRow): ExperienceCardModel | null {
  if (!row.creator || !row.place) return null;

  const photos = sortedPhotos(row.experience_photos);

  return {
    id: row.id,
    title: row.place.name,
    storyPreview: truncate(row.story, CARD_STORY_PREVIEW_CHAR_BUDGET),
    location: row.city,
    placeId: row.place.id,
    coverImage: photos[0] ?? null,
    creator: toCreatorPreview(row.creator),
    category: toCategoryPreview(row.place.category),
    likeCount: row.like_count,
    commentCount: row.comment_count,
    featured: row.featured,
    createdAt: row.created_at,
  };
}

/** Maps a raw joined Discover row into the full model. Returns null for a malformed row — see module doc. */
export function toExperienceModel(row: ExperienceFeedRow): ExperienceModel | null {
  const card = toExperienceCardModel(row);
  if (!card) return null;

  return {
    ...card,
    story: row.story,
    photos: sortedPhotos(row.experience_photos),
    wouldRecommend: row.would_recommend,
    amountSpent: row.amount_spent,
    visitType: row.visit_type,
    goodForTags: row.good_for_tags,
    vibeTags: row.vibe_tags,
    updatedAt: row.updated_at,
  };
}

// ─── Discover Feed Params ───────────────────────────────────────────────────────

/**
 * 'newest'   — PRD §8.3 default For You content, reverse-chronological.
 * 'trending' — PRD §8.3 "Trending filter" — highest engagement, city-scoped.
 * The PRD doesn't define a trending time-decay/scoring algorithm, so this
 * sprint uses a straightforward `like_count DESC` ordering (see
 * experiencesService.ts) — swapping in a weighted/recency-decayed score
 * later only changes that one query, not this type or any hook/screen.
 */
export type DiscoverSortMode = 'newest' | 'trending';

export function isDiscoverSortMode(value: string): value is DiscoverSortMode {
  return value === 'newest' || value === 'trending';
}

export interface FeaturedExperiencesParams {
  city?: string;
  limit?: number;
}

export interface DiscoverFeedParams {
  sort: DiscoverSortMode;
  city?: string;
  /**
   * Accepted here so the service/query layer is ready for category
   * filtering, but no UI in this sprint sets it — the Categories Row
   * (PRD §8.3 / this sprint's brief) is display-only until a later
   * sprint wires selection through to this param.
   */
  category?: PlaceCategoryId;
  limit?: number;
}
