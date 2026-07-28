/**
 * Stroll — Notification Section Header
 * src/components/notifications/NotificationSectionHeader.tsx
 *
 * Sprint 8 Prompt 2 (Notification Center UI). Renders one date-grouping
 * label ("Today", "Yesterday", "Earlier This Week", "Earlier This
 * Month", "Earlier") from src/lib/notificationGrouping.ts's
 * groupNotificationsByDate(). Kept as its own small component (rather
 * than an inline Label in the screen) so the FlatList's flattened
 * header rows and the section-label styling both live in one place —
 * this sprint's own suggested "NotificationGroup" piece.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '@/theme';
import { Label } from '@/components/ui';

export interface NotificationSectionHeaderProps {
  label: string;
}

function NotificationSectionHeaderBase({ label }: NotificationSectionHeaderProps) {
  return (
    <View style={styles.container}>
      <Label style={styles.label}>{label}</Label>
    </View>
  );
}

export const NotificationSectionHeader = React.memo(NotificationSectionHeaderBase);

const styles = StyleSheet.create({
  container: {
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xs,
  },
  label: {
    textTransform: 'uppercase',
    letterSpacing: theme.typography.letterSpacings.wide,
  },
});
