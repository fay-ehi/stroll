/**
 * Stroll — Search Recommendations
 * src/features/search/recommendations/selectRecommendations.ts
 *
 * Sprint 7 Prompt 2 — Smart Search & Discovery, "Recommended Collections"
 * / "Recommended Experiences": "When no exact collection/experience
 * exists, recommend similar [ones]... Recommendations should feel
 * intentional [and] encourage exploration rather than simply filling
 * space."
 *
 * This module is deliberately data-only — it selects and orders a
 * recommendation list from a candidate pool searchService.ts already
 * fetched (via keyword-mapping's expanded/related search terms — see
 * that file's own "Recommendation Candidates" step); it never queries
 * Supabase itself. That split keeps "how do we find MORE rows" (a
 * service-layer, network concern) separate from "which of those rows
 * are actually worth recommending, and in what order" (a pure, unit-
 * testable decision this file owns) — the same reasoning ranking/ and
 * highlighting/ already follow for staying UI/network-free.
 */

import { rankExperienceResults, rankCollectionResults } from '../ranking/relevance';
import type { ExperienceCardModel } from '@/types/experience';
import type { CollectionCardModel } from '@/types/collection';

/** How many recommended items to show per section — small and curated (the prompt's own "feel intentional", not "fill space"), one row shorter than a normal SEARCH_LIMITS.RESULTS_PER_SECTION result set. */
export const RECOMMENDATION_LIMIT = 6;

/**
 * Picks and orders the "you might like" Experiences shown when the
 * literal query returned none. `candidates` is the deduped pool
 * searchService.ts already fetched via related/expanded terms;
 * `alreadyShownIds` excludes anything already visible elsewhere on the
 * screen (defensive — in practice the literal-query section is empty
 * whenever this runs, but a future caller passing a non-empty primary
 * section should never see the same card twice).
 */
export function selectRecommendedExperiences(
  candidates: ExperienceCardModel[],
  alreadyShownIds: ReadonlySet<string>,
  query: string,
  limit: number = RECOMMENDATION_LIMIT,
): ExperienceCardModel[] {
  const eligible = candidates.filter((item) => !alreadyShownIds.has(item.id));
  return rankExperienceResults(eligible, query).slice(0, limit);
}

/** Same as `selectRecommendedExperiences`, for Collections. */
export function selectRecommendedCollections(
  candidates: CollectionCardModel[],
  alreadyShownIds: ReadonlySet<string>,
  query: string,
  limit: number = RECOMMENDATION_LIMIT,
): CollectionCardModel[] {
  const eligible = candidates.filter((item) => !alreadyShownIds.has(item.id));
  return rankCollectionResults(eligible, query).slice(0, limit);
}
