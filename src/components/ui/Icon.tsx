/**
 * Stroll UI — Icon
 * src/components/ui/Icon.tsx
 *
 * Design System §12 — Iconography:
 *   Library: Lucide Icons
 *   Stroke Width: 2px (fixed, never changes)
 *   Icons should remain consistent throughout the application.
 *   Do not mix icon libraries.
 *   Icons should always support text rather than replacing it.
 *
 * This wrapper enforces:
 *   - Lucide as the only icon source (pass the icon component in, not a name string,
 *     so TypeScript can verify it's a real Lucide icon and tree-shaking still works)
 *   - theme.layout.iconStrokeWidth (2px) as the only allowed stroke width
 *   - theme color tokens for icon color — no raw hex values at call sites
 *   - a consistent sizing scale tied to typography, not arbitrary pixel values
 *
 * Required dependency (install in Sprint 3 commands):
 *   npx expo install lucide-react-native react-native-svg
 *
 * Usage:
 *   import { Heart, Search } from 'lucide-react-native';
 *   <Icon icon={Heart} size="md" color={theme.colors.brand.primary} />
 *   <Icon icon={Search} size="lg" />
 */

import React from 'react';
import { theme } from '@/theme';
import type { LucideIcon } from 'lucide-react-native';

// ─── Size Scale ────────────────────────────────────────────────────────────────
// Tied to common icon usage contexts across the Design System component list
// (chips, buttons, search bar, top app bar, bottom nav, avatars).

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const ICON_SIZES: Record<IconSize, number> = {
  xs: 14, // inline with caption/tiny text
  sm: 16, // inline with body small / chips
  md: 20, // default — buttons, list rows, inputs
  lg: 24, // top app bar actions, bottom nav
  xl: 32, // empty states, featured moments
};

// ─── Props ─────────────────────────────────────────────────────────────────────

export interface IconProps {
  /** The Lucide icon component itself, e.g. `Heart` from 'lucide-react-native'. */
  icon: LucideIcon;
  /** Token-based size. Defaults to 'md' (20px). */
  size?: IconSize;
  /** Theme color. Defaults to theme.colors.text.primary. */
  color?: string;
  /** Accessibility label — required when the icon is the only content of a control. */
  accessibilityLabel?: string;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function Icon({
  icon: LucideIconComponent,
  size = 'md',
  color = theme.colors.text.primary,
  accessibilityLabel,
}: IconProps) {
  return (
    <LucideIconComponent
      size={ICON_SIZES[size]}
      color={color}
      strokeWidth={theme.layout.iconStrokeWidth}
      accessibilityLabel={accessibilityLabel}
    />
  );
}

// Export the size map so other components (e.g. Button) can compute
// matching touch targets or spacing relative to icon size.
export { ICON_SIZES };
