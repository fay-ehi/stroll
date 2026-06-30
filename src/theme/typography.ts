/**
 * Stroll Design System — Typography Tokens
 * Version 1.0
 *
 * Rules:
 * - Headings always use Plus Jakarta Sans (600 or 700).
 * - Body text always uses Inter (400, 500, or 600).
 * - Never introduce additional font families.
 * - Line heights remain generous to maximise readability.
 * - Text should never compete with imagery.
 *
 * Usage with expo-font:
 *   Fonts must be loaded via useFonts() in your root layout.
 *   The family strings here correspond to the font names registered
 *   with Expo's font loader. See fonts.ts for the exact asset map.
 */

import type { TypographyTokens } from './types';

// ─── Font Family Keys ─────────────────────────────────────────────────────────
// These must exactly match the names passed to useFonts().

export const FONT_FAMILY = {
  /**
   * Plus Jakarta Sans — headings only.
   * Weights used: 600 (SemiBold), 700 (Bold).
   */
  headingRegular:  'PlusJakartaSans-SemiBold',
  headingBold:     'PlusJakartaSans-Bold',

  /**
   * Inter — all body text.
   * Weights used: 400 (Regular), 500 (Medium), 600 (SemiBold).
   */
  bodyRegular:     'Inter-Regular',
  bodyMedium:      'Inter-Medium',
  bodySemiBold:    'Inter-SemiBold',
} as const;

export type FontFamilyKey = keyof typeof FONT_FAMILY;

// ─── Typography Tokens ────────────────────────────────────────────────────────

export const typography: TypographyTokens = {
  // ── Font Families ────────────────────────────────────────────────────────
  families: {
    heading: 'PlusJakartaSans-SemiBold',
    body:    'Inter-Regular',
  },

  // ── Font Weights ─────────────────────────────────────────────────────────
  // React Native accepts weight as a string literal.
  weights: {
    regular:  '400',
    medium:   '500',
    semiBold: '600',
    bold:     '700',
  },

  // ── Font Sizes (px → React Native points, 1:1 on standard density) ───────
  sizes: {
    display:   48,
    h1:        36,
    h2:        30,
    h3:        24,
    h4:        20,
    h5:        18,
    bodyLarge: 16,
    body:      15,
    bodySmall: 14,
    caption:   12,
    tiny:      11,
  },

  // ── Line Heights ─────────────────────────────────────────────────────────
  // Generous line heights aid readability and create the calm, editorial feel
  // defined in the Design Philosophy. Formula: size × ratio.
  // Heading ratio ≈ 1.2–1.3 | Body ratio ≈ 1.5–1.6
  lineHeights: {
    display:   58,  // 48 × 1.21
    h1:        44,  // 36 × 1.22
    h2:        38,  // 30 × 1.27
    h3:        32,  // 24 × 1.33
    h4:        28,  // 20 × 1.40
    h5:        26,  // 18 × 1.44
    bodyLarge: 26,  // 16 × 1.63
    body:      24,  // 15 × 1.60
    bodySmall: 22,  // 14 × 1.57
    caption:   18,  // 12 × 1.50
    tiny:      16,  // 11 × 1.45
  },

  // ── Letter Spacings ───────────────────────────────────────────────────────
  // React Native uses numerical values for letterSpacing (in points).
  letterSpacings: {
    tight:  -0.5,
    normal:  0,
    wide:    0.5,
  },
} as const;

// ─── Text Style Presets ───────────────────────────────────────────────────────
// Ready-to-spread style objects for every typographic role.
// Each preset includes fontFamily, fontSize, lineHeight, and fontWeight.
// Import and spread into a StyleSheet or NativeWind style object.

// Use the constant defined above directly — no import needed.
const F = FONT_FAMILY;

export type TextStylePreset = {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  fontWeight: '400' | '500' | '600' | '700';
  letterSpacing: number;
};

