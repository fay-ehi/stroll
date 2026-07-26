/**
 * Stroll UI — Like Button
 * src/components/ui/LikeButton.tsx
 *
 * Sprint 6 Prompt 2. The one Heart control used everywhere a Like lives
 * — ExperienceCard's footer (components/discover/ExperienceCard.tsx) and
 * Experience Detail's own engagement row
 * (components/experience-detail/ExperienceDetailHeader.tsx) both render
 * this instead of keeping two copies of the same animation logic, per
 * requirement #5 ("Reuse the shared Like hook. Do not implement separate
 * logic.") and requirement #17 ("No duplicate logic.").
 *
 * Deliberately lives in components/ui/ rather than discover/ or
 * experience-detail/ — it belongs to neither domain screen, the same
 * "generic, reusable design-system primitive" reasoning every other file
 * in this folder (Button, Badge, Avatar, Icon...) already follows.
 *
 * Purely presentational — it owns its own animation state (the scale-pop
 * + outline↔filled crossfade, requirement #4) but not the Like mutation
 * itself; the caller passes `isLiked`/`onPress`/`disabled` and gets those
 * from useLikes.ts's useIsLiked()/useLike(), same division of
 * responsibility Bookmark/BookmarkCheck already has in ExperienceCard
 * (the card owns useIsExperienceSaved()/useToggleSaveExperience(), the
 * icon itself is dumb).
 *
 * ── How the animation is triggered ──
 * A ref tracks the PREVIOUS `isLiked` value across renders. The
 * scale-pop + fill-in only plays on a genuine false→true transition —
 * not on mount (so a card that mounts already-liked doesn't pop), and
 * not on a true→true re-render (satisfies requirement #3's "If already
 * liked, do not replay the animation" — a double tap on an
 * already-liked cover never even calls onPress, per ExperienceCard's own
 * handler, so `isLiked` never toggles off then back on here; this guard
 * is what keeps the SAME animation contract correct regardless of which
 * caller is driving `isLiked`). Unliking (true→false) crossfades the
 * fill back out but skips the bouncy pop — only the act of hearting
 * something gets the celebratory motion.
 *
 * Respects the system's Reduce Motion setting via theme's
 * useReducedMotion() (§17 Accessibility) — animations resolve instantly
 * to their end state instead of skipping the state change entirely.
 */

import React, { useEffect, useRef } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { Heart } from 'lucide-react-native';

import { theme, useReducedMotion, DURATION_FAST, EASING_STANDARD } from '@/theme';
import { hitSlop } from '@/theme/utils';
import { formatCount } from '@/utils';
import { Caption, BodySmall } from '@/components/ui/Typography';

const STANDARD_BEZIER = Easing.bezier(...EASING_STANDARD);

export type LikeButtonSize = 'sm' | 'md' | 'lg';

const ICON_PX: Record<LikeButtonSize, number> = { sm: 16, md: 20, lg: 24 };
const TOUCH_DIAMETER: Record<LikeButtonSize, number> = { sm: 32, md: 40, lg: 48 };

export interface LikeButtonProps {
  isLiked: boolean;
  /** Omit to render an icon-only button (not currently used, but keeps this component honest about count being optional rather than assumed). */
  count?: number;
  onPress: () => void;
  disabled?: boolean;
  size?: LikeButtonSize;
  style?: object;
}

export function LikeButton({ isLiked, count, onPress, disabled, size = 'sm', style }: LikeButtonProps) {
  const iconPx = ICON_PX[size];
  const reduceMotion = useReducedMotion();
  const CountText = size === 'md' ? BodySmall : Caption;

  // ── Heart scale-pop + fill crossfade ──
  const scale = useSharedValue(1);
  const fillOpacity = useSharedValue(isLiked ? 1 : 0);
  const wasLiked = useRef(isLiked);

  useEffect(() => {
    const transitionedToLiked = isLiked && !wasLiked.current;
    const transitionedToUnliked = !isLiked && wasLiked.current;
    wasLiked.current = isLiked;

    if (!transitionedToLiked && !transitionedToUnliked) return;

    if (reduceMotion) {
      fillOpacity.value = isLiked ? 1 : 0;
      return;
    }

    fillOpacity.value = withTiming(isLiked ? 1 : 0, { duration: DURATION_FAST, easing: STANDARD_BEZIER });

    if (transitionedToLiked) {
      scale.value = withSequence(
        withTiming(1.25, { duration: DURATION_FAST * 0.6, easing: STANDARD_BEZIER }),
        withSpring(1, { damping: 9, stiffness: 260 }),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLiked, reduceMotion]);

  const iconContainerStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const fillStyle = useAnimatedStyle(() => ({ opacity: fillOpacity.value }));

  // ── Count fade/scale pulse on change ──
  const countScale = useSharedValue(1);
  const countOpacity = useSharedValue(1);
  const previousCount = useRef(count);

  useEffect(() => {
    if (count === undefined || previousCount.current === undefined || count === previousCount.current) {
      previousCount.current = count;
      return;
    }
    previousCount.current = count;

    if (reduceMotion) return;

    countOpacity.value = withSequence(
      withTiming(0.3, { duration: DURATION_FAST * 0.5, easing: STANDARD_BEZIER }),
      withTiming(1, { duration: DURATION_FAST * 0.5, easing: STANDARD_BEZIER }),
    );
    countScale.value = withSequence(
      withTiming(0.85, { duration: DURATION_FAST * 0.5, easing: STANDARD_BEZIER }),
      withSpring(1, { damping: 10, stiffness: 300 }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, reduceMotion]);

  const countStyle = useAnimatedStyle(() => ({
    opacity: countOpacity.value,
    transform: [{ scale: countScale.value }],
  }));

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={hitSlop(TOUCH_DIAMETER[size])}
      style={[styles.row, style]}
      accessibilityRole="button"
      accessibilityState={{ selected: isLiked, disabled: !!disabled }}
      accessibilityLabel={
        count !== undefined
          ? `${isLiked ? 'Unlike' : 'Like'} this experience. ${count} ${count === 1 ? 'like' : 'likes'}.`
          : isLiked
            ? 'Unlike this experience'
            : 'Like this experience'
      }
    >
      <Animated.View style={[{ width: iconPx, height: iconPx }, iconContainerStyle]}>
        <Heart
          width={iconPx}
          height={iconPx}
          color={theme.colors.text.tertiary}
          strokeWidth={theme.layout.iconStrokeWidth}
        />
        <Animated.View style={[StyleSheet.absoluteFillObject, fillStyle]}>
          <Heart
            width={iconPx}
            height={iconPx}
            color={theme.colors.brand.primary}
            fill={theme.colors.brand.primary}
            strokeWidth={theme.layout.iconStrokeWidth}
          />
        </Animated.View>
      </Animated.View>

      {count !== undefined ? (
        <Animated.View style={countStyle}>
          <CountText>{formatCount(count)}</CountText>
        </Animated.View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xxs,
  },
});
