/**
 * Stroll Design System — Theme Types
 * Version 1.0
 *
 * Strongly-typed contracts for every design token.
 * Import these types whenever a component or utility needs to
 * reference a token by its structural shape rather than raw value.
 */

// ─── Color Tokens ────────────────────────────────────────────────────────────

export interface BrandColors {
  /** #FC5A03 — primary actions, active nav, selected chips, links, progress */
  primary: string;
  /** #E45214 — hover, pressed, active gradients, button feedback */
  interactive: string;
}

export interface NeutralColors {
  /** #FFFFFF — main app background */
  background: string;
  /** #FAFAFA — secondary background, search bar background */
  backgroundSecondary: string;
  /** #FFFFFF — card surface */
  surface: string;
  /** #EFEFEF — divider lines */
  divider: string;
  /** #E6E6E6 — border color */
  border: string;
}

export interface TextColors {
  /** #111111 — primary body text, headings */
  primary: string;
  /** #6B7280 — secondary / supporting text */
  secondary: string;
  /** #9CA3AF — tertiary / placeholder text */
  tertiary: string;
  /** #D1D5DB — disabled text */
  disabled: string;
}

export interface SemanticColors {
  /** #16A34A */
  success: string;
  /** #F59E0B */
  warning: string;
  /** #DC2626 */
  error: string;
  /** #2563EB */
  info: string;
}

export interface StaticColors {
  white: string;
  black: string;
  transparent: string;
}

export interface ColorTokens {
  brand: BrandColors;
  neutral: NeutralColors;
  text: TextColors;
  semantic: SemanticColors;
  static: StaticColors;
}

// ─── Typography Tokens ────────────────────────────────────────────────────────

export type FontFamily = 'heading' | 'body';

export interface FontFamilies {
  /** Plus Jakarta Sans — used for all headings */
  heading: string;
  /** Inter — used for all body text */
  body: string;
}

export type FontWeightKey =
  | 'regular'
  | 'medium'
  | 'semiBold'
  | 'bold';

export interface FontWeights {
  /** 400 */
  regular: '400';
  /** 500 */
  medium: '500';
  /** 600 */
  semiBold: '600';
  /** 700 */
  bold: '700';
}

export type FontSizeKey =
  | 'display'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'bodyLarge'
  | 'body'
  | 'bodySmall'
  | 'caption'
  | 'tiny';

export interface FontSizes {
  display: number;   // 48
  h1: number;        // 36
  h2: number;        // 30
  h3: number;        // 24
  h4: number;        // 20
  h5: number;        // 18
  bodyLarge: number; // 16
  body: number;      // 15
  bodySmall: number; // 14
  caption: number;   // 12
  tiny: number;      // 11
}

export interface LineHeights {
  display: number;
  h1: number;
  h2: number;
  h3: number;
  h4: number;
  h5: number;
  bodyLarge: number;
  body: number;
  bodySmall: number;
  caption: number;
  tiny: number;
}

export interface LetterSpacings {
  tight: number;
  normal: number;
  wide: number;
}

export interface TypographyTokens {
  families: FontFamilies;
  weights: FontWeights;
  sizes: FontSizes;
  lineHeights: LineHeights;
  letterSpacings: LetterSpacings;
}

// ─── Spacing Tokens ───────────────────────────────────────────────────────────

export interface SpacingTokens {
  /** 4px */
  xxs: number;
  /** 8px */
  xs: number;
  /** 12px */
  sm: number;
  /** 16px */
  md: number;
  /** 20px */
  lg: number;
  /** 24px — standard screen padding */
  xl: number;
  /** 32px — large sections */
  xxl: number;
  /** 40px */
  '3xl': number;
  /** 48px */
  '4xl': number;
  /** 56px */
  '5xl': number;
  /** 64px */
  '6xl': number;
  /** 72px */
  '7xl': number;
  /** 80px */
  '8xl': number;
}

// ─── Radius Tokens ────────────────────────────────────────────────────────────

