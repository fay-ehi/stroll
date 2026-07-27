/**
 * Stroll — Keyword Mapping
 * src/features/search/keyword-mapping/keywordMap.ts
 *
 * Sprint 7 Prompt 2 — Smart Search & Discovery, "Similar Keyword
 * Matching": "Support closely related searches... These mappings should
 * be configurable rather than hardcoded throughout the codebase. Create
 * a reusable keyword mapping system."
 *
 * `KEYWORD_MAP` is that one configuration point — every other file in
 * this feature (searchService.ts's recommendation fallback, suggestion
 * vocabulary, ranking) reads related terms through `expandSearchTerms()`
 * below rather than each hardcoding its own synonym list.
 *
 * Concepts are drawn from two places:
 *   1. The prompt's own worked examples (romantic, coffee, brunch,
 *      beach, work café) — reproduced faithfully so the sprint's
 *      acceptance criteria pass exactly as specified.
 *   2. This app's REAL existing vocabulary — `GOOD_FOR_TAGS`,
 *      `VIBE_TAGS` (constants/app.ts) and `PLACE_CATEGORIES`
 *      (constants/places.ts), the same tag/category values
 *      experiencesService.ts's searchExperiences() already matches
 *      against server-side. Anchoring related terms to real,
 *      queryable tag/category labels (not just prose synonyms) means
 *      an expanded search term stands a real chance of finding actual
 *      rows, not just looking plausible in a demo.
 *
 * Every key and value is lowercase — `expandSearchTerms()` normalizes
 * the incoming query the same way, so lookups are case-insensitive
 * without scattering `.toLowerCase()` calls through every caller.
 */

import { tokenize, bestFuzzyWordSimilarity } from '../ranking/textMatch';

// ─── Configuration ──────────────────────────────────────────────────────────────
// Each key maps to related search terms a person might not think to type
// themselves but would recognize as "yes, that's what I meant". Deliberately
// NOT exhaustive — this is product-curated discovery vocabulary, not a
// thesaurus; entries are added because they surface genuinely related
// content, not to maximize coverage.

export const KEYWORD_MAP: Record<string, readonly string[]> = {
  // ── Prompt's own worked examples ──
  cafe: ['coffee shop', 'espresso', 'latte', 'cafeteria'],
  café: ['coffee shop', 'espresso', 'latte', 'cafeteria'],
  coffee: ['café', 'espresso', 'latte', 'coffee shop'],
  romantic: ['date night', 'couples', 'anniversary', 'rooftop dinner', 'date spot'],
  brunch: ['breakfast', 'morning coffee', 'weekend café'],
  beach: ['ocean', 'resort', 'waterfront'],
  'work café': ['study spot', 'laptop friendly', 'quiet coffee', 'remote work friendly'],
  'work cafe': ['study spot', 'laptop friendly', 'quiet coffee', 'remote work friendly'],

  // ── Extended, grounded in GOOD_FOR_TAGS / VIBE_TAGS / PLACE_CATEGORIES ──
  'date night': ['romantic', 'couples', 'anniversary', 'rooftop dinner', 'date spot'],
  couples: ['romantic', 'date night', 'date spot'],
  anniversary: ['romantic', 'date night', 'rooftop dinner'],
  study: ['study spot', 'quiet', 'laptop friendly', 'remote workers', 'students'],
  'study spot': ['quiet', 'remote work friendly', 'laptop friendly', 'students'],
  quiet: ['study spot', 'remote work friendly', 'work café'],
  remote: ['remote workers', 'remote work friendly', 'study spot', 'laptop friendly'],
  family: ['families', 'family friendly', 'kids'],
  kids: ['family friendly', 'families'],
  budget: ['budget friendly', 'affordable', 'cheap eats'],
  cheap: ['budget friendly', 'affordable'],
  luxury: ['upscale', 'fine dining', 'high end'],
  upscale: ['luxury', 'fine dining'],
  'hidden gem': ['underrated', 'off the beaten path', 'lesser known'],
  underrated: ['hidden gem', 'off the beaten path'],
  nightlife: ['bars', 'late night', 'lively', 'club'],
  party: ['nightlife', 'lively', 'late night', 'group event'],
  club: ['nightlife', 'late night', 'lively'],
  group: ['friends', 'great for groups', 'group event'],
  friends: ['great for groups', 'group event', 'group'],
  solo: ['quiet', 'remote workers'],
  shopping: ['mall', 'boutique', 'market'],
  museum: ['art', 'culture', 'gallery', 'attractions'],
  art: ['museum', 'gallery', 'culture'],
  park: ['outdoor', 'nature', 'green space'],
  outdoor: ['park', 'nature', 'beach'],
  hotel: ['stay', 'accommodation', 'resort'],
  instagrammable: ['photogenic', 'scenic', 'aesthetic'],
  cozy: ['quiet', 'intimate', 'hidden gem'],
  business: ['business meetings', 'work', 'professional'],
  dinner: ['restaurant', 'rooftop dinner', 'fine dining'],
  breakfast: ['brunch', 'morning coffee'],
  late: ['late night', 'nightlife'],
};

