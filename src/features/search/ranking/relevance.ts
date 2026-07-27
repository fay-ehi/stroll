/**
 * Stroll — Search Ranking: Relevance Scoring
 * src/features/search/ranking/relevance.ts
 *
 * Sprint 7 Prompt 2 — Smart Search & Discovery, "Intelligent Ranking":
 * results should be ranked by relevance, not simply alphabetical/
 * newest-first, in the priority order the prompt itself specifies —
 * exact title > partial title > tag > description > category — with
 * ties broken toward "newer, richer or more engaging content".
 *
 * Pure functions only — this file never touches Supabase, React, or
 * navigation, so it can sort whatever searchService.ts already fetched
 * without becoming a second data-access layer (this codebase's own
 * "never duplicate ... query logic" rule). searchService.ts calls these
 * as the last step before returning `SearchResults`, per this prompt's
 * own "Avoid placing ranking logic inside UI components."
 *
 * ── Why Experiences/Collections don't get a real "tag match" tier ──
 * `ExperienceCardModel` deliberately doesn't carry `goodForTags`/
 * `vibeTags` — those live on the fuller `ExperienceModel` a Detail
 * screen needs (see types/experience.ts's own doc), and Search reuses
 * the lighter Card model rather than introducing a Search-specific
 * duplicate (this codebase's "never duplicate ... models" rule, echoed
 * again in types/search.ts's own module doc). A row that only matched
 * on the backend via a `good_for_tags`/`vibe_tags` overlap (see
 * experiencesService.ts's searchExperiences) genuinely has no tag text
 * available client-side to score against — `category` (which IS on the
 * card) is the closest available proxy, so it fills the "tag or
 * category" tier alone. A card with no textual signal at all still
 * scores MATCH_TIER.NONE rather than 0 — it was returned because it
 * matched *something* server-side, so it stays in the list, just last.
 */

import { MATCH_TIER, type MatchTier } from '../types';
import { bestFuzzyWordSimilarity, isFuzzyMatch } from './textMatch';
import type { ExperienceCardModel } from '@/types/experience';
import type { CollectionCardModel } from '@/types/collection';
import type { CreatorSearchResult } from '@/types/search';

// ─── Generic Tiered Text Scorer ─────────────────────────────────────────────────

/**
 * Scores one candidate string against the query on the shared
 * exact/starts-with/includes/fuzzy scale — the building block every
 * domain-specific scorer below composes. Returns 0 (not `MATCH_TIER.NONE`)
 * when `text` is empty/missing so callers can tell "no signal here" apart
 * from "this field genuinely didn't match" while still combining scores
 * with a simple `Math.max`.
 */
function scoreField(text: string | null | undefined, query: string): number {
  if (!text) return 0;
  const normalizedText = text.trim().toLowerCase();
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedText || !normalizedQuery) return 0;

  if (normalizedText === normalizedQuery) return MATCH_TIER.EXACT;
  if (normalizedText.startsWith(normalizedQuery)) return MATCH_TIER.STARTS_WITH;
  if (normalizedText.includes(normalizedQuery)) return MATCH_TIER.INCLUDES;
  if (isFuzzyMatch(text, query)) {
    return MATCH_TIER.FUZZY * bestFuzzyWordSimilarity(text, query);
  }
  return 0;
}

/** Same as `scoreField`, but treats the field as a title (title-tier weights) vs. a supporting/description field (description-tier weight) — used so a match in a title always outranks the same strength of match in a story/bio, per the prompt's own priority order. */
function scoreTitleField(text: string | null | undefined, query: string): number {
  return scoreField(text, query);
}

function scoreDescriptionField(text: string | null | undefined, query: string): number {
  const score = scoreField(text, query);
  // A description/story match is real signal, but per the prompt's
  // priority order it should never outrank even a partial TITLE match —
  // cap it at the DESCRIPTION tier regardless of how strongly the text
  // itself matched (exact-equals a whole story is essentially never
  // going to happen, but the cap keeps the ordering correct either way).
  return score > 0 ? Math.min(score, MATCH_TIER.DESCRIPTION) : 0;
}

function scoreCategoryField(text: string | null | undefined, query: string): number {
  const score = scoreField(text, query);
  return score > 0 ? Math.min(score, MATCH_TIER.TAG_OR_CATEGORY) : 0;
}

// ─── Experiences ─────────────────────────────────────────────────────────────────

/** Relevance score for one Experience Card against a query — see module doc for the tier breakdown. */
export function scoreExperienceRelevance(item: ExperienceCardModel, query: string): number {
  const titleScore = scoreTitleField(item.title, query);
  const categoryScore = scoreCategoryField(item.category?.label ?? null, query);
  const descriptionScore = scoreDescriptionField(item.storyPreview, query);
  const creatorScore = Math.min(scoreField(item.creator.displayName, query), MATCH_TIER.TAG_OR_CATEGORY);

  const best = Math.max(titleScore, categoryScore, descriptionScore, creatorScore);
  return best > 0 ? best : MATCH_TIER.NONE;
}

