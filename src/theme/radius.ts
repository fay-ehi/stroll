/**
 * Stroll Design System — Radius Tokens
 * Version 1.0
 *
 * Rounded corners communicate warmth.
 * Stroll prioritises warmth over precision.
 * Components should feel approachable without appearing playful.
 *
 * Design System §9 — Corner Radius:
 *   Buttons      14px
 *   Inputs       14px
 *   Cards        18px
 *   Images       20px
 *   Bottom Sheets 28px
 *   Dialogs      20px
 *   Profile Avatars → full circle
 */

import type { RadiusTokens } from './types';

export const radius: RadiusTokens = {
  /** 0px — no rounding, used for edge-to-edge elements */
  none: 0,

  /** 14px — buttons and text inputs */
  button: 14,

  /** 14px — input fields (same as button by design) */
  input: 14,

  /** 18px — all card surfaces */
  card: 18,

  /** 20px — image corners within cards and standalone images */
  image: 20,

  /** 20px — dialogs / modals */
  dialog: 20,

  /** 28px — bottom sheets (top corners only in practice) */
  bottomSheet: 28,

  /**
   * 9999px — fully circular.
   * Used for: profile avatars, floating action buttons, pill-shaped search bars.
   * React Native resolves any value larger than half the element's
   * smaller dimension as a full circle.
   */
  full: 9999,
} as const;
