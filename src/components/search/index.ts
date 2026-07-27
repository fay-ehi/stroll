/**
 * Stroll — Search Components
 * src/components/search/index.ts
 *
 * Sprint 7 Prompt 1 & 2. Mirrors the barrel-per-domain convention already
 * used by src/components/discover, profile, collections, etc.
 *
 * NOTE — ExperienceCard.tsx and CollectionCard.tsx (components/discover)
 * both import HighlightedText by its direct file path rather than from
 * this barrel, to avoid a require cycle (RecommendedResults/
 * DiscoveryPrompt below import FROM components/discover). See
 * HighlightedText's own re-export here for every other caller — this
 * cycle concern only applies to files inside components/discover itself.
 */

export { SearchInput } from './SearchInput';
export type { SearchInputProps } from './SearchInput';

export { SearchSection } from './SearchSection';
export type { SearchSectionProps } from './SearchSection';

export { CreatorResultRow, CreatorResultRowSkeleton } from './CreatorResultRow';
export type { CreatorResultRowProps } from './CreatorResultRow';

export { RecentSearchesList } from './RecentSearchesList';
export type { RecentSearchesListProps } from './RecentSearchesList';

// ─── Sprint 7 Prompt 2 — Smart Search & Discovery ──────────────────────────────

export { HighlightedText } from './HighlightedText';
export type { HighlightedTextProps } from './HighlightedText';

export { SuggestedSearches } from './SuggestedSearches';
export type { SuggestedSearchesProps } from './SuggestedSearches';

export { RecommendedResults } from './RecommendedResults';
export type { RecommendedResultsProps } from './RecommendedResults';

export { DiscoveryPrompt } from './DiscoveryPrompt';

export { getCollectionCardWidth, COLLECTIONS_GRID_COLUMNS, COLLECTIONS_GRID_GAP } from './collectionGridWidth';
