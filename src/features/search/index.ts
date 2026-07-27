/**
 * Stroll — Search Intelligence Feature Barrel
 * src/features/search/index.ts
 *
 * Sprint 7 Prompt 2 — Smart Search & Discovery. Single import point for
 * every isolated concern this feature adds on top of Sprint 7 Prompt 1's
 * Search Foundation — mirrors the barrel-per-domain convention already
 * used by src/components/search, src/components/discover, etc.
 *
 * Consumers (searchService.ts, useSearch.ts, components/search/*)
 * should import from here rather than reaching into individual
 * ranking/highlighting/keyword-mapping/recommendations files directly.
 */

export * from './types';
export * from './ranking';
export * from './highlighting';
export * from './keyword-mapping';
export * from './recommendations';