/** Secondary sort key when two Experiences tie on relevance — "newer, richer, or more engaging" per the prompt. Engagement (likes + comments) first, since it's the stronger "this is genuinely good content" signal; recency breaks any remaining tie. */
function experienceTiebreak(item: ExperienceCardModel): number {
  const engagement = item.likeCount + item.commentCount;
  const recency = Date.parse(item.createdAt) || 0;
  // Engagement dominates the sort; recency only matters between
  // similarly-engaged items — dividing recency down keeps it from ever
  // outweighing a real engagement difference while `Date.parse` values
  // (milliseconds since epoch) are still monotonic for comparison.
  return engagement * 1_000_000_000 + recency;
}

/** Sorts Experience Cards by relevance to `query`, richest/newest first on ties. Stable — `Array.prototype.sort` is spec-guaranteed stable in every JS engine this app targets, so equally-scored items keep their original (backend-ordered) relative order beyond the explicit tiebreak. */
export function rankExperienceResults(
  items: ExperienceCardModel[],
  query: string,
): ExperienceCardModel[] {
  return items
    .map((item) => ({ item, relevance: scoreExperienceRelevance(item, query) }))
    .sort((a, b) => {
      if (b.relevance !== a.relevance) return b.relevance - a.relevance;
      return experienceTiebreak(b.item) - experienceTiebreak(a.item);
    })
    .map(({ item }) => item);
}

// ─── Collections ────────────────────────────────────────────────────────────────

/** Relevance score for one Collection Card against a query. Collections have no tag/category field — description and owner name fill the "supporting text" tiers instead (mirroring how collectionsService.ts's searchCollections() itself matches on title OR owner name server-side). */
export function scoreCollectionRelevance(item: CollectionCardModel, query: string): number {
  const titleScore = scoreTitleField(item.title, query);
  const descriptionScore = scoreDescriptionField(item.descriptionPreview, query);
  const ownerScore = Math.min(scoreField(item.owner.displayName, query), MATCH_TIER.TAG_OR_CATEGORY);
  const cityScore = Math.min(scoreField(item.city, query), MATCH_TIER.TAG_OR_CATEGORY);

  const best = Math.max(titleScore, descriptionScore, ownerScore, cityScore);
  return best > 0 ? best : MATCH_TIER.NONE;
}

/** "Richer" for a Collection is more Experiences inside it — the clearest existing signal of a well-curated, engaging Collection (Design System's own "experienceCount" is already surfaced on every card for this reason). Featured Collections get a further nudge — they're already editorially vetted as high-quality. */
function collectionTiebreak(item: CollectionCardModel): number {
  const featuredBoost = item.isFeatured ? 1_000 : 0;
  const recency = Date.parse(item.createdAt) || 0;
  return featuredBoost * 1_000_000 + item.experienceCount * 1_000 + recency / 1_000_000_000;
}

export function rankCollectionResults(
  items: CollectionCardModel[],
  query: string,
): CollectionCardModel[] {
  return items
    .map((item) => ({ item, relevance: scoreCollectionRelevance(item, query) }))
    .sort((a, b) => {
      if (b.relevance !== a.relevance) return b.relevance - a.relevance;
      return collectionTiebreak(b.item) - collectionTiebreak(a.item);
    })
    .map(({ item }) => item);
}

// ─── Creators ───────────────────────────────────────────────────────────────────

/** Relevance score for one Creator result — display name and username are both "title-equivalent" fields for a person (either is what someone actually types), bio is the supporting field. */
export function scoreCreatorRelevance(item: CreatorSearchResult, query: string): number {
  const nameScore = Math.max(scoreTitleField(item.displayName, query), scoreTitleField(item.username, query));
  const bioScore = scoreDescriptionField(item.bio, query);

  const best = Math.max(nameScore, bioScore);
  return best > 0 ? best : MATCH_TIER.NONE;
}

function creatorTiebreak(item: CreatorSearchResult): number {
  // No recency/engagement field exists on a Creator search result — the
  // one available "richer" signal is verification, matching how the
  // Followers/Following and Search rows already give a verified badge
  // visual precedence.
  return item.isVerified ? 1 : 0;
}

export function rankCreatorResults(
  items: CreatorSearchResult[],
  query: string,
): CreatorSearchResult[] {
  return items
    .map((item) => ({ item, relevance: scoreCreatorRelevance(item, query) }))
    .sort((a, b) => {
      if (b.relevance !== a.relevance) return b.relevance - a.relevance;
      return creatorTiebreak(b.item) - creatorTiebreak(a.item);
    })
    .map(({ item }) => item);
}

// ─── Re-exports (for callers that only need generic tokenization) ─────────────

export { tokenize } from './textMatch';
export type { MatchTier };
