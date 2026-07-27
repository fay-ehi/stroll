/**
 * Stroll — Search Intelligence Shared Types
 * src/features/search/types.ts
 *
 * Sprint 7 Prompt 2 — Smart Search & Discovery. Shared, dependency-free
 * types used across this feature's four isolated concerns (ranking,
 * highlighting, keyword-mapping, recommendations — see this folder's
 * other subdirectories). Kept in one small file rather than duplicated
 * per-module, the same "don't duplicate types" rule the rest of this
 * codebase already follows.
 *
 * Nothing here talks to Supabase, React, or React Native — every type
 * below describes a pure data shape only, so every module in this
 * feature stays independently unit-testable (this prompt's own
 * "Keep logic modular and testable" rule).
 */

/** One segment of a piece of text after splitting it around a search match — see highlighting/highlightMatch.ts. */
export interface HighlightSegment {
  text: string;
  isMatch: boolean;
}

/**
 * A single "did this candidate match, and how strongly" tier — shared by
 * every domain's relevance scorer (ranking/relevance.ts) so Experiences,
 * Collections, and Creators all rank on the same scale and combine
 * predictably. Mirrors the prompt's own suggested priority order:
 * exact title > partial title > tag > description > category, with two
 * extra tiers this codebase's actual data needs: FUZZY (typo-tolerant,
 * below any literal-substring tier) and NONE (still worth showing —
 * the row already passed the backend's own query — just ranked last).
 */
export const MATCH_TIER = {
  EXACT: 100,
  STARTS_WITH: 82,
  INCLUDES: 66,
  TAG_OR_CATEGORY: 50,
  DESCRIPTION: 34,
  FUZZY: 18,
  NONE: 4,
} as const;

export type MatchTier = (typeof MATCH_TIER)[keyof typeof MATCH_TIER];

/** A single suggestion chip shown beneath the search input while the user is still typing — see keyword-mapping/suggestionVocabulary.ts. */
export interface SearchSuggestion {
  /** The exact text a tap replaces the query with and searches for. */
  term: string;
  /** Where this suggestion came from — lets the UI/analytics distinguish "you typed this before" from "here's something related", without changing how a tap behaves. */
  source: 'recent' | 'vocabulary';
}
