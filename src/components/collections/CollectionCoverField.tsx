/**
 * Stroll — Collection Cover Field
 * src/components/collections/CollectionCoverField.tsx
 *
 * Sprint 5 — Prompt 1, requirement #3 (Create Collection): "Custom cover
 * image (optional)... Image picker, Preview before saving, Replace
 * selected image, Remove selected image before saving." A presentational
 * picker box — the Create Collection screen owns the actual
 * expo-image-picker call and local `{ uri, mimeType }` state; this
 * component only renders the empty/preview states and forwards taps.
 *
 * Only used by app/(modals)/create-collection.tsx. Collection Detail's
 * own "Change Cover" / "Remove Cover" management actions don't need this
 * — the header's already-rendered cover doubles as the preview there
 * (see CollectionDetailHeader.tsx), so those actions are plain
 * Alert.alert menu items that go straight to the picker.
 */

import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { ImagePlus, X } from 'lucide-react-native';

import { theme } from '@/theme';
import { hitSlop as computeHitSlop } from '@/theme/utils';
import { Caption, Icon } from '@/components/ui';

export interface CollectionCoverFieldProps {
  /** The picked image's local uri, or null if nothing has been picked (or generation is still the default). */
  uri: string | null;
  onPick: () => void;
  onRemove: () => void;
  disabled?: boolean;
}

const REMOVE_BUTTON_DIAMETER = 28;

export function CollectionCoverField({ uri, onPick, onRemove, disabled }: CollectionCoverFieldProps) {
  if (uri) {
    return (
      <View style={styles.previewWrapper}>
        <Pressable
          onPress={onPick}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel="Replace cover photo"
        >
          <Image source={{ uri }} style={styles.preview} contentFit="cover" />
        </Pressable>
        <Pressable
          onPress={onRemove}
          disabled={disabled}
          style={styles.removeButton}
          hitSlop={computeHitSlop(REMOVE_BUTTON_DIAMETER)}
          accessibilityRole="button"
          accessibilityLabel="Remove selected cover photo"
        >
          <Icon icon={X} size="sm" color={theme.colors.static.white} />
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPick}
      disabled={disabled}
      style={styles.emptyBox}
      accessibilityRole="button"
      accessibilityLabel="Add a cover photo"
    >
      <Icon icon={ImagePlus} size="lg" color={theme.colors.text.tertiary} />
      <Caption color={theme.colors.text.tertiary} style={styles.emptyCaption}>
        Add a cover photo (optional) — without one, we'll use your first experience's photo.
      </Caption>
    </Pressable>
  );
}

const FIELD_HEIGHT = 160;

const styles = StyleSheet.create({
  emptyBox: {
    height: FIELD_HEIGHT,
    borderRadius: theme.radius.card,
    borderWidth: theme.borders.width,
    borderColor: theme.colors.neutral.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
    gap: theme.spacing.xs,
  },
  emptyCaption: {
    textAlign: 'center',
  },
  previewWrapper: {
    height: FIELD_HEIGHT,
    borderRadius: theme.radius.card,
    overflow: 'hidden',
  },
  preview: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    width: REMOVE_BUTTON_DIAMETER,
    height: REMOVE_BUTTON_DIAMETER,
    borderRadius: theme.radius.full,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
