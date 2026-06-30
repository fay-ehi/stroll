/**
 * Stroll Design System — Animation Tokens
 * Version 1.0
 *
 * Design System §14 — Motion Philosophy:
 *   "Fast enough to feel responsive. Slow enough to feel natural."
 *   Standard durations: 150ms, 200ms, 300ms.
 *   Use easing rather than linear movement.
 *   Avoid unnecessary animations.
 *
 * Design Philosophy §18 — Motion Philosophy:
 *   Animations should answer one of: What changed? Where did it go?
 *   What should the user notice?
 *   They should feel subtle, smooth, responsive, and natural.
 *   Never dramatic or distracting.
 *   Users should barely notice the animation itself.
 *
 * Easing curves follow Material Design / iOS Human Interface conventions:
 *   standard    — general purpose transitions
 *   decelerate  — elements entering the screen
 *   accelerate  — elements leaving the screen
 *
 * For React Native Reanimated (worklets), use these values with
 * Easing.bezier(x1, y1, x2, y2) from 'react-native-reanimated'.
 * For Animated API, use Easing.bezier from 'react-native'.
 */

import type { AnimationTokens } from './types';

export const animation: AnimationTokens = {
  durations: {
    /** 150ms — micro interactions: button press feedback, chip selection */
    fast:   150,

    /** 200ms — standard transitions: tab switches, modal appears, icon changes */
    normal: 200,

    /** 300ms — larger transitions: page changes, bottom sheet appear/dismiss */
    slow:   300,
  },

  easings: {
    /**
     * Standard easing — general purpose.
     * Used for: color transitions, opacity fades, most state changes.
     * Cubic bezier: ease-in-out character.
     */
    standard:   [0.4, 0.0, 0.2, 1.0] as const,

    /**
     * Decelerate — elements entering the screen.
     * Starts fast, slows to rest. Feels natural for things appearing.
     * Used for: bottom sheets sliding up, modals appearing, toasts entering.
     */
    decelerate: [0.0, 0.0, 0.2, 1.0] as const,

    /**
     * Accelerate — elements leaving the screen.
     * Starts slow, exits quickly. Feels like flicking something away.
     * Used for: bottom sheets dismissing, modals closing, toasts leaving.
     */
    accelerate: [0.4, 0.0, 1.0, 1.0] as const,
  },
} as const;

// ─── Reduced Motion ───────────────────────────────────────────────────────────
// Respect the user's system preference for reduced motion (§17 Accessibility).
// Import and use in animated components to honour accessibility settings.
//
// Usage:
//   import { useReducedMotion } from './animation';
//   const shouldReduce = useReducedMotion();
//   const duration = shouldReduce ? 0 : animation.durations.normal;

import { useReducedMotion as useReanimatedReducedMotion } from 'react-native-reanimated';

export function useReducedMotion(): boolean {
  // Reanimated exposes this hook — returns true when the system
  // accessibility setting "Reduce Motion" is enabled.
  return useReanimatedReducedMotion();
}

// ─── Duration Helpers ─────────────────────────────────────────────────────────
// Convenience access without importing the full object.

export const DURATION_FAST   = animation.durations.fast;
export const DURATION_NORMAL = animation.durations.normal;
export const DURATION_SLOW   = animation.durations.slow;

export const EASING_STANDARD   = animation.easings.standard;
export const EASING_DECELERATE = animation.easings.decelerate;
export const EASING_ACCELERATE = animation.easings.accelerate;
