/**
 * Stroll — Suggestion Vocabulary
 * src/features/search/keyword-mapping/suggestionVocabulary.ts
 *
 * Sprint 7 Prompt 2 — Smart Search & Discovery, "Suggested Searches":
 * "When the user begins typing, display helpful suggestions beneath the
 * search input... Suggestions may come from: Previous searches, Existing
 * collection titles, Existing experience titles, Common tags, Related
 * keywords."
 *
 * ── Why this reads local vocabulary, not a live titles query ──
 * The prompt's own worked example — typing "caf" suggests "Cafés",
 * "Coffee Dates", "Study Spots", "Brunch" — is discovery-phrase
 * vocabulary, not literal experience/collection titles from this
 * install's data (a fresh database has no "Coffee Dates"-titled
 * anything). A live per-keystroke titles query would also mean firing a
 * network request on every character typed, in addition to (not instead
 * of) the debounced full search useSearch.ts already runs once typing
 * settles — real cost for a typeahead list that's meant to feel instant.
 * `SUGGESTION_VOCABULARY` below instead draws from this app's own real,
 * already-in-memory tag/category constants (GOOD_FOR_TAGS, VIBE_TAGS,
 * PLACE_CATEGORIES — the "Common tags" source the prompt names) plus
 * keyword-mapping's curated concepts (the "Related keywords" source),
 * scored purely client-side. "Existing collection/experience titles" is
 * satisfied differently: once the debounced query is long enough to
 * search for real, its own top title matches ARE the results list
 * itself — a person doesn't need a second, separate title-suggestion
 * list once real results are already on screen.
 */

import { GOOD_FOR_TAGS, VIBE_TAGS } from '@/constants/app';
import { PLACE_CATEGORIES } from '@/constants/places';
import { KEYWORD_MAP } from './keywordMap';
import { bestFuzzyWordSimilarity } from '../ranking/textMatch';
import type { RecentSearchEntry } from '@/lib/recentSearches';
import type { SearchSuggestion } from '../types';

// ─── Vocabulary ─────────────────────────────────────────────────────────────────

function titleCase(term: string): string {
  return term
    .split(' ')
    .map((word) => (word.length > 0 ? word[0]!.toUpperCase() + word.slice(1) : word))
    .join(' ');
}

// A few product-curated discovery phrases beyond the raw tag/category
// vocabulary — the prompt's own "caf" example expects "Coffee Dates" and
// "Study Spots" specifically, which read as intentional phrasing rather
// than a bare tag label like "Cafés" alone would.
const CURATED_SUGGESTION_PHRASES: readonly string[] = [
  'Coffee Dates',
  'Study Spots',
  'Weekend Café',
  'Rooftop Dinner',
  'Hidden Gems',
  'Morning Coffee',
  'Laptop Friendly',
  'Date Night',
  'Group Hangouts',
];

const SUGGESTION_VOCABULARY: readonly string[] = Array.from(
  new Set([
    ...PLACE_CATEGORIES.map((category) => category.label),
    ...GOOD_FOR_TAGS,
    ...VIBE_TAGS,
    ...Object.keys(KEYWORD_MAP).map(titleCase),
    ...Object.values(KEYWORD_MAP).flatMap((values) => values.map(titleCase)),
    ...CURATED_SUGGESTION_PHRASES,
  ]),
);

// ─── Matching ───────────────────────────────────────────────────────────────────

const FUZZY_SUGGESTION_THRESHOLD = 0.7;

function vocabularyMatches(input: string, limit: number): string[] {
  const normalizedInput = input.trim().toLowerCase();
  if (!normalizedInput) return [];

  const scored = SUGGESTION_VOCABULARY.map((term) => {
    const normalizedTerm = term.toLowerCase();
    let score = 0;
    if (normalizedTerm.startsWith(normalizedInput)) score = 3;
    else if (normalizedTerm.includes(normalizedInput)) score = 2;
    else if (bestFuzzyWordSimilarity(term, normalizedInput) >= FUZZY_SUGGESTION_THRESHOLD) score = 1;
    return { term, score };
  }).filter((entry) => entry.score > 0);

  scored.sort((a, b) => b.score - a.score || a.term.localeCompare(b.term));
  return scored.slice(0, limit).map((entry) => entry.term);
}

function recentMatches(input: string, recent: RecentSearchEntry[], limit: number): string[] {
  const normalizedInput = input.trim().toLowerCase();
  if (!normalizedInput) return [];

  return recent
    .map((entry) => entry.query)
    .filter((query) => query.toLowerCase() !== normalizedInput && query.toLowerCase().includes(normalizedInput))
    .slice(0, limit);
}

/** Default cap on how many chips render beneath the search input — kept small so the typeahead list stays scannable at a glance (Design System §28: chips are for "quick selections", not a long scrollable list). */
const DEFAULT_SUGGESTION_LIMIT = 6;

/**
 * Builds the Suggested Searches list shown beneath the input while the
 * user is mid-typing. Previous searches are listed first (the prompt's
 * own source ordering: "Previous searches" comes before the rest), then
 * vocabulary matches fill any remaining slots. Returns `[]` for an empty
 * input — nothing to suggest against yet (the screen shows Recent
 * Searches / the inspiration empty state instead; see search.tsx).
 */
export function getSuggestedSearches(
  input: string,
  recent: RecentSearchEntry[],
  limit: number = DEFAULT_SUGGESTION_LIMIT,
): SearchSuggestion[] {
  if (!input.trim()) return [];

  const fromRecent = recentMatches(input, recent, limit);
  const remaining = Math.max(0, limit - fromRecent.length);
  const fromVocabulary = vocabularyMatches(input, remaining + fromRecent.length)
    // Drop any vocabulary term already covered by a recent-search match,
    // case-insensitively, so the same term never renders as two chips.
    .filter((term) => !fromRecent.some((r) => r.toLowerCase() === term.toLowerCase()))
    .slice(0, remaining);

  return [
    ...fromRecent.map((term): SearchSuggestion => ({ term, source: 'recent' })),
    ...fromVocabulary.map((term): SearchSuggestion => ({ term, source: 'vocabulary' })),
  ];
}
