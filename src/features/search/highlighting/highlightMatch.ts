/**
 * Stroll — Search Highlighting
 * src/features/search/highlighting/highlightMatch.ts
 *
 * Sprint 7 Prompt 2 — Smart Search & Discovery, "Keyword Highlighting":
 * "Highlight the matching text inside results... The matching portion
 * should be visually emphasized while respecting the Design System. Do
 * not overuse highlighting."
 *
 * Deliberately highlights ONLY a literal (case-insensitive) substring
 * match of the query itself — not fuzzy matches, not expanded/related
 * keywords. Highlighting a word the user didn't actually type (e.g.
 * bolding "Café" inside a "coffee" search result, which only matched via
 * keyword-mapping) would look like a bug, not a feature — "the matching
 * portion" in the prompt's own example ("Coffee" → "Best **Coffee**
 * Dates in Lagos") is unambiguous about this. That restraint is also
 * the "Do not overuse highlighting" instruction in practice: one exact
 * phrase, wherever it literally appears, and nothing else.
 *
 * Pure string function — no React import here at all — so it stays
 * trivially unit-testable and reusable from any renderer. See
 * src/components/search/HighlightedText.tsx for the React Native
 * presentation built on top of it.
 */

import type { HighlightSegment } from '../types';

/** Escapes RegExp special characters so a query typed by a user (which may contain them, e.g. "3.5", "AT&T") is always treated as literal text, never as a pattern. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Splits `text` into segments around every case-insensitive occurrence
 * of `query`. Returns the whole text as one non-matching segment when
 * `query` is empty/whitespace-only or doesn't appear in `text` at all —
 * callers (HighlightedText) render that case as plain, unstyled text.
 */
export function getHighlightSegments(text: string, query: string): HighlightSegment[] {
  const trimmedQuery = query.trim();
  if (!trimmedQuery || !text) {
    return [{ text, isMatch: false }];
  }

  const pattern = new RegExp(`(${escapeRegExp(trimmedQuery)})`, 'gi');
  const parts = text.split(pattern);

  // String.split with a capturing group interleaves the captured
  // delimiters into the result array, so every ODD index is a match and
  // every EVEN index is the text between matches — no separate regex
  // exec loop needed. isMatch is derived from each part's index BEFORE
  // dropping empty parts (adjacent matches, or a match at the very start
  // of the string, produce empty '' entries) — filtering first would
  // shift later indices and silently mislabel real matches as plain text.
  const segments: HighlightSegment[] = parts
    .map((part, index) => ({ text: part, isMatch: index % 2 === 1 }))
    .filter((segment) => segment.text.length > 0);

  return segments.length > 0 ? segments : [{ text, isMatch: false }];
}

/** True if `text` contains `query` anywhere, case-insensitive — a cheap check for "should this item's UI even attempt highlighting" without building the full segment array. */
export function hasHighlightMatch(text: string, query: string): boolean {
  const trimmedQuery = query.trim().toLowerCase();
  if (!trimmedQuery) return false;
  return text.toLowerCase().includes(trimmedQuery);
}
