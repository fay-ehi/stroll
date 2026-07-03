/**
 * Stroll — Onboarding: Select Interests
 * app/(onboarding)/interests.tsx
 *
 * Step 2 of 5. Multi-select interest categories that seed the user's
 * Discover feed recommendations. Minimum 3 required.
 *
 * PRD §8.2: "Select Interests — Seeds initial content recommendations. Required."
 */

import React, { useCallback } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { OnboardingStepWrapper } from '@/components/onboarding/OnboardingStepWrapper';
import { Button, Body, BodySmall, Caption } from '@/components/ui';
import { showToast } from '@/stores/toastStore';
import { theme } from '@/theme';
import {
  INTEREST_CATEGORIES,
  ONBOARDING_RULES,
} from '@/constants/onboarding';

export default function OnboardingInterestsScreen() {
  const user = useAuthStore((s) => s.user);
  const {
    data,
    setInterests,
    goToNextStep,
    goToPrevStep,
    submitProfile,
    submitting,
  } = useOnboardingStore();

  const toggleInterest = useCallback(
    (id: string) => {
      const current = data.interests;
      if (current.includes(id)) {
        setInterests(current.filter((i) => i !== id));
      } else {
        if (current.length >= ONBOARDING_RULES.MAX_INTERESTS) return;
        setInterests([...current, id]);
      }
    },
    [data.interests, setInterests]
  );

  const handleContinue = useCallback(async () => {
    if (data.interests.length < ONBOARDING_RULES.MIN_INTERESTS) {
      showToast({
        type:    'info',
        message: `Pick at least ${ONBOARDING_RULES.MIN_INTERESTS} interests to continue.`,
      });
      return;
    }

    if (!user) return;

    // Read display name and username from the Supabase auth user metadata.
    const displayName = (user.user_metadata?.['display_name'] as string | undefined) ?? '';
    const username    = (user.user_metadata?.['username']     as string | undefined) ?? '';

    const ok = await submitProfile(user.id, username, displayName);
    if (!ok) {
      showToast({ type: 'error', message: 'Could not save your profile. Please try again.' });
      return;
    }

    goToNextStep();
    router.push('/(onboarding)/avatar');
  }, [data.interests, user, submitProfile, goToNextStep]);

  const remaining = ONBOARDING_RULES.MIN_INTERESTS - data.interests.length;

  return (
    <OnboardingStepWrapper
      step="interests"
      title="What are you into?"
      subtitle="Choose your interests so we can personalise your Discover feed."
      showBack
      onBack={() => {
        goToPrevStep();
        router.back();
      }}
      footer={
        <>
          {remaining > 0 && (
            <Caption align="center" color={theme.colors.text.tertiary}>
              Pick {remaining} more to continue
            </Caption>
          )}
          <Button
            label="Continue"
            variant="primary"
            fullWidth
            disabled={data.interests.length < ONBOARDING_RULES.MIN_INTERESTS}
            loading={submitting}
            onPress={handleContinue}
          />
        </>
      }
    >
      <View style={styles.grid}>
        {INTEREST_CATEGORIES.map((category) => {
          const selected = data.interests.includes(category.id);
          return (
            <Pressable
              key={category.id}
              onPress={() => toggleInterest(category.id)}
              style={({ pressed }) => [
                styles.chip,
                selected && styles.chipSelected,
                pressed && !selected && styles.chipPressed,
              ]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={category.label}
            >
              <Body style={styles.emoji}>{category.emoji}</Body>
              <BodySmall
                color={selected ? theme.colors.static.white : theme.colors.text.primary}
                style={selected ? styles.chipLabelSelected : undefined}
              >
                {category.label}
              </BodySmall>
            </Pressable>
          );
        })}
      </View>
    </OnboardingStepWrapper>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           theme.spacing.sm,
  },
  chip: {
    flexDirection:    'row',
    alignItems:       'center',
    gap:              theme.spacing.xs,
    paddingVertical:  theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius:     theme.radius.full,
    borderWidth:      theme.borders.width,
    borderColor:      theme.colors.neutral.border,
    backgroundColor:  theme.colors.neutral.background,
  },
  chipSelected: {
    backgroundColor: theme.colors.brand.primary,
    borderColor:     theme.colors.brand.primary,
  },
  chipPressed: {
    backgroundColor: theme.colors.neutral.backgroundSecondary,
  },
  chipLabelSelected: {
    fontWeight: theme.typography.weights.semiBold,
  },
  emoji: {
    fontSize: theme.typography.sizes.body,
  },
});
