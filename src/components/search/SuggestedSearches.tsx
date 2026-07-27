/**
 * Stroll — Suggested Searches
 * src/components/search/SuggestedSearches.tsx
 *
 * Sprint 7 Prompt 2 — Smart Search & Discovery, "Suggested Searches":
 * "display helpful suggestions beneath the search input... Selecting a
 * suggestion immediately performs the search."
 *
 * Built on the existing `Chip` component (components/ui/Chip.tsx) —
 * Design System §28 already scopes Chips to "Quick selections", which is
 * exactly what tapping a suggestion is; no new pill/tag primitive needed.
 * Rendered in a wrapping row (not a horizontal FlatList) since the list
 * is always short (SuggestionVocabulary's own DEFAULT_SUGGESTION_LIMIT)
 * and benefits from being scannable at a glance rather than requiring a
 * swipe.
 *
 * Accessibility (prompt's own requirements):
 *   - Keyboard accessible / screen-reader operable — inherited for free
 *     from Chip, which already sets accessibilityRole="button" and a
 *     real accessibilityLabel per chip.
 *   - "Screen readers announce suggestion changes" — `accessibilityLiveRegion="polite"`
 *     on the wrapping container (Android's assertive-but-not-interrupting
 *     announcement mode; iOS VoiceOver honors polite live regions via the
 *     same prop on recent React Native versions) so a screen-reader user
 *     typing hears the list update without needing to re-explore the
 *     screen after every keystroke.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '@/theme';
import { BodySmall, Chip } from '@/components/ui';
import type { SearchSuggestion } from '@/features/search';

export interface SuggestedSearchesProps {
  suggestions: SearchSuggestion[];
  onSelect: (term: string) => void;
}

export function SuggestedSearches({ suggestions, onSelect }: SuggestedSearchesProps) {
  if (suggestions.length === 0) return null;

  return (
    <View accessibilityLiveRegion="polite">
      <BodySmall color={theme.colors.text.tertiary} style={styles.label}>
        SUGGESTIONS
      </BodySmall>
      <View style={styles.row}>
        {suggestions.map((suggestion) => (
          <Chip
            key={`${suggestion.source}-${suggestion.term}`}
            label={suggestion.term}
            onPress={() => onSelect(suggestion.term)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    letterSpacing: 0.5,
    marginBottom: theme.spacing.sm,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.lg,
  },
});
