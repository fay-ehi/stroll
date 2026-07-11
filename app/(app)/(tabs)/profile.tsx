/**
 * Stroll — Profile Tab
 * app/(app)/(tabs)/profile.tsx
 *
 * PRD §8.11 — My Profile: avatar, display name, city, bio, interests.
 *
 * Redesign (this pass): Instagram/TikTok-style layout —
 *   Avatar · Display Name [pen icon] · @username · Bio
 *   Stat row: Experiences · Followers · Following (tap Followers/
 *   Following to open the follow list modal)
 *   Gallery grid of the user's own published experiences
 *   Log out (temporary — see note below)
 *
 * Changes from the previous "verification screen" version (see git
 * history / the old doc comment this replaced):
 *   - Edit is now a small pen icon beside the display name, not a
 *     separate "Edit Profile" button below the bio.
 *   - City/location row removed from the header per this pass's brief.
 *     `city` is untouched everywhere else (Discover personalization,
 *     onboarding, etc.) — only this screen's header stopped displaying
 *     it. The edit form's fields are unchanged (display name + bio only,
 *     same as before) since city was never editable from this screen to
 *     begin with (see the old TextInput fields).
 *   - Stat row + gallery grid are new. Gallery is REAL data
 *     (useUserGallery → fetchExperiencesByUser, the same `experiences`
 *     table every other feed reads from). Follower/Following counts are
 *     a SKELETON — see src/types/follow.ts's module doc; no `follows`
 *     table exists in this codebase yet, so those numbers come from a
 *     mock service until a future sprint wires the real thing. Nothing
 *     else on this screen needs to change when that happens.
 *   - Sprint 3 Prompt 3 (Creator Experience Management): the gallery grid
 *     now also carries a Drafts tile (always first — see
 *     src/components/profile/DraftsTile.tsx) and each published tile's
 *     tap now opens Experience Details, with a management action sheet
 *     (Edit / Delete — src/components/profile/ExperienceGridTile.tsx)
 *     reachable from a small per-tile button. Superseded the "Tapping a
 *     gallery photo currently does nothing" line this doc used to have.
 *
 * Log Out lives here (not Settings) for now, since Settings is still a
 * placeholder (Sprint 4). Move this into Settings once that screen ships
 * — left as-is per product direction ("temporarily there").
 */

