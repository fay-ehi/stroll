/**
 * Stroll — Onboarding Step Wrapper
 * src/components/onboarding/OnboardingStepWrapper.tsx
 *
 * Shared layout shell for every onboarding step.
 * Handles: safe area, scroll, progress bar, back button, title, subtitle,
 * skip link, and a sticky bottom action area.
 *
 * Design Philosophy §28:
 *   "Onboarding should create excitement, not friction."
 *   "Get the user to Discover as quickly as possible."
 */

import React from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/theme';
import { H3, Body, BodySmall, Icon } from '@/components/ui';
import { ArrowLeft } from 'lucide-react-native';
import { OnboardingProgress } from './OnboardingProgress';
import { ONBOARDING_STEPS, type OnboardingStep } from '@/constants/onboarding';

export interface OnboardingStepWrapperProps {
  step:         OnboardingStep;
  title:        string;
  subtitle?:    string;
  /** Whether to show back arrow. Defaults to true unless first step. */
  showBack?:    boolean;
  onBack?:      () => void;
  /** Skip link label — omit to hide. */
  skipLabel?:   string;
  onSkip?:      () => void;
  /** Primary CTA rendered in the sticky bottom area. */
  footer:       React.ReactNode;
  children:     React.ReactNode;
}

export function OnboardingStepWrapper({
  step,
  title,
  subtitle,
  showBack = true,
  onBack,
  skipLabel,
  onSkip,
  footer,
  children,
}: OnboardingStepWrapperProps) {
  const insets      = useSafeAreaInsets();
  const stepIndex   = ONBOARDING_STEPS.indexOf(step);
  const isFirstStep = stepIndex === 0;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header — progress + back + skip */}
      <View
        style={[
          styles.header,
          { paddingTop: Math.max(insets.top + theme.spacing.sm, theme.spacing.xl) },
        ]}
      >
        <View style={styles.headerRow}>
          {showBack && !isFirstStep ? (
            <Pressable
              onPress={onBack}
              style={styles.backButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Icon icon={ArrowLeft} size="md" color={theme.colors.text.primary} />
            </Pressable>
          ) : (
            <View style={styles.backPlaceholder} />
          )}

          <View style={styles.progressWrapper}>
            <OnboardingProgress currentIndex={stepIndex} />
          </View>

          {skipLabel && onSkip ? (
            <Pressable
              onPress={onSkip}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={skipLabel}
            >
              <BodySmall color={theme.colors.text.secondary}>{skipLabel}</BodySmall>
            </Pressable>
          ) : (
            <View style={styles.skipPlaceholder} />
          )}
        </View>
      </View>

      {/* Scrollable content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Step title */}
        <View style={styles.titleBlock}>
          <H3 style={styles.title}>{title}</H3>
          {subtitle ? (
            <Body color={theme.colors.text.secondary}>{subtitle}</Body>
          ) : null}
        </View>

        {children}
      </ScrollView>

      {/* Sticky footer with CTA */}
      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom + theme.spacing.sm, theme.spacing.xl) },
        ]}
      >
        {footer}
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const BACK_BUTTON_SIZE = theme.layout.touchTargetMin;

const styles = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: theme.colors.neutral.background,
  },
  header: {
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    paddingBottom:     theme.spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           theme.spacing.sm,
  },
  backButton: {
    width:          BACK_BUTTON_SIZE,
    height:         BACK_BUTTON_SIZE,
    alignItems:     'center',
    justifyContent: 'center',
  },
  backPlaceholder: {
    width: BACK_BUTTON_SIZE,
  },
  progressWrapper: {
    flex: 1,
  },
  skipPlaceholder: {
    width: theme.spacing.xxl,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    paddingBottom:     theme.spacing.xxl,
  },
  titleBlock: {
    marginBottom: theme.spacing.xxl,
    gap:          theme.spacing.xs,
  },
  title: {
    marginBottom: 0,
  },
  footer: {
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    paddingTop:        theme.spacing.md,
    borderTopWidth:    theme.borders.width,
    borderTopColor:    theme.colors.neutral.border,
    backgroundColor:   theme.colors.neutral.background,
    gap:               theme.spacing.sm,
  },
});
