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
 * Tap the tile → Experience Details (view — requirement #1). Long-press
 * the tile → Edit / Add to Collection / Delete, via Alert.alert — the
 * same lightweight action-sheet pattern this screen's own
 * handleAvatarPress already uses (app/(app)/(tabs)/profile.tsx).
 * Replaces an earlier corner "⋮" button per product direction (cleaner
 * tile, no icon sitting on top of the photo). A screen reader has no
 * built-in gesture for "long press", so the same handler is also
 * exposed as a custom accessibilityAction ("Manage") on the tile —
 * VoiceOver/TalkBack users reach it through the actions rotor instead of
 * a physical long-press.
 *
 * Sprint 5 Prompt 1 added "Add to Collection" (`onAddToCollection`,
 * optional so this component doesn't break if a future caller omits
 * it). This tile is the natural entry point for requirement #4 ("Users
 * should be able to add one of their own published Experiences") —
 * every experience shown here is already scoped to the signed-in
 * user's own gallery (see this doc's opening paragraph), the same
 * "no cross-user access possible" guarantee requirement #4's "Do not
 * allow adding Experiences owned by other users" asks for, satisfied
 * by construction rather than a runtime ownership check. Deliberately
 * NOT added to ExperienceActionBar.tsx (Experience Detail's action
 * bar) — that component's own doc says its four actions (Save, Share,
 * Directions, Report) are scoped as "Only" those four; extending it is
 * a different sprint's call to make.
 *
 * React.memo'd per requirement #11 ("Memoized Experience Cards") — this
 * grid can be dozens of cells long once pagination kicks in, and no tile
 * needs to re-render when a sibling's local state (or the header above
 * them) changes.
 */

import React, { memo, useCallback } from 'react';
import { View, Pressable, StyleSheet, Alert } from 'react-native';
import { Image } from 'expo-image';
import { ImageOff } from 'lucide-react-native';

import { Icon } from '@/components/ui';
import { theme } from '@/theme';
import type { ExperienceCardModel } from '@/types/experience';

export interface ExperienceGridTileProps {
  experience: ExperienceCardModel;
  size: number;
  onPress: (experience: ExperienceCardModel) => void;
  onEdit: (experience: ExperienceCardModel) => void;
  onDelete: (experience: ExperienceCardModel) => void;
  /** Sprint 5 Prompt 1 — opens the Add-to-Collection modal for this experience. Optional so existing callers/tests don't break; profile.tsx always passes it. */
  onAddToCollection?: (experience: ExperienceCardModel) => void;
}

function ExperienceGridTileComponent({
  experience,
  size,
  onPress,
  onEdit,
  onDelete,
  onAddToCollection,
}: ExperienceGridTileProps) {
  // Two-step: long-pressing the tile opens Edit/Add to Collection/Delete;
  // Delete itself opens a second, explicit confirmation — requirement
  // #5's (Sprint 3 Prompt 3) "Confirmation dialog" for Delete
  // specifically, on top of (not instead of) the first action-sheet tap.
  const handleManagePress = useCallback(() => {
    const options: Parameters<typeof Alert.alert>[2] = [
      { text: 'Edit', onPress: () => onEdit(experience) },
    ];

    if (onAddToCollection) {
      options.push({ text: 'Add to Collection', onPress: () => onAddToCollection(experience) });
    }

    options.push(
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
    );

    Alert.alert(experience.title || 'Manage experience', undefined, options);
  }, [experience, onEdit, onAddToCollection, onDelete]);

  return (
    <View style={{ width: size, height: size }}>
      <Pressable
        style={styles.fill}
        onPress={() => onPress(experience)}
        onLongPress={handleManagePress}
        accessibilityRole="button"
        accessibilityLabel={experience.title}
        accessibilityActions={[{ name: 'longpress', label: 'Manage' }]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'longpress') {
            handleManagePress();
          }
        }}
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
});