import React, { useCallback, useMemo } from 'react';
import { View, Pressable, FlatList, StyleSheet, Alert, RefreshControl, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { Camera, BadgeCheck, WifiOff, AlertCircle, Pencil, Compass } from 'lucide-react-native';

import {
  ScreenContainer, H2, H4, Body, Caption,
  Avatar, Button, TextInput, Icon,
  Skeleton, SkeletonCircle, SkeletonText,
  EmptyState,
} from '@/components/ui';
import { DraftsTile, ExperienceGridTile } from '@/components/profile';
import { useSignOut } from '@/hooks/useAuth';
import {
  useProfile,
  useUpdateProfile,
  useRefreshProfile,
  useUploadAvatar,
  useRemoveAvatar,
} from '@/hooks/useProfile';
import { useUserGallery, useDeleteExperience } from '@/hooks/useUserGallery';
import { useDraftQuery } from '@/hooks/useExperienceDrafts';
import { useFollowCounts } from '@/hooks/useFollows';
import { useProfileStore, type AvatarUploadStage } from '@/stores/profileStore';
import { PROFILE_LIMITS } from '@/constants/app';
import { ROUTES, MODAL_ROUTES } from '@/constants/routes';
import { theme, FONT_FAMILY } from '@/theme';
import type { ExperienceCardModel } from '@/types/experience';

function uploadStageLabel(stage: AvatarUploadStage): string {
  switch (stage) {
    case 'picking':    return 'Opening photo library…';
    case 'validating': return 'Checking photo…';
    case 'uploading':  return 'Uploading photo…';
    case 'saving':     return 'Saving…';
    case 'idle':       return '';
  }
}

const GRID_COLUMNS = 3;
const GRID_GAP = theme.spacing.xxs;
/** How many skeleton cells to show while the gallery's first page is loading — matches a typical first-page row count without needing to know the real count in advance. */
const GALLERY_SKELETON_COUNT = 5;

// ─── Grid Item (Sprint 3 Prompt 3) ─────────────────────────────────────────────
// The creator grid mixes three different kinds of cell — the Drafts tile
// (always first, requirement #1), loading placeholders, and published
// experiences — so the FlatList's `data` is this discriminated union
// rather than `ExperienceCardModel[]` directly.

type ProfileGridItem =
  | { type: 'drafts' }
  | { type: 'skeleton'; key: string }
  | { type: 'experience'; experience: ExperienceCardModel };

export default function ProfileScreen() {
  const { signOut, loading: signingOut } = useSignOut();
  const { profile, isLoading, isError, error, isOffline, refetch } = useProfile();
  const { refresh, isRefreshing } = useRefreshProfile();
  const updateProfileMutation = useUpdateProfile();
  const removeAvatarMutation = useRemoveAvatar();
  const { pickAndUpload, isUploading, stage } = useUploadAvatar();
  const { width: windowWidth } = useWindowDimensions();

  const gallery = useUserGallery(profile?.id);
  const { followerCount, followingCount } = useFollowCounts(profile?.id);
  // Named `experienceDraft` (not `draft`) to stay clear of the profile
  // EDIT draft below (`useProfileStore((s) => s.draft)`) — two entirely
  // different domains that happen to share the word "draft".
  const { draft: experienceDraft, isLoading: isDraftLoading } = useDraftQuery(profile?.id);
  const { deleteExperience } = useDeleteExperience(profile?.id);

  const isEditing     = useProfileStore((s) => s.isEditing);
  const draft         = useProfileStore((s) => s.draft);
  const startEditing  = useProfileStore((s) => s.startEditing);
  const updateDraft   = useProfileStore((s) => s.updateDraft);
  const cancelEditing = useProfileStore((s) => s.cancelEditing);
  const finishEditing = useProfileStore((s) => s.finishEditing);

  const tileSize =
    (windowWidth - theme.layout.screenPaddingHorizontal * 2 - GRID_GAP * (GRID_COLUMNS - 1)) /
    GRID_COLUMNS;

  const confirmSignOut = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const openFollowList = (kind: 'followers' | 'following') => {
    if (!profile) return;
    // Cast: expo-router's generated route types (.expo/types) are built by
    // the dev server scanning app/ on start — they won't know about the
    // new follows/[userId].tsx route until `expo start` has run at least
    // once after this file was added. The path itself is correct (mirrors
    // every other (modals) route's push shape). Safe to remove this cast
    // after the first local `expo start`/`expo prebuild` regenerates
    // .expo/types.
    router.push({
      pathname: '/(modals)/follows/[userId]',
      params: { userId: profile.id, kind },
    } as never);
  };

  // ── Creator content grid (Sprint 3 Prompt 3) ──────────────────────────────
  // The Drafts tile is always first (requirement #1), regardless of
  // whether a draft currently exists — DraftsTile itself renders the
  // empty/loading/has-a-draft states. While the published-experiences
  // page is still loading, skeleton cells stand in for it — see
  // GALLERY_SKELETON_COUNT's doc above.

  const gridData: ProfileGridItem[] = useMemo(() => {
    const items: ProfileGridItem[] = [{ type: 'drafts' }];
    if (gallery.isLoading) {
      for (let i = 0; i < GALLERY_SKELETON_COUNT; i++) {
        items.push({ type: 'skeleton', key: `skeleton-${i}` });
      }
    } else {
      for (const experience of gallery.experiences) {
        items.push({ type: 'experience', experience });
      }
    }
    return items;
  }, [gallery.isLoading, gallery.experiences]);

  const handleOpenDrafts = useCallback(() => {
    router.push(MODAL_ROUTES.drafts as never);
  }, []);

  const handleOpenExperience = useCallback((experience: ExperienceCardModel) => {
    router.push(ROUTES.app.experienceDetail(experience.id) as never);
  }, []);

  const handleEditExperience = useCallback((experience: ExperienceCardModel) => {
    router.push(MODAL_ROUTES.editExperience(experience.id) as never);
  }, []);

  const handleDeleteExperience = useCallback(
    (experience: ExperienceCardModel) => {
      deleteExperience(experience.id);
    },
    [deleteExperience],
  );

  const renderGridItem = useCallback(
    ({ item }: { item: ProfileGridItem }) => {
      if (item.type === 'drafts') {
        return (
          <DraftsTile
            size={tileSize}
            draft={experienceDraft}
            isLoading={isDraftLoading}
            onPress={handleOpenDrafts}
          />
        );
      }
      if (item.type === 'skeleton') {
        return <Skeleton width={tileSize} height={tileSize} borderRadius={0} />;
      }
      return (
        <ExperienceGridTile
          experience={item.experience}
          size={tileSize}
          onPress={handleOpenExperience}
          onEdit={handleEditExperience}
          onDelete={handleDeleteExperience}
        />
      );
    },
    [tileSize, experienceDraft, isDraftLoading, handleOpenDrafts, handleOpenExperience, handleEditExperience, handleDeleteExperience],
  );

  const gridKeyExtractor = useCallback((item: ProfileGridItem) => {
    if (item.type === 'drafts') return 'drafts-tile';
    if (item.type === 'skeleton') return item.key;
    return item.experience.id;
  }, []);

  const handleGalleryEndReached = useCallback(() => {
    if (gallery.hasNextPage && !gallery.isFetchingNextPage && !gallery.isError) {
      gallery.fetchNextPage();
    }
  }, [gallery.hasNextPage, gallery.isFetchingNextPage, gallery.isError, gallery.fetchNextPage]);

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
      </ScreenContainer>
    );
  }

  // ── Error / missing-profile state ──────────────────────────────────────────
  if (isError || !profile) {
    return (
      <ScreenContainer scroll={false}>
        <EmptyState
          icon={AlertCircle}
          title="We couldn't load your profile"
          description={error?.userMessage ?? 'Something went wrong. Please try again.'}
          action={{ label: 'Try Again', onPress: refetch }}
        />
      </ScreenContainer>
    );
  }

  // From here on, `profile` is guaranteed non-null.

  const handleAvatarPress = () => {
    if (isUploading || isOffline) return;

    const options = profile.avatarUrl
      ? [
          { text: 'Change Photo', onPress: () => { void pickAndUpload(); } },
          {
            text: 'Remove Photo',
            style: 'destructive' as const,
            onPress: () => removeAvatarMutation.mutate(profile.avatarUrl),
          },
          { text: 'Cancel', style: 'cancel' as const },
        ]
      : [
          { text: 'Choose Photo', onPress: () => { void pickAndUpload(); } },
          { text: 'Cancel', style: 'cancel' as const },
        ];

    Alert.alert('Profile Photo', undefined, options);
  };

  const handleStartEditing = () => {
    startEditing({ displayName: profile.displayName, bio: profile.bio ?? '' });
  };

  const handleSave = () => {
    if (!draft) return;
    updateProfileMutation.mutate(
      { displayName: draft.displayName, bio: draft.bio },
      { onSuccess: finishEditing }
    );
  };

  // ── Gallery header: avatar, name+pen, username, bio, stats ──────────────────
  const galleryHeader = (
    <View>
      {isOffline ? (
        <View style={styles.offlineBanner}>
          <Icon icon={WifiOff} size="sm" color={theme.colors.semantic.warning} />
          <Caption color={theme.colors.semantic.warning} style={styles.offlineText}>
            You&apos;re offline — showing your last saved profile.
          </Caption>
        </View>
      ) : null}

      <View style={styles.header}>
        <Pressable
          onPress={handleAvatarPress}
          disabled={isUploading || isOffline}
          style={styles.avatarButton}
          accessibilityRole="button"
          accessibilityLabel={profile.avatarUrl ? 'Change profile photo' : 'Add profile photo'}
        >
          <Avatar
            source={profile.avatarUrl ? { uri: profile.avatarUrl } : undefined}
            name={profile.displayName}
            size="xl"
          />
          <View style={styles.cameraOverlay}>
            <Icon icon={Camera} size="sm" color={theme.colors.static.white} />
          </View>
        </Pressable>

        {isUploading ? (
          <Caption color={theme.colors.text.secondary}>{uploadStageLabel(stage)}</Caption>
        ) : null}

        <View style={styles.nameRow}>
          <H2 align="center" style={styles.displayName}>{profile.displayName}</H2>
          {profile.isVerified ? (
            <Icon icon={BadgeCheck} size="sm" color={theme.colors.brand.primary} accessibilityLabel="Verified" />
          ) : null}
          {!isEditing ? (
            <Pressable
              onPress={handleStartEditing}
              disabled={isOffline}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Edit profile"
              style={styles.editPenButton}
            >
              <Icon icon={Pencil} size="sm" color={theme.colors.text.tertiary} />
            </Pressable>
          ) : null}
        </View>
        <Body color={theme.colors.text.secondary}>@{profile.username}</Body>
      </View>

      {!isEditing ? (
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <H4 align="center" style={styles.statNumber}>{gallery.experiences.length}</H4>
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
      ) : null}

      {isEditing && draft ? (
        <View style={styles.editSection}>
          <TextInput
            label="Display Name"
            value={draft.displayName}
            onChangeText={(text) => updateDraft({ displayName: text })}
            maxLength={PROFILE_LIMITS.MAX_DISPLAY_NAME_LENGTH}
          />
          <TextInput
            label="Bio"
            value={draft.bio}
            onChangeText={(text) => updateDraft({ bio: text })}
            multiline
            maxLength={PROFILE_LIMITS.MAX_BIO_LENGTH}
            helperText={`${draft.bio.length}/${PROFILE_LIMITS.MAX_BIO_LENGTH}`}
            containerStyle={styles.bioInput}
          />
          <View style={styles.editActions}>
            <Button
              label="Cancel"
              variant="secondary"
              onPress={cancelEditing}
              style={styles.editActionButton}
            />
            <Button
              label="Save"
              onPress={handleSave}
              loading={updateProfileMutation.isPending}
              style={styles.editActionButton}
            />
          </View>
        </View>
      ) : (
        <View style={styles.bioSection}>
          {profile.bio ? (
            <Body align="center">{profile.bio}</Body>
          ) : (
            <Body align="center" color={theme.colors.text.tertiary}>
              No bio yet.
            </Body>
          )}
        </View>
      )}

      <View style={styles.galleryDivider} />
    </View>
  );

  return (
    <ScreenContainer scroll={false} padded={false}>
      <FlatList
        data={gridData}
        keyExtractor={gridKeyExtractor}
        renderItem={renderGridItem}
        numColumns={GRID_COLUMNS}
        columnWrapperStyle={styles.gridRow}
        ListHeaderComponent={galleryHeader}
        ListFooterComponent={
          <View style={styles.footer}>
            {/*
              Requirement #1's "Empty state" for Published Experiences —
              rendered here rather than via ListEmptyComponent because
              `data` (gridData) is never actually empty: the Drafts tile
              always occupies the first cell (requirement #1's "Always
              appear first"), regardless of whether there are any
              published experiences yet.
            */}
            {!gallery.isLoading && gallery.experiences.length === 0 ? (
              <View style={styles.emptyGallery}>
                <EmptyState
                  icon={Compass}
                  title="No experiences yet"
                  description="Experiences you publish will show up here."
                />
              </View>
            ) : null}
            <Button
              label="Log out"
              variant="destructive"
              fullWidth
              loading={signingOut}
              onPress={confirmSignOut}
            />
          </View>
        }
        onEndReached={handleGalleryEndReached}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.screenPadding}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => { void refresh(); }}
            tintColor={theme.colors.brand.primary}
          />
        }
      />
    </ScreenContainer>
  );
}

