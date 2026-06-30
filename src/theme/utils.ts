/**
 * Stroll Design System — Theme Utilities
 * Version 1.0
 *
 * Production-quality helpers that make token consumption ergonomic
 * without adding unnecessary abstraction.
 *
 * Every helper here must earn its place by solving a real problem
 * that appears repeatedly across components. No speculative utilities.
 */

import { StyleSheet, Platform, PixelRatio, Dimensions } from 'react-native';
import { theme } from './index';
import type { ShadowValue } from './types';

// ─── 1. createThemedStyles ────────────────────────────────────────────────────
// A thin wrapper around StyleSheet.create() that injects the theme object.
// Avoids importing theme separately in every component file that needs styles.
//
// Usage:
//   const useStyles = createThemedStyles((t) => ({
//     container: { backgroundColor: t.colors.neutral.background },
//     title:     { ...t.typography.styles.h3, color: t.colors.text.primary },
//   }));
//
//   function MyComponent() {
//     const styles = useStyles();
//     return <View style={styles.container} />;
//   }

type StyleFactory<T extends StyleSheet.NamedStyles<T>> = (
  t: typeof theme
) => T;

export function createThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: StyleFactory<T>
): () => T {
  // Styles are created once and memoised by StyleSheet.create.
  // The theme is static (no dark mode in MVP), so this is safe.
  const styles = StyleSheet.create(factory(theme));
  return () => styles;
}

// ─── 2. getShadowStyle ────────────────────────────────────────────────────────
// Re-exported from shadows.ts for convenience. Converts a ShadowValue to
// platform-appropriate React Native style props.
//
// Usage:
//   <View style={{ ...getShadowStyle(theme.shadows.medium), borderRadius: 18 }} />

export { getShadowStyle } from './shadows';

// ─── 3. responsiveFontSize ───────────────────────────────────────────────────
// Scales a font size linearly with the screen width, clamped to sensible
// bounds. Intended for Display and H1 sizes only, where the large values
// can overflow on narrow devices. Body text should never be scaled.
//
// Usage:
//   fontSize: responsiveFontSize(theme.typography.sizes.display)

const BASE_WIDTH = 390; // iPhone 14 logical width (design baseline)

export function responsiveFontSize(size: number): number {
  const { width } = Dimensions.get('window');
  const scale     = width / BASE_WIDTH;
  const scaled    = size * Math.min(scale, 1.2); // cap at 120% of base
  return Math.round(PixelRatio.roundToNearestPixel(scaled));
}

// ─── 4. getTextStyle ─────────────────────────────────────────────────────────
// Returns the textStyles preset for a given size key, with optional
// colour and alignment overrides. Useful for one-liner Text styling.
//
// Usage:
//   <Text style={getTextStyle('h3', theme.colors.text.secondary)} />

import { textStyles } from './typography';
import type { TextStylePreset } from './typography';

export function getTextStyle(
  key: keyof typeof textStyles,
  color?: string,
  textAlign?: 'left' | 'center' | 'right' | 'auto'
): TextStylePreset & { color?: string; textAlign?: string } {
  return {
    ...textStyles[key],
    ...(color     ? { color }     : {}),
    ...(textAlign ? { textAlign } : {}),
  };
}

// ─── 5. hitSlop ──────────────────────────────────────────────────────────────
// Generates a hitSlop object that expands a small touch target to meet
// the WCAG AA minimum of 44px (Design System §17).
//
// Usage:
//   <TouchableOpacity hitSlop={hitSlop(24)} onPress={...} />
//
// If the visual element is already ≥44px, pass 0 or omit hitSlop entirely.

export function hitSlop(
  visualSize: number
): { top: number; bottom: number; left: number; right: number } {
  const minTarget = theme.layout.touchTargetMin; // 44
  const expansion = Math.max(0, (minTarget - visualSize) / 2);
  return {
    top:    expansion,
    bottom: expansion,
    left:   expansion,
    right:  expansion,
  };
}

// ─── 6. platformShadow ────────────────────────────────────────────────────────
// Returns the correct shadow style for the current platform from a
// ShadowValue token. A named convenience alias for getShadowStyle.

export function platformShadow(
  shadow: ShadowValue
): Record<string, unknown> {
  if (Platform.OS === 'android') {
    return { elevation: shadow.elevation };
  }
  return {
    shadowColor:   shadow.shadowColor,
    shadowOffset:  shadow.shadowOffset,
    shadowOpacity: shadow.shadowOpacity,
    shadowRadius:  shadow.shadowRadius,
  };
}

// ─── 7. spacing helpers ───────────────────────────────────────────────────────
// Shorthand for padding/margin with spacing tokens.
// Avoids destructuring theme.spacing everywhere.

export const sp = theme.spacing;

/**
 * Returns a symmetric padding object.
 * Usage: <View style={pad(theme.spacing.xl)} />  → { padding: 24 }
 */
export function pad(value: number): { padding: number } {
  return { padding: value };
}

/**
 * Returns horizontal + vertical padding separately.
 * Usage: <View style={padXY(theme.spacing.xl, theme.spacing.md)} />
 */
export function padXY(
  horizontal: number,
  vertical: number
): { paddingHorizontal: number; paddingVertical: number } {
  return { paddingHorizontal: horizontal, paddingVertical: vertical };
}
