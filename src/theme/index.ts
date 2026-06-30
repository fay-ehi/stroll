/**
 * Stroll Design System — Master Theme
 * Version 1.0
 *
 * This is the single import point for all design tokens.
 * Every component, screen, and utility must import from here.
 *
 * Usage:
 *   import { theme } from '@/theme';
 *   const cardStyle = { borderRadius: theme.radius.card };
 *
 * Or import individual token modules for tighter tree-shaking:
 *   import { colors } from '@/theme/colors';
 *   import { spacing } from '@/theme/spacing';
 *
 * Architecture decisions:
 * - The theme object is a plain constant — no React context needed for
 *   the static light-mode theme. Dark mode (planned for post-MVP) will
 *   extend this via a ThemeProvider that swaps color tokens only (§57).
 * - All values are deeply readonly via `as const` in each module.
 * - No values are hardcoded anywhere in the app — only this file and its
 *   sub-modules contain raw visual values.
 */

import { colors }       from './colors';
import { typography }   from './typography';
import { spacing }      from './spacing';
import { radius }       from './radius';
import { shadows, elevation } from './shadows';
import { borders }      from './layout';
import { opacity }      from './layout';
import { zIndex }       from './layout';
import { layoutTokens } from './layout';
import { animation }    from './animation';

import type { StrollTheme } from './types';

export const theme: StrollTheme = {
  colors,
  typography,
  spacing,
  radius,
  shadows,
  borders,
  animation,
  elevation,
  zIndex,
  opacity,
  layout: layoutTokens,
} as const;

// ─── Named Re-exports ─────────────────────────────────────────────────────────
// Allow individual module imports for tree-shaking without going through
// the master theme object. Both patterns are supported.

export { colors }                    from './colors';
export { typography, textStyles, FONT_FAMILY } from './typography';
export { spacing, layout as spacingLayout }    from './spacing';
export { radius }                    from './radius';
export { shadows, elevation, getShadowStyle }  from './shadows';
export { borders, opacity, zIndex, layoutTokens } from './layout';
export { animation, useReducedMotion,
         DURATION_FAST, DURATION_NORMAL, DURATION_SLOW,
         EASING_STANDARD, EASING_DECELERATE, EASING_ACCELERATE } from './animation';

export type {
  StrollTheme,
  ColorTokens,
  BrandColors,
  NeutralColors,
  TextColors,
  SemanticColors,
  StaticColors,
  TypographyTokens,
  FontSizeKey,
  FontWeightKey,
  FontFamily,
  SpacingTokens,
  RadiusTokens,
  ShadowTokens,
  ShadowValue,
  BorderTokens,
  AnimationTokens,
  AnimationDurations,
  ElevationTokens,
  ElevationLevel,
  ZIndexTokens,
  OpacityTokens,
  LayoutTokens,
} from './types';

export type { TextStylePreset, FontFamilyKey } from './typography';
