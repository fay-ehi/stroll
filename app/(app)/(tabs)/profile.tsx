/**
 * Stroll — Profile Tab
 * app/(app)/(tabs)/profile.tsx
 *
 * PRD §8.11 — My Profile: avatar, display name, city, bio, interests.
 *
 * Sprint 1 Prompt 3 scope: this is a verification screen for the Profile
 * domain — it proves the full pipeline (auto-created profile, avatar
 * upload/replace/remove, edit + cache update, offline/error states) works
 * end to end. It is deliberately NOT the final polished Edit Profile UI
 * from the Design System (city picker, interest re-selection, Experiences/
 * Collections tabs, follower counts) — that full screen is later sprint
 * scope per this prompt's brief ("do not build profile editing screens
 * beyond what is required to verify the profile system").
 *
 * Log Out lives here (not Settings) for now, since Settings is still a
 * placeholder (Sprint 4). Move this into Settings once that screen ships.
 */

import React from 'react';
import { View, Pressable, StyleSheet, Alert, RefreshControl } from 'react-native';
import {
  ScreenContainer, H2, Body, BodySmall, Caption,
  Avatar, Button, TextInput, Icon,
  Skeleton, SkeletonCircle, SkeletonText,
  EmptyState,
} from '@/components/ui';
import { Camera, MapPin, BadgeCheck, WifiOff, AlertCircle, Pencil } from 'lucide-react-native';
import { useSignOut } from '@/hooks/useAuth';
import {
  useProfile,
  useUpdateProfile,
  useRefreshProfile,
  useUploadAvatar,
  useRemoveAvatar,
} from '@/hooks/useProfile';
import { useProfileStore, type AvatarUploadStage } from '@/stores/profileStore';
import { PROFILE_LIMITS } from '@/constants/app';
import { theme } from '@/theme';

function uploadStageLabel(stage: AvatarUploadStage): string {
  switch (stage) {
    case 'picking':    return 'Opening photo library…';
    case 'validating': return 'Checking photo…';
    case 'uploading':  return 'Uploading photo…';
    case 'saving':     return 'Saving…';
    case 'idle':       return '';
  }
}

export default function ProfileScreen() {
  const { signOut, loading: signingOut } = useSignOut();
  const { profile, isLoading, isError, error, isOffline, refetch } = useProfile();
  const { refresh, isRefreshing } = useRefreshProfile();
  const updateProfileMutation = useUpdateProfile();
  const removeAvatarMutation = useRemoveAvatar();
  const { pickAndUpload, isUploading, stage } = useUploadAvatar();

  const isEditing     = useProfileStore((s) => s.isEditing);
  const draft         = useProfileStore((s) => s.draft);
  const startEditing  = useProfileStore((s) => s.startEditing);
  const updateDraft   = useProfileStore((s) => s.updateDraft);
  const cancelEditing = useProfileStore((s) => s.cancelEditing);
  const finishEditing = useProfileStore((s) => s.finishEditing);

  const confirmSignOut = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  // ── Loading state — skeleton resembling the final layout (Design System §34) ──
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

  return (
    <ScreenContainer
      scrollViewProps={{
        refreshControl: (
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => { void refresh(); }}
            tintColor={theme.colors.brand.primary}
          />
        ),
      }}
    >
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
          <H2 align="center">{profile.displayName}</H2>
          {profile.isVerified ? (
            <Icon icon={BadgeCheck} size="sm" color={theme.colors.brand.primary} accessibilityLabel="Verified" />
          ) : null}
        </View>
        <Body color={theme.colors.text.secondary}>@{profile.username}</Body>

        {profile.city ? (
          <View style={styles.cityRow}>
            <Icon icon={MapPin} size="sm" color={theme.colors.text.tertiary} />
            <BodySmall color={theme.colors.text.secondary}>{profile.city}</BodySmall>
          </View>
        ) : null}
      </View>

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
          <Button
            label="Edit Profile"
            variant="secondary"
            leftIcon={Pencil}
            disabled={isOffline}
            onPress={handleStartEditing}
            style={styles.editButton}
          />
        </View>
      )}


      <View style={styles.footer}>
        <Button
          label="Log out"
          variant="destructive"
          fullWidth
          loading={signingOut}
          onPress={confirmSignOut}
        />
      </View>
    </ScreenContainer>
  );
}

const AVATAR_DIAMETER = 96;

const styles = StyleSheet.create({
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
    marginBottom:      theme.spacing.md,
  },
  offlineText: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    gap:        theme.spacing.xxs,
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
  cityRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           theme.spacing.xxs,
    marginTop:     theme.spacing.xxs,
  },
  bioSection: {
    alignItems: 'center',
    gap:        theme.spacing.md,
    marginTop:  theme.spacing.lg,
  },
  editButton: {
    marginTop: theme.spacing.xs,
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
  interestsSection: {
    marginTop: theme.spacing.xl,
  },
  sectionTitle: {
    marginBottom: theme.spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           theme.spacing.xs,
  },
  footer: {
    paddingTop:    theme.spacing.xxl,
    paddingBottom: theme.spacing.xl,
  },
});