export interface RadiusTokens {
  /** 14px — buttons */
  button: number;
  /** 14px — inputs */
  input: number;
  /** 18px — cards */
  card: number;
  /** 20px — images */
  image: number;
  /** 28px — bottom sheets */
  bottomSheet: number;
  /** 20px — dialogs */
  dialog: number;
  /** 9999px — fully circular (avatars, pills, search bar) */
  full: number;
  /** 0px — no rounding */
  none: number;
}

// ─── Shadow Tokens ────────────────────────────────────────────────────────────

export interface ShadowValue {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number; // Android elevation equivalent
}

export interface ShadowTokens {
  /** 0 1px 3px rgba(0,0,0,0.05) */
  small: ShadowValue;
  /** 0 6px 20px rgba(0,0,0,0.06) */
  medium: ShadowValue;
  /** 0 10px 30px rgba(0,0,0,0.08) */
  large: ShadowValue;
  /** No shadow — flat surfaces */
  none: ShadowValue;
}

// ─── Border Tokens ────────────────────────────────────────────────────────────

export interface BorderTokens {
  /** 1px */
  width: number;
  /** #E6E6E6 */
  color: string;
}

// ─── Animation Tokens ────────────────────────────────────────────────────────

export interface AnimationDurations {
  /** 150ms — micro interactions */
  fast: number;
  /** 200ms — standard transitions */
  normal: number;
  /** 300ms — larger transitions, page changes */
  slow: number;
}

export interface AnimationEasings {
  /** Standard ease-in-out */
  standard: readonly [number, number, number, number];
  /** Decelerate — items entering */
  decelerate: readonly [number, number, number, number];
  /** Accelerate — items leaving */
  accelerate: readonly [number, number, number, number];
}

export interface AnimationTokens {
  durations: AnimationDurations;
  easings: AnimationEasings;
}

// ─── Elevation Tokens ────────────────────────────────────────────────────────

export type ElevationLevel = 'flat' | 'card' | 'modal';

export interface ElevationTokens {
  /** Ground level — 0 */
  flat: number;
  /** Cards, surfaces — 2 */
  card: number;
  /** Modals, bottom sheets — 8 */
  modal: number;
}

// ─── Z-Index Tokens ───────────────────────────────────────────────────────────

export interface ZIndexTokens {
  /** Base content */
  base: number;
  /** Raised content, cards */
  raised: number;
  /** Dropdowns, overlays */
  dropdown: number;
  /** Sticky headers, nav bars */
  sticky: number;
  /** Bottom sheets */
  bottomSheet: number;
  /** Modals */
  modal: number;
  /** Toast notifications */
  toast: number;
  /** Tooltips */
  tooltip: number;
}

// ─── Opacity Tokens ───────────────────────────────────────────────────────────

export interface OpacityTokens {
  /** 0.0 — fully transparent */
  none: number;
  /** 0.38 — disabled state */
  disabled: number;
  /** 0.5 — medium overlay */
  medium: number;
  /** 0.72 — heavy overlay */
  heavy: number;
  /** 1.0 — fully opaque */
  full: number;
}

// ─── Layout Tokens ────────────────────────────────────────────────────────────

export interface LayoutTokens {
  /** Standard horizontal screen padding: 24px */
  screenPaddingHorizontal: number;
  /** Large section padding: 32px */
  sectionPaddingLarge: number;
  /** Gap between components: 16px */
  componentGap: number;
  /** Minimum touch target: 44px */
  touchTargetMin: number;
  /** Standard button height: 48px */
  buttonHeight: number;
  /** Standard input height: 48px */
  inputHeight: number;
  /** Search bar height: 48px */
  searchBarHeight: number;
  /** Bottom nav min item height: 60px */
  listItemMinHeight: number;
  /** Recommended list item height: 72px */
  listItemHeight: number;
  /** Icon stroke width: 2px */
  iconStrokeWidth: number;
}

// ─── Master Theme ─────────────────────────────────────────────────────────────

export interface StrollTheme {
  colors: ColorTokens;
  typography: TypographyTokens;
  spacing: SpacingTokens;
  radius: RadiusTokens;
  shadows: ShadowTokens;
  borders: BorderTokens;
  animation: AnimationTokens;
  elevation: ElevationTokens;
  zIndex: ZIndexTokens;
  opacity: OpacityTokens;
  layout: LayoutTokens;
}
