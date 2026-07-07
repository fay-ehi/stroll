/**
 * Stroll — Place Image
 * src/components/places/PlaceImage.tsx
 *
 * Reusable image display for anything showing a place's hero image or
 * gallery photos (future Place Card, Place Detail Page, etc.) — not a
 * screen itself, just the image-handling piece this sprint asks for.
 *
 * Handles:
 *   - Missing URL (place has no hero_image yet) → fallback placeholder
 *   - Failed load (broken URL, offline) → same fallback placeholder
 *   - Configurable aspect ratio (defaults to 4:3 — the Design System
 *     doesn't specify one for Place Card cover images, so this is a
 *     product-decision default, easy to override per usage)
 *   - Accessible: fallback and image both carry the same accessibility
 *     label so a screen reader user gets a meaningful description either way
 *
 * Deliberately does NOT animate the fallback with the shimmer Skeleton
 * pattern — that's reserved for PlaceCardSkeleton (shown while the *query*
 * is loading, before any URL exists at all). This component's own
 * "no image" state is a static placeholder, which is calmer for the very
 * common case of a place that simply doesn't have a photo yet.
 *
 * Sprint 2 Prompt 1: the failed-load-with-reset-on-uri-change state below
 * used to be a local `useState` + `useEffect` pair here (and a near-
 * identical one in Avatar.tsx). It's now the shared `useImageLoadFailed`
 * hook (src/hooks/index.ts) — ExperienceCard's cover image needed the
 * exact same behavior, and copy-pasting it a third time would be the
 * "duplicated logic" this codebase's architecture rules call out.
 */

import React from 'react';
import { View, Image, StyleSheet, type ViewStyle } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { theme } from '@/theme';
import { Icon } from '@/components/ui';
import { useImageLoadFailed } from '@/hooks';

export interface PlaceImageProps {
  uri: string | null | undefined;
  /** Required — should describe the place (e.g. the place's name), not just "image". */
  accessibilityLabel: string;
  /** Width / height. Defaults to 4:3 — override for square grids, wide hero banners, etc. */
  aspectRatio?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

const DEFAULT_ASPECT_RATIO = 4 / 3;

export function PlaceImage({
  uri,
  accessibilityLabel,
  aspectRatio = DEFAULT_ASPECT_RATIO,
  borderRadius = theme.radius.card,
  style,
}: PlaceImageProps) {
  const [failed, markFailed] = useImageLoadFailed(uri);
  const showImage = !!uri && !failed;

  return (
    <View style={[styles.container, { aspectRatio, borderRadius }, style]}>
      {showImage ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
          accessible
          accessibilityRole="image"
          accessibilityLabel={accessibilityLabel}
          onError={markFailed}
        />
      ) : (
        <View
          style={styles.fallback}
          accessible
          accessibilityRole="image"
          accessibilityLabel={accessibilityLabel}
        >
          <Icon icon={MapPin} size="lg" color={theme.colors.text.tertiary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: theme.colors.neutral.backgroundSecondary,
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.neutral.backgroundSecondary,
  },
});
