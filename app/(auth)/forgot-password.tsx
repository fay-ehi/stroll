/**
 * Stroll — Forgot Password Screen
 * app/(auth)/forgot-password.tsx
 *
 * PRD §8.1 — Field: Email. Action: Send Reset Link.
 * After submission, shows a confirmation message regardless of whether
 * the email exists (standard security practice — never reveal whether
 * an email is registered).
 */

import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { AuthScreenWrapper } from '@/components/auth/AuthScreenWrapper';
import { AuthFormField } from '@/components/auth/AuthFormField';
import { Button, Body, BodySmall } from '@/components/ui';
import { useForgotPassword } from '@/hooks/useAuth';
import { ROUTES } from '@/constants/routes';
import { theme } from '@/theme';
import { Mail, CheckCircle } from 'lucide-react-native';
import { Icon } from '@/components/ui';

export default function ForgotPasswordScreen() {
  const { submit, validate, loading, submitted } = useForgotPassword();
  const [email, setEmail]   = useState('');
  const [error, setError]   = useState<string | undefined>();
  const [touched, setTouched] = useState(false);

  const handleChangeText = useCallback((text: string) => {
    setEmail(text);
    if (error) setError(undefined);
  }, [error]);

  const handleBlur = useCallback(() => {
    setTouched(true);
    setError(validate(email));
  }, [validate, email]);

  const handleSubmit = useCallback(async () => {
    setTouched(true);
    const fieldError = validate(email);
    setError(fieldError);
    if (fieldError) return;
    await submit(email);
  }, [validate, email, submit]);

  // ── Submitted state ───────────────────────────────────────────────────────
  if (submitted) {
    return (
      <AuthScreenWrapper
        title="Check your inbox"
        subtitle={`If ${email} is registered, you'll receive a reset link shortly.`}
        showBack={false}
      >
        <View style={styles.successContent}>
          <View style={styles.iconBackdrop}>
            <Icon
              icon={CheckCircle}
              size="xl"
              color={theme.colors.semantic.success}
            />
          </View>

          <Body
            align="center"
            color={theme.colors.text.secondary}
            style={styles.hint}
          >
            Check your spam folder if you don't see it within a few minutes.
          </Body>
        </View>

        <Button
          label="Back to sign in"
          variant="primary"
          fullWidth
          onPress={() => router.replace(ROUTES.auth.logIn as never)}
          style={styles.backButton}
        />
      </AuthScreenWrapper>
    );
  }

  // ── Request Form ──────────────────────────────────────────────────────────
  return (
    <AuthScreenWrapper
      title="Reset your password"
      subtitle="Enter your email and we'll send you a link to reset your password."
      showBack
      footer={
        <>
          <Button
            label="Send reset link"
            variant="primary"
            fullWidth
            loading={loading}
            onPress={handleSubmit}
          />

          <Pressable
            onPress={() => router.replace(ROUTES.auth.logIn as never)}
            accessibilityRole="button"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <BodySmall color={theme.colors.text.secondary}>
              Remember your password?{' '}
              <BodySmall color={theme.colors.brand.primary}>Sign in</BodySmall>
            </BodySmall>
          </Pressable>
        </>
      }
    >
      <AuthFormField
        label="Email"
        placeholder="you@example.com"
        leftIcon={Mail}
        value={email}
        onChangeText={handleChangeText}
        onBlur={handleBlur}
        errorText={touched ? error : undefined}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        keyboardType="email-address"
        returnKeyType="done"
      />
    </AuthScreenWrapper>
  );
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const ICON_BACKDROP_DIAMETER = theme.spacing['8xl'];

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  submitButton: {
    marginTop: theme.spacing.md,
  },
  successContent: {
    alignItems:   'center',
    marginTop:    theme.spacing.xxl,
    marginBottom: theme.spacing.xl,
  },
  iconBackdrop: {
    width:           ICON_BACKDROP_DIAMETER,
    height:          ICON_BACKDROP_DIAMETER,
    borderRadius:    theme.radius.full,
    backgroundColor: theme.colors.neutral.backgroundSecondary,
    alignItems:      'center',
    justifyContent:  'center',
    marginBottom:    theme.spacing.lg,
  },
  hint: {
    maxWidth: theme.spacing['5xl'] * 5,
  },
  backButton: {
    marginTop: theme.spacing.xl,
  },
});
