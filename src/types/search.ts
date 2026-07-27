/**
 * Stroll — Search Domain Types
 * src/types/search.ts
 *
 * Sprint 7 Prompt 1 — Search Foundation. This file has no dependency on
 * the services layer (same rule types/profile.ts's own doc states) —
 * profileService.ts imports `CreatorSearchRow` FROM here, not the other
 * way around.
 *
 * Experiences and Collections already have their own canonical card
 * models (`ExperienceCardModel` in types/experience.ts,
 * `CollectionCardModel` in types/collection.ts) — Search reuses both
 * as-is rather than defining Search-specific duplicates (this
 * codebase's architecture rule: "never duplicate ... models"). Creators
 * don't have an existing "search result" shape, though: `CreatorPreview`
 * (types/experience.ts) is deliberately minimal (no bio — an Experience
 * Card's creator row never shows one), and the Follow domain's
 * `FollowUserPreview` (types/follow.ts) is a near-identical shape built
 * for a different screen. Rather than repurpose either, `CreatorSearchResult`
 * below extends `CreatorPreview` with the one additional field the
 * prompt's own spec asks for ("Display: Avatar, Name, Bio, Follow
 * button") — bio.
 *
 * `SearchResults` is the "one unified response object" the prompt asks
 * searchService.ts to return — a plain aggregate of the three domains'
 * own card models, not a new fourth model. Nothing here talks to
 * Supabase or React — see services/searchService.ts and hooks/useSearch.ts
 * for those layers.
 *
 * Sprint 7 Prompt 2 — Smart Search & Discovery adds `recommendedExperiences`
 * / `recommendedCollections`: the "Suggested Results" section (and the
 * enhanced No Results state's "you might enjoy these instead" content),
 * populated only when the matching exact-query section came back empty —
 * see searchService.ts and features/search/recommendations for how these
 * are selected. Additive fields on the existing type, not a parallel
 * result shape — every Sprint 7 Prompt 1 caller of `SearchResults` keeps
 * compiling unchanged.
 */

import type { CreatorPreview, ExperienceCardModel } from './experience';
import type { CollectionCardModel } from './collection';

// ─── Raw Row Shape ───────────────────────────────────────────────────────────────

/** The shape profileService.ts's searchCreators() returns — a `profiles` row projected down to exactly what a Creator search result needs. */
export interface CreatorSearchRow {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  is_verified: boolean;
}

// ─── Canonical Domain Model ──────────────────────────────────────────────────────

/** A Creator as Search's own results section renders it — CreatorPreview plus a bio line (this section's one extra requirement over an Experience Card's creator row). */
export interface CreatorSearchResult extends CreatorPreview {
  bio: string | null;
}

/** Maps a raw `profiles` row into the shape the Creators results section renders. */
export function toCreatorSearchResult(row: CreatorSearchRow): CreatorSearchResult {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    isVerified: row.is_verified,
    bio: row.bio,
  };
}

// ─── Unified Search Results ───────────────────────────────────────────────────────

/**
 * The "one unified response object" searchService.ts's searchAll()
 * returns — Experiences → Collections → Creators, matching the prompt's
 * own required section order (useSearch.ts / search.tsx render them in
 * this same order; the order isn't re-derived at the UI layer).
 */
export interface SearchResults {
  experiences: ExperienceCardModel[];
  collections: CollectionCardModel[];
  creators: CreatorSearchResult[];
  /** "Recommended Experiences" — populated only when `experiences` came back empty for this exact query. See features/search/recommendations. */
  recommendedExperiences: ExperienceCardModel[];
  /** "Recommended Collections" — populated only when `collections` came back empty for this exact query. See features/search/recommendations. */
  recommendedCollections: CollectionCardModel[];
}

export const EMPTY_SEARCH_RESULTS: SearchResults = {
  experiences: [],
  collections: [],
  creators: [],
  recommendedExperiences: [],
  recommendedCollections: [],
};
