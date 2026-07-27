/**
 * Stroll — Highlighted Text
 * src/components/search/HighlightedText.tsx
 *
 * Sprint 7 Prompt 2 — Smart Search & Discovery, "Keyword Highlighting".
 * The React Native presentation layer on top of
 * features/search/highlighting/highlightMatch.ts's pure `getHighlightSegments()`
 * — this component owns only how a match LOOKS, not how one is found.
 *
 * Renders as plain inline text spans (`<Text>` inside `<Text>`), not a
 * standalone typography component — this is meant to be used AS the
 * children of an existing Typography component (H5, Body, ...), e.g.:
 *
 *   <H5 numberOfLines={2}>
 *     <HighlightedText text={title} query={highlightQuery} />
 *   </H5>
 *
 * so it inherits that component's font/size/color and only overrides
 * color+weight on the matched runs — exactly the "visually emphasized
 * while respecting the Design System" instruction, since every other
 * typographic property (family, size, line height) stays whatever the
 * wrapping component already establishes.
 *
 * Color choice: `theme.colors.brand.primary` — the Design System's own
 * "guides attention... never dominates a screen" color (colors.ts),
 * which is exactly the right amount of emphasis for a few highlighted
 * words inside an otherwise normal card, not a new color introduced
 * just for this.
 */

import React from 'react';
import { Text } from 'react-native';
import { theme } from '@/theme';
import { getHighlightSegments } from '@/features/search';

export interface HighlightedTextProps {
  text: string;
  /** The literal query to highlight. Renders `text` completely plain (no highlighting, no extra work) when omitted or empty — safe to pass through unconditionally from a screen that isn't in a search context. */
  query?: string;
}

export function HighlightedText({ text, query }: HighlightedTextProps) {
  if (!query || !query.trim()) return <>{text}</>;

  const segments = getHighlightSegments(text, query);
  // A single non-matching segment means the query never actually
  // appeared in this text (e.g. a Description/Tag-tier match, not a
  // Title-tier one) — render plain rather than wrapping in a pointless
  // extra <Text> node.
  if (segments.length === 1 && !segments[0]!.isMatch) return <>{text}</>;

  return (
    <>
      {segments.map((segment, index) =>
        segment.isMatch ? (
          <Text key={index} style={styles.match}>
            {segment.text}
          </Text>
        ) : (
          <React.Fragment key={index}>{segment.text}</React.Fragment>
        ),
      )}
    </>
  );
}

const styles = {
  match: {
    color: theme.colors.brand.primary,
    fontWeight: '700' as const,
  },
};
