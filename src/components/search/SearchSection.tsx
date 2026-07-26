/**
 * Stroll — Search Section
 * src/components/search/SearchSection.tsx
 *
 * Sprint 7 Prompt 1 — Search Foundation. A generic "title + count + N
 * items + See all" wrapper shared by all three results sections
 * (Experiences, Collections, Creators) — the three differ only in what
 * they render per item, not in this shell.
 *
 * Uses PAGINATION.SEARCH_SECTION_PREVIEW (constants/app.ts) — a constant
 * that already existed, unused, before this sprint ("Number of items
 * shown per section in Search before View All"). Rather than build a
 * separate "View All" screen/route (outside this prompt's own scope,
 * which explicitly excludes search filters/sorting and doesn't ask for
 * new routes), "See all" expands the section in place — same data
 * already fetched, no extra request, no new screen.
 *
 * Renders nothing when its section has zero results — the Search screen
 * decides overall empty-vs-results state by checking all three sections
 * together (see useSearch.ts's `hasResults`), not by this component
 * showing an empty message per section.
 */

import React, { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';

import { theme } from '@/theme';
import { H5, BodySmall } from '@/components/ui';
import { PAGINATION } from '@/constants/app';

export interface SearchSectionProps<T> {
  title: string;
  items: T[];
  keyExtractor: (item: T) => string;
  renderItem: (item: T) => React.ReactNode;
  /** 1 = full-width vertical stack (Experiences, Creators). 2 = two-column wrap (Collections, matching CollectionCard's own grid-cell sizing elsewhere in the app). Defaults to 1. */
  columns?: 1 | 2;
  /** Required when columns === 2 — each item's wrapper is sized explicitly so the wrap layout lines up in two even columns. */
  itemWidth?: number;
}

export function SearchSection<T>({
  title,
  items,
  keyExtractor,
  renderItem,
  columns = 1,
  itemWidth,
}: SearchSectionProps<T>) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (items.length === 0) return null;

  const previewCount = PAGINATION.SEARCH_SECTION_PREVIEW;
  const visibleItems = isExpanded ? items : items.slice(0, previewCount);
  const hasMore = items.length > previewCount;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <H5>{title}</H5>
        <BodySmall color={theme.colors.text.tertiary}>{items.length}</BodySmall>
      </View>

      <View style={columns === 2 ? styles.wrap : styles.stack}>
        {visibleItems.map((item) => (
          <View
            key={keyExtractor(item)}
            style={columns === 2 ? { width: itemWidth } : undefined}
          >
            {renderItem(item)}
          </View>
        ))}
      </View>

      {hasMore ? (
        <Pressable
          onPress={() => setIsExpanded((prev) => !prev)}
          style={styles.seeAllButton}
          accessibilityRole="button"
          accessibilityLabel={isExpanded ? `Show fewer ${title}` : `See all ${items.length} ${title}`}
        >
          <BodySmall color={theme.colors.brand.primary}>
            {isExpanded ? 'Show less' : `See all ${items.length} results`}
          </BodySmall>
        </Pressable>
      ) : null}
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  section: {
    marginBottom: theme.spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  stack: {
    gap: theme.spacing.md,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  seeAllButton: {
    marginTop: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    alignItems: 'center',
  },
});