const AVATAR_DIAMETER = 96;

const styles = StyleSheet.create({
  screenPadding: {
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    paddingBottom: theme.spacing['4xl'],
  },
  loadingContainer: {
    flex:              1,
    alignItems:        'center',
    justifyContent:    'center',
    gap:               theme.spacing.sm,
    paddingHorizontal: theme.spacing.xl,
  },
  loadingBio: {
    marginTop: theme.spacing.md,
    width:     '100%',
  },
  offlineBanner: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               theme.spacing.xs,
    backgroundColor:   theme.colors.neutral.backgroundSecondary,
    borderRadius:      theme.radius.card,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical:   theme.spacing.xs,
    marginTop:         theme.spacing.md,
    marginBottom:      theme.spacing.md,
  },
  offlineText: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    gap:        theme.spacing.xxs,
    paddingTop: theme.spacing.md,
  },
  avatarButton: {
    position:     'relative',
    width:        AVATAR_DIAMETER,
    height:       AVATAR_DIAMETER,
    marginBottom: theme.spacing.sm,
  },
  cameraOverlay: {
    position:        'absolute',
    bottom:          0,
    right:           0,
    width:           theme.spacing.xxl,
    height:          theme.spacing.xxl,
    borderRadius:    theme.radius.full,
    backgroundColor: theme.colors.brand.primary,
    alignItems:      'center',
    justifyContent:  'center',
    borderWidth:     theme.borders.width + 1,
    borderColor:     theme.colors.neutral.background,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           theme.spacing.xxs,
  },
  // H2's own preset is 30px — this keeps its bold family/weight but pulls
  // the size down to h3's 24px, so the name reads a touch less shouty
  // without losing the bold weight that pairs with statNumber below.
  displayName: {
    fontSize: theme.typography.sizes.h3,
    lineHeight: theme.typography.lineHeights.h3,
  },
  editPenButton: {
    marginLeft: theme.spacing.xxs,
  },
  bioSection: {
    alignItems: 'center',
    gap:        theme.spacing.md,
    marginTop:  theme.spacing.sm,
  },
  editSection: {
    marginTop: theme.spacing.lg,
    gap:       theme.spacing.md,
  },
  bioInput: {
    marginTop: 0,
  },
  editActions: {
    flexDirection: 'row',
    gap:           theme.spacing.sm,
  },
  editActionButton: {
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.xxl,
    marginTop: theme.spacing.xs,
    paddingVertical: theme.spacing.xxs,
  },
  statItem: {
    alignItems: 'center',
    gap: theme.spacing.xxs,
  },
  // Same weight/family as the display name (H2 uses the bold heading
  // preset) — H4's own preset is semiBold, so this overrides just those
  // two fields on top of it rather than swapping the component, which
  // would also change the font size.
  statNumber: {
    fontFamily: FONT_FAMILY.headingBold,
    fontWeight: theme.typography.weights.bold,
  },
  galleryDivider: {
    height: theme.borders.width,
    backgroundColor: theme.colors.neutral.border,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xxs,
  },
  gridRow: {
    gap: GRID_GAP,
  },
  emptyGallery: {
    paddingVertical: theme.spacing.xxl,
  },
  footer: {
    paddingTop:    theme.spacing.xxl,
    paddingBottom: theme.spacing.xl,
  },
});
