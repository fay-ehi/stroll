/**
 * Stroll — Experience Grid Tile
 * src/components/profile/ExperienceGridTile.tsx
 *
 * Sprint 3 Prompt 3 — one cell of the Profile screen's creator content
 * grid (requirement #1's "familiar creator profile grids used by
 * platforms like Instagram and TikTok"). Every experience shown here
 * belongs to the signed-in user viewing their OWN profile — profile.tsx
 * only ever renders this against `gallery.experiences`, which is scoped
 * to `profile.id` (see useUserGallery.ts) — so a manage affordance is
 * always appropriate here, unlike ExperienceCard (src/components/discover)
 * which also renders other people's experiences on Discover.
 *
 * Tap the tile → Experience Details (view — requirement #1). The small
 * "⋮" button in the corner → Edit / Delete, via Alert.alert — the same
 * lightweight action-sheet pattern this screen's own handleAvatarPress
 * already uses (app/(app)/(tabs)/profile.tsx). Deliberately a real button
 * rather than a long-press-only gesture: requirement #10 (Accessibility)
 * asks for accessible action buttons, and a long-press has no
 * screen-reader-discoverable equivalent without one.
 *
 * React.memo'd per requirement #11 ("Memoized Experience Cards") — this
 * grid can be dozens of cells long once pagination kicks in, and no tile
 * needs to re-render when a sibling's local state (or the header above
 * them) changes.
 */

import React, { memo, useCallback } from 'react';
import { View, Pressable, StyleSheet, Alert } from 'react-native';
import { Image } from 'expo-image';
import { MoreVertical, ImageOff } from 'lucide-react-native';

import { Icon } from '@/components/ui';
import { theme } from '@/theme';
import type { ExperienceCardModel } from '@/types/experience';

export interface ExperienceGridTileProps {
  experience: ExperienceCardModel;
  size: number;
  onPress: (experience: ExperienceCardModel) => void;
  onEdit: (experience: ExperienceCardModel) => void;
  onDelete: (experience: ExperienceCardModel) => void;
}

function ExperienceGridTileComponent({ experience, size, onPress, onEdit, onDelete }: ExperienceGridTileProps) {
  // Two-step: the corner button opens Edit/Delete/Cancel; Delete itself
  // opens a second, explicit confirmation — requirement #5's "Confirmation
  // dialog" for Delete specifically, on top of (not instead of) the first
  // action-sheet tap.
  const handleManagePress = useCallback(() => {
    Alert.alert(experience.title || 'Manage experience', undefined, [
      { text: 'Edit', onPress: () => onEdit(experience) },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          Alert.alert(
            'Delete this experience?',
            "This removes it from Discover and your profile permanently. This can\u2019t be undone.",
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => onDelete(experience) },
            ],
          );
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [experience, onEdit, onDelete]);

  return (
    <View style={{ width: size, height: size }}>
      <Pressable
        style={styles.fill}
        onPress={() => onPress(experience)}
        accessibilityRole="button"
        accessibilityLabel={experience.title}
      >
        {experience.coverImage ? (
          <Image
            source={{ uri: experience.coverImage.url }}
            style={styles.fill}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={[styles.fill, styles.fallback]}>
            <Icon icon={ImageOff} size="md" color={theme.colors.text.tertiary} />
          </View>
        )}
      </Pressable>

      <Pressable
        style={styles.manageButton}
        onPress={handleManagePress}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        accessibilityRole="button"
        accessibilityLabel={`Manage "${experience.title}"`}
      >
        <Icon icon={MoreVertical} size="xs" color={theme.colors.static.white} />
      </Pressable>
    </View>
  );
}

export const ExperienceGridTile = memo(ExperienceGridTileComponent);

const styles = StyleSheet.create({
  fill: {
    width: '100%',
    height: '100%',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.neutral.border,
  },
  manageButton: {
    position: 'absolute',
    top: theme.spacing.xxs,
    right: theme.spacing.xxs,
    width: 22,
    height: 22,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.static.black,
  },
});
