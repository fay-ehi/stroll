/**
 * Stroll — Recent Searches List
 * src/components/search/RecentSearchesList.tsx
 *
 * Sprint 7 Prompt 1 — Search Foundation. Shown when the Search screen's
 * input is empty (see search.tsx) and there's history to show.
 * Requirements covered: tap to search again, remove individual search,
 * clear all.
 */

import React, { useCallback } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Clock, X } from 'lucide-react-native';

import { theme } from '@/theme';
import { Body, BodySmall, Icon } from '@/components/ui';
import { hitSlop } from '@/theme/utils';
import type { RecentSearchEntry } from '@/lib/recentSearches';

export interface RecentSearchesListProps {
  searches: RecentSearchEntry[];
  /** Re-runs a past search — the row itself is tappable, not just an icon. */
  onSelect: (query: string) => void;
  onRemove: (query: string) => void;
  onClearAll: () => void;
}

export function RecentSearchesList({
  searches,
  onSelect,
  onRemove,
  onClearAll,
}: RecentSearchesListProps) {
  if (searches.length === 0) return null;

  return (
    <View>
      <View style={styles.header}>
        <BodySmall color={theme.colors.text.tertiary} style={styles.headerLabel}>
          RECENT SEARCHES
        </BodySmall>
        <Pressable
          onPress={onClearAll}
          hitSlop={hitSlop(20)}
          accessibilityRole="button"
          accessibilityLabel="Clear all recent searches"
        >
          <BodySmall color={theme.colors.brand.primary}>Clear All</BodySmall>
        </Pressable>
      </View>

      {searches.map((entry) => (
        <RecentSearchRow
          key={entry.query}
          entry={entry}
          onSelect={onSelect}
          onRemove={onRemove}
        />
      ))}
    </View>
  );
}

function RecentSearchRow({
  entry,
  onSelect,
  onRemove,
}: {
  entry: RecentSearchEntry;
  onSelect: (query: string) => void;
  onRemove: (query: string) => void;
}) {
  const handleSelect = useCallback(() => onSelect(entry.query), [onSelect, entry.query]);
  const handleRemove = useCallback(() => onRemove(entry.query), [onRemove, entry.query]);

  return (
    <Pressable
      style={styles.row}
      onPress={handleSelect}
      accessibilityRole="button"
      accessibilityLabel={`Search again for ${entry.query}`}
    >
      <Icon icon={Clock} size="sm" color={theme.colors.text.tertiary} />
      <Body style={styles.rowText} numberOfLines={1}>
        {entry.query}
      </Body>
      <Pressable
        onPress={handleRemove}
        hitSlop={hitSlop(20)}
        accessibilityRole="button"
        accessibilityLabel={`Remove "${entry.query}" from recent searches`}
      >
        <Icon icon={X} size="sm" color={theme.colors.text.tertiary} />
      </Pressable>
    </Pressable>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  headerLabel: {
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    minHeight: theme.layout.listItemMinHeight,
  },
  rowText: {
    flex: 1,
  },
});
