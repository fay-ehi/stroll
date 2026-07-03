/**
 * Stroll — Onboarding: Profile Photo
 * app/(onboarding)/avatar.tsx
 *
 * Step 3 of 5. Optional avatar upload. Skippable.
 * Uses expo-image-picker to select from the photo library.
 *
 * Design Philosophy §28: "Get the user to Discover as quickly as possible."
 * Avatar is nice-to-have at onboarding — always skippable.
 */

import React, { useCallback } from 'react';
import { View, Pressable, Image, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '@/stores/authStore';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { OnboardingStepWrapper } from '@/components/onboarding/OnboardingStepWrapper';
import { Button, BodySmall } from '@/components/ui';
import { Avatar } from '@/components/ui';
import { showToast } from '@/stores/toastStore';
import { theme } from '@/theme';
import { Camera } from 'lucide-react-native';
import { Icon } from '@/components/ui';
import { ONBOARDING_RULES } from '@/constants/onboarding';

// Avatar preview diameter for this screen.
const AVATAR_DIAMETER = 120;

export default function OnboardingAvatarScreen() {
  const user = useAuthStore((s) => s.user);
  const {
    data,
    setAvatarUri,
    goToNextStep,
    goToPrevStep,
    saveAvatar,
    submitting,
  } = useOnboardingStore();

  const displayName =
    (user?.user_metadata?.['display_name'] as string | undefined) ?? '';

  const handlePickImage = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showToast({
        type:    'info',
        message: 'Photo access is needed to set a profile picture.',
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];

    // Rough size check (asset.fileSize is optional).
    if (asset.fileSize && asset.fileSize > ONBOARDING_RULES.MAX_AVATAR_BYTES) {
      showToast({
        type:    'error',
        message: 'Image is too large. Please choose a file under 5MB.',
      });
      return;
    }

    const mimeType = asset.mimeType ?? 'image/jpeg';
    setAvatarUri(asset.uri, mimeType);
  }, [setAvatarUri]);

  const handleContinue = useCallback(async () => {
    if (!user) return;

    if (data.avatarUri) {
      const ok = await saveAvatar(user.id);
      if (!ok) {
        showToast({
          type:    'error',
          message: 'Could not upload your photo. You can add one later from your profile.',
        });
        // Don't block — let them continue even if avatar upload fails.
      }
    }

    goToNextStep();
    router.push('/(onboarding)/notifications');
  }, [user, data.avatarUri, saveAvatar, goToNextStep]);

  const handleSkip = useCallback(() => {
    goToNextStep();
    router.push('/(onboarding)/notifications');
  }, [goToNextStep]);

  return (
    <OnboardingStepWrapper
      step="avatar"
      title="Add a profile photo"
      subtitle="Let people know who you are. You can always update this later."
      showBack
      onBack={() => {
        goToPrevStep();
        router.back();
      }}
      skipLabel="Skip"
      onSkip={handleSkip}
      footer={
        <Button
          label={data.avatarUri ? 'Continue' : 'Skip for now'}
          variant={data.avatarUri ? 'primary' : 'secondary'}
          fullWidth
          loading={submitting}
          onPress={handleContinue}
        />
      }
    >
      <View style={styles.avatarSection}>
        {/* Avatar preview */}
        <Pressable
          onPress={handlePickImage}
          style={styles.avatarButton}
          accessibilityRole="button"
          accessibilityLabel={data.avatarUri ? 'Change profile photo' : 'Add profile photo'}
        >
          {data.avatarUri ? (
            <Image
              source={{ uri: data.avatarUri }}
              style={[styles.avatarImage, { borderRadius: AVATAR_DIAMETER / 2 }]}
              resizeMode="cover"
              accessibilityLabel="Selected profile photo preview"
            />
          ) : (
            <Avatar
              name={displayName}
              size="xl"
            />
          )}

          {/* Camera overlay */}
          <View style={styles.cameraOverlay}>
            <Icon icon={Camera} size="sm" color={theme.colors.static.white} />
          </View>
        </Pressable>

        <BodySmall
          align="center"
          color={theme.colors.text.secondary}
          style={styles.hint}
        >
          Tap to choose a photo from your library
        </BodySmall>

        {data.avatarUri ? (
          <Pressable
            onPress={() => setAvatarUri(null)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Remove selected photo"
          >
            <BodySmall color={theme.colors.semantic.error}>Remove photo</BodySmall>
          </Pressable>
        ) : null}
      </View>
    </OnboardingStepWrapper>
  );
}

const styles = StyleSheet.create({
  avatarSection: {
    alignItems:   'center',
    gap:          theme.spacing.md,
    marginTop:    theme.spacing.xl,
  },
  avatarButton: {
    position: 'relative',
    width:    AVATAR_DIAMETER,
    height:   AVATAR_DIAMETER,
  },
  avatarImage: {
    width:  AVATAR_DIAMETER,
    height: AVATAR_DIAMETER,
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
  hint: {
    maxWidth: theme.spacing['5xl'] * 4,
  },
});
