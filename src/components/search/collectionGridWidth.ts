/**
 * Stroll — Collections Grid Width
 * src/components/search/collectionGridWidth.ts
 *
 * The 2-column Collection Card width formula SearchSection's caller
 * originally computed inline in search.tsx (Sprint 7 Prompt 1) — pulled
 * out here once Sprint 7 Prompt 2 needed the exact same computation in
 * two more places (RecommendedResults, DiscoveryPrompt) rather than
 * tripling the formula (this codebase's "never duplicate ... utilities"
 * rule). Pure arithmetic, no component/hook — call it from each
 * caller's own `useWindowDimensions()` + `useMemo`.
 */

import { theme } from '@/theme';

export const COLLECTIONS_GRID_COLUMNS = 2;
export const COLLECTIONS_GRID_GAP = theme.spacing.md;

export function getCollectionCardWidth(
  windowWidth: number,
  columns: number = COLLECTIONS_GRID_COLUMNS,
): number {
  return (
    (windowWidth - theme.layout.screenPaddingHorizontal * 2 - COLLECTIONS_GRID_GAP * (columns - 1)) /
    columns
  );
}
