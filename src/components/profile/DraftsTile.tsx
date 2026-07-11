/**
 * Stroll — Drafts Tile
 * src/components/profile/DraftsTile.tsx
 *
 * Sprint 3 Prompt 3 — the first cell of the Profile screen's creator
 * grid, always ("A Drafts tile as the first item... Always appear
 * first" — requirement #1). Opens the Drafts modal
 * (app/(modals)/drafts.tsx) on tap, which is where Resume/Delete
 * actually live (requirement #2) — this tile is a status indicator +
 * entry point, nothing more.
 *
 * There is at most one draft per user (see useExperienceDrafts.ts's
 * module doc) — this tile's "preview" is really just "does the one
 * draft that can exist, exist" rendered as a thumbnail. Its empty state
 * borrows the dashed-tile visual language the in-app photo grid's own
 * empty add-tile already establishes
 * (src/components/experience-creation/PhotoGridPicker.tsx) for the same
 * "nothing here yet" meaning, reused for consistency rather than
 * inventing a second empty-tile style.
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
  draft: ExperienceDraft | null;
  isLoading: boolean;
  onPress: () => void;
}

export function DraftsTile({ size, draft, isLoading, onPress }: DraftsTileProps) {
  if (isLoading) {
    return <Skeleton width={size} height={size} borderRadius={0} />;
  }

  // A draft's first photo, if it has one yet — a brand-new draft
  // (Photos step not reached, or left empty) has none, which is exactly
  // as valid a "in-progress draft" as one with photos, so it falls back
  // to the same FileEdit glyph either way.
  const previewPhoto = draft?.photos[0]?.localUri ?? null;

  return (
    <Pressable
      style={[styles.tile, { width: size, height: size }, !draft && styles.empty]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={draft ? 'Drafts, 1 draft in progress' : 'Drafts, no drafts yet'}
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
        <Badge label={draft ? 'Draft' : 'Drafts'} variant={draft ? 'primary' : 'neutral'} />
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
  empty: {
    borderWidth: theme.borders.width,
    borderColor: theme.colors.neutral.border,
    borderStyle: 'dashed',
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
