/**
 * Stroll — Experience Pick Row
 * src/components/collections/ExperiencePickRow.tsx
 *
 * Sprint 5 — Prompt 2, requirement #6 (Experience Contributions). One
 * row in app/(modals)/collection-add-experience/[collectionId].tsx's
 * picker — the Collection-first counterpart to CollectionSelectRow.tsx
 * (which is Experience-first: given one Experience, pick a Collection).
 * Here it's the reverse: given one Collection, pick from the signed-in
 * user's own published Experiences — so each row is a compact
 * thumbnail + title, not a Collection cover + title.
 */

import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Plus, Check, Images } from 'lucide-react-native';

import { theme } from '@/theme';
import { Body, Caption, Icon, Spinner } from '@/components/ui';
import type { ExperienceCardModel } from '@/types/experience';

export interface ExperiencePickRowProps {
  experience: ExperienceCardModel;
  onAdd: () => void;
  isAdding?: boolean;
  isAdded?: boolean;
}

const THUMBNAIL_SIZE = 48;

export function ExperiencePickRow({ experience, onAdd, isAdding, isAdded }: ExperiencePickRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.thumbnailWrapper}>
        {experience.coverImage ? (
          <Image
            source={{ uri: experience.coverImage.url }}
            style={styles.thumbnail}
            cachePolicy="memory-disk"
            contentFit="cover"
          />
        ) : (
          <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
            <Icon icon={Images} size="sm" color={theme.colors.text.tertiary} />
          </View>
        )}
      </View>

      <View style={styles.textColumn}>
        <Body numberOfLines={1}>{experience.title}</Body>
        <Caption color={theme.colors.text.tertiary} numberOfLines={1}>
          {experience.location}
        </Caption>
      </View>

      {isAdding ? (
        <Spinner size="small" />
      ) : (
        <Pressable
          onPress={onAdd}
          disabled={isAdded}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={isAdded ? `${experience.title} already added` : `Add ${experience.title}`}
          style={[styles.actionCircle, isAdded && styles.actionCircleAdded]}
        >
          <Icon icon={isAdded ? Check : Plus} size="sm" color={isAdded ? theme.colors.static.white : theme.colors.brand.primary} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  thumbnailWrapper: {
    borderRadius: theme.radius.image,
    overflow: 'hidden',
  },
  thumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
  },
  thumbnailPlaceholder: {
    backgroundColor: theme.colors.neutral.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textColumn: {
    flex: 1,
    gap: 2,
  },
  actionCircle: {
    width: 32,
    height: 32,
    borderRadius: theme.radius.full,
    borderWidth: theme.borders.width,
    borderColor: theme.colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCircleAdded: {
    backgroundColor: theme.colors.semantic.success,
    borderColor: theme.colors.semantic.success,
  },
});
