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
 * Save button (Sprint 5 Prompt 4, revised): only rendered when
 * `source === 'saved'` — i.e. only inside the Saved tab's own grid,
 * where it doubles as the remove-from-Saved action. Every other mount
 * (Discover feed, Related, Continue Exploring, Place Detail, Collection
 * Detail) no longer shows a bookmark on the card itself — Save lives on
 * Experience Detail's action bar instead, by product direction ("it's
 * enough being in the details"). `useIsExperienceSaved`/
 * `useToggleSaveExperience` are still called unconditionally on every
 * card regardless of `source` (Rules of Hooks — a prop can't gate
 * whether a hook runs), but that's not the wasted work it might sound
 * like: every card reads the SAME shared `saved.experienceIds` query
 * (see useSaved.ts's own module doc), so mounting 50 cards with the
 * button hidden on 49 of them still only fires one network request, not
 * 50 — the hook call is cheap even where its result goes unused.
 *
 * 'compact' variant (added alongside the above): a narrower layout for
 * the Saved tab's 2-column grid, where 'standard' (built for a full-width
 * single-column feed) is too tall and its 3-line story preview wraps
 * awkwardly at ~160-180px. Drops the story preview entirely and tightens
 * the content padding; keeps the same cover aspect ratio, title,
 * location row, and creator/like footer as 'standard' so it still reads
 * as the same card family, just denser.
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
 *
 * Sprint 6 Prompt 2 (Experience Likes): the footer heart is functional
 * (LikeButton, components/ui/LikeButton.tsx; useIsLiked()/useLike(),
 * hooks/useLikes.ts), and the cover image supports double-tap-to-like.
 *
 * ── Double tap, and why it's plain Pressable + a timestamp, not
 * react-native-gesture-handler ──
 * Two earlier attempts used `GestureDetector`/`Gesture.Tap()` and both
 * broke this card in real, reproducible ways: nesting a GestureDetector
 * inside this card's whole-card navigation Pressable made both touch
 * systems (RN's built-in responder system, and RNGH's own native
 * recognizer) fire for the same tap; splitting them into siblings and
 * fixing the view-flattening/collapsable requirement that comes with
 * GestureDetector fixed the double-fire but reportedly still didn't
 * behave correctly on-device, and by that point it was no longer worth
 * the risk of a third native-gesture-system bug that's hard to diagnose
 * without a device in the loop.
 *
 * This version doesn't introduce a second touch system at all. The
 * image is wrapped in an ordinary `Pressable` — nested inside this
 * card's existing whole-card Pressable exactly the way `saveButton` and
 * `locationRow` already are below, a pattern already proven safe in this
 * exact file (innermost Pressable wins, outer's onPress doesn't also
 * fire — this is standard, well-established React Native behavior for
 * nested Pressables specifically, unlike Pressable-vs-GestureDetector).
 * Single vs. double tap is disambiguated with a plain timestamp check: a
 * tap starts a short timer before actually navigating; if a second tap
 * lands inside that window, the timer is cancelled and the tap is
 * treated as a double instead. It's a few more lines than a gesture
 * library call recorded a hoped-for edge case perfectly, but every part
 * of it is ordinary JS state that behaves predictably without relying on
 * native gesture-recognizer internals that can't be exercised from this
 * environment. Verify on a real device before relying on this note
 * alone, same as any touch-handling change.
 */

