/**
 * Stroll — Recent Searches
 * src/lib/recentSearches.ts
 *
 * Sprint 7 Prompt 1 — Search Foundation. Backs the Search screen's
 * "Recent Searches" list: a capped, most-recently-used list of search
 * terms, deduped case-insensitively (searching "Lagos" then "lagos"
 * moves the same entry to the front rather than growing the list with
 * a near-duplicate).
 *
 * Built entirely on the existing `storage` abstraction
 * (src/lib/storage.ts) — no new persistence mechanism — the same
 * pattern src/lib/recentlyViewed.ts already establishes for a different
 * local-only MRU list. Deliberately local-device-only, not synced to
 * Supabase — the prompt's own scope ("Persist between app launches")
 * only asks for on-device persistence, not cross-device sync.
 *
 * Consumed through src/hooks/useSearch.ts's `useRecentSearches()`, which
 * wraps these functions in TanStack Query for consistent loading-state
 * ergonomics — screens/components should go through that hook, not call
 * this module directly, the same "Hooks → ... → Storage" layering the
 * rest of this codebase's architecture rules require.
 */

import { storage } from '@/lib/storage';
import { logError } from '@/lib/errors';
import { SEARCH_LIMITS } from '@/constants/app';

const STORAGE_KEY = 'recent-searches';

export interface RecentSearchEntry {
  query: string;
  searchedAt: string;
}

/** Every recent search, most-recent-first. Empty array if there's no history yet, or storage is unavailable. */
export async function getRecentSearches(): Promise<RecentSearchEntry[]> {
  return (await storage.get<RecentSearchEntry[]>(STORAGE_KEY)) ?? [];
}

/**
 * Records a search term, most-recent-first, deduped case-insensitively,
 * capped at SEARCH_LIMITS.MAX_RECENT_SEARCHES. Called once a search
 * actually resolves (see useSearch.ts) — not on every keystroke, so the
 * list only ever fills with terms the user meant to search for.
 */
export async function recordRecentSearch(query: string): Promise<RecentSearchEntry[]> {
  const trimmed = query.trim();
  if (!trimmed) return getRecentSearches();

  try {
    const existing = await getRecentSearches();
    const withoutThisOne = existing.filter(
      (entry) => entry.query.toLowerCase() !== trimmed.toLowerCase(),
    );
    const updated: RecentSearchEntry[] = [
      { query: trimmed, searchedAt: new Date().toISOString() },
      ...withoutThisOne,
    ].slice(0, SEARCH_LIMITS.MAX_RECENT_SEARCHES);

    await storage.set(STORAGE_KEY, updated);
    return updated;
  } catch (err) {
    // A failed write here should never surface to the user or block the
    // search itself — recent-search history degrading silently is the
    // correct failure mode for a signal this soft (same tradeoff
    // recentlyViewed.ts's recordExperienceView already makes).
    logError('recordRecentSearch', err);
    return getRecentSearches();
  }
}

/** Removes a single recent search entry by its exact query text. */
export async function removeRecentSearch(query: string): Promise<RecentSearchEntry[]> {
  try {
    const existing = await getRecentSearches();
    const updated = existing.filter((entry) => entry.query !== query);
    await storage.set(STORAGE_KEY, updated);
    return updated;
  } catch (err) {
    logError('removeRecentSearch', err);
    return getRecentSearches();
  }
}

/** Clears the entire recent-searches list. */
export async function clearRecentSearches(): Promise<void> {
  try {
    await storage.remove(STORAGE_KEY);
  } catch (err) {
    logError('clearRecentSearches', err);
  }
}
