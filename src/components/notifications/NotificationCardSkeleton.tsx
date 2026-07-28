/**
 * Stroll — Notification Card Skeleton
 * src/components/notifications/NotificationCardSkeleton.tsx
 *
 * Sprint 8 Prompt 2 (Notification Center UI). Approximates
 * NotificationCard's shape (avatar, title + time row, one message
 * line) — Design System §34: "Skeletons should resemble the final
 * layout." Built entirely from the existing Skeleton primitives, so
 * reduced-motion support comes for free (same convention as
 * ExperienceCardSkeleton.tsx).
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '@/theme';
import { SkeletonCircle, SkeletonText } from '@/components/ui';

export function NotificationCardSkeleton() {
  return (
    <View style={styles.row}>
      <SkeletonCircle diameter={44} />
      <View style={styles.content}>
        <SkeletonText width="45%" />
        <SkeletonText width="85%" />
      </View>
    </View>
  );
}

export interface NotificationListSkeletonProps {
  /** How many card skeletons to render. Defaults to 6 — enough to fill a typical screen without a blank tail. */
  count?: number;
}

/** The Notification Center's initial (first-page) loading state. */
export function NotificationListSkeleton({ count = 6 }: NotificationListSkeletonProps) {
  return (
    <View
      style={styles.list}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      accessibilityRole="progressbar"
      accessibilityLabel="Loading notifications"
    >
      {Array.from({ length: count }, (_, index) => (
        <NotificationCardSkeleton key={index} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  content: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  list: {
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    paddingTop: theme.spacing.xs,
  },
});
