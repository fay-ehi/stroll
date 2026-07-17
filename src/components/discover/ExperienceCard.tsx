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
 *
 * Sprint 2 Prompt 3 (Feed Performance):
 *   - Cover image uses `expo-image` (already a dependency, previously
 *     unused anywhere) instead of React Native's built-in `Image` —
 *     `cachePolicy="memory-disk"` means a photo scrolled past and back
 *     into view, or reused between the main feed / Related Experiences /
 *     Continue Exploring, decodes once and is read from cache everywhere
 *     after, instead of re-fetching over the network each time. Not
 *     applied to PlaceImage.tsx or ImageGallery.tsx in this pass — this
 *     requirement is specifically about the feed, and ExperienceCard is
 *     the component actually rendered dozens of times in one scrolling
 *     list; those two are natural candidates for the same change later.
 *   - The whole component is wrapped in `React.memo` — in a FlatList of
 *     100+ cards, re-rendering every visible card whenever the list's
 *     own state changes (e.g. a sibling's image finishing loading) is
 *     exactly the wasted work this sprint's "avoid unnecessary renders"
 *     calls out. `ExperienceCardModel` is an immutable value produced
 *     fresh per query response, so a shallow prop comparison is correct
 *     here — no custom comparator needed.
 *   - Fires `experience_opened` (and `recommendation_opened` when
 *     `source` is `'continue_exploring'`) on tap — see `source` prop.
 */

import React from 'react';
import { View, Pressable, StyleSheet, Platform, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Bookmark, Heart, MapPin, BadgeCheck, ImageOff } from 'lucide-react-native';

import { theme } from '@/theme';
import { Card, Avatar, Badge, Icon, H5, Body, BodySmall, Caption } from '@/components/ui';
import { useImageLoadFailed } from '@/hooks';
import { showToast } from '@/stores/toastStore';
import { hitSlop } from '@/theme/utils';
import { formatCount } from '@/utils';
import { ROUTES } from '@/constants/routes';
import { trackExperienceOpened, trackRecommendationOpened } from '@/lib/analytics';
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

const CoverImage = React.memo(function CoverImage({
  uri,
  accessibilityLabel,
  aspectRatio,
}: CoverImageProps) {
  const [failed, markFailed] = useImageLoadFailed(uri);
  const showImage = !!uri && !failed;

  return (
    <View style={[styles.coverContainer, { aspectRatio }]}>
      {showImage ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={200}
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
});

// ─── Experience Card ──────────────────────────────────────────────────────────────

export type ExperienceCardVariant = 'standard' | 'featured';
export type ExperienceCardSource =
  | 'discover_feed'
  | 'related'
  | 'continue_exploring'
  | 'place_detail'
  | 'nearby_surfaced'
  /** Sprint 5 Prompt 1 — a Collection Detail screen's Experience list. */
  | 'collection_detail';

export interface ExperienceCardProps {
  experience: ExperienceCardModel;
  variant?: ExperienceCardVariant;
  /** Fixed width — required for 'featured' so it renders correctly inside a horizontal carousel. */
  width?: number;
  style?: ViewStyle;
  /** Which surface rendered this card — attached to the `experience_opened` analytics event. Defaults to the main feed, the most common case. */
  source?: ExperienceCardSource;
}

// Photography must occupy "at least 60%" of the card (Design System §24).
// A 4:3 cover above a compact two-line-of-metadata content block clears
// that bar comfortably for 'standard'; 'featured' uses a slightly wider
// 16:11 ratio suited to a larger carousel card.
const COVER_ASPECT_RATIO: Record<ExperienceCardVariant, number> = {
  standard: 4 / 3,
  featured: 16 / 11,
};

export const ExperienceCard = React.memo(function ExperienceCard({
  experience,
  variant = 'standard',
  width,
  style,
  source = 'discover_feed',
}: ExperienceCardProps) {
  const { title, storyPreview, location, category, creator, coverImage, likeCount, featured } =
    experience;

  const handlePress = () => {
    trackExperienceOpened({ experienceId: experience.id, source });
    if (source === 'continue_exploring') {
      trackRecommendationOpened({
        experienceId: experience.id,
        recommendationType: 'continue_exploring',
      });
    }
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
        <View style={styles.cardInner}>
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
        </View>
      </Card>
    </Pressable>
  );
});

// ─── Styles ────────────────────────────────────────────────────────────────────

const SAVE_BUTTON_DIAMETER = 36;

const styles = StyleSheet.create({
  card: {
    // No overflow: 'hidden' here — iOS shadows are clipped by their own
    // view's overflow, so the shadow must live on this (unclipped) Card
    // and the rounded-corner image/content clipping must happen one
    // level down, on `cardInner`. Without this split, iOS renders the
    // shadow-less "flat" card the user flagged, while Android's
    // elevation (a different rendering path) isn't clipped by
    // overflow:'hidden' the same way and looked fine either way.
    //
    // Platform.select below is a second, separate fix: even unclipped,
    // theme.shadows.medium's shadowOpacity/shadowRadius (tuned to match
    // Android's elevation:3 numerically) still reads noticeably fainter
    // on iOS, because iOS renders a soft Gaussian-blurred shadow while
    // Android's elevation renders a tighter, more defined one — the same
    // numbers just don't produce the same look across the two rendering
    // engines. This bumps opacity/radius/offset specifically for this
    // card (not the shared theme token, which other elevated surfaces
    // still use as-is) so it reads with the same visual weight as
    // Android's version.
    ...Platform.select({
      ios: {
        shadowOpacity: 0.16,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
      },
      default: {},
    }),
  },
  cardInner: {
    borderRadius: theme.radius.card,
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
