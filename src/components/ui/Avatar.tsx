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
 *
 * Sprint 1 Prompt 4 fix: `imageFailed` used to only ever be set to `true` via
 * `onError`, with nothing to reset it — so once an image failed to load on a
 * given Avatar instance, that instance showed initials forever, even after
 * being re-rendered with a new, perfectly valid `source` (e.g. right after
 * uploading a new avatar). Now resets whenever the source itself changes.
 */

import React, { useState, useEffect } from 'react';
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

/**
 * Extracts a stable, comparable key from an ImageSourcePropType so the
 * failed-state effect below can tell "the same source, still failing" apart
 * from "a genuinely new source, worth trying again". Handles the shapes
 * this component is ever actually given: a `{ uri }` object, undefined, or
 * (defensively) a local require() number/array.
 */
function getSourceKey(source?: ImageSourcePropType): string | number | undefined {
  if (!source) return undefined;
  if (typeof source === 'number') return source;
  if (Array.isArray(source)) {
    return source.map((s) => (typeof s === 'object' && s && 'uri' in s ? s.uri : '')).join('|');
  }
  return 'uri' in source ? source.uri : undefined;
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

  // Keyed on the derived source identity (a primitive), not the `source`
  // prop itself — that's a new object reference on every render even when
  // it's the same URI, which would reset imageFailed on every keystroke of
  // an unrelated state update elsewhere in the tree.
  useEffect(() => {
    setImageFailed(false);
  }, [getSourceKey(source)]);

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
