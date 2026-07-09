/**
 * Stroll — Personalization
 * src/lib/personalization.ts
 *
 * Requirement #1 (Personalized Feed) + #9 ("Keep personalization isolated
 * from UI components"): pure functions, no React, no Supabase, no
 * TanStack Query — this file only knows how to score and reorder a list
 * of `ExperienceCardModel`s it's handed. Every call site (currently just
 * `useInfiniteDiscoverFeed` in useDiscoverFeed.ts) is responsible for
 * gathering the context (interests, recent categories) and handing back
 * the result; this module never fetches anything itself.
 *
 * ── "Server-friendly and easy to replace with a more advanced algorithm
 *    later" ──
 * City (a hard filter) and sort/newest-vs-trending (the primary order)
 * are still resolved entirely server-side, exactly as before — this
 * module never touches either. It only RE-ORDERS *within* one already-
 * fetched page, as a thin personalization layer on top. That's
 * deliberate: it means
 *   (a) cursor pagination stays correct — reordering inside a page never
 *       changes which rows the next page's cursor points to, since the
 *       cursor is derived server-side, before this function ever runs.
 *   (b) replacing this with a real algorithm later (a Postgres function,
 *       a recommendation service, an ML ranker) only ever means changing
 *       what `scoreExperience()` returns, or swapping the one call site
 *       in useInfiniteDiscoverFeed for a server-computed order and
 *       deleting this file — no UI component, hook signature, or query
 *       key needs to change either way.
 *
 * ── Scoring ──
 * A small, fully-explainable weighted sum, not a black box:
 *   +INTEREST_MATCH_WEIGHT   if the card's category is one of the user's
 *                            onboarding interests (constants/onboarding.ts
 *                            INTEREST_CATEGORIES and constants/places.ts
 *                            PLACE_CATEGORIES deliberately share the same
 *                            `id`s for their overlapping categories — see
 *                            places.ts's own doc comment — so this is a
 *                            direct id comparison, no translation table).
 *   +RECENT_CATEGORY_WEIGHT  if the card's category is among the
 *                            categories the user has recently viewed
 *                            experiences in (src/lib/recentlyViewed.ts).
 *   +FEATURED_WEIGHT         small nudge for editorially featured content.
 * Ties (including "no signal at all" — every weight is 0) preserve the
 * server's original order via a stable sort, so personalization can only
 * ever promote relevant content, never scramble an otherwise-sensible
 * chronological/trending order into something unpredictable.
 */

import type { ExperienceCardModel } from '@/types/experience';
import type { PlaceCategoryId } from '@/constants/places';

const INTEREST_MATCH_WEIGHT = 3;
const RECENT_CATEGORY_WEIGHT = 2;
const FEATURED_WEIGHT = 1;

export interface PersonalizationContext {
  /** Raw `profile.interests` — a mix of ids that overlap PlaceCategoryId and ones that don't (see module doc). Non-overlapping ids simply never match anything, harmlessly. */
  interests: string[];
  /** From `getFrequentCategories()` (recentlyViewed.ts) — empty until the user has viewed a few experiences. */
  recentCategoryIds: PlaceCategoryId[];
}

/**
 * Scores one card. Exported on its own (not just the list-sorting
 * function below) so a future screen — or a unit test — can score a
 * single card without needing a whole list.
 */
export function scoreExperience(
  card: ExperienceCardModel,
  context: PersonalizationContext,
): number {
  let score = 0;

  const categoryId = card.category?.id;
  if (categoryId) {
    if (context.interests.includes(categoryId)) score += INTEREST_MATCH_WEIGHT;
    if (context.recentCategoryIds.includes(categoryId)) score += RECENT_CATEGORY_WEIGHT;
  }

  if (card.featured) score += FEATURED_WEIGHT;

  return score;
}

/**
 * Stable-sorts `cards` by `scoreExperience()`, highest first. Stability
 * matters here specifically — `Array.prototype.sort` in every JS engine
 * Stroll targets (Hermes, JSC, V8) is already stable per the ES2019 spec,
 * so equal-score cards keep the server's original relative order without
 * any extra bookkeeping.
 */
export function personalizeExperienceList(
  cards: ExperienceCardModel[],
  context: PersonalizationContext,
): ExperienceCardModel[] {
  // No signal at all yet (brand-new user, empty interests somehow, no
  // view history) — skip the pass entirely rather than paying for a sort
  // that's provably a no-op.
  if (context.interests.length === 0 && context.recentCategoryIds.length === 0) {
    return cards;
  }

  return cards
    .map((card) => ({ card, score: scoreExperience(card, context) }))
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.card);
}
