/**
 * Stroll — Categories Row
 * src/components/discover/CategoriesRow.tsx
 *
 * This sprint's requirement #7: "Display available categories. Support
 * icons, active state, inactive state. Filtering logic will be
 * implemented later." Reuses PLACE_CATEGORIES (Sprint 1 Prompt 4) rather
 * than inventing a parallel category list — an Experience's category IS
 * its place's structural category (see src/types/experience.ts's
 * `CategoryPreview`).
 *
 * Deliberately a *controlled* component — selection state lives in the
 * Discover screen (page-local `useState`, not Zustand: this is exactly
 * the kind of ephemeral, single-screen UI state the architecture rules
 * reserve Zustand for skipping past when a screen-local hook is enough).
 * Selecting a chip only updates that visual state for now; nothing here
 * calls into `useDiscoverFeed`'s `category` param yet — that wiring is
 * explicitly future-sprint scope per this sprint's brief.
 *
 * Built on the existing Chip component (Design System §28) — a category's
 * "icon" is its emoji, prefixed directly into the chip's label, so no
 * change to Chip itself was needed.
 */

import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { theme } from '@/theme';
import { Chip } from '@/components/ui';
import { PLACE_CATEGORIES, type PlaceCategoryId } from '@/constants/places';

export interface CategoriesRowProps {
  /** null represents the unfiltered "All" chip. */
  selectedCategoryId: PlaceCategoryId | null;
  onSelect: (categoryId: PlaceCategoryId | null) => void;
}

export function CategoriesRow({ selectedCategoryId, onSelect }: CategoriesRowProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      accessibilityRole="tablist"
      accessibilityLabel="Categories"
    >
      <Chip
        label="All"
        selected={selectedCategoryId === null}
        onPress={() => onSelect(null)}
        style={styles.chip}
      />
      {PLACE_CATEGORIES.map((category) => (
        <Chip
          key={category.id}
          label={`${category.emoji} ${category.label}`}
          selected={selectedCategoryId === category.id}
          onPress={() => onSelect(category.id)}
          style={styles.chip}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    gap: theme.spacing.sm,
  },
  chip: {
    marginRight: 0,
  },
});
