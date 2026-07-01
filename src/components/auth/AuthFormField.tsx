/**
 * Stroll — Auth Form Field
 * src/components/auth/AuthFormField.tsx
 *
 * Thin wrapper around the reusable TextInput component that applies
 * consistent spacing between fields on auth screens.
 * Not exported from the UI barrel — auth-specific only.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, type TextInputComponentProps } from '@/components/ui';
import { theme } from '@/theme';

export function AuthFormField(props: TextInputComponentProps) {
  return (
    <View style={styles.wrapper}>
      <TextInput {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: theme.spacing.md,
  },
});
