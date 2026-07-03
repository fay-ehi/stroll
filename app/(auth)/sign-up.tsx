/**
 * Stroll — Sign Up Screen
 * app/(auth)/sign-up.tsx
 *
 * Fix: Submit button moved into the `footer` prop so it is pinned
 * outside the ScrollView and always visible above the keyboard.
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

    const result = await submit(values);
    if (result.ok) {
      if (result.requiresConfirmation) {
        setDone(true);
      } else {
        router.replace(ROUTES.tabs.discover as never);
      }
    }
  }, [validate, values, submit]);

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
        errorText={touched.username ? errors.username : undefined}
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

