/**
 * Stroll Design System — Borders, Opacity, Z-Index & Layout Tokens
 * Version 1.0
 */

import type {
  BorderTokens,
  OpacityTokens,
  ZIndexTokens,
  LayoutTokens,
} from './types';

// ─── Border Tokens ────────────────────────────────────────────────────────────
// Design System §11 — Borders:
//   Default thickness: 1px
//   Color: #E6E6E6
//   Avoid thick borders. Whitespace should separate sections first.

export const borders: BorderTokens = {
  /** 1px — the only permitted border width */
  width: 1,

  /** #E6E6E6 — matches the neutral border color */
  color: '#E6E6E6',
} as const;

// ─── Opacity Tokens ───────────────────────────────────────────────────────────
// Used for disabled states, overlays, and subtle visual hierarchy cues.
// Never use opacity to communicate information without another visual signal.

export const opacity: OpacityTokens = {
  /** 0 — fully transparent (invisible but occupies space) */
  none:     0,

  /** 0.38 — disabled state for buttons, inputs, icons */
  disabled: 0.38,

  /** 0.5 — mid-level overlay (e.g. dimmed background behind bottom sheet) */
  medium:   0.5,

  /** 0.72 — heavier overlay (e.g. behind modal, darkened image overlay) */
  heavy:    0.72,

  /** 1 — fully opaque */
  full:     1,
} as const;

// ─── Z-Index Tokens ───────────────────────────────────────────────────────────
// Stroll uses only three elevation levels (§15): flat, card, modal.
// The z-index scale maps to those levels plus supporting UI layers.

export const zIndex: ZIndexTokens = {
  /** 0 — base content layer */
  base:        0,

  /** 10 — raised elements within a flat surface (e.g. card overlay text) */
  raised:      10,

  /** 20 — dropdowns, autocomplete lists */
  dropdown:    20,

  /** 30 — sticky headers, persistent navigation bars */
  sticky:      30,

  /** 40 — bottom sheets */
  bottomSheet: 40,

  /** 50 — modals and dialog overlays */
  modal:       50,

  /** 60 — toast notifications (must always float above modals) */
  toast:       60,

  /** 70 — tooltips (highest non-system layer) */
  tooltip:     70,
} as const;

// ─── Layout Tokens ────────────────────────────────────────────────────────────
// Structural layout constants derived from the Design System.
// These are not spacing values — they describe component dimensions and
// screen-level grid decisions.
//
// Design System §13 — Grid:
//   Standard Screen Padding:  24px
//   Large Sections:           32px
//   Component Gap:            16px
//
// Design System §17 — Accessibility:
//   Minimum touch target:     44px
//
// Design System §21 — Buttons:
//   Height:                   48px
//   Horizontal Padding:       20px
//
// Design System §23 — Search Bar:
//   Height:                   48px
//
// Design System §44 — Lists:
//   Minimum item height:      60px
//   Recommended:              72px
//
// Design System §12 — Iconography:
//   Stroke Width:             2px

export const layoutTokens: LayoutTokens = {
  /** 24px — horizontal padding applied to every screen edge */
  screenPaddingHorizontal: 24,

  /** 32px — padding for large, standalone page sections */
  sectionPaddingLarge: 32,

  /** 16px — gap between sibling components (cards, list items) */
  componentGap: 16,

  /** 44px — minimum tappable area for any interactive element (WCAG) */
  touchTargetMin: 44,

  /** 48px — height for all primary and secondary buttons */
  buttonHeight: 48,

  /** 48px — height for all text input fields */
  inputHeight: 48,

  /** 48px — height for the search bar component */
  searchBarHeight: 48,

  /** 60px — minimum height for list row items */
  listItemMinHeight: 60,

  /** 72px — recommended height for list row items */
  listItemHeight: 72,

  /** 2px — Lucide icon stroke width (must never change) */
  iconStrokeWidth: 2,
} as const;
