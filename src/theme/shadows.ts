/**
 * Stroll Design System — Shadow Tokens
 * Version 1.0
 *
 * Design System §10 — Shadows:
 *   Shadow Small  → 0 1px 3px rgba(0,0,0,0.05)
 *   Shadow Medium → 0 6px 20px rgba(0,0,0,0.06)
 *   Shadow Large  → 0 10px 30px rgba(0,0,0,0.08)
 *
 * Rules:
 * - Heavy shadows are never used. The interface must feel light.
 * - Only three elevation levels exist: flat, card, modal (§15).
 * - Shadows are split by platform:
 *     iOS    → shadowColor, shadowOffset, shadowOpacity, shadowRadius
 *     Android → elevation (maps to an approximate equivalent)
 *
 * React Native does not support CSS box-shadow shorthand.
 * The ShadowValue type encodes both platform representations.
 *
 * Design System §15 — Elevation Levels:
 *   Flat   → background, dividers, flat surfaces
 *   Card   → cards, input fields
 *   Modal  → bottom sheets, modals, toasts
 */

import type { ShadowTokens, ShadowValue, ElevationTokens } from './types';

// ─── Shadow Presets ───────────────────────────────────────────────────────────

export const shadows: ShadowTokens = {
  /**
   * No shadow — flat ground-level surfaces.
   */
  none: {
    shadowColor:   '#000000',
    shadowOffset:  { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius:  0,
    elevation:     0,
  },

  /**
   * Shadow Small — subtle lift.
   * CSS equivalent: 0 1px 3px rgba(0,0,0,0.05)
   * Used for: input fields, chips, minor surface lifts.
   */
  small: {
    shadowColor:   '#000000',
    shadowOffset:  { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius:  3,
    elevation:     1,
  },

  /**
   * Shadow Medium — cards.
   * CSS equivalent: 0 6px 20px rgba(0,0,0,0.06)
   * Used for: ExperienceCard, PlaceCard, CollectionCard.
   */
  medium: {
    shadowColor:   '#000000',
    shadowOffset:  { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius:  20,
    elevation:     3,
  },

  /**
   * Shadow Large — modals and bottom sheets.
   * CSS equivalent: 0 10px 30px rgba(0,0,0,0.08)
   * Used for: bottom sheets, modals, toasts.
   */
  large: {
    shadowColor:   '#000000',
    shadowOffset:  { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius:  30,
    elevation:     8,
  },
} as const;

// ─── Elevation Tokens ─────────────────────────────────────────────────────────
// Android elevation values that correspond to each shadow level.

export const elevation: ElevationTokens = {
  flat:  0,
  card:  3,
  modal: 8,
} as const;

// ─── Helper — getShadowStyle ──────────────────────────────────────────────────
// Returns platform-compatible shadow style props from a ShadowValue.
// Spread the result directly into a StyleSheet object.
//
// Usage:
//   const styles = StyleSheet.create({
//     card: { ...getShadowStyle(shadows.medium), borderRadius: radius.card }
//   });

import { Platform } from 'react-native';

export function getShadowStyle(shadow: ShadowValue): Record<string, unknown> {
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
