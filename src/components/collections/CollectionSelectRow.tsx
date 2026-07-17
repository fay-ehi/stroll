/**
 * Stroll — Collection Select Row
 * src/components/collections/CollectionSelectRow.tsx
 *
 * Sprint 5 — Prompt 1, requirement #4 (Add Experience to Collection):
 * "Multi-select Collections... Loading state... Success toast... Failure
 * handling." Used by app/(modals)/add-to-collection.tsx.
 *
 * Instant-toggle, not a checkbox-then-Confirm pattern — tapping a row
 * immediately adds or removes the Experience (see that screen's own doc
 * for the reasoning), so this component's only interactive state is
 * "selected" (already contains the Experience) vs. "pending" (a
 * mutation for this exact row is in flight) vs. neither. No local
 * component state of its own — `isSelected`/`isPending` are both driven
 * by the parent screen's query + mutation state, so a toggle Optimistic-
 * updates and rolls back exactly where useAddExperienceToCollection /
 * useRemoveExperienceFromCollection (useCollections.ts) already handle
 * it, rather than this row keeping its own shadow copy of "checked".
 */

import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Check, Images } from 'lucide-react-native';

import { theme } from '@/theme';
import { Body, Caption, Icon, Spinner } from '@/components/ui';
import type { CollectionModel } from '@/types/collection';

export interface CollectionSelectRowProps {
  collection: CollectionModel;
  isSelected: boolean;
  isPending: boolean;
  onToggle: () => void;
}

const THUMBNAIL_SIZE = 44;
const CHECK_DIAMETER = 24;

export function CollectionSelectRow({ collection, isSelected, isPending, onToggle }: CollectionSelectRowProps) {
  return (
    <Pressable
      onPress={onToggle}
      disabled={isPending}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isSelected, disabled: isPending }}
      accessibilityLabel={collection.title}
    >
      {collection.coverImage ? (
        <Image source={{ uri: collection.coverImage.url }} style={styles.thumbnail} contentFit="cover" />
      ) : (
        <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
          <Icon icon={Images} size="sm" color={theme.colors.text.tertiary} />
        </View>
      )}

      <View style={styles.textColumn}>
        <Body numberOfLines={1}>{collection.title}</Body>
        <Caption color={theme.colors.text.tertiary}>
          {collection.experienceCount === 1 ? '1 experience' : `${collection.experienceCount} experiences`}
        </Caption>
      </View>

      {isPending ? (
        <Spinner size="small" />
      ) : (
        <View style={[styles.checkCircle, isSelected && styles.checkCircleSelected]}>
          {isSelected ? <Icon icon={Check} size="sm" color={theme.colors.static.white} /> : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  thumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: theme.radius.card,
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
  checkCircle: {
    width: CHECK_DIAMETER,
    height: CHECK_DIAMETER,
    borderRadius: theme.radius.full,
    borderWidth: theme.borders.width,
    borderColor: theme.colors.neutral.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleSelected: {
    backgroundColor: theme.colors.brand.primary,
    borderColor: theme.colors.brand.primary,
  },
});
