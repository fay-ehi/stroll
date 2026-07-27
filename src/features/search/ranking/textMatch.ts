/**
 * Stroll — Search Ranking: Text Matching Primitives
 * src/features/search/ranking/textMatch.ts
 *
 * Sprint 7 Prompt 2 — Smart Search & Discovery. The one place this
 * feature computes "how similar is this text to that query" — every
 * other module in `features/search/` (relevance scoring, suggestion
 * vocabulary matching, recommendation candidate selection) builds on
 * top of these primitives rather than each rolling its own string
 * comparison, per this prompt's own "Create a reusable... system" /
 * "Keep logic modular" rules.
 *
 * No new dependency (a fuzzy-search library, e.g. Fuse.js, isn't in
 * package.json and this prompt's own rules say "Do not introduce new
 * dependencies unless absolutely necessary") — a query this small (a
 * search box's in-progress text, a card's title) doesn't need one.
 * Everything below is a few dozen lines of plain, testable TypeScript.
 */

// ─── Levenshtein Distance ───────────────────────────────────────────────────────

/**
 * Classic edit distance (insertions/deletions/substitutions) between two
 * strings, case-insensitive. Single-row rolling array — O(n×m) time,
 * O(min(n,m)) space, which is more than fast enough for the short
 * strings (search queries, card titles, tag labels) this feature ever
 * compares.
 */
export function levenshteinDistance(a: string, b: string): number {
  const s = a.toLowerCase();
  const t = b.toLowerCase();

  if (s === t) return 0;
  if (s.length === 0) return t.length;
  if (t.length === 0) return s.length;

  let previousRow = Array.from({ length: t.length + 1 }, (_, i) => i);

  for (let i = 1; i <= s.length; i++) {
    const currentRow = [i];
    for (let j = 1; j <= t.length; j++) {
      const substitutionCost = s[i - 1] === t[j - 1] ? 0 : 1;
      currentRow.push(
        Math.min(
          (currentRow[j - 1] ?? 0) + 1, // insertion
          (previousRow[j] ?? 0) + 1, // deletion
          (previousRow[j - 1] ?? 0) + substitutionCost, // substitution
        ),
      );
    }
    previousRow = currentRow;
  }

  return previousRow[t.length] ?? Math.max(s.length, t.length);
}

/**
 * Normalized similarity between two single words, 0 (nothing alike) to 1
 * (identical, case-insensitive). Divides by the longer string's length so
 * short words aren't unfairly punished for a single-character typo.
 */
export function wordSimilarity(a: string, b: string): number {
  const longest = Math.max(a.length, b.length);
  if (longest === 0) return 1;
  return 1 - levenshteinDistance(a, b) / longest;
}

// ─── Tokenization ───────────────────────────────────────────────────────────────

/** A small, deliberately short stopword list — just enough to keep multi-word fallback search (see recommendations/selectRecommendations.ts) from wasting a lookup on a word that carries no search meaning of its own. Not a general NLP stopword list. */
const STOPWORDS = new Set(['a', 'an', 'the', 'in', 'on', 'at', 'for', 'of', 'and', 'or', 'to', 'with']);

/** Lowercases and splits on anything that isn't a letter/number, dropping empty tokens and stopwords. `"Quiet Cafés in Lagos"` → `["quiet", "cafés", "lagos"]`. */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length > 0 && !STOPWORDS.has(token));
}

// ─── Fuzzy Match ────────────────────────────────────────────────────────────────

/** Below this similarity, two words are considered unrelated — chosen loosely (not a tuned ML threshold) so a 1–2 character typo on a short word ("caf" vs "cafe") still counts, but genuinely different words don't. */
const FUZZY_SIMILARITY_THRESHOLD = 0.6;

/**
 * Best fuzzy similarity between `query` and any single word inside
 * `text`, 0–1. Token-based rather than a whole-string comparison — a
 * whole-string edit distance between "coffee" and "Best Coffee Dates in
 * Lagos" is dominated by the words that DON'T match, which is exactly
 * backwards for a search query that's usually just one concept buried
 * inside a longer title or story.
 */
export function bestFuzzyWordSimilarity(text: string, query: string): number {
  const queryToken = query.trim().toLowerCase();
  if (!queryToken) return 0;

  const textTokens = tokenize(text);
  if (textTokens.length === 0) return 0;

  let best = 0;
  for (const token of textTokens) {
    // A literal substring hit (either direction) is a full-strength fuzzy
    // match — this lets a short, prefix-style query like "caf" register
    // as strongly related to "café" without needing a lenient edit-distance
    // threshold that would also start matching unrelated short words.
    if (token.includes(queryToken) || queryToken.includes(token)) {
      best = 1;
      break;
    }
    const similarity = wordSimilarity(token, queryToken);
    if (similarity > best) best = similarity;
  }
  return best;
}

/** Whether `text` fuzzy-matches `query` closely enough to count as related at all (see FUZZY_SIMILARITY_THRESHOLD). */
export function isFuzzyMatch(text: string, query: string): boolean {
  return bestFuzzyWordSimilarity(text, query) >= FUZZY_SIMILARITY_THRESHOLD;
}
