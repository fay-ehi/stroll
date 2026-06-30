/**
 * Stroll Design System — Color Tokens
 * Version 1.0
 *
 * Single source of truth for every color value in the application.
 * Import from here exclusively. Never hardcode hex values in components.
 *
 * Rules enforced by this system:
 * - Orange (#FC5A03) guides attention; it never dominates a screen.
 * - Semantic colors communicate status only; they never replace brand color.
 * - Neutral colors dominate every screen.
 */

import type { ColorTokens } from './types';

export const colors: ColorTokens = {
  // ─── Brand ─────────────────────────────────────────────────────────────────
  brand: {
    /**
     * Primary brand orange.
     * Used for: primary buttons, active navigation, selected chips,
     * links, progress indicators, toggle ON, active icons, primary actions.
     * Orange should guide attention — never dominate a screen.
     */
    primary: '#FC5A03',

    /**
     * Interactive orange — slightly darker.
     * Used for: hover state, pressed state, active gradients (rare),
     * button feedback. Users should rarely perceive this as a distinct color.
     */
    interactive: '#E45214',
  },

  // ─── Neutral ───────────────────────────────────────────────────────────────
  neutral: {
    /** Main app background. White creates trust and breathing room. */
    background: '#FFFFFF',

    /** Secondary background. Used for search bars, input fills, list rows. */
    backgroundSecondary: '#FAFAFA',

    /** Card surface. Same as background — cards lift via shadow, not color. */
    surface: '#FFFFFF',

    /** Divider line. Subtle horizontal rule between content sections. */
    divider: '#EFEFEF',

    /** Border color. Used for input outlines, card outlines, separators. */
    border: '#E6E6E6',
  },

  // ─── Text ──────────────────────────────────────────────────────────────────
  text: {
    /** Primary text. Near-black for maximum readability without harshness. */
    primary: '#111111',

    /** Secondary text. Supporting information, metadata, labels. */
    secondary: '#6B7280',

    /** Tertiary text. Placeholders, hints, captions at lowest hierarchy. */
    tertiary: '#9CA3AF',

    /** Disabled text. Form fields and actions in an unavailable state. */
    disabled: '#D1D5DB',
  },

  // ─── Semantic ──────────────────────────────────────────────────────────────
  // These colors communicate system status only.
  // They must never replace the primary brand color.
  semantic: {
    success: '#16A34A',
    warning: '#F59E0B',
    error:   '#DC2626',
    info:    '#2563EB',
  },

  // ─── Static ────────────────────────────────────────────────────────────────
  // Raw values used where semantic naming would obscure intent (e.g. overlays).
  static: {
    white:       '#FFFFFF',
    black:       '#000000',
    transparent: 'transparent',
  },
} as const;

// ─── Convenience Re-exports ───────────────────────────────────────────────────
// Import individual palettes when you only need part of the color system.

export const brandColors    = colors.brand;
export const neutralColors  = colors.neutral;
export const textColors     = colors.text;
export const semanticColors = colors.semantic;
export const staticColors   = colors.static;
