/**
 * Stroll — Sign Up Screen
 * app/(auth)/sign-up.tsx
 *
 * Fix: Submit button moved into the `footer` prop so it is pinned
 * outside the ScrollView and always visible above the keyboard.
 *
 * Sprint 1 Prompt 4 fix: added live username availability checking
 * (reuses the existing useUsernameCheck hook from the onboarding domain)
 * and field-specific error handling for taken usernames / already-
 * registered emails, so both are caught here — before an account is
 * even created — instead of surfacing several screens later in
 * onboarding with no way to go back and change them.
 */

import React, { useState, useCallback } from 'react';
import { View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { AuthScreenWrapper } from '@/components/auth/AuthScreenWrapper';
import { AuthFormField } from '@/components/auth/AuthFormField';
import { Button, BodySmall } from '@/components/ui';
import {
  useSignUp,
  type SignUpFormValues,
  type SignUpFormErrors,
} from '@/hooks/useAuth';
import { useUsernameCheck } from '@/hooks/useOnboarding';
import { ROUTES } from '@/constants/routes';
import { theme } from '@/theme';
import { User, AtSign, Mail, Lock } from 'lucide-react-native';

const EMPTY_FORM: SignUpFormValues = {
  displayName: '',
  username:    '',
  email:       '',
  password:    '',
};

export default function SignUpScreen() {
  const { submit, validate, loading } = useSignUp();

  const [values, setValues]   = useState<SignUpFormValues>(EMPTY_FORM);
  const [errors, setErrors]   = useState<SignUpFormErrors>({});
  const [touched, setTouched] = useState<
    Partial<Record<keyof SignUpFormValues, boolean>>
  >({});
  const [done, setDone] = useState(false);

  // Live "is this username available" feedback while typing — the same
  // debounced hook the onboarding username flow already relies on.
  const usernameCheck = useUsernameCheck(values.username);

  const setValue = useCallback(
    (field: keyof SignUpFormValues) => (text: string) => {
      setValues((prev) => ({ ...prev, [field]: text }));
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    },
    [errors]
  );

  const handleBlur = useCallback(
    (field: keyof SignUpFormValues) => () => {
      setTouched((prev) => ({ ...prev, [field]: true }));
      const fieldErrors = validate(values);
      setErrors((prev) => ({ ...prev, [field]: fieldErrors[field] }));
    },
    [validate, values]
  );

  const handleSubmit = useCallback(async () => {
    setTouched({ displayName: true, username: true, email: true, password: true });
    const formErrors = validate(values);
    setErrors(formErrors);
    if (Object.values(formErrors).some(Boolean)) return;

    // Don't let a submit slip through while the live check still shows the
    // username as taken — the pre-submit check in useSignUp would catch it
    // anyway, but failing fast here avoids an unnecessary round trip.
    if (usernameCheck.state === 'taken') {
      setErrors((prev) => ({ ...prev, username: usernameCheck.message }));
      return;
    }

    const result = await submit(values);
    if (result.ok) {
      if (result.requiresConfirmation) {
        setDone(true);
      } else {
        router.replace(ROUTES.tabs.discover as never);
      }
    } else if (result.fieldErrors) {
      setErrors((prev) => ({ ...prev, ...result.fieldErrors }));
      setTouched((prev) => ({
        ...prev,
        ...Object.fromEntries(Object.keys(result.fieldErrors!).map((key) => [key, true])),
      }));
    }
  }, [validate, values, submit, usernameCheck.state, usernameCheck.message]);

  // Username field's helper/error text: local sync validation (format)
  // takes priority once the field has been touched; otherwise fall back
  // to the live availability check's state while the user is still typing.
  const usernameErrorText = touched.username && errors.username
    ? errors.username
    : usernameCheck.state === 'taken'
      ? usernameCheck.message
      : undefined;

  const usernameHelperText = usernameErrorText
    ? undefined
    : usernameCheck.state === 'checking'
      ? 'Checking availability…'
      : usernameCheck.state === 'available'
        ? usernameCheck.message
        : undefined;

  // ── "Check your email" confirmation state ────────────────────────────────
  if (done) {
    return (
      <AuthScreenWrapper
        title="Check your email"
        subtitle={`We sent a confirmation link to ${values.email}. Open it to activate your account.`}
        footer={
          <Button
            label="Back to sign in"
            variant="primary"
            fullWidth
            onPress={() => router.replace(ROUTES.auth.logIn as never)}
          />
        }
      >
        <View />
      </AuthScreenWrapper>
    );
  }

  // ── Sign Up Form ─────────────────────────────────────────────────────────
  return (
    <AuthScreenWrapper
      title="Create your account"
      subtitle="Join Stroll and start discovering your city."
      showBack
      footer={
        <>
          <Button
            label="Create account"
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
              Already have an account?{' '}
              <BodySmall color={theme.colors.brand.primary}>Sign in</BodySmall>
            </BodySmall>
          </Pressable>
        </>
      }
    >
      <AuthFormField
        label="Display name"
        placeholder="Your full name"
        leftIcon={User}
        value={values.displayName}
        onChangeText={setValue('displayName')}
        onBlur={handleBlur('displayName')}
        errorText={touched.displayName ? errors.displayName : undefined}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
      />

      <AuthFormField
        label="Username"
        placeholder="your_username"
        leftIcon={AtSign}
        value={values.username}
        onChangeText={(t) => setValue('username')(t.toLowerCase())}
        onBlur={handleBlur('username')}
        errorText={usernameErrorText}
        helperText={usernameHelperText}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username-new"
        textContentType="username"
        returnKeyType="next"
      />

      <AuthFormField
        label="Email"
        placeholder="you@example.com"
        leftIcon={Mail}
        value={values.email}
        onChangeText={setValue('email')}
        onBlur={handleBlur('email')}
        errorText={touched.email ? errors.email : undefined}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        keyboardType="email-address"
        returnKeyType="next"
      />

      <AuthFormField
        label="Password"
        placeholder="At least 8 characters"
        leftIcon={Lock}
        secureTextEntry
        value={values.password}
        onChangeText={setValue('password')}
        onBlur={handleBlur('password')}
        errorText={touched.password ? errors.password : undefined}
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="done"
        helperText="Minimum 8 characters."
      />
    </AuthScreenWrapper>
  );
}

