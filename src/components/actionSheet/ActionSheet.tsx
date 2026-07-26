/**
 * Stroll — Action Sheet Component
 * src/components/actionSheet/ActionSheet.tsx
 *
 * Renders the active action sheet (see actionSheetStore.ts for why this
 * exists instead of Alert.alert). A compact, rounded, icon-forward menu
 * card that pops in near the center of the screen — NOT a dimmed
 * full-screen bottom sheet. Whatever was on screen before the sheet
 * opened stays fully visible behind it (matching how TikTok's own
 * "Discard / Save draft" menu behaves — no darkened backdrop, just a
 * floating card over the live screen); tapping anywhere outside the
 * card dismisses it via a fully transparent touch-catcher, not a
 * visible scrim.
 *
 * Bug fix (round 1): the original version had a genuine
 * `backgroundColor: black` scrim under the card, which read as "the
 * whole screen goes black" rather than "a menu appeared over my
 * content" — removed entirely.
 *
 * Bug fix (round 2, this pass): moved from a bottom-anchored sheet that
 * slid up (translateY) to a card centered on screen that scales/fades
 * in — a small vertical slide reads fine for a wide bottom sheet, but
 * for a compact centered card it just looked like it was drifting up
 * from the bottom edge rather than "popping up" where the tap happened.
 * Also gave every row more breathing room (taller rows, a slightly
 * larger label so "icon + word" reads as one deliberate row rather than
 * a cramped icon-only list — every option has always carried a label
 * string; if a build ever showed icons with no text next to them, that
 * build predates this component or a bundler cache needs clearing, not
 * a markup problem in this file).
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useActionSheetStore, hideActionSheet, type ActionSheetOption } from '@/stores/actionSheetStore';
import { theme } from '@/theme';
import { Body, BodySmall, Caption, Icon } from '@/components/ui';

const ROW_HEIGHT = 56;
// Keeps the card feeling like a compact floating menu (closer to
// TikTok's own reference) rather than a full-bleed bottom sheet.
const CARD_MAX_WIDTH = 340;
// Pop-in starting scale — subtle, not a dramatic zoom.
const ENTER_SCALE = 0.92;

// Same platform split Card.tsx uses for its own elevated shadow — iOS
// needs the individual shadow* props (and is clipped by any ancestor's
// overflow:hidden), Android needs `elevation` instead.
const sheetShadow: ViewStyle =
  Platform.OS === 'android'
    ? { elevation: theme.shadows.large.elevation }
    : {
        shadowColor: theme.shadows.large.shadowColor,
        shadowOffset: theme.shadows.large.shadowOffset,
        shadowOpacity: theme.shadows.large.shadowOpacity,
        shadowRadius: theme.shadows.large.shadowRadius,
      };

// ─── Option Row ────────────────────────────────────────────────────────────────

interface OptionRowProps {
  option: ActionSheetOption;
  showDivider: boolean;
}

function OptionRow({ option, showDivider }: OptionRowProps) {
  const tint = option.disabled
    ? theme.colors.text.disabled
    : option.destructive
      ? theme.colors.semantic.error
      : theme.colors.text.primary;

  const handlePress = () => {
    if (option.disabled) return;
    hideActionSheet();
    // Let the dismiss animation begin before running the caller's own
    // effect (which may navigate, or open another sheet/modal) — avoids
    // the new screen mounting underneath a still-visible sheet.
    requestAnimationFrame(() => option.onPress());
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={option.disabled}
      accessibilityRole="menuitem"
      accessibilityState={{ disabled: option.disabled }}
      style={({ pressed }) => [
        styles.row,
        showDivider ? styles.rowDivider : undefined,
        { opacity: pressed ? 0.6 : 1 },
      ]}
    >
      {option.icon ? (
        <View style={styles.rowIcon}>
          <Icon icon={option.icon} size="md" color={tint} />
        </View>
      ) : null}
      <Body color={tint} numberOfLines={1} style={styles.rowLabel}>
        {option.label}
      </Body>
    </Pressable>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function ActionSheet() {
  const payload = useActionSheetStore((s) => s.current);
  const shouldReduce = useReducedMotion();
  const scale = useRef(new Animated.Value(ENTER_SCALE)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  // Keep the last non-null payload around while the exit animation
  // plays, so the sheet's content doesn't blink to empty before it's
  // finished fading away.
  const lastPayloadRef = useRef(payload);
  if (payload) lastPayloadRef.current = payload;
  const rendered = payload ?? lastPayloadRef.current;

  useEffect(() => {
    if (payload) {
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 1,
          duration: shouldReduce ? 0 : theme.animation.durations.normal,
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: shouldReduce ? 0 : theme.animation.durations.normal,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scale, {
          toValue: ENTER_SCALE,
          duration: shouldReduce ? 0 : theme.animation.durations.fast,
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 0,
          duration: shouldReduce ? 0 : theme.animation.durations.fast,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [payload, scale, cardOpacity, shouldReduce]);

  if (!rendered) return null;

  const rowCount = rendered.options.length;

  return (
    <Modal
      visible={!!payload}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={hideActionSheet}
    >
      {/* Fully transparent — the screen behind stays exactly as it was.
          This View only exists to catch outside taps for dismissal, and
          to center the card near the middle of the screen rather than
          pinning it to an edge. */}
      <Pressable
        style={styles.fill}
        onPress={hideActionSheet}
        accessibilityLabel="Dismiss"
        accessibilityRole="button"
      >
        <Animated.View
          style={[
            styles.sheet,
            {
              opacity: cardOpacity,
              transform: [{ scale }],
            },
          ]}
        >
          {/* Pressable wrapper with a no-op onPress so tapping inside the
              card doesn't bubble to the outer dismiss-catcher above. */}
          <Pressable onPress={() => {}} style={[styles.card, sheetShadow]}>
            <View style={styles.cardInner}>
              {rendered.title || rendered.message ? (
                <View style={styles.header}>
                  {rendered.title ? (
                    <BodySmall
                      color={theme.colors.text.tertiary}
                      numberOfLines={2}
                      style={styles.headerTitle}
                    >
                      {rendered.title}
                    </BodySmall>
                  ) : null}
                  {rendered.message ? (
                    <Caption color={theme.colors.text.tertiary} numberOfLines={3}>
                      {rendered.message}
                    </Caption>
                  ) : null}
                </View>
              ) : null}

              {rendered.options.map((option, index) => (
                <OptionRow
                  key={`${option.label}-${index}`}
                  option={option}
                  showDivider={index < rowCount - 1}
                />
              ))}

              {/* Cancel — folded into the same card as its last row
                  (divider above), rather than a second floating pill. */}
              <Pressable
                onPress={hideActionSheet}
                accessibilityRole="button"
                accessibilityLabel={rendered.cancelLabel ?? 'Cancel'}
                style={({ pressed }) => [
                  styles.row,
                  styles.cancelRow,
                  { opacity: pressed ? 0.6 : 1 },
                ]}
              >
                <Body color={theme.colors.text.primary} style={styles.cancelLabel}>
                  {rendered.cancelLabel ?? 'Cancel'}
                </Body>
              </Pressable>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  sheet: {
    width: '100%',
    maxWidth: CARD_MAX_WIDTH,
  },
  card: {
    borderRadius: theme.radius.dialog,
    // No overflow:'hidden' here — same reasoning as ExperienceCard.tsx's
    // own card/cardInner split: iOS shadows are clipped by their own
    // view's overflow, so the shadow lives on this unclipped View and
    // the rounded-corner row/divider clipping happens one level down.
  },
  cardInner: {
    backgroundColor: theme.colors.neutral.surface,
    borderRadius: theme.radius.dialog,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    gap: theme.spacing.xxs,
    alignItems: 'center',
    borderBottomWidth: theme.borders.width,
    borderBottomColor: theme.colors.neutral.divider,
  },
  headerTitle: {
    fontWeight: theme.typography.weights.semiBold,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    height: ROW_HEIGHT,
    paddingHorizontal: theme.spacing.lg,
  },
  rowIcon: {
    width: 24,
    alignItems: 'center',
  },
  rowDivider: {
    borderBottomWidth: theme.borders.width,
    borderBottomColor: theme.colors.neutral.divider,
  },
  rowLabel: {
    flex: 1,
  },
  cancelRow: {
    borderTopWidth: theme.borders.width,
    borderTopColor: theme.colors.neutral.divider,
    justifyContent: 'center',
  },
  cancelLabel: {
    fontWeight: theme.typography.weights.semiBold,
  },
});
