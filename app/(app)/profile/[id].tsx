/**
 * Stroll — Public Profile
 * app/(app)/profile/[id].tsx
 *
 * Sprint 6 — Prompt 1. The canonical destination for viewing any OTHER
 * creator's profile — reached from every creator reference throughout
 * the app via ROUTES.app.otherUserProfile(userId): Experience Detail's
 * creator row (see app/(app)/experience/[id].tsx), a Collection's
 * owner/contributor row (CollectionDetailHeader.tsx /
 * ContributorsLine.tsx), and a Collection Card's avatar stack
 * (CollectionCard.tsx) — all of which already pushed here before this
 * screen was real (see each call site's own doc for why).
 *
 * Same information architecture as the Profile tab
 * (app/(app)/(tabs)/profile.tsx) — avatar, name, bio, stats, Collections
 * row, published Experience grid — reusing the exact same hooks
 * (useUserGallery, useMyCollections, both already generic over any
 * userId, not just "me") and the exact same reusable pieces
 * (CollectionsRow, the shared ExperienceCard) via usePublicProfilePage()
 * (src/hooks/useProfile.ts) rather than re-implementing any of those
 * fetches. What's deliberately NOT here, per this sprint's own ADR:
 * drafts, creator-management long-press actions, delete actions, and
 * Edit Profile controls — this is a read-only, visitor's view of
 * someone else, not the owner's own management surface. In its place:
 * a Follow/Following button.
 *
 * The Experience grid uses ExperienceCard (the same reusable card every
 * other feed renders), not ExperienceGridTile — that component's own
 * long-press menu (Edit/Delete/Add to Collection) is exactly the
 * "creator management" surface this screen must not expose to a
 * visitor; the Profile tab keeps ExperienceGridTile for the signed-in
 * user's own gallery, this screen uses the plain card instead.
 *
 * Viewing your OWN id through this route (e.g. tapping your own avatar
 * in a Collection you collaborate on) redirects straight to the Profile
 * tab instead of rendering a read-only mirror of yourself — that tab
 * already IS the fuller, editable version of this same information, and
 * "Follow yourself" isn't a state this screen needs to handle at all.
 */

import React, { useCallback, useEffect } from 'react';
import { View, Pressable, FlatList, StyleSheet, RefreshControl, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, BadgeCheck, WifiOff, AlertCircle, SearchX, Compass } from 'lucide-react-native';

import {
  ScreenContainer, H2, H4, Body, Caption,
  Avatar, Button, Icon,
  Skeleton, SkeletonCircle, SkeletonText,
  EmptyState,
} from '@/components/ui';
import { ExperienceCard, ExperienceCardSkeleton } from '@/components/discover';
import { CollectionsRow } from '@/components/profile';
import { useAuthState } from '@/hooks/useAuth';
import { usePublicProfilePage } from '@/hooks/useProfile';
import { useIsFollowing, useFollow } from '@/hooks/useFollows';
import { ROUTES } from '@/constants/routes';
import { theme, FONT_FAMILY } from '@/theme';
import type { ExperienceCardModel } from '@/types/experience';
import type { CollectionModel } from '@/types/collection';

const GRID_COLUMNS = 2;
const GRID_GAP = theme.spacing.md;
const GALLERY_SKELETON_COUNT = 4;
const AVATAR_DIAMETER = 96;
const BACK_BUTTON_DIAMETER = 40;

function BackButton() {
  return (
    <Pressable
      onPress={() => router.back()}
      style={styles.backButton}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel="Go back"
    >
      <View style={styles.backButtonScrim} />
      <Icon icon={ArrowLeft} size="md" color={theme.colors.static.white} />
    </Pressable>
  );
}

