/**
 * Stroll — Drafts Tile
 * src/components/profile/DraftsTile.tsx
 *
 * Sprint 3 Prompt 3 — the first cell of the Profile screen's creator
 * grid, shown only once at least one draft exists (see this file's own
 * `drafts.length === 0` guard below, and profile.tsx's gridData
 * construction, which never even adds this cell to the list otherwise).
 * Opens the Drafts modal (app/(modals)/drafts.tsx) on tap, which is
 * where Resume/Delete actually live — this tile is a status indicator +
 * entry point, nothing more.
 *
 * A user can have any number of drafts now (see useExperienceDrafts.ts's
 * module doc) — this tile's "preview" is the most-recently-edited
 * draft's first photo (drafts[0], already sorted newest-first by
 * loadAllDrafts), with a count badge covering 2+.
 */

import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { FileEdit } from 'lucide-react-native';

import { Icon, Badge, Skeleton } from '@/components/ui';
import { theme } from '@/theme';
import type { ExperienceDraft } from '@/types/experienceDraft';

export interface DraftsTileProps {
  size: number;
  drafts: ExperienceDraft[];
  isLoading: boolean;
  onPress: () => void;
}

export function DraftsTile({ size, drafts, isLoading, onPress }: DraftsTileProps) {
  if (isLoading) {
    return <Skeleton width={size} height={size} borderRadius={0} />;
  }

  // Nothing to show — profile.tsx already omits this cell from the grid
  // in this case, but this guard keeps the component correct on its own
  // too (e.g. if it's ever reused somewhere that doesn't pre-filter).
  if (drafts.length === 0) {
    return null;
  }

  const mostRecent = drafts[0]!;
  // A brand-new draft (Photos step not reached, or left empty) has no
  // photo yet — exactly as valid an in-progress draft as one with
  // photos, so it falls back to the same FileEdit glyph either way.
  const previewPhoto = mostRecent.photos[0]?.localUri ?? null;
  const count = drafts.length;

  return (
    <Pressable
      style={[styles.tile, { width: size, height: size }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={count === 1 ? 'Drafts, 1 draft in progress' : `Drafts, ${count} drafts in progress`}
    >
      {previewPhoto ? (
        <Image
          source={{ uri: previewPhoto }}
          style={styles.fill}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      ) : (
        <Icon icon={FileEdit} size="lg" color={theme.colors.text.tertiary} />
      )}

      <View style={styles.badge}>
        <Badge label={count === 1 ? 'Draft' : `${count} Drafts`} variant="primary" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: theme.colors.neutral.backgroundSecondary,
    overflow:        'hidden',
  },
  fill: {
    width:  '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    bottom:   theme.spacing.xxs,
    left:     theme.spacing.xxs,
  },
});
