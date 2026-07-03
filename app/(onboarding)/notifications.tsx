/**
 * Stroll — Onboarding: Enable Notifications
 * app/(onboarding)/notifications.tsx
 *
 * Step 4 of 5. Requests push notification permission.
 *
 * Note: expo-notifications push support was removed from Expo Go in SDK 53.
 * The permission request is wrapped in try/catch so the screen never crashes
 * in Expo Go — it simply treats the result as denied and moves on.
 * A development build is required for real push notification support.
 */

import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { OnboardingStepWrapper } from '@/components/onboarding/OnboardingStepWrapper';
import { Button, Body, BodySmall } from '@/components/ui';
import { Icon } from '@/components/ui';
import { theme } from '@/theme';
import { Bell, Heart, MessageCircle, Users } from 'lucide-react-native';

const VALUE_PROPS = [
  { icon: Heart,         label: 'When someone likes your experience' },
  { icon: MessageCircle, label: 'When someone comments on your post' },
  { icon: Users,         label: 'When someone starts following you' },
] as const;

export default function OnboardingNotificationsScreen() {
  const { setNotifications, goToNextStep, goToPrevStep, submitting } =
    useOnboardingStore();

  const proceed = useCallback(
    (granted: boolean) => {
      setNotifications(granted);
      goToNextStep();
      router.push('/(onboarding)/suggested-users');
    },
    [setNotifications, goToNextStep]
  );

  const handleEnable = useCallback(async () => {
    try {
      // Dynamically import so the module load itself doesn't crash Expo Go
      // at route-discovery time (the top-level import was causing the error).
      const Notifications = await import('expo-notifications');
      const { status } = await Notifications.requestPermissionsAsync();
      proceed(status === 'granted');
    } catch {
      // expo-notifications not supported in Expo Go on SDK 53+ —
      // treat as denied and continue.
      proceed(false);
    }
  }, [proceed]);

  const handleSkip = useCallback(() => proceed(false), [proceed]);

  return (
    <OnboardingStepWrapper
      step="notifications"
      title="Stay in the loop"
      subtitle="Know when people engage with your experiences and recommendations."
      showBack
      onBack={() => {
        goToPrevStep();
        router.back();
      }}
      skipLabel="Not now"
      onSkip={handleSkip}
      footer={
        <>
          <Button
            label="Enable notifications"
            variant="primary"
            fullWidth
            loading={submitting}
            onPress={handleEnable}
          />
          <Button
            label="Not now"
            variant="tertiary"
            fullWidth
            onPress={handleSkip}
          />
        </>
      }
    >
      <View style={styles.iconSection}>
        <View style={styles.iconBackdrop}>
          <Icon icon={Bell} size="xl" color={theme.colors.brand.primary} />
        </View>
      </View>

      <View style={styles.valueProps}>
        {VALUE_PROPS.map(({ icon, label }) => (
          <View key={label} style={styles.valueProp}>
            <View style={styles.valuePropIcon}>
              <Icon icon={icon} size="sm" color={theme.colors.brand.primary} />
            </View>
            <Body color={theme.colors.text.secondary}>{label}</Body>
          </View>
        ))}
      </View>

      <BodySmall
        align="center"
        color={theme.colors.text.tertiary}
        style={styles.disclaimer}
      >
        You can change your notification preferences at any time in Settings.
      </BodySmall>
    </OnboardingStepWrapper>
  );
}

const ICON_BACKDROP_SIZE = theme.spacing['8xl'];

const styles = StyleSheet.create({
  iconSection: {
    alignItems:   'center',
    marginBottom: theme.spacing.xxl,
    marginTop:    theme.spacing.lg,
  },
  iconBackdrop: {
    width:           ICON_BACKDROP_SIZE,
    height:          ICON_BACKDROP_SIZE,
    borderRadius:    theme.radius.full,
    backgroundColor: theme.colors.neutral.backgroundSecondary,
    alignItems:      'center',
    justifyContent:  'center',
  },
  valueProps: {
    gap:          theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  valueProp: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           theme.spacing.md,
  },
  valuePropIcon: {
    width:           theme.spacing.xxl,
    height:          theme.spacing.xxl,
    borderRadius:    theme.radius.full,
    backgroundColor: theme.colors.neutral.backgroundSecondary,
    alignItems:      'center',
    justifyContent:  'center',
  },
  disclaimer: {
    marginTop: theme.spacing.md,
  },
});