export const textStyles: Record<string, TextStylePreset> = {
  // ── Heading Presets ──────────────────────────────────────────────────────
  display: {
    fontFamily:    F.headingBold,
    fontSize:      typography.sizes.display,
    lineHeight:    typography.lineHeights.display,
    fontWeight:    typography.weights.bold,
    letterSpacing: typography.letterSpacings.tight,
  },
  h1: {
    fontFamily:    F.headingBold,
    fontSize:      typography.sizes.h1,
    lineHeight:    typography.lineHeights.h1,
    fontWeight:    typography.weights.bold,
    letterSpacing: typography.letterSpacings.tight,
  },
  h2: {
    fontFamily:    F.headingBold,
    fontSize:      typography.sizes.h2,
    lineHeight:    typography.lineHeights.h2,
    fontWeight:    typography.weights.bold,
    letterSpacing: typography.letterSpacings.tight,
  },
  h3: {
    fontFamily:    F.headingRegular,
    fontSize:      typography.sizes.h3,
    lineHeight:    typography.lineHeights.h3,
    fontWeight:    typography.weights.semiBold,
    letterSpacing: typography.letterSpacings.normal,
  },
  h4: {
    fontFamily:    F.headingRegular,
    fontSize:      typography.sizes.h4,
    lineHeight:    typography.lineHeights.h4,
    fontWeight:    typography.weights.semiBold,
    letterSpacing: typography.letterSpacings.normal,
  },
  h5: {
    fontFamily:    F.headingRegular,
    fontSize:      typography.sizes.h5,
    lineHeight:    typography.lineHeights.h5,
    fontWeight:    typography.weights.semiBold,
    letterSpacing: typography.letterSpacings.normal,
  },

  // ── Body Presets ─────────────────────────────────────────────────────────
  bodyLarge: {
    fontFamily:    F.bodyRegular,
    fontSize:      typography.sizes.bodyLarge,
    lineHeight:    typography.lineHeights.bodyLarge,
    fontWeight:    typography.weights.regular,
    letterSpacing: typography.letterSpacings.normal,
  },
  bodyLargeMedium: {
    fontFamily:    F.bodyMedium,
    fontSize:      typography.sizes.bodyLarge,
    lineHeight:    typography.lineHeights.bodyLarge,
    fontWeight:    typography.weights.medium,
    letterSpacing: typography.letterSpacings.normal,
  },
  bodyLargeSemiBold: {
    fontFamily:    F.bodySemiBold,
    fontSize:      typography.sizes.bodyLarge,
    lineHeight:    typography.lineHeights.bodyLarge,
    fontWeight:    typography.weights.semiBold,
    letterSpacing: typography.letterSpacings.normal,
  },
  body: {
    fontFamily:    F.bodyRegular,
    fontSize:      typography.sizes.body,
    lineHeight:    typography.lineHeights.body,
    fontWeight:    typography.weights.regular,
    letterSpacing: typography.letterSpacings.normal,
  },
  bodyMedium: {
    fontFamily:    F.bodyMedium,
    fontSize:      typography.sizes.body,
    lineHeight:    typography.lineHeights.body,
    fontWeight:    typography.weights.medium,
    letterSpacing: typography.letterSpacings.normal,
  },
  bodySemiBold: {
    fontFamily:    F.bodySemiBold,
    fontSize:      typography.sizes.body,
    lineHeight:    typography.lineHeights.body,
    fontWeight:    typography.weights.semiBold,
    letterSpacing: typography.letterSpacings.normal,
  },
  bodySmall: {
    fontFamily:    F.bodyRegular,
    fontSize:      typography.sizes.bodySmall,
    lineHeight:    typography.lineHeights.bodySmall,
    fontWeight:    typography.weights.regular,
    letterSpacing: typography.letterSpacings.normal,
  },
  bodySmallMedium: {
    fontFamily:    F.bodyMedium,
    fontSize:      typography.sizes.bodySmall,
    lineHeight:    typography.lineHeights.bodySmall,
    fontWeight:    typography.weights.medium,
    letterSpacing: typography.letterSpacings.normal,
  },
  bodySmallSemiBold: {
    fontFamily:    F.bodySemiBold,
    fontSize:      typography.sizes.bodySmall,
    lineHeight:    typography.lineHeights.bodySmall,
    fontWeight:    typography.weights.semiBold,
    letterSpacing: typography.letterSpacings.normal,
  },

  // ── Supporting Presets ───────────────────────────────────────────────────
  caption: {
    fontFamily:    F.bodyRegular,
    fontSize:      typography.sizes.caption,
    lineHeight:    typography.lineHeights.caption,
    fontWeight:    typography.weights.regular,
    letterSpacing: typography.letterSpacings.normal,
  },
  captionMedium: {
    fontFamily:    F.bodyMedium,
    fontSize:      typography.sizes.caption,
    lineHeight:    typography.lineHeights.caption,
    fontWeight:    typography.weights.medium,
    letterSpacing: typography.letterSpacings.normal,
  },
  tiny: {
    fontFamily:    F.bodyRegular,
    fontSize:      typography.sizes.tiny,
    lineHeight:    typography.lineHeights.tiny,
    fontWeight:    typography.weights.regular,
    letterSpacing: typography.letterSpacings.normal,
  },
  tinyMedium: {
    fontFamily:    F.bodyMedium,
    fontSize:      typography.sizes.tiny,
    lineHeight:    typography.lineHeights.tiny,
    fontWeight:    typography.weights.medium,
    letterSpacing: typography.letterSpacings.normal,
  },

  // ── Button Label ─────────────────────────────────────────────────────────
  // Buttons always use 600 weight body text (matches Design System §21)
  buttonLabel: {
    fontFamily:    F.bodySemiBold,
    fontSize:      typography.sizes.body,
    lineHeight:    typography.lineHeights.body,
    fontWeight:    typography.weights.semiBold,
    letterSpacing: typography.letterSpacings.normal,
  },

  // ── Label ────────────────────────────────────────────────────────────────
  label: {
    fontFamily:    F.bodyMedium,
    fontSize:      typography.sizes.bodySmall,
    lineHeight:    typography.lineHeights.bodySmall,
    fontWeight:    typography.weights.medium,
    letterSpacing: typography.letterSpacings.wide,
  },
} as const;
