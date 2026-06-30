/**
 * Stroll Design System — Spacing Tokens
 * Version 1.0
 *
 * Stroll uses an 8-point spacing grid.
 * Base unit: 8px
 *
 * Rules:
 * - Only use values from this scale. Never introduce arbitrary values.
 * - Consistency is more important than perfection.
 * - 4px (xxs) is the only sub-8 value, used for tight internal padding.
 *
 * Named scale maps to pixel values:
 *   xxs  →  4
 *   xs   →  8
 *   sm   →  12
 *   md   →  16
 *   lg   →  20
 *   xl   →  24  (standard screen horizontal padding)
 *   xxl  →  32  (large section padding)
 *   3xl  →  40
 *   4xl  →  48
 *   5xl  →  56
 *   6xl  →  64
 *   7xl  →  72
 *   8xl  →  80
 */

import type { SpacingTokens } from './types';

export const spacing: SpacingTokens = {
  xxs:  4,
  xs:   8,
  sm:   12,
  md:   16,
  lg:   20,
  xl:   24,
  xxl:  32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 56,
  '6xl': 64,
  '7xl': 72,
  '8xl': 80,
} as const;

// ─── Semantic Spacing Aliases ─────────────────────────────────────────────────
// Named aliases for layout-level spacing decisions.
// Use these in screen-level layout, not in tight component internals.

export const layout = {
  /** Standard horizontal padding on every screen: 24px */
  screenPaddingHorizontal: spacing.xl,

  /** Large section padding: 32px */
  sectionPaddingLarge: spacing.xxl,

  /** Gap between sibling components (cards, list items): 16px */
  componentGap: spacing.md,

  /** Vertical section gap (between major page sections): 32px */
  sectionGap: spacing.xxl,

  /** Tight internal padding inside a component (e.g. chip): 8px */
  componentInternalPadding: spacing.xs,
} as const;
