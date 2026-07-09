/**
 * Stroll — Recently Viewed
 * src/lib/recentlyViewed.ts
 *
 * Backs two things in this sprint's brief:
 *   - Requirement #1's "Recently viewed categories" personalization signal
 *   - Requirement #2's "Continue Exploring" ("categories the user
 *     frequently opens... previously viewed experiences")
 *
 * Built entirely on the existing `storage` abstraction (src/lib/storage.ts,
 * Sprint 0) — no new persistence mechanism. A capped, most-recently-used
 * list of `{ experienceId, categoryId, viewedAt }`, deduped by
 * experienceId (viewing the same experience again just moves it to the
 * front rather than growing the list).
 *
 * Deliberately local-device-only, not synced to Supabase — this is a
 * lightweight personalization signal, not a feature the product surfaces
 * anywhere (no "history" screen exists or is planned). If that changes
 * later, this module's exported functions are the entire surface area to
 * redirect at a Supabase table instead.
 */

import { storage } from '@/lib/storage';
import { logError } from '@/lib/errors';
import type { PlaceCategoryId } from '@/constants/places';

const STORAGE_KEY = 'recently-viewed-experiences';
/** Enough history for frequency-based category ranking without the list growing unbounded. */
const MAX_ENTRIES = 30;
/** How many categories getFrequentCategories() returns at most. */
const DEFAULT_CATEGORY_LIMIT = 3;

export interface RecentlyViewedEntry {
  experienceId: string;
  categoryId: PlaceCategoryId | null;
  viewedAt: string;
}

/**
 * Records a view, most-recent-first, deduped by experienceId, capped at
 * MAX_ENTRIES. Called once per successful Experience Detail load — see
 * useExperienceDetail.ts.
 */
export async function recordExperienceView(entry: {
  experienceId: string;
  categoryId: PlaceCategoryId | null;
}): Promise<void> {
  try {
    const existing = (await storage.get<RecentlyViewedEntry[]>(STORAGE_KEY)) ?? [];
    const withoutThisOne = existing.filter((e) => e.experienceId !== entry.experienceId);
    const updated: RecentlyViewedEntry[] = [
      {
        experienceId: entry.experienceId,
        categoryId: entry.categoryId,
        viewedAt: new Date().toISOString(),
      },
      ...withoutThisOne,
    ].slice(0, MAX_ENTRIES);

    await storage.set(STORAGE_KEY, updated);
  } catch (err) {
    // A failed write here should never surface to the user or block
    // navigation — personalization degrading silently is the correct
    // failure mode for a signal this soft.
    logError('recordExperienceView', err);
  }
}

/**
 * Returns the categories the user has most frequently viewed, most
 * frequent first (ties broken by recency). Empty array if there's no
 * history yet, or storage is unavailable — both are valid, unexceptional
 * states for personalization to fall back on other signals.
 */
export async function getFrequentCategories(
  limit = DEFAULT_CATEGORY_LIMIT,
): Promise<PlaceCategoryId[]> {
  const entries = (await storage.get<RecentlyViewedEntry[]>(STORAGE_KEY)) ?? [];

  const frequency = new Map<PlaceCategoryId, { count: number; mostRecentViewedAt: string }>();
  for (const entry of entries) {
    if (!entry.categoryId) continue;
    const existing = frequency.get(entry.categoryId);
    if (existing) {
      existing.count += 1;
    } else {
      frequency.set(entry.categoryId, { count: 1, mostRecentViewedAt: entry.viewedAt });
    }
  }

  return [...frequency.entries()]
    .sort(
      ([, a], [, b]) =>
        b.count - a.count || b.mostRecentViewedAt.localeCompare(a.mostRecentViewedAt),
    )
    .slice(0, limit)
    .map(([categoryId]) => categoryId);
}

/** The single most recently viewed experience's id, if any — used to seed "Continue Exploring" (see useContinueExploring in useDiscoverFeed.ts). */
export async function getMostRecentlyViewedExperienceId(): Promise<string | null> {
  const entries = (await storage.get<RecentlyViewedEntry[]>(STORAGE_KEY)) ?? [];
  return entries[0]?.experienceId ?? null;
}
