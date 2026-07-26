/**
 * Stroll — Collection Card
 * src/components/discover/CollectionCard.tsx
 *
 * Shows: cover image, title, city, experience count, and who it belongs
 * to — the owner's avatar, plus a small overlapping stack of
 * collaborator avatars when `isCollaborative` (mirrors how group avatars
 * are conventionally shown elsewhere in the app's design language: lead
 * avatar + overlapping smaller ones).
 *
 * Mounted as of Sprint 5 Prompt 3 — CollectionCarousel.tsx (Discover) and
 * a future Search results surface both render this directly. `onPress`
 * on the outer Pressable navigates to Collection Detail (see
 * app/(app)/(tabs)/discover.tsx's wiring); Card.tsx's own doc anticipated
 * exactly this ("Product-specific cards ... will be built in a future
 * sprint on top of this component").
 *
 * Sprint 5 Prompt 3, requirement #5 (Creator Navigation): each avatar in
 * the owner/collaborator stack is its own nested Pressable that navigates
 * straight to that person's profile — same "inner Pressable wins the
 * touch" pattern ExperienceCard.tsx's location row already uses inside
 * its own outer, whole-card Pressable. Reuses ROUTES.app.otherUserProfile,
 * the same route ContributorsLine.tsx (Collection Detail's own
 * "Created by Alice & Bob" line) already resolves a name tap to.
 *
 * Wrapped in React.memo (requirement #11, "Memoized Collection Cards")
 * for the same reason ExperienceCard.tsx is — this renders repeatedly
 * inside a horizontal FlatList, and CollectionCardModel is an immutable
 * value produced fresh per query response, so a shallow prop comparison
 * is correct here with no custom comparator needed.
 *
 * Sprint 5 Prompt 4 — added a Save/Unsave button, same corner-overlay
 * treatment (scrim + icon, top-right of the cover) as ExperienceCard's
 * own, reading/writing its own saved state internally
 * (useIsCollectionSaved + useToggleSaveCollection) rather than through a
 * prop — the requirement #7 "Collection Cards should [indicate saved
 * state] too" applied to every existing mount of this card (the Discover
 * carousel today) with no call-site changes required.
 *
 * Bug fix (this pass): `styles.card` used to carry both the elevated
 * shadow (via Card's `variant="elevated"`) AND `overflow: 'hidden'` on
 * the same View — on iOS, a shadow is drawn outside the view's own
 * bounds, so `overflow: 'hidden'` clips it away entirely, leaving the
 * card visually flat everywhere this renders (Discover's carousel, and
 * the Saved tab's Collections grid). ExperienceCard.tsx already solved
 * this with a card/cardInner split — the shadow lives on the outer,
 * unclipped `card`, and the rounded-corner clipping (needed so the cover
 * image's square corners don't poke out past the card's rounded ones)
 * moves one level down to `cardInner`. Mirrored here for the same fix.
 */

import React from 'react';
import { View, Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Users, ImageOff, Bookmark, BookmarkCheck } from 'lucide-react-native';

import { theme } from '@/theme';
import { Card, Avatar, Icon, H5, BodySmall, Caption } from '@/components/ui';
import { useImageLoadFailed } from '@/hooks';
import { useIsCollectionSaved, useToggleSaveCollection } from '@/hooks/useSaved';
import { hitSlop } from '@/theme/utils';
import { ROUTES } from '@/constants/routes';
import type { CollectionCardModel } from '@/types/collection';
import type { CreatorPreview } from '@/types/experience';

export interface CollectionCardProps {
  collection: CollectionCardModel;
  onPress?: (collection: CollectionCardModel) => void;
  style?: ViewStyle;
}

// ─── Contributor Avatar ─────────────────────────────────────────────────────────
// A single owner/collaborator avatar, independently tappable to that
// person's profile — nested inside the card's own outer Pressable (see
// module doc). AVATAR_DIAMETER (Avatar's "sm" size) is well under the
// 44px WCAG AA touch target, so hitSlop expands it the same way
// ExperienceCard's save button does.
const AVATAR_DIAMETER = 32;

const ContributorAvatar = React.memo(function ContributorAvatar({ person }: { person: CreatorPreview }) {
  return (
    <Pressable
      onPress={() => router.push(ROUTES.app.otherUserProfile(person.id))}
      hitSlop={hitSlop(AVATAR_DIAMETER)}
      accessibilityRole="link"
      accessibilityLabel={`View ${person.displayName}'s profile`}
    >
      <Avatar
        source={person.avatarUrl ? { uri: person.avatarUrl } : undefined}
        name={person.displayName}
        size="sm"
        accessibilityLabel={person.displayName}
      />
    </Pressable>
  );
});

export const CollectionCard = React.memo(function CollectionCard({
  collection,
  onPress,
  style,
}: CollectionCardProps) {
  const [imageFailed, onImageError] = useImageLoadFailed(collection.coverImage?.url);
  const showImage = collection.coverImage && !imageFailed;

  const isSaved = useIsCollectionSaved(collection.id);
  const toggleSave = useToggleSaveCollection();

  const handleSavePress = () => {
    toggleSave.mutate({ collectionId: collection.id, isSaved });
  };

  return (
    <Pressable
      onPress={onPress ? () => onPress(collection) : undefined}
      disabled={!onPress}
      style={style}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={collection.title}
    >
      <Card variant="elevated" padding={0} style={styles.card}>
        <View style={styles.cardInner}>
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

            {/* Nested Pressable — same "inner Pressable wins the touch" pattern ContributorAvatar below already uses inside this card's own outer Pressable. */}
            <Pressable
              onPress={handleSavePress}
              disabled={toggleSave.isPending}
              hitSlop={hitSlop(SAVE_BUTTON_DIAMETER)}
              style={styles.saveButton}
              accessibilityRole="button"
              accessibilityState={{ selected: isSaved, disabled: toggleSave.isPending }}
              accessibilityLabel={isSaved ? 'Remove from Saved' : 'Save this collection'}
            >
              <View style={styles.saveButtonScrim} />
              <Icon
                icon={isSaved ? BookmarkCheck : Bookmark}
                size="sm"
                color={isSaved ? theme.colors.brand.primary : theme.colors.static.white}
              />
            </Pressable>
          </View>

          <View style={styles.body}>
            <H5 numberOfLines={1}>{collection.title}</H5>

            {collection.city ? (
              <Caption color={theme.colors.text.tertiary}>{collection.city}</Caption>
            ) : null}

            <View style={styles.metaRow}>
              <View style={styles.avatarStack}>
                <ContributorAvatar person={collection.owner} />
                {collection.collaborators.slice(0, 2).map((collaborator) => (
                  <ContributorAvatar key={collaborator.id} person={collaborator} />
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
        </View>
      </Card>
    </Pressable>
  );
});

const SAVE_BUTTON_DIAMETER = 36;

const styles = StyleSheet.create({
  card: {
    // No overflow: 'hidden' here — see this file's module doc ("Bug fix
    // (this pass)"). The shadow from Card's `variant="elevated"` lives
    // on this View; rounded-corner clipping moves to `cardInner` below.
    width: '100%',
  },
  cardInner: {
    borderRadius: theme.radius.card,
    overflow: 'hidden',
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
  saveButton: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    width: SAVE_BUTTON_DIAMETER,
    height: SAVE_BUTTON_DIAMETER,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  saveButtonScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.static.black,
    opacity: theme.opacity.heavy,
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
