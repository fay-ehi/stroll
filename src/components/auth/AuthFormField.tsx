/**
 * Stroll — Auth Form Field
 * src/components/auth/AuthFormField.tsx
 *
 * Thin wrapper around the reusable TextInput component that applies
 * consistent spacing between fields on auth screens.
 * Not exported from the UI barrel — auth-specific only.
 *
 * Bug fix (this pass): reports its own focus events up to
 * AuthScreenWrapper via AuthFieldFocusContext, so a field several rows
 * down a longer form (e.g. Sign Up's Email/Password) gets scrolled into
 * view above the keyboard + sticky footer instead of staying wherever it
 * happened to render — see AuthScreenWrapper.tsx's own doc for the full
 * explanation of the bug this fixes.
 */

import React, { useRef } from 'react';
import { View, StyleSheet, type TextInput as RNTextInput } from 'react-native';
import { TextInput, type TextInputComponentProps } from '@/components/ui';
import { theme } from '@/theme';
import { useAuthFieldFocus } from './AuthScreenWrapper';

export function AuthFormField({ onFocus, ...props }: TextInputComponentProps) {
  const fieldRef = useRef<RNTextInput>(null);
  const fieldFocus = useAuthFieldFocus();

  return (
    <View style={styles.wrapper}>
      <TextInput
        ref={fieldRef}
        onFocus={(e) => {
          fieldFocus?.scrollToFocusedField(fieldRef);
          onFocus?.(e);
        }}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: theme.spacing.md,
  },
});
