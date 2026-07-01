/**
 * Stroll — Reset Password Screen
 * app/(auth)/reset-password.tsx
 *
 * Handles the deep link from Supabase's password reset email.
 * When the user taps the link, Supabase redirects to:
 *   stroll:///(auth)/reset-password
 *
 * Supabase automatically establishes a temporary session when the
 * deep link is opened, so updateUser() works without additional auth.
 * After a successful update, the user is redirected to sign in.
 */

import React, { useState, useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { AuthScreenWrapper } from '@/components/auth/AuthScreenWrapper';
import { AuthFormField } from '@/components/auth/AuthFormField';
import { Button } from '@/components/ui';
import { useResetPassword } from '@/hooks/useAuth';
import { ROUTES } from '@/constants/routes';
import { theme } from '@/theme';
import { Lock } from 'lucide-react-native';
import { showToast } from '@/stores/toastStore';

export default function ResetPasswordScreen() {
  const { submit, validate, loading } = useResetPassword();

  const [password, setPassword]     = useState('');
  const [confirm, setConfirm]       = useState('');
  const [errors, setErrors]         = useState<{ password?: string; confirm?: string }>({});
  const [touched, setTouched]       = useState({ password: false, confirm: false });

  const handleBlur = useCallback(
    (field: 'password' | 'confirm') => () => {
      setTouched((prev) => ({ ...prev, [field]: true }));
      const fieldErrors = validate(password, confirm);
      setErrors((prev) => ({ ...prev, [field]: fieldErrors[field] }));
    },
    [validate, password, confirm]
  );

  const handleSubmit = useCallback(async () => {
    setTouched({ password: true, confirm: true });
    const formErrors = validate(password, confirm);
    setErrors(formErrors);

    if (formErrors.password || formErrors.confirm) return;

    const result = await submit(password);

    if (result.ok) {
      showToast({ type: 'success', message: 'Password updated. Please sign in.' });
      router.replace(ROUTES.auth.logIn as never);
    }
  }, [validate, submit, password, confirm]);

  return (
    <AuthScreenWrapper
      title="Set a new password"
      subtitle="Choose a strong password you haven't used before."
    >
      <AuthFormField
        label="New password"
        placeholder="At least 8 characters"
        leftIcon={Lock}
        secureTextEntry
        value={password}
        onChangeText={(t) => {
          setPassword(t);
          if (errors.password) setErrors((p) => ({ ...p, password: undefined }));
        }}
        onBlur={handleBlur('password')}
        errorText={touched.password ? errors.password : undefined}
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
        helperText="Minimum 8 characters."
      />

      <AuthFormField
        label="Confirm password"
        placeholder="Repeat your new password"
        leftIcon={Lock}
        secureTextEntry
        value={confirm}
        onChangeText={(t) => {
          setConfirm(t);
          if (errors.confirm) setErrors((p) => ({ ...p, confirm: undefined }));
        }}
        onBlur={handleBlur('confirm')}
        errorText={touched.confirm ? errors.confirm : undefined}
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="done"
      />

      <Button
        label="Update password"
        variant="primary"
        fullWidth
        loading={loading}
        onPress={handleSubmit}
        style={styles.submitButton}
      />
    </AuthScreenWrapper>
  );
}

const styles = StyleSheet.create({
  submitButton: {
    marginTop: theme.spacing.md,
  },
});