// ─── Query Expansion ────────────────────────────────────────────────────────────

/** How many extra search terms `expandSearchTerms()` will return at most — bounds the number of supplemental Supabase round trips searchService.ts fires per query (see that file's recommendation-fetch step). */
const MAX_EXPANDED_TERMS = 4;

/** Every key AND value in KEYWORD_MAP, flattened once at module load — the pool `fuzzyRelatedTerms()` scans for a typo-tolerant match when there's no exact hit. */
const VOCABULARY_TERMS: readonly string[] = Array.from(
  new Set([...Object.keys(KEYWORD_MAP), ...Object.values(KEYWORD_MAP).flat()]),
);

/** Direct + reverse lookup for one already-normalized term: its own mapped values, PLUS — if it appears as a value somewhere — that entry's key and sibling values. `getRelatedKeywords('date night')` therefore also surfaces 'romantic' (the entry it's a value of) even though 'date night' isn't itself a key everywhere it's used. */
function relatedTermsForSingleWordOrPhrase(term: string): string[] {
  const related = new Set<string>();

  const direct = KEYWORD_MAP[term];
  if (direct) {
    for (const value of direct) related.add(value);
  }

  for (const [key, values] of Object.entries(KEYWORD_MAP)) {
    if (values.includes(term)) {
      if (key !== term) related.add(key);
      for (const sibling of values) {
        if (sibling !== term) related.add(sibling);
      }
    }
  }

  related.delete(term);
  return Array.from(related);
}

/** Typo-tolerant fallback: if `term` doesn't literally appear anywhere in KEYWORD_MAP, find the closest vocabulary term (e.g. "romatic" → "romantic") and return ITS related terms instead of nothing. */
function fuzzyRelatedTerms(term: string): string[] {
  let bestTerm: string | null = null;
  let bestScore = 0;

  for (const candidate of VOCABULARY_TERMS) {
    const score = bestFuzzyWordSimilarity(candidate, term);
    if (score > bestScore) {
      bestScore = score;
      bestTerm = candidate;
    }
  }

  // 0.75 is stricter than textMatch's own general-purpose fuzzy threshold
  // (0.6) — this fallback silently substitutes a DIFFERENT word than what
  // was typed, so it should only fire on a near-miss (a genuine typo),
  // not a loosely-related word that happens to share some letters.
  if (!bestTerm || bestScore < 0.75) return [];
  return [bestTerm, ...relatedTermsForSingleWordOrPhrase(bestTerm)];
}

/**
 * Expands a raw search query into up to `MAX_EXPANDED_TERMS` related
 * search terms — the terms searchService.ts additionally searches for
 * when the literal query returns few/no results (see that file's
 * "Recommended Experiences/Collections" step). Tries, in order:
 *   1. The whole trimmed query as a phrase key/value (catches multi-word
 *      entries like "work café").
 *   2. Each individual word, tokenized (catches "romantic dinner ideas"
 *      via its "romantic" token even though the whole phrase isn't a key).
 *   3. A fuzzy fallback per token, for typo tolerance.
 * Always excludes the original query itself and de-dupes case-insensitively.
 */
export function expandSearchTerms(query: string, maxTerms: number = MAX_EXPANDED_TERMS): string[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return [];

  const expanded = new Set<string>();

  const wholePhraseMatches = relatedTermsForSingleWordOrPhrase(normalizedQuery);
  for (const term of wholePhraseMatches) expanded.add(term);

  const tokens = tokenize(normalizedQuery);
  for (const token of tokens) {
    for (const term of relatedTermsForSingleWordOrPhrase(token)) expanded.add(term);
  }

  if (expanded.size === 0) {
    for (const term of fuzzyRelatedTerms(normalizedQuery)) expanded.add(term);
  }

  expanded.delete(normalizedQuery);
  return Array.from(expanded)
    .filter((term) => term !== normalizedQuery)
    .slice(0, maxTerms);
}

/** Every individually significant word in the query (stopwords/short tokens dropped) — used as a last-resort recall-broadening fallback (see recommendations/selectRecommendations.ts) for multi-word queries KEYWORD_MAP has no direct concept for, e.g. "quiet cafés in lagos" → ["quiet", "cafés", "lagos"], each searched individually. */
export function significantTokens(query: string): string[] {
  return tokenize(query).filter((token) => token.length >= 3);
}
