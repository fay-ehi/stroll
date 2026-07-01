/**
 * Stroll — Toast Component
 * src/components/toast/Toast.tsx
 *
 * Renders the active toast notification. Animated slide-up from the
 * bottom, auto-hides after the configured duration.
 *
 * Design System §36:
 *   Duration: 3 seconds (TIMEOUTS.TOAST_DURATION_MS)
 *   Position: Bottom of screen
 *   Types: Success, Info, Warning, Error
 *   "Toasts should never interrupt user flow."
 *
 * Animation respects Design System §14 (motion tokens) and §56
 * (Reduced Motion via useReducedMotion).
 *
 * Rendered once by ToastProvider in the root layout — never instantiate
 * this component directly in feature screens.
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useReducedMotion } from 'react-native-reanimated';
import { useToastStore, hideToast, type ToastType } from '@/stores/toastStore';
import { theme } from '@/theme';
import { BodySmall } from '@/components/ui';
import { CheckCircle, Info, AlertTriangle, XCircle, X } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

// ─── Toast Type Config ──────────────────────────────────────────────────────────

interface ToastTypeConfig {
  background: string;
  iconColor:  string;
  textColor:  string;
  icon:       LucideIcon;
}

const TYPE_CONFIG: Record<ToastType, ToastTypeConfig> = {
  success: {
    background: theme.colors.semantic.success,
    iconColor:  theme.colors.static.white,
    textColor:  theme.colors.static.white,
    icon:       CheckCircle,
  },
  info: {
    background: theme.colors.semantic.info,
    iconColor:  theme.colors.static.white,
    textColor:  theme.colors.static.white,
    icon:       Info,
  },
  warning: {
    background: theme.colors.semantic.warning,
    iconColor:  theme.colors.static.white,
    textColor:  theme.colors.static.white,
    icon:       AlertTriangle,
  },
  error: {
    background: theme.colors.semantic.error,
    iconColor:  theme.colors.static.white,
    textColor:  theme.colors.static.white,
    icon:       XCircle,
  },
};

// Distance to slide up from below the visible area.
const SLIDE_DISTANCE = 80;

// ─── Component ─────────────────────────────────────────────────────────────────

export function Toast() {
  const toast          = useToastStore((s) => s.current);
  const insets         = useSafeAreaInsets();
  const shouldReduce   = useReducedMotion();
  const translateY     = useRef(new Animated.Value(SLIDE_DISTANCE)).current;
  const opacity        = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (toast) {
      // Slide in.
      Animated.parallel([
        Animated.timing(translateY, {
          toValue:         0,
          duration:        shouldReduce ? 0 : theme.animation.durations.slow,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue:         1,
          duration:        shouldReduce ? 0 : theme.animation.durations.normal,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Slide out.
      Animated.parallel([
        Animated.timing(translateY, {
          toValue:         SLIDE_DISTANCE,
          duration:        shouldReduce ? 0 : theme.animation.durations.normal,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue:         0,
          duration:        shouldReduce ? 0 : theme.animation.durations.fast,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [toast, translateY, opacity, shouldReduce]);

  // Always render so the animated values are stable, but hide when empty.
  if (!toast) return null;

  const config = TYPE_CONFIG[toast.type];

  const bottomOffset =
    Math.max(insets.bottom, theme.spacing.sm) + theme.spacing.md;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: config.background,
          bottom:          bottomOffset,
          transform:       [{ translateY }],
          opacity,
          ...(Platform.OS === 'android'
            ? { elevation: theme.shadows.large.elevation }
            : {
                shadowColor:   theme.shadows.large.shadowColor,
                shadowOffset:  theme.shadows.large.shadowOffset,
                shadowOpacity: theme.shadows.large.shadowOpacity,
                shadowRadius:  theme.shadows.large.shadowRadius,
              }),
        },
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <config.icon
        size={theme.typography.sizes.bodyLarge}
        color={config.iconColor}
        strokeWidth={theme.layout.iconStrokeWidth}
      />

      <BodySmall
        color={config.textColor}
        style={styles.message}
        numberOfLines={2}
      >
        {toast.message}
      </BodySmall>

      <Pressable
        onPress={hideToast}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
        style={styles.dismissButton}
      >
        <X
          size={theme.typography.sizes.bodySmall}
          color={config.iconColor}
          strokeWidth={theme.layout.iconStrokeWidth}
        />
      </Pressable>
    </Animated.View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position:         'absolute',
    left:             theme.layout.screenPaddingHorizontal,
    right:            theme.layout.screenPaddingHorizontal,
    flexDirection:    'row',
    alignItems:       'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical:  theme.spacing.sm,
    borderRadius:     theme.radius.card,
    gap:              theme.spacing.xs,
    zIndex:           theme.zIndex.toast,
  },
  message: {
    flex:       1,
    fontWeight: theme.typography.weights.medium,
  },
  dismissButton: {
    minWidth:       theme.layout.touchTargetMin / 2,
    alignItems:     'center',
    justifyContent: 'center',
  },
});
