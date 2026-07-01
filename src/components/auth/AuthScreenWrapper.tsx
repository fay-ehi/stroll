/**
 * Stroll — Auth Screen Wrapper
 * src/components/auth/AuthScreenWrapper.tsx
 *
 * Shared layout shell for every auth screen. Handles:
 *   - Safe area + scroll
 *   - Keyboard avoidance
 *   - Consistent top/bottom padding
 *   - Back button (optional)
 *   - Logo/brand mark area
 *
 * Design Philosophy §28 — Onboarding:
 *   "Onboarding should create excitement, not friction."
 *   "Every onboarding step should answer one of three questions:
 *    Why does Stroll exist? What can I discover here? What should I do next?"
 */

import React from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/theme';
import { H2, Body } from '@/components/ui';
import { Icon } from '@/components/ui';
import { ArrowLeft } from 'lucide-react-native';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface AuthScreenWrapperProps {
  /** Screen headline — short and direct. */
  title: string;
  /** Supporting copy below the title. */
  subtitle?: string;
  /** Show a back arrow in the top left. */
  showBack?: boolean;
  children: React.ReactNode;
  /** Rendered below the form, pinned near the bottom. */
  footer?: React.ReactNode;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function AuthScreenWrapper({
  title,
  subtitle,
  showBack = false,
  children,
  footer,
}: AuthScreenWrapperProps) {
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop:    Math.max(insets.top + theme.spacing.lg, theme.spacing.xxl),
            paddingBottom: Math.max(insets.bottom + theme.spacing.lg, theme.spacing.xxl),
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back button */}
        {showBack && (
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Icon
              icon={ArrowLeft}
              size="md"
              color={theme.colors.text.primary}
            />
          </Pressable>
        )}

        {/* Brand wordmark area */}
        <View style={styles.brand}>
          <Body
            color={theme.colors.brand.primary}
            style={styles.wordmark}
          >
            Stroll
          </Body>
        </View>

        {/* Title + subtitle */}
        <View style={styles.header}>
          <H2 style={styles.title}>{title}</H2>
          {subtitle ? (
            <Body color={theme.colors.text.secondary} style={styles.subtitle}>
              {subtitle}
            </Body>
          ) : null}
        </View>

        {/* Form content */}
        <View style={styles.form}>{children}</View>

        {/* Footer links / secondary actions */}
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: theme.colors.neutral.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    flexGrow: 1,
  },
  backButton: {
    alignSelf:    'flex-start',
    marginBottom: theme.spacing.lg,
    minWidth:     theme.layout.touchTargetMin,
    minHeight:    theme.layout.touchTargetMin,
    alignItems:   'center',
    justifyContent: 'center',
  },
  brand: {
    marginBottom: theme.spacing.xxl,
  },
  wordmark: {
    fontWeight:    theme.typography.weights.bold,
    fontSize:      theme.typography.sizes.h4,
    letterSpacing: theme.typography.letterSpacings.tight,
  },
  header: {
    marginBottom: theme.spacing.xxl,
  },
  title: {
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    lineHeight: theme.typography.lineHeights.body,
  },
  form: {
    flex: 1,
  },
  footer: {
    marginTop: theme.spacing.xl,
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
});
