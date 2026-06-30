/**
 * Stroll UI — Avatar
 * src/components/ui/Avatar.tsx
 *
 * Design System §30 — Avatars:
 *   Sizes: Small, Medium, Large, Extra Large
 *   Behavior: Always circular. Fallback displays initials. Never stretch images.
 *
 * Corner Radius: theme.radius.full (circular, per §9 "Profile Avatars → Circular")
 *
 * The online indicator is not explicitly in the Design System component list,
 * but is requested in this sprint's scope and is a common Creator/Profile
 * pattern (§27 Creator Card references "Followers", profile-adjacent surfaces).
 * Implemented using semantic success color, sized proportionally to the avatar.
 */

import React, { useState } from 'react';
import { View, Image, StyleSheet, type ImageSourcePropType } from 'react-native';
import { theme } from '@/theme';
import { Caption, BodySmall, Body } from './Typography';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

export interface AvatarProps {
  /** Remote or local image source. If omitted or fails to load, initials are shown. */
  source?: ImageSourcePropType;
  /** Full name used to derive initials when no image is available. */
  name?: string;
  /** Token-based size. Defaults to 'md'. */
  size?: AvatarSize;
  /** Shows a small dot indicating online/active status. */
  showOnlineIndicator?: boolean;
  /** Accessibility label override. Defaults to the person's name. */
  accessibilityLabel?: string;
}

// ─── Size Map ──────────────────────────────────────────────────────────────────
// Derived from common usage contexts: Small (list rows), Medium (cards),
// Large (profile headers), Extra Large (profile hero).
// indicatorBorderWidth is an explicit design value per size (the white ring
// separating the online dot from the avatar image) rather than a computed
// formula, so each size's proportions are intentional and auditable.

const SIZE_MAP: Record<
  AvatarSize,
  { diameter: number; indicatorSize: number; indicatorBorderWidth: number; textComponent: typeof Caption }
> = {
  sm: { diameter: 32, indicatorSize: 9,  indicatorBorderWidth: theme.borders.width + 1,     textComponent: Caption },
  md: { diameter: 44, indicatorSize: 11, indicatorBorderWidth: theme.borders.width + 1,     textComponent: BodySmall },
  lg: { diameter: 64, indicatorSize: 14, indicatorBorderWidth: theme.borders.width + 1.5,   textComponent: Body },
  xl: { diameter: 96, indicatorSize: 18, indicatorBorderWidth: theme.borders.width + 2,     textComponent: Body },
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase();
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase();
}

// Deterministic background tint for initials avatars, derived from the name
// so the same user always gets the same color. Uses only theme-approved
// neutral/semantic tones to stay within the palette — never arbitrary hues.
const INITIALS_BACKGROUNDS = [
  theme.colors.brand.primary,
  theme.colors.semantic.info,
  theme.colors.semantic.success,
  theme.colors.semantic.warning,
  theme.colors.text.secondary,
];

function getInitialsBackground(name?: string): string {
  if (!name) return theme.colors.text.tertiary;
  const hash = name
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return INITIALS_BACKGROUNDS[hash % INITIALS_BACKGROUNDS.length]!;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function Avatar({
  source,
  name,
  size = 'md',
  showOnlineIndicator = false,
  accessibilityLabel,
}: AvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const { diameter, indicatorSize, indicatorBorderWidth, textComponent: TextComponent } = SIZE_MAP[size];
  const showImage = source && !imageFailed;

  return (
    <View
      style={{ width: diameter, height: diameter }}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel ?? name ?? 'User avatar'}
    >
      {showImage ? (
        <Image
          source={source}
          style={[
            styles.image,
            { width: diameter, height: diameter, borderRadius: theme.radius.full },
          ]}
          // Never stretch images — cover ensures the circle fills correctly.
          resizeMode="cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <View
          style={[
            styles.initialsContainer,
            {
              width: diameter,
              height: diameter,
              borderRadius: theme.radius.full,
              backgroundColor: getInitialsBackground(name),
            },
          ]}
        >
          <TextComponent color={theme.colors.static.white} style={styles.initialsText}>
            {getInitials(name)}
          </TextComponent>
        </View>
      )}

      {showOnlineIndicator ? (
        <View
          style={[
            styles.onlineIndicator,
            {
              width: indicatorSize,
              height: indicatorSize,
              borderRadius: theme.radius.full,
              borderWidth: indicatorBorderWidth,
            },
          ]}
        />
      ) : null}
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  image: {
    backgroundColor: theme.colors.neutral.backgroundSecondary,
  },
  initialsContainer: {
    alignItems:     'center',
    justifyContent: 'center',
  },
  initialsText: {
    fontWeight: theme.typography.weights.semiBold,
  },
  onlineIndicator: {
    position:        'absolute',
    bottom:          0,
    right:           0,
    backgroundColor: theme.colors.semantic.success,
    borderColor:     theme.colors.neutral.background,
  },
});
