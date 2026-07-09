/**
 * Stroll — Experience Description
 * src/components/experience-detail/ExperienceDescription.tsx
 *
 * Requirement #5: "Full description, Rich formatting if supported,
 * Expand/Collapse for long descriptions, Proper typography hierarchy.
 * Avoid hardcoded truncation values."
 *
 * No rich text formatting exists anywhere in this app yet (the story
 * field is plain text end to end, from Create Experience's textarea
 * through to here) — so "rich formatting if supported" renders as plain
 * paragraphs with normal line-height, which is the honest current state.
 *
 * "Avoid hardcoded truncation values" is taken literally: rather than
 * slicing the string at some character count (which also wouldn't adapt
 * to Dynamic Type — requirement #16 — a fixed character budget might be
 * two lines at default text size and six lines at 200% scale), an
 * invisible measurement pass renders the full text once with no line
 * limit, and `onTextLayout` reports how many lines it actually took at
 * the device's current font scale. Only if that's more than
 * `COLLAPSED_LINES` does "Read more" appear at all — a short story never
 * gets a pointless toggle that doesn't do anything.
 */

import React, { useState } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  type NativeSyntheticEvent,
  type TextLayoutEventData,
} from 'react-native';
import { theme } from '@/theme';
import { H5, Body, BodySemiBold } from '@/components/ui';

const COLLAPSED_LINES = 5;

export interface ExperienceDescriptionProps {
  story: string;
}

export function ExperienceDescription({ story }: ExperienceDescriptionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);

  const handleMeasure = (event: NativeSyntheticEvent<TextLayoutEventData>) => {
    if (event.nativeEvent.lines.length > COLLAPSED_LINES) setCanExpand(true);
  };

  return (
    <View style={styles.container}>
      <H5>About this experience</H5>

      <View>
        {/* Invisible measurement pass — same width/font as the real text
            below, laid out to its full (unlimited) height so onTextLayout
            reports the true line count, then visually collapsed to zero
            height. Text wrapping is resolved during layout, before this
            height clipping is applied, so the reported line count is
            unaffected by it. */}
        <Body
          style={styles.measure}
          onTextLayout={handleMeasure}
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
        >
          {story}
        </Body>

        <Body numberOfLines={isExpanded ? undefined : COLLAPSED_LINES}>{story}</Body>
      </View>

      {canExpand ? (
        <Pressable
          onPress={() => setIsExpanded((expanded) => !expanded)}
          accessibilityRole="button"
          accessibilityLabel={isExpanded ? 'Show less' : 'Read more'}
          hitSlop={{ top: theme.spacing.xs, bottom: theme.spacing.xs, left: 0, right: 0 }}
        >
          <BodySemiBold color={theme.colors.brand.primary}>
            {isExpanded ? 'Show less' : 'Read more'}
          </BodySemiBold>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.sm,
  },
  measure: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 0,
    overflow: 'hidden',
    opacity: 0,
  },
});
