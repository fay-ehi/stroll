/**
 * Stroll — Onboarding: Follow Suggested Users
 * app/(onboarding)/suggested-users.tsx
 *
 * Step 5 of 5. Final onboarding step — optional per PRD §8.2:
 * "Follow Suggested Users — Builds initial social graph. No — skippable."
 *
 * Sprint 1 Prompt 2 scope: The follow infrastructure (follow table,
 * follow service, suggested users query) belongs to a later sprint.
 * This screen renders as a placeholder that completes onboarding
 * immediately so the user reaches Discover. The follow UI will be
 * wired in once the social layer is built.
 *
 * What this screen DOES do now:
 *   - Finalizes the profile (onboarding_complete = true in Supabase)
 *   - Persists the completion flag to AsyncStorage
 *   - Redirects to Discover
 *
 * What gets added later:
 *   - Fetch suggested users from Supabase
 *   - Render CreatorCard list with Follow buttons
 *   - Persist follows before completing
 */

import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { OnboardingStepWrapper } from '@/components/onboarding/OnboardingStepWrapper';
import { Button, Body, BodySmall } from '@/components/ui';
import { Icon } from '@/components/ui';
import { showToast } from '@/stores/toastStore';
import { ROUTES } from '@/constants/routes';
import { theme } from '@/theme';
import { Compass } from 'lucide-react-native';

export default function OnboardingSuggestedUsersScreen() {
  const user = useAuthStore((s) => s.user);
  const { goToPrevStep, finalize, submitting } = useOnboardingStore();

  const handleFinish = useCallback(async () => {
    if (!user) return;

    const ok = await finalize(user.id);
    if (!ok) {
      showToast({
        type:    'error',
        message: "Couldn't save your progress. Please try again.",
      });
      return;
    }

    // Replace the entire onboarding stack with the main app.
    // The auth guard in (app)/_layout.tsx confirms the session is valid.
    router.replace(ROUTES.tabs.discover as never);
  }, [user, finalize]);

  const handleSkip = useCallback(async () => {
    // Skip also completes onboarding — "skip" means skip following people,
    // not skip saving completion state.
    await handleFinish();
  }, [handleFinish]);

  return (
    <OnboardingStepWrapper
      step="suggested_users"
      title="You're almost in"
      subtitle="Follow people whose taste you trust to personalise your feed."
      showBack
      onBack={() => {
        goToPrevStep();
        router.back();
      }}
      skipLabel="Skip"
      onSkip={handleSkip}
      footer={
        <>
          <Button
            label="Start exploring"
            variant="primary"
            fullWidth
            loading={submitting}
            onPress={handleFinish}
          />
          <Button
            label="Skip for now"
            variant="tertiary"
            fullWidth
            onPress={handleSkip}
          />
        </>
      }
    >
      {/* Placeholder — suggested users list renders here in a future sprint */}
      <View style={styles.placeholder}>
        <View style={styles.iconBackdrop}>
          <Icon icon={Compass} size="xl" color={theme.colors.brand.primary} />
        </View>

        <Body align="center" color={theme.colors.text.primary} style={styles.placeholderTitle}>
          Discover your city
        </Body>

        <BodySmall
          align="center"
          color={theme.colors.text.secondary}
          style={styles.placeholderBody}
        >
          Stroll is better with people. Suggested tastemakers will appear here once your community grows.
        </BodySmall>
      </View>
    </OnboardingStepWrapper>
  );
}

const ICON_BACKDROP_SIZE = theme.spacing['8xl'];

const styles = StyleSheet.create({
  placeholder: {
    alignItems:  'center',
    marginTop:   theme.spacing.xl,
    gap:         theme.spacing.lg,
  },
  iconBackdrop: {
    width:           ICON_BACKDROP_SIZE,
    height:          ICON_BACKDROP_SIZE,
    borderRadius:    theme.radius.full,
    backgroundColor: theme.colors.neutral.backgroundSecondary,
    alignItems:      'center',
    justifyContent:  'center',
  },
  placeholderTitle: {
    fontWeight: theme.typography.weights.semiBold,
  },
  placeholderBody: {
    maxWidth:  theme.spacing['5xl'] * 5,
    textAlign: 'center',
  },
});
