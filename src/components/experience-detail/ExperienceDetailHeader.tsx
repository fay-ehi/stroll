/**
 * Stroll — Experience Detail Header
 * src/components/experience-detail/ExperienceDetailHeader.tsx
 *
 * Requirement #3 — Experience Header: "Cover image, Title, Category
 * badge, Creator preview, Location, Created date, Estimated duration (if
 * available), Price indicator (if applicable)."
 *
 * Two fields are deliberately not here:
 *   - Cover image: ImageGallery (requirement #4) already renders the
 *     full-width hero + swipeable gallery immediately above this header
 *     on the detail screen. A second, separate cover image here would
 *     just repeat the first photo in the gallery.
 *   - Estimated duration / Price indicator: neither `ExperienceModel` nor
 *     `PlaceModel` has a backing field for either. types/place.ts's own
 *     PRD-alignment note explains why price (`priceLevel`) specifically
 *     is modeled but intentionally never surfaced in any Place UI (PRD
 *     §8.8 lists it under "Intentionally Not Shown"). Per this sprint's
 *     "only display fields that exist, avoid placeholder text for
 *     missing values" — both are simply omitted rather than faked.
 *
 * The creator mention here is intentionally a compact single line (small
 * avatar + name + verified badge) — the only creator identity shown on
 * this screen. A fuller block (bio, total experiences) used to repeat
 * lower on the page but was removed as redundant; this one is enough.
 *
 * Likes engagement row (Sprint 6 Prompt 2, requirement #5 — "Wire the
 * Like button into the existing Experience Detail screen. Reuse the
 * shared Like hook. Do not implement separate logic."): the button now
 * sits on the creator row itself, right-aligned opposite the avatar/name
 * — it is a sibling of the creator-nav Pressable, not nested inside it,
 * so tapping anywhere in the creator name/avatar area does not trigger a
 * like, and tapping the heart does not trigger creator navigation. Each
 * control owns exactly one tap target. (Any hit-slop or double-tap
 * behavior inside <LikeButton> itself is owned by that shared component
 * in @/components/ui, not by this file.)
 * Calls useIsLiked()/useLike()/useLikeCount() itself rather than
 * receiving isLiked/onToggle as props from app/(app)/experience/[id].tsx
 * — the same self-contained-hook-consumption shape ExperienceCard
 * already uses for its own Save button (that card doesn't receive
 * isSaved as a prop either), so this header needs no new prop on its own
 * public API to add Likes. `experience.likeCount` seeds useLikeCount()
 * so the row never flashes 0 before the live count resolves — see that
 * hook's own doc for why a live query exists here at all when every
 * ExperienceCard just uses the model's own field directly.
 */

import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { MapPin } from 'lucide-react-native';

import { theme } from '@/theme';
import { H2, Body, Caption, Badge, Avatar, Icon, LikeButton } from '@/components/ui';
import { formatDate } from '@/utils';
import { useIsLiked, useLike, useLikeCount } from '@/hooks/useLikes';
import type { ExperienceDetailModel } from '@/types/experience';

export interface ExperienceDetailHeaderProps {
  experience: ExperienceDetailModel;
  /** Called when the inline creator mention is tapped — navigates to that creator's Public Profile (Sprint 6 Prompt 1; see app/(app)/experience/[id].tsx's handleCreatorPress). */
  onCreatorPress?: () => void;
}

export function ExperienceDetailHeader({
  experience,
  onCreatorPress,
}: ExperienceDetailHeaderProps) {
  const { title, category, creator, place, createdAt } = experience;

  const isLiked = useIsLiked(experience.id);
  const likeCount = useLikeCount(experience.id, experience.likeCount);
  const likeMutation = useLike();

  const handleLikePress = () => {
    if (likeMutation.isPending) return;
    likeMutation.mutate({
      experienceId: experience.id,
      creatorId: creator.id,
      isLiked,
      source: 'experience_detail',
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <H2 style={styles.title}>{title}</H2>
        {category ? (
          <Badge label={`${category.emoji} ${category.label}`} variant="neutral" />
        ) : null}
      </View>

      <View style={styles.creatorRow}>
        <Pressable
          onPress={onCreatorPress}
          style={styles.creatorInfo}
          accessibilityRole={onCreatorPress ? 'button' : undefined}
          accessibilityLabel={`By ${creator.displayName}`}
        >
          <Avatar
            source={creator.avatarUrl ? { uri: creator.avatarUrl } : undefined}
            name={creator.displayName}
            size="sm"
          />
          <Body numberOfLines={1} style={styles.creatorName}>
            {creator.displayName}
          </Body>
        </Pressable>

        <LikeButton
          isLiked={isLiked}
          count={likeCount}
          onPress={handleLikePress}
          disabled={likeMutation.isPending}
          size="lg"
        />
      </View>

      <View style={styles.metaRow}>
        <Icon icon={MapPin} size="xs" color={theme.colors.text.tertiary} />
        <Caption numberOfLines={1} style={styles.metaText}>
          {place.name} · {place.city}
        </Caption>
      </View>

      <Caption color={theme.colors.text.tertiary}>Shared {formatDate(createdAt)}</Caption>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  title: {
    flex: 1,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  creatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    flexShrink: 1,
  },
  creatorName: {
    flexShrink: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xxs,
  },
  metaText: {
    flexShrink: 1,
  },
});
