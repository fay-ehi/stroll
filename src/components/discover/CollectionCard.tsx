/**
 * Stroll — Collection Card (Skeleton)
 * src/components/discover/CollectionCard.tsx
 *
 * STATUS: Skeleton only — see src/types/collection.ts's module doc.
 * Anticipated by Card.tsx's own doc comment ("Product-specific cards
 * (ExperienceCard, PlaceCard, CollectionCard — defined in Design System
 * §24–26) will be built in a future sprint on top of this component") —
 * this is that future sprint's starting point, built the same way
 * ExperienceCard was: the `Card` layout primitive plus this domain's own
 * content.
 *
 * Shows: cover image, title, city, experience count, and who it belongs
 * to — the owner's avatar, plus a small overlapping stack of
 * collaborator avatars when `isCollaborative` (mirrors how group avatars
 * are conventionally shown elsewhere in the app's design language: lead
 * avatar + overlapping smaller ones).
 *
 * Not wired to navigation yet — there's no Collection Detail screen to
 * navigate to. `onPress` is accepted so a future wiring can pass it in
 * without changing this component again.
 */

import React from 'react';
import { View, Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Users, ImageOff } from 'lucide-react-native';

import { theme } from '@/theme';
import { Card, Avatar, Icon, H5, BodySmall, Caption } from '@/components/ui';
import { useImageLoadFailed } from '@/hooks';
import type { CollectionCardModel } from '@/types/collection';

export interface CollectionCardProps {
  collection: CollectionCardModel;
  onPress?: (collection: CollectionCardModel) => void;
  style?: ViewStyle;
}

export function CollectionCard({ collection, onPress, style }: CollectionCardProps) {
  const [imageFailed, onImageError] = useImageLoadFailed(collection.coverImage?.url);
  const showImage = collection.coverImage && !imageFailed;

  return (
    <Pressable
      onPress={onPress ? () => onPress(collection) : undefined}
      disabled={!onPress}
      style={style}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={collection.title}
    >
      <Card variant="elevated" padding={0} style={styles.card}>
        <View style={styles.imageWrapper}>
          {showImage ? (
            <Image
              source={{ uri: collection.coverImage!.url }}
              style={styles.image}
              contentFit="cover"
              cachePolicy="memory-disk"
              onError={onImageError}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <View style={[styles.image, styles.imageFallback]}>
              <Icon icon={ImageOff} size="lg" color={theme.colors.text.tertiary} />
            </View>
          )}
        </View>

        <View style={styles.body}>
          <H5 numberOfLines={1}>{collection.title}</H5>

          {collection.city ? (
            <Caption color={theme.colors.text.tertiary}>{collection.city}</Caption>
          ) : null}

          <View style={styles.metaRow}>
            <View style={styles.avatarStack}>
              <Avatar
                source={collection.owner.avatarUrl ? { uri: collection.owner.avatarUrl } : undefined}
                name={collection.owner.displayName}
                size="sm"
              />
              {collection.collaborators.slice(0, 2).map((collaborator) => (
                <Avatar
                  key={collaborator.id}
                  source={collaborator.avatarUrl ? { uri: collaborator.avatarUrl } : undefined}
                  name={collaborator.displayName}
                  size="sm"
                  accessibilityLabel={collaborator.displayName}
                />
              ))}
            </View>

            {collection.isCollaborative ? (
              <Icon icon={Users} size="xs" color={theme.colors.text.tertiary} />
            ) : null}
            <BodySmall color={theme.colors.text.tertiary} numberOfLines={1} style={styles.metaText}>
              {collection.isCollaborative
                ? `${collection.collaborators.length + 1} curators`
                : collection.owner.displayName}
              {' · '}
              {collection.experienceCount} {collection.experienceCount === 1 ? 'spot' : 'spots'}
            </BodySmall>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    width: '100%',
  },
  imageWrapper: {
    width: '100%',
    aspectRatio: 16 / 10,
    backgroundColor: theme.colors.neutral.border,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  avatarStack: {
    flexDirection: 'row',
  },
  metaText: {
    flex: 1,
  },
});
