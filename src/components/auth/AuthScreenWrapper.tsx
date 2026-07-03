/**
 * Stroll — Auth Screen Wrapper
 * src/components/auth/AuthScreenWrapper.tsx
 *
 * Sprint 1 Prompt 2 fix: footer (submit button) moved outside the
 * ScrollView and pinned to the bottom of the screen. This ensures
 * the button is always visible regardless of keyboard state or screen
 * height — the previous version could push the button below the fold
 * on smaller devices when the keyboard was open.
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
  title:      string;
  subtitle?:  string;
  showBack?:  boolean;
  children:   React.ReactNode;
  /** Rendered in a sticky area below the form, always visible. */
  footer?:    React.ReactNode;
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
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
    >
      {/* Scrollable form area */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(
              insets.top + theme.spacing.lg,
              theme.spacing.xxl
            ),
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

        {/* Brand wordmark */}
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
            <Body color={theme.colors.text.secondary}>{subtitle}</Body>
          ) : null}
        </View>

        {/* Form fields */}
        {children}
      </ScrollView>

      {/* ── Sticky footer — always visible, never scrolls away ── */}
      {footer ? (
        <View
          style={[
            styles.footer,
            {
              paddingBottom: Math.max(
                insets.bottom + theme.spacing.sm,
                theme.spacing.xl
              ),
            },
          ]}
        >
          {footer}
        </View>
      ) : null}
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
    // Bottom padding ensures last field isn't hidden behind footer.
    paddingBottom: theme.spacing['4xl'],
  },
  backButton: {
    alignSelf:      'flex-start',
    marginBottom:   theme.spacing.lg,
    minWidth:       theme.layout.touchTargetMin,
    minHeight:      theme.layout.touchTargetMin,
    alignItems:     'center',
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
