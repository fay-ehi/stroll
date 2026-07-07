/**
 * Stroll — Experience Card
 * src/components/discover/ExperienceCard.tsx
 *
 * Design System §24 — Experience Card:
 *   "This is the most important reusable component in Stroll. Every
 *   screen displaying experiences should use this component."
 *   Contains: Hero Image, Title, Location, Creator, Short Story Preview,
 *   Save Button, Optional Tags.
 *   Rules: Photography occupies at least 60% of the card. Stories should
 *   never exceed three lines in previews. Metadata remains visually
 *   secondary.
 *   Variants: Compact, Standard, Featured, Horizontal.
 *
 * This sprint implements 'standard' (the feed) and 'featured' (the
 * Featured Carousel) — 'compact' and 'horizontal' are left for whichever
 * future surface actually needs them (Search results, Place Detail's
 * experience list, etc.), per the brief's "do not build ... search"
 * scope. Built directly on the `Card` layout primitive from Sprint 0,
 * exactly as that component's own doc comment anticipated ("Product-
 * specific cards ... will be built in a future sprint on top of this
 * component").
 *
 * Save button is a placeholder per this sprint's brief ("Do not implement
 * save functionality yet") — it's tappable and gives real feedback via
 * the existing Toast system, but persists nothing.
 */

import React from 'react';
import { View, Image, Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { Bookmark, Heart, MapPin, BadgeCheck, ImageOff } from 'lucide-react-native';

import { theme } from '@/theme';
import { Card, Avatar, Badge, Icon, H5, Body, BodySmall, Caption } from '@/components/ui';
import { useImageLoadFailed } from '@/hooks';
import { showToast } from '@/stores/toastStore';
import { hitSlop } from '@/theme/utils';
import { formatCount } from '@/utils';
import { ROUTES } from '@/constants/routes';
import type { ExperienceCardModel } from '@/types/experience';

// ─── Cover Image ────────────────────────────────────────────────────────────────
// Same missing/failed-load handling as PlaceImage, via the shared
// useImageLoadFailed hook — see that component's doc for why this isn't a
// third copy-pasted useState/useEffect pair.

interface CoverImageProps {
  uri: string | null;
  accessibilityLabel: string;
  aspectRatio: number;
}

function CoverImage({ uri, accessibilityLabel, aspectRatio }: CoverImageProps) {
  const [failed, markFailed] = useImageLoadFailed(uri);
  const showImage = !!uri && !failed;

  return (
    <View style={[styles.coverContainer, { aspectRatio }]}>
      {showImage ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
          accessible
          accessibilityRole="image"
          accessibilityLabel={accessibilityLabel}
          onError={markFailed}
        />
      ) : (
        <View
          style={styles.coverFallback}
          accessible
          accessibilityRole="image"
          accessibilityLabel={accessibilityLabel}
        >
          <Icon icon={ImageOff} size="lg" color={theme.colors.text.tertiary} />
        </View>
      )}
    </View>
  );
}

// ─── Experience Card ──────────────────────────────────────────────────────────────

export type ExperienceCardVariant = 'standard' | 'featured';

export interface ExperienceCardProps {
  experience: ExperienceCardModel;
  variant?: ExperienceCardVariant;
  /** Fixed width — required for 'featured' so it renders correctly inside a horizontal carousel. */
  width?: number;
  style?: ViewStyle;
}

// Photography must occupy "at least 60%" of the card (Design System §24).
// A 4:3 cover above a compact two-line-of-metadata content block clears
// that bar comfortably for 'standard'; 'featured' uses a slightly wider
// 16:11 ratio suited to a larger carousel card.
const COVER_ASPECT_RATIO: Record<ExperienceCardVariant, number> = {
  standard: 4 / 3,
  featured: 16 / 11,
};