import React, { useEffect, useRef } from 'react';
import { View, Pressable, StyleSheet, Platform, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { Bookmark, BookmarkCheck, Heart, MapPin, BadgeCheck, ImageOff } from 'lucide-react-native';

import { theme, useReducedMotion, EASING_STANDARD } from '@/theme';
import { Card, Avatar, Badge, Icon, H5, Body, BodySmall, Caption, LikeButton } from '@/components/ui';
import { useImageLoadFailed } from '@/hooks';
import { useIsExperienceSaved, useToggleSaveExperience } from '@/hooks/useSaved';
import { useIsLiked, useLike } from '@/hooks/useLikes';
import { hitSlop } from '@/theme/utils';
import { ROUTES } from '@/constants/routes';
import { trackExperienceOpened, trackRecommendationOpened } from '@/lib/analytics';
import type { ExperienceCardModel } from '@/types/experience';

const STANDARD_BEZIER = Easing.bezier(...EASING_STANDARD);

// A tap on the cover image waits this long to see whether a second tap
// follows before committing to "single tap, navigate" — the same window
// (250ms) the earlier gesture-handler attempts used, chosen to feel
// snappy while still comfortably catching an intentional double tap.
const DOUBLE_TAP_WINDOW_MS = 250;

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

export type ExperienceCardVariant = 'standard' | 'featured' | 'compact';
export type ExperienceCardSource =
  | 'discover_feed'
  | 'related'
  | 'continue_exploring'
  | 'place_detail'
  | 'nearby_surfaced'
  /** Sprint 5 Prompt 1 — a Collection Detail screen's Experience list. */
  | 'collection_detail'
  /** Sprint 5 Prompt 4 — the Saved tab's own Experiences section. The only source that renders the card's Save button — see module doc. */
  | 'saved'
  /** Sprint 6 Prompt 1 — a Public Profile screen's published Experience grid (app/(app)/profile/[id].tsx). Does not render the Save button — same reasoning as every non-'saved' source. */
  | 'public_profile';

export interface ExperienceCardProps {
  experience: ExperienceCardModel;
  variant?: ExperienceCardVariant;
  /** Fixed width — required for 'featured'/'compact' so they render correctly inside a horizontal carousel or grid cell. */
  width?: number;
  style?: ViewStyle;
  /** Which surface rendered this card — attached to the `experience_opened` analytics event, and gates whether the Save button renders (only 'saved'). Defaults to the main feed, the most common case. */
  source?: ExperienceCardSource;
}

// Photography must occupy "at least 60%" of the card (Design System §24).
// A 4:3 cover above a compact two-line-of-metadata content block clears
// that bar comfortably for 'standard'; 'featured' uses a slightly wider
// 16:11 ratio suited to a larger carousel card. 'compact' keeps the same
// 4:3 as 'standard' — it's the content block below that shrinks, not the
// photo (still needs its "at least 60%" of the card).
const COVER_ASPECT_RATIO: Record<ExperienceCardVariant, number> = {
  standard: 4 / 3,
  featured: 16 / 11,
  compact: 4 / 3,
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
  const isCompact = variant === 'compact';
  const showSaveButton = source === 'saved';

  const isSaved = useIsExperienceSaved(experience.id);
  const toggleSave = useToggleSaveExperience();

  const isLiked = useIsLiked(experience.id);
  const likeMutation = useLike();
  const reduceMotion = useReducedMotion();

  // ── Floating heart (double tap) ──
  // Scale up, fade out, auto-disappear, never intercept touches
  // (pointerEvents="none" on the rendered overlay below).
  const floatingHeartOpacity = useSharedValue(0);
  const floatingHeartScale = useSharedValue(0.6);

  const playFloatingHeart = () => {
    if (reduceMotion) return; // decorative only — the Like itself still registers without it
    floatingHeartScale.value = 0.6;
    floatingHeartOpacity.value = 1;
    floatingHeartScale.value = withSequence(
      withTiming(1.15, { duration: 180, easing: STANDARD_BEZIER }),
      withTiming(1, { duration: 120, easing: STANDARD_BEZIER }),
    );
    floatingHeartOpacity.value = withDelay(300, withTiming(0, { duration: 250, easing: STANDARD_BEZIER }));
  };

  const floatingHeartStyle = useAnimatedStyle(() => ({
    opacity: floatingHeartOpacity.value,
    transform: [{ scale: floatingHeartScale.value }],
  }));

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
    toggleSave.mutate({ experienceId: experience.id, isSaved });
  };

  const handleLikePress = () => {
    if (likeMutation.isPending) return;
    likeMutation.mutate({ experienceId: experience.id, creatorId: creator.id, isLiked, source });
  };

  // "Double tap should not unlike" + "If already liked, do not replay the
  // animation" — an already-liked experience simply ignores a double tap
  // entirely, no mutation call and no floating heart.
  const handleDoubleTapLike = () => {
    if (isLiked || likeMutation.isPending) return;
    playFloatingHeart();
    likeMutation.mutate({ experienceId: experience.id, creatorId: creator.id, isLiked: false, source });
  };

  // ── Single vs. double tap (cover image only) ──
  // See module doc for why this is plain Pressable + a timestamp rather
  // than a gesture library. `lastTapAtRef` always advances to "now" on
  // every tap (not just the first of a pair) so a third rapid tap chains
  // correctly off the second rather than being misread as a fresh,
  // isolated single tap that would schedule an unwanted navigation.
  const lastTapAtRef = useRef(0);
  const pendingSingleTapRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (pendingSingleTapRef.current) {
        clearTimeout(pendingSingleTapRef.current);
      }
    };
  }, []);

  const handleImagePress = () => {
    const now = Date.now();
    const isRapidSecondTap = now - lastTapAtRef.current < DOUBLE_TAP_WINDOW_MS;
    lastTapAtRef.current = now;

    if (isRapidSecondTap) {
      if (pendingSingleTapRef.current) {
        clearTimeout(pendingSingleTapRef.current);
        pendingSingleTapRef.current = null;
      }
      handleDoubleTapLike();
      return;
    }

    pendingSingleTapRef.current = setTimeout(() => {
      pendingSingleTapRef.current = null;
      handlePress();
    }, DOUBLE_TAP_WINDOW_MS);
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
            <Pressable onPress={handleImagePress}>
              <CoverImage
                uri={coverImage?.url ?? null}
                accessibilityLabel={`Photo from an experience at ${title}`}
                aspectRatio={COVER_ASPECT_RATIO[variant]}
              />
            </Pressable>

            {featured ? (
              <Badge label="Featured" variant="primary" style={styles.featuredBadge} />
            ) : null}

            {showSaveButton ? (
              <Pressable
                onPress={handleSavePress}
                disabled={toggleSave.isPending}
                hitSlop={hitSlop(SAVE_BUTTON_DIAMETER)}
                style={styles.saveButton}
                accessibilityRole="button"
                accessibilityState={{ selected: isSaved, disabled: toggleSave.isPending }}
                accessibilityLabel={isSaved ? 'Remove from Saved' : 'Save this experience'}
              >
                {/* Separate scrim layer so its opacity doesn't cascade to (fade) the icon rendered on top of it. */}
                <View style={styles.saveButtonScrim} />
                <Icon
                  icon={isSaved ? BookmarkCheck : Bookmark}
                  size="sm"
                  color={isSaved ? theme.colors.brand.primary : theme.colors.static.white}
                />
              </Pressable>
            ) : null}

            {/* pointerEvents="none" — never intercepts touches. */}
            <Animated.View pointerEvents="none" style={[styles.floatingHeart, floatingHeartStyle]}>
              <Heart
                width={64}
                height={64}
                color={theme.colors.static.white}
                fill={theme.colors.static.white}
                strokeWidth={0}
              />
            </Animated.View>
          </View>

          <View style={[styles.content, isCompact && styles.contentCompact]}>
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

            {isCompact ? null : (
              <Body numberOfLines={3} color={theme.colors.text.secondary} style={styles.story}>
                {storyPreview}
              </Body>
            )}

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

              <LikeButton
                isLiked={isLiked}
                count={likeCount}
                onPress={handleLikePress}
                disabled={likeMutation.isPending}
                size="sm"
              />
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
  floatingHeart: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    // Matches saveButtonScrim's shadow-free treatment — a plain drop
    // shadow reads as a soft outline against any photo behind it,
    // keeping the heart legible over light or dark covers alike.
    ...Platform.select({
      ios: { shadowColor: theme.colors.static.black, shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
      default: {},
    }),
  },
  content: {
    padding: theme.spacing.md,
    gap: theme.spacing.xxs,
  },
  contentCompact: {
    padding: theme.spacing.sm,
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
});
