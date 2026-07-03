/**
 * Stroll — Log In Screen
 * app/(auth)/log-in.tsx
 *
 * Fix: Submit button moved into the `footer` prop so it is pinned
 * outside the ScrollView and always visible above the keyboard.
 */

import React, { useState, useCallback } from 'react';
import { StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { AuthScreenWrapper } from '@/components/auth/AuthScreenWrapper';
import { AuthFormField } from '@/components/auth/AuthFormField';
import { Button, BodySmall } from '@/components/ui';
import {
  useSignIn,
  type SignInFormValues,
  type SignInFormErrors,
} from '@/hooks/useAuth';
import { ROUTES } from '@/constants/routes';
import { theme } from '@/theme';
import { Mail, Lock } from 'lucide-react-native';

const EMPTY_FORM: SignInFormValues = { email: '', password: '' };

export default function LogInScreen() {
  const { submit, validate, loading } = useSignIn();

  const [values, setValues]   = useState<SignInFormValues>(EMPTY_FORM);
  const [errors, setErrors]   = useState<SignInFormErrors>({});
  const [touched, setTouched] = useState<
    Partial<Record<keyof SignInFormValues, boolean>>
  >({});

  const setValue = useCallback(
    (field: keyof SignInFormValues) => (text: string) => {
      setValues((prev) => ({ ...prev, [field]: text }));
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    },
    [errors]
  );

  const handleBlur = useCallback(
    (field: keyof SignInFormValues) => () => {
      setTouched((prev) => ({ ...prev, [field]: true }));
      const fieldErrors = validate(values);
      setErrors((prev) => ({ ...prev, [field]: fieldErrors[field] }));
    },
    [validate, values]
  );

  const handleSubmit = useCallback(async () => {
    setTouched({ email: true, password: true });
    const formErrors = validate(values);
    setErrors(formErrors);
    if (Object.values(formErrors).some(Boolean)) return;

    const result = await submit(values);
    if (result.ok) {
      router.replace(ROUTES.tabs.discover as never);
    }
  }, [validate, values, submit]);

  return (
    <AuthScreenWrapper
      title="Welcome back"
      subtitle="Sign in to continue discovering your city."
      showBack
      footer={
        <>
      
          <Button
            label="Sign in"
            variant="primary"
            fullWidth
            loading={loading}
            onPress={handleSubmit}
            
          />

          <Pressable
            onPress={() => router.push(ROUTES.auth.forgotPassword as never)}
            accessibilityRole="button"
            style={styles.link}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <BodySmall color={theme.colors.brand.primary}>
              Forgot password?
            </BodySmall>
          </Pressable>

          <Pressable
            onPress={() => router.replace(ROUTES.auth.signUp as never)}
            accessibilityRole="button"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <BodySmall color={theme.colors.text.secondary}>
              Don't have an account?{' '}
              <BodySmall color={theme.colors.brand.primary}>Sign up</BodySmall>
            </BodySmall>
          </Pressable>
        </>
      }
    >
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
        placeholder="Your password"
        leftIcon={Lock}
        secureTextEntry
        value={values.password}
        onChangeText={setValue('password')}
        onBlur={handleBlur('password')}
        errorText={touched.password ? errors.password : undefined}
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="done"
      />
    </AuthScreenWrapper>
  );
}

const styles = StyleSheet.create({
  link: {
    alignItems: 'center',
  },
});
