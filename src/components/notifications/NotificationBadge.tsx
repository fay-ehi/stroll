/**
 * Stroll — Notification Badge
 * src/components/notifications/NotificationBadge.tsx
 *
 * Sprint 8 Prompt 3 (Real-Time Notifications & Badge System). A small,
 * solid-fill count pill meant to sit absolutely positioned on the
 * corner of an icon — this sprint's own "Notification Badge" section:
 *
 *   0        → no badge (renders null)
 *   1–9      → exact count
 *   10+      → "9+"
 *
 * Deliberately its own component rather than reusing components/ui's
 * `Badge` — that one is a bordered, uppercase status *label* (Featured,
 * New, Trending — Design System §31), a different shape and purpose
 * from a tiny numeric corner-pill. This is closer in spirit to
 * LikeButton.tsx's own count treatment, and reuses that same
 * animation approach directly: a `useRef`-tracked previous value, a
 * reanimated scale pulse fired only on a genuine increase (never on
 * mount, never on a decrease — e.g. a read/mark-all-read shrinking the
 * count plays no animation), and `useReducedMotion()` support. This
 * sprint's own Philosophy: "Avoid attention-grabbing animations" — the
 * pulse is a brief, small scale change, not a bounce, flash, or color
 * change.
 */

import React, { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, withSequence, Easing } from 'react-native-reanimated';

import { theme, useReducedMotion, DURATION_FAST, EASING_STANDARD } from '@/theme';
import { Tiny } from '@/components/ui';

const STANDARD_BEZIER = Easing.bezier(...EASING_STANDARD);

const MAX_DISPLAYED_COUNT = 9;
// Bumped 16 → 18 → 20. The 18px pass fixed the iOS clipping (an
// oversized lineHeight relative to a too-small circle), but on Android
// — which handles font metrics differently — the same 18px circle with
// a 10px digit still read as visibly cramped. 20px + an 11px digit
// gives comfortable, consistent breathing room on both platforms
// without the badge overwhelming the bell icon it sits on.
const BADGE_DIAMETER = 20;

export interface NotificationBadgeProps {
  count: number;
}

export function NotificationBadge({ count }: NotificationBadgeProps) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const previousCount = useRef(count);

  useEffect(() => {
    const increased = count > previousCount.current;
    previousCount.current = count;

    if (!increased || reduceMotion) return;

    scale.value = withSequence(
      withTiming(1.3, { duration: DURATION_FAST * 0.6, easing: STANDARD_BEZIER }),
      withSpring(1, { damping: 9, stiffness: 260 }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  if (count <= 0) return null;

  const label = count > MAX_DISPLAYED_COUNT ? `${MAX_DISPLAYED_COUNT}+` : String(count);

  return (
    <Animated.View
      style={[styles.badge, animatedStyle]}
      // The parent icon button already carries its own accessibilityLabel
      // (e.g. "Notifications, 3 unread") that folds the count in as
      // words — this pill would otherwise be announced a second time,
      // redundantly, as its own element.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Tiny color={theme.colors.static.white} style={styles.label}>
        {label}
      </Tiny>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: BADGE_DIAMETER,
    height: BADGE_DIAMETER,
    borderRadius: theme.radius.full,
    paddingHorizontal: 4,
    backgroundColor: theme.colors.brand.primary,
    borderWidth: 1.5,
    borderColor: theme.colors.neutral.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: theme.typography.weights.semiBold,
    // Explicit, tight values — deliberately NOT the inherited `Tiny`
    // preset's fontSize/lineHeight (11/16), which was sized for regular
    // captions with normal leading, not a number centered in a small
    // filled circle. A lineHeight noticeably smaller than the preset's
    // keeps the glyph vertically centered on both platforms instead of
    // overflowing (iOS) or reading cramped against the circle (Android).
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
    includeFontPadding: false,
  },
});
