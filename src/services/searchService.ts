/**
 * Stroll — Search Service
 * src/services/searchService.ts
 *
 * Sprint 7 Prompt 1 — Search Foundation. The prompt's own spec: "Create
 * a dedicated SearchService... expose methods for searching Experiences,
 * Collections, Creators... return one unified response object."
 *
 * This file does NOT talk to Supabase directly and does not become a
 * fourth "owner" of `experiences` / `collections` / `profiles` — each of
 * those tables already has exactly one owning service file (see each
 * file's own module doc), and duplicating their query logic here would
 * violate this codebase's "never duplicate repositories/query logic"
 * architecture rule. Instead, `searchAll()` is a thin orchestrator: it
 * calls each domain's own new search function in parallel, maps each
 * one's raw rows through that domain's own existing card-model mapper,
 * and merges the three into the single `SearchResults` object the
 * Search screen renders — the "unified response object" the prompt
 * describes is this composition step, not a new data-access layer.
 *
 * ── Per-section graceful degradation ──
 * A failure in one section (e.g. the Creators query erroring) does not
 * fail the whole search — each section is caught independently and
 * degrades to an empty array with a logged error, so a real problem in
 * one domain's query never blanks out results the other two sections
 * already have. This matches Design System §35's general error-handling
 * spirit ("the app should degrade gracefully") and this prompt's own
 * "Search should always feel responsive" requirement — a single flaky
 * section is a worse failure mode for a unified results screen than
 * silently showing fewer sections.
 *
 * ── Sprint 7 Prompt 2 — Smart Search & Discovery ──
 * `searchAll()` gains two steps after the three sections above already
 * resolve, both delegated to the new `features/search/` module so this
 * file stays the thin orchestrator its Prompt 1 doc describes rather
 * than growing its own ranking/matching logic inline:
 *   1. Rank each section by relevance (features/search/ranking) — the
 *      prompt's "Intelligent Ranking" requirement.
 *   2. For any section that came back with zero exact matches, fetch a
 *      small recommendation candidate pool using keyword-mapping's
 *      `expandSearchTerms()` (the prompt's "Similar Keyword Matching")
 *      plus, for multi-word queries, each individual significant word
 *      (`significantTokens()` — recovers from a whole phrase like "quiet
 *      cafés in lagos" matching nothing by retrying each word alone),
 *      then rank and cap that pool via `features/search/recommendations`.
 *      This ONLY fires extra queries when a section is actually empty —
 *      a query with strong exact matches costs exactly what Prompt 1's
 *      version already cost.
 */

import { logError, normalizeError, type StrollError } from '@/lib/errors';
import { searchExperiences } from '@/services/experiencesService';
import { searchCollections } from '@/services/collectionsService';
import { searchCreators } from '@/services/profileService';
import { toExperienceCardModel, type ExperienceCardModel } from '@/types/experience';
import { toCollectionCardModel, type CollectionCardModel } from '@/types/collection';
import { toCreatorSearchResult, type SearchResults, EMPTY_SEARCH_RESULTS } from '@/types/search';
import { uniqueBy } from '@/utils';
import {
  rankExperienceResults,
  rankCollectionResults,
  rankCreatorResults,
  expandSearchTerms,
  significantTokens,
  selectRecommendedExperiences,
  selectRecommendedCollections,
  RECOMMENDATION_LIMIT,
} from '@/features/search';

// ─── Result Type ───────────────────────────────────────────────────────────────

export type SearchServiceResult<T> = { ok: true; data: T } | { ok: false; error: StrollError };

// ─── Per-Domain Helpers (each independently degrades to []) ───────────────────

async function searchExperiencesSection(query: string, limit: number): Promise<ExperienceCardModel[]> {
  const result = await searchExperiences({ query, limit });
  if (!result.ok) {
    logError('searchService.experiences', result.error);
    return [];
  }
  return result.data
    .map(toExperienceCardModel)
    .filter((model): model is ExperienceCardModel => model !== null);
}

async function searchCollectionsSection(query: string, limit: number): Promise<CollectionCardModel[]> {
  const result = await searchCollections({ query, limit });
  if (!result.ok) {
    logError('searchService.collections', result.error);
    return [];
  }
  return result.data
    .map(toCollectionCardModel)
    .filter((model): model is CollectionCardModel => model !== null);
}

async function searchCreatorsSection(
  query: string,
  limit: number,
  excludeUserId: string | undefined,
) {
  const result = await searchCreators({ query, limit, excludeUserId });
  if (!result.ok) {
    logError('searchService.creators', result.error);
    return [];
  }
  return result.data.map(toCreatorSearchResult);
}

// ─── Unified Search ─────────────────────────────────────────────────────────────