export function ExperienceCard({
  experience,
  variant = 'standard',
  width,
  style,
}: ExperienceCardProps) {
  const { title, storyPreview, location, category, creator, coverImage, likeCount, featured } =
    experience;

  const handlePress = () => {
    router.push(ROUTES.app.experienceDetail(experience.id) as never);
  };

  const handlePlacePress = () => {
    router.push(ROUTES.app.placeDetail(experience.placeId) as never);
  };

  const handleSavePress = () => {
    // Placeholder — see module doc. Real save/collection logic is a later sprint.
    showToast({ type: 'info', message: 'Saving is coming soon.' });
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [{ width, opacity: pressed ? 0.96 : 1 }, style]}
      accessibilityRole="button"
      accessibilityLabel={`Experience at ${title} by ${creator.displayName}`}
    >
      <Card variant="elevated" padding={0} style={styles.card}>
        <View style={styles.coverWrapper}>
          <CoverImage
            uri={coverImage?.url ?? null}
            accessibilityLabel={`Photo from an experience at ${title}`}
            aspectRatio={COVER_ASPECT_RATIO[variant]}
          />

          {featured ? (
            <Badge label="Featured" variant="primary" style={styles.featuredBadge} />
          ) : null}

          <Pressable
            onPress={handleSavePress}
            hitSlop={hitSlop(SAVE_BUTTON_DIAMETER)}
            style={styles.saveButton}
            accessibilityRole="button"
            accessibilityLabel="Save this experience"
          >
            {/* Separate scrim layer so its opacity doesn't cascade to (fade) the icon rendered on top of it. */}
            <View style={styles.saveButtonScrim} />
            <Icon icon={Bookmark} size="sm" color={theme.colors.static.white} />
          </Pressable>
        </View>

        <View style={styles.content}>
          <Pressable
            onPress={handlePlacePress}
            style={styles.locationRow}
            hitSlop={{ top: theme.spacing.xxs, bottom: theme.spacing.xxs, left: 0, right: 0 }}
            accessibilityRole="link"
            accessibilityLabel={`View ${location} on the map`}
          >
            <Icon icon={MapPin} size="xs" color={theme.colors.text.tertiary} />
            <Caption numberOfLines={1} style={styles.locationText}>
              {location}
              {category ? `  ·  ${category.emoji} ${category.label}` : ''}
            </Caption>
          </Pressable>

          <H5 numberOfLines={2} style={styles.title}>
            {title}
          </H5>

          <Body numberOfLines={3} color={theme.colors.text.secondary} style={styles.story}>
            {storyPreview}
          </Body>

          <View style={styles.footer}>
            <View style={styles.creatorRow}>
              <Avatar
                source={creator.avatarUrl ? { uri: creator.avatarUrl } : undefined}
                name={creator.displayName}
                size="sm"
              />
              <BodySmall numberOfLines={1} style={styles.creatorName}>
                {creator.displayName}
              </BodySmall>
              {creator.isVerified ? (
                <Icon
                  icon={BadgeCheck}
                  size="xs"
                  color={theme.colors.brand.primary}
                  accessibilityLabel="Verified creator"
                />
              ) : null}
            </View>

            <View style={styles.likeRow} accessibilityLabel={`${formatCount(likeCount)} likes`}>
              <Icon icon={Heart} size="sm" color={theme.colors.text.tertiary} />
              <Caption>{formatCount(likeCount)}</Caption>
            </View>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const SAVE_BUTTON_DIAMETER = 36;

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
  coverWrapper: {
    width: '100%',
  },
  coverContainer: {
    width: '100%',
  },
  coverFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.neutral.backgroundSecondary,
  },
  featuredBadge: {
    position: 'absolute',
    top: theme.spacing.sm,
    left: theme.spacing.sm,
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
  content: {
    padding: theme.spacing.md,
    gap: theme.spacing.xxs,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xxs,
    alignSelf: 'flex-start',
  },
  locationText: {
    flexShrink: 1,
  },
  title: {
    marginTop: theme.spacing.xxs,
  },
  story: {
    marginTop: theme.spacing.xxs,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing.sm,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    flexShrink: 1,
  },
  creatorName: {
    flexShrink: 1,
  },
  likeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xxs,
  },
});
