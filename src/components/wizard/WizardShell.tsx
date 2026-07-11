/**
 * Stroll — Wizard Shell
 * src/components/wizard/WizardShell.tsx
 *
 * Shared layout for any multi-step wizard screen — Experience Creation
 * today, whatever comes next tomorrow. Structurally mirrors
 * components/onboarding/OnboardingStepWrapper (safe area, scroll,
 * progress bar, back button, title/subtitle, sticky footer) but takes
 * `stepIndex`/`stepCount`/`title`/`subtitle` as plain props instead of
 * importing OnboardingStep/ONBOARDING_STEPS — that's what makes this
 * component genuinely reusable across flows (requirement #2: "The wizard
 * should be generic enough for future multi-step flows") rather than a
 * second copy of the onboarding-specific version.
 *
 * Differs from OnboardingStepWrapper in one deliberate way: onboarding's
 * "skip" slot becomes a "close" (X) slot here, always visible, wired to
 * an exit-confirmation flow (requirement #9) rather than a skip action —
 * a Create flow can be abandoned, but its steps aren't individually
 * skippable the way an onboarding step can be.
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
import { H3, Body, Caption, Icon, Spinner } from '@/components/ui';
import { ArrowLeft, X } from 'lucide-react-native';
import { WizardProgress } from './WizardProgress';

export interface WizardShellProps {
  /** 0-based index of the current step, for the progress indicator and back-button visibility. */
  stepIndex: number;
  stepCount: number;
  title: string;
  subtitle?: string;
  /** Defaults to `stepIndex > 0` — the first step of a wizard has nothing to go back to. */
  showBack?: boolean;
  onBack?: () => void;
  /** Always shown — triggers the caller's exit-confirmation flow. */
  onClose: () => void;
  /** Shows a small "Saving…" indicator without shifting layout (Design System §21's "never shift position" rule, applied here too). */
  saving?: boolean;
  /** Primary/secondary actions rendered in the sticky bottom area. */
  footer: React.ReactNode;
  children: React.ReactNode;
}

export function WizardShell({
  stepIndex,
  stepCount,
  title,
  subtitle,
  showBack,
  onBack,
  onClose,
  saving = false,
  footer,
  children,
}: WizardShellProps) {
  const insets = useSafeAreaInsets();
  const canGoBack = showBack ?? stepIndex > 0;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header — back + progress + close */}
      <View
        style={[
          styles.header,
          { paddingTop: Math.max(insets.top + theme.spacing.sm, theme.spacing.xl) },
        ]}
      >
        <View style={styles.headerRow}>
          {canGoBack ? (
            <Pressable
              onPress={onBack}
              style={styles.iconButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Icon icon={ArrowLeft} size="md" color={theme.colors.text.primary} />
            </Pressable>
          ) : (
            <View style={styles.iconButtonPlaceholder} />
          )}

          <View style={styles.progressWrapper}>
            <WizardProgress currentIndex={stepIndex} totalSteps={stepCount} />
          </View>

          <Pressable
            onPress={onClose}
            style={styles.iconButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Icon icon={X} size="md" color={theme.colors.text.primary} />
          </Pressable>
        </View>

        {/* Reserved-height slot so the saving indicator never shifts the title below it. */}
        <View style={styles.savingSlot}>
          {saving ? (
            <View style={styles.savingRow}>
              <Spinner size="small" accessibilityLabel="Saving draft" />
              <Caption color={theme.colors.text.tertiary}>Saving…</Caption>
            </View>
          ) : null}
        </View>
      </View>

      {/* Scrollable content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleBlock}>
          <H3 style={styles.title}>{title}</H3>
          {subtitle ? (
            <Body color={theme.colors.text.secondary}>{subtitle}</Body>
          ) : null}
        </View>

        {children}
      </ScrollView>

      {/* Sticky footer */}
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

// ─── Styles ────────────────────────────────────────────────────────────────────

const ICON_BUTTON_SIZE = theme.layout.touchTargetMin;

const styles = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: theme.colors.neutral.background,
  },
  header: {
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    paddingBottom:     theme.spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           theme.spacing.sm,
  },
  iconButton: {
    width:          ICON_BUTTON_SIZE,
    height:         ICON_BUTTON_SIZE,
    alignItems:     'center',
    justifyContent: 'center',
  },
  iconButtonPlaceholder: {
    width: ICON_BUTTON_SIZE,
  },
  progressWrapper: {
    flex: 1,
  },
  savingSlot: {
    height:         theme.spacing.lg,
    justifyContent: 'center',
  },
  savingRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           theme.spacing.xxs,
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
