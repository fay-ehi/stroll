/**
 * Stroll — FAQ Accordion Item
 * src/components/help/FAQAccordionItem.tsx
 *
 * Sprint 9 Prompt 2 — Help, About & Legal. The Help screen's one
 * repeated building block — self-contained expand/collapse state (no
 * external "which item is open" coordination needed; multiple items can
 * be open at once, which is the friendlier default for scanning FAQs).
 * No animation library — a plain conditional render, same "don't add a
 * dependency for something this small" reasoning as everywhere else this
 * sprint.
 */

import React, { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { theme } from '@/theme';
import { Body, BodyMedium } from '../ui/Typography';
import { Icon } from '../ui/Icon';
import type { FAQItem } from '@/constants/appInfo';

export interface FAQAccordionItemProps {
  item: FAQItem;
}

export function FAQAccordionItem({ item }: FAQAccordionItemProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => setExpanded((prev) => !prev)}
        style={styles.header}
        accessibilityRole="button"
        accessibilityLabel={item.question}
        accessibilityState={{ expanded }}
        accessibilityHint={expanded ? 'Collapses the answer' : 'Expands the answer'}
      >
        <BodyMedium style={styles.question}>{item.question}</BodyMedium>
        <Icon
          icon={expanded ? ChevronUp : ChevronDown}
          size="sm"
          color={theme.colors.text.tertiary}
        />
      </Pressable>
      {expanded ? (
        <Body color={theme.colors.text.secondary} style={styles.answer}>
          {item.answer}
        </Body>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: theme.spacing.sm,
  },
  header: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    minHeight:      theme.layout.touchTargetMin,
  },
  question: {
    flex:        1,
    marginRight: theme.spacing.sm,
  },
  answer: {
    marginTop: theme.spacing.xs,
  },
});