export default function PublicProfileScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const id = rawId ?? '';

  const { user: currentUser } = useAuthState();
  const { width: windowWidth } = useWindowDimensions();
  const isOwnProfile = !!currentUser && currentUser.id === id;

  // Viewing yourself through this route redirects to the (fuller,
  // editable) Profile tab rather than rendering a read-only mirror of
  // yourself — see this file's own module doc.
  useEffect(() => {
    if (isOwnProfile) {
      router.replace(ROUTES.tabs.profile as never);
    }
  }, [isOwnProfile]);

  const {
    profile: profileQuery,
    gallery,
    collections,
    followerCount,
    followingCount,
    refresh,
    isRefreshing,
  } = usePublicProfilePage(isOwnProfile ? undefined : id);
  const { profile, isLoading, isError, error, refetch } = profileQuery;

  const isFollowing = useIsFollowing(profile?.id);
  const followMutation = useFollow();

  const tileSize =
    (windowWidth - theme.layout.screenPaddingHorizontal * 2 - GRID_GAP * (GRID_COLUMNS - 1)) /
    GRID_COLUMNS;

  const openFollowList = useCallback(
    (kind: 'followers' | 'following') => {
      if (!profile) return;
      // Cast for the same reason app/(app)/(tabs)/profile.tsx's own
      // openFollowList already carries — see that function's comment.
      router.push({
        pathname: '/(modals)/follows/[userId]',
        params: { userId: profile.id, kind },
      } as never);
    },
    [profile],
  );

  const handleToggleFollow = useCallback(() => {
    if (!profile) return;
    followMutation.mutate({ targetUserId: profile.id, isFollowing });
  }, [profile, isFollowing, followMutation]);

  const handleSelectCollection = useCallback((collection: CollectionModel) => {
    router.push(ROUTES.app.collectionDetail(collection.id) as never);
  }, []);

  const handleGalleryEndReached = useCallback(() => {
    if (gallery.hasNextPage && !gallery.isFetchingNextPage && !gallery.isError) {
      gallery.fetchNextPage();
    }
  }, [gallery]);

  const renderExperienceItem = useCallback(
    ({ item }: { item: ExperienceCardModel }) => (
      <View style={{ width: tileSize, maxWidth: tileSize }}>
        <ExperienceCard experience={item} variant="compact" source="public_profile" width={tileSize} />
      </View>
    ),
    [tileSize],
  );

  const experienceKeyExtractor = useCallback((item: ExperienceCardModel) => item.id, []);

  // While the redirect effect above is about to fire, render nothing
  // rather than a flash of "own profile as a stranger would see it."
  if (isOwnProfile) {
    return (
      <ScreenContainer scroll={false} padded={false}>
        <View />
      </ScreenContainer>
    );
  }

  // ── Loading state — skeleton resembling the final layout ────────────────────
  if (isLoading) {
    return (
      <ScreenContainer scroll={false}>
        <View style={styles.loadingContainer}>
          <SkeletonCircle diameter={AVATAR_DIAMETER} />
          <SkeletonText width="50%" />
          <SkeletonText width="30%" />
          <Skeleton height={60} style={styles.loadingBio} />
        </View>
        <BackButton />
      </ScreenContainer>
    );
  }

  // ── Error / missing-user state — offline, not found, or other failure ───────
  if (isError || !profile) {
    const isMissing = error?.code === 'NOT_FOUND';
    const isOffline = error?.code === 'NETWORK_ERROR';

    return (
      <ScreenContainer scroll={false}>
        <EmptyState
          icon={isOffline ? WifiOff : isMissing ? SearchX : AlertCircle}
          title={
            isOffline ? "You're offline" : isMissing ? 'User not found' : "We couldn't load this profile"
          }
          description={
            isOffline
              ? 'Connect to the internet and try again.'
              : isMissing
                ? 'This user may have been removed, or the link is incorrect.'
                : (error?.userMessage ?? 'Something went wrong. Please try again.')
          }
          action={isMissing ? undefined : { label: 'Try Again', onPress: refetch }}
        />
        <BackButton />
      </ScreenContainer>
    );
  }

  // From here on, `profile` is guaranteed non-null.

  const galleryHeader = (
    <View>
      <View style={styles.header}>
        <Avatar
          source={profile.avatarUrl ? { uri: profile.avatarUrl } : undefined}
          name={profile.displayName}
          size="xl"
        />

        <View style={styles.nameRow} accessibilityRole="header">
          <H2 align="center" style={styles.displayName}>
            {profile.displayName}
          </H2>
          {profile.isVerified ? (
            <Icon icon={BadgeCheck} size="sm" color={theme.colors.brand.primary} accessibilityLabel="Verified" />
          ) : null}
        </View>
        <Body color={theme.colors.text.secondary}>@{profile.username}</Body>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <H4 align="center" style={styles.statNumber}>
            {gallery.isLoading ? '–' : gallery.experiences.length}
          </H4>
          <Caption color={theme.colors.text.tertiary}>Experiences</Caption>
        </View>
        <Pressable
          style={styles.statItem}
          onPress={() => openFollowList('followers')}
          accessibilityRole="button"
          accessibilityLabel={`${followerCount} followers`}
        >
          <H4 align="center" style={styles.statNumber}>{followerCount}</H4>
          <Caption color={theme.colors.text.tertiary}>Followers</Caption>
        </Pressable>
        <Pressable
          style={styles.statItem}
          onPress={() => openFollowList('following')}
          accessibilityRole="button"
          accessibilityLabel={`${followingCount} following`}
        >
          <H4 align="center" style={styles.statNumber}>{followingCount}</H4>
          <Caption color={theme.colors.text.tertiary}>Following</Caption>
        </Pressable>
      </View>

      <View style={styles.bioSection}>
        {profile.bio ? (
          <Body align="center">{profile.bio}</Body>
        ) : (
          <Body align="center" color={theme.colors.text.tertiary}>
            No bio yet.
          </Body>
        )}
      </View>

      <View style={styles.followButtonWrap}>
        <Button
          label={isFollowing ? 'Following' : 'Follow'}
          variant={isFollowing ? 'secondary' : 'primary'}
          onPress={handleToggleFollow}
          loading={followMutation.isPending}
          accessibilityLabel={
            isFollowing ? `Unfollow ${profile.displayName}` : `Follow ${profile.displayName}`
          }
          style={styles.followButton}
        />
      </View>

      <View style={styles.collectionsSection}>
        <CollectionsRow
          collections={collections.collections}
          isLoading={collections.isLoading}
          isOwnProfile={false}
          onSelectCollection={handleSelectCollection}
          onCreateCollection={() => {}}
        />
      </View>

      <View style={styles.galleryDivider} />
    </View>
  );

  return (
    <ScreenContainer scroll={false} padded={false}>
      <FlatList
        data={gallery.isLoading ? [] : gallery.experiences}
        keyExtractor={experienceKeyExtractor}
        renderItem={renderExperienceItem}
        numColumns={GRID_COLUMNS}
        columnWrapperStyle={styles.gridRow}
        ListHeaderComponent={galleryHeader}
        ListEmptyComponent={
          gallery.isLoading ? (
            <View style={styles.skeletonGrid}>
              {Array.from({ length: GALLERY_SKELETON_COUNT }, (_, i) => (
                <ExperienceCardSkeleton key={i} variant="compact" width={tileSize} />
              ))}
            </View>
          ) : (
            <View style={styles.emptyGallery}>
              <EmptyState
                icon={Compass}
                title="No experiences yet"
                description={`${profile.displayName} hasn't published any experiences yet.`}
              />
            </View>
          )
        }
        onEndReached={handleGalleryEndReached}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.screenPadding}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              void refresh();
            }}
            tintColor={theme.colors.brand.primary}
          />
        }
      />
      <BackButton />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screenPadding: {
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    paddingBottom: theme.spacing['4xl'],
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xl,
  },
  loadingBio: {
    marginTop: theme.spacing.md,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    gap: theme.spacing.xxs,
    paddingTop: theme.spacing.xxl,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xxs,
  },
  displayName: {
    fontSize: theme.typography.sizes.h3,
    lineHeight: theme.typography.lineHeights.h3,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.xxl,
    marginTop: theme.spacing.md,
    paddingVertical: theme.spacing.xxs,
  },
  statItem: {
    alignItems: 'center',
    gap: theme.spacing.xxs,
  },
  statNumber: {
    fontFamily: FONT_FAMILY.headingBold,
    fontWeight: theme.typography.weights.bold,
  },
  bioSection: {
    alignItems: 'center',
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  followButtonWrap: {
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    marginTop: theme.spacing.md,
  },
  followButton: {
    width: '100%',
  },
  collectionsSection: {
    marginTop: theme.spacing.lg,
  },
  galleryDivider: {
    height: theme.borders.width,
    backgroundColor: theme.colors.neutral.border,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  gridRow: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  emptyGallery: {
    paddingVertical: theme.spacing.xxl,
  },
  backButton: {
    position: 'absolute',
    top: theme.spacing.md,
    left: theme.spacing.md,
    width: BACK_BUTTON_DIAMETER,
    height: BACK_BUTTON_DIAMETER,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  backButtonScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.static.black,
    opacity: theme.opacity.heavy,
  },
});