export interface SearchAllParams {
  query: string;
  /** The signed-in user's id, if any — excluded from the Creators section so a user never finds themself in their own search results (see profileService.ts's searchCreators doc). */
  excludeUserId?: string;
  /** Applied per-section (Experiences / Collections / Creators each get up to this many), not to the combined total. */
  limit?: number;
}

/**
 * Search terms to additionally query when a section needs recommendation
 * candidates — keyword-mapping's related terms first, then (for
 * multi-word queries only) each individual significant word, deduped
 * case-insensitively and capped so a thin/no-match query never fans out
 * into an unbounded number of extra requests.
 */
const MAX_RECOMMENDATION_TERMS = 5;

function recommendationSearchTerms(query: string): string[] {
  const expanded = expandSearchTerms(query);

  const tokens = significantTokens(query);
  // A single-word query's only token IS the query itself — tokenizing it
  // again would just re-search the exact term that already found nothing.
  const tokenFallback = tokens.length > 1 ? tokens : [];

  return uniqueBy([...expanded, ...tokenFallback], (term) => term.toLowerCase()).slice(
    0,
    MAX_RECOMMENDATION_TERMS,
  );
}

/** Fetches and merges recommendation candidates across every related search term, in parallel — one combined pool `selectRecommendedExperiences`/`selectRecommendedCollections` then rank and cap. Returns empty arrays immediately (no requests fired) when there are no related terms for this query. */
async function fetchRecommendationCandidates(
  terms: string[],
  limit: number,
): Promise<{ experiences: ExperienceCardModel[]; collections: CollectionCardModel[] }> {
  if (terms.length === 0) return { experiences: [], collections: [] };

  const results = await Promise.all(
    terms.map((term) =>
      Promise.all([searchExperiencesSection(term, limit), searchCollectionsSection(term, limit)]),
    ),
  );

  return {
    experiences: uniqueBy(results.flatMap(([experiences]) => experiences), (item) => item.id),
    collections: uniqueBy(results.flatMap(([, collections]) => collections), (item) => item.id),
  };
}

/**
 * Runs all three domain searches in parallel and returns one combined
 * `SearchResults` object — Experiences, Collections, and Creators, in
 * that order (the prompt's own required section order; useSearch.ts and
 * search.tsx render them in this same order without re-deriving it),
 * each ranked by relevance to `query`. When Experiences and/or
 * Collections come back with no exact matches, also populates the
 * matching `recommended*` field from a keyword-expanded candidate pool
 * (see module doc).
 *
 * Always resolves `ok: true` — a section-level failure degrades to an
 * empty array for that section rather than failing the whole call (see
 * module doc's "Per-section graceful degradation"). The `ok: false`
 * branch exists for symmetry with every other service in this codebase
 * (and so a genuinely unexpected throw here still surfaces through the
 * same StrollError shape everything else does), not because a normal
 * section failure ever takes it.
 */
export async function searchAll(params: SearchAllParams): Promise<SearchServiceResult<SearchResults>> {
  const query = params.query.trim();
  if (!query) return { ok: true, data: EMPTY_SEARCH_RESULTS };

  const limit = params.limit ?? 10;

  try {
    const [rawExperiences, rawCollections, rawCreators] = await Promise.all([
      searchExperiencesSection(query, limit),
      searchCollectionsSection(query, limit),
      searchCreatorsSection(query, limit, params.excludeUserId),
    ]);

    const experiences = rankExperienceResults(rawExperiences, query);
    const collections = rankCollectionResults(rawCollections, query);
    const creators = rankCreatorResults(rawCreators, query);

    const needsExperienceRecommendations = experiences.length === 0;
    const needsCollectionRecommendations = collections.length === 0;

    let recommendedExperiences: ExperienceCardModel[] = [];
    let recommendedCollections: CollectionCardModel[] = [];

    if (needsExperienceRecommendations || needsCollectionRecommendations) {
      const terms = recommendationSearchTerms(query);
      const candidates = await fetchRecommendationCandidates(terms, limit);

      if (needsExperienceRecommendations) {
        recommendedExperiences = selectRecommendedExperiences(
          candidates.experiences,
          new Set(experiences.map((item) => item.id)),
          query,
          RECOMMENDATION_LIMIT,
        );
      }
      if (needsCollectionRecommendations) {
        recommendedCollections = selectRecommendedCollections(
          candidates.collections,
          new Set(collections.map((item) => item.id)),
          query,
          RECOMMENDATION_LIMIT,
        );
      }
    }

    return {
      ok: true,
      data: { experiences, collections, creators, recommendedExperiences, recommendedCollections },
    };
  } catch (err) {
    // Shouldn't be reachable — every awaited call above already catches
    // and degrades internally — but kept for the same reason every other
    // service's try/catch exists: an unexpected throw still returns a
    // StrollError instead of crashing the screen.
    return { ok: false, error: normalizeError(err) };
  }
}
