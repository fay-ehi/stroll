/**
 * Stroll UI — TextInput
 * src/components/ui/TextInput.tsx
 *
 * Design System §22 — Text Fields:
 *   Structure: Label, Input, Helper Text, Error Message
 *   States: Default, Focused, Typing, Filled, Disabled, Error, Success
 *   Rule: Always use labels. Do not rely solely on placeholders.
 *
 * Radius: theme.radius.input (14px)
 * Height: theme.layout.inputHeight (48px)
 * Border: theme.colors.neutral.border, focused → theme.colors.brand.primary
 *
 * Accessibility:
 *   - Label is always rendered as visible text (never placeholder-only),
 *     satisfying both the Design System rule and screen reader needs.
 *   - Error/helper text is linked via accessibilityHint.
 *   - Password toggle has its own accessibilityLabel and is a real
 *     touch target (44px) even though the icon itself is smaller.
 */

import React, { useState, forwardRef } from 'react';
import {
  View,
  TextInput as RNTextInput,
  Pressable,
  StyleSheet,
  type TextInputProps as RNTextInputProps,
  type ViewStyle,
} from 'react-native';
import { theme } from '@/theme';
import { textStyles } from '@/theme/typography';
import { hitSlop as computeHitSlop } from '@/theme/utils';
import { Icon, type IconSize } from './Icon';
import { Eye, EyeOff } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Caption, Label as LabelText } from './Typography';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type TextInputState = 'default' | 'focused' | 'disabled' | 'error' | 'success';

export interface TextInputComponentProps extends Omit<RNTextInputProps, 'style'> {
  /** Always required — Design System mandates visible labels, never placeholder-only. */
  label: string;
  /** Helper text shown below the input when there's no error. */
  helperText?: string;
  /** Error message — when present, overrides helperText and applies error styling. */
  errorText?: string;
  /** Applies success styling (e.g. after successful validation). */
  success?: boolean;
  /** Disables the input. */
  disabled?: boolean;
  /** Icon shown on the left inside the input. */
  leftIcon?: LucideIcon;
  /** Icon shown on the right inside the input. Ignored if `secureTextEntry` is true
   *  (the password visibility toggle takes that slot instead). */
  rightIcon?: LucideIcon;
  /** Renders a password field with a visibility toggle in the right slot. */
  secureTextEntry?: boolean;
  /** Outer container style override. */
  containerStyle?: ViewStyle;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export const TextInput = forwardRef<RNTextInput, TextInputComponentProps>(
  (
    {
      label,
      helperText,
      errorText,
      success = false,
      disabled = false,
      leftIcon,
      rightIcon,
      secureTextEntry = false,
      containerStyle,
      onFocus,
      onBlur,
      ...inputProps
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    const hasError = Boolean(errorText);
    const state: TextInputState = disabled
      ? 'disabled'
      : hasError
        ? 'error'
        : success
          ? 'success'
          : isFocused
            ? 'focused'
            : 'default';

    const borderColor = {
      default:  theme.colors.neutral.border,
      focused:  theme.colors.brand.primary,
      disabled: theme.colors.neutral.border,
      error:    theme.colors.semantic.error,
      success:  theme.colors.semantic.success,
    }[state];

    const iconSize: IconSize = 'md';
    const showPasswordToggle = secureTextEntry;

    return (
      <View style={[styles.container, containerStyle]}>
        {/* Label — always visible, never placeholder-only (Design System §22) */}
        <LabelText style={styles.label}>{label}</LabelText>

        <View
          style={[
            styles.inputWrapper,
            {
              borderColor,
              borderWidth: state === 'focused' || state === 'error' || state === 'success'
                ? theme.borders.width + 1 // slightly thicker to signal active/validated state
                : theme.borders.width,
              backgroundColor: disabled
                ? theme.colors.neutral.backgroundSecondary
                : theme.colors.neutral.background,
            },
          ]}
        >
          {leftIcon ? (
            <View style={styles.leftIconWrapper}>
              <Icon
                icon={leftIcon}
                size={iconSize}
                color={disabled ? theme.colors.text.disabled : theme.colors.text.secondary}
              />
            </View>
          ) : null}

          <RNTextInput
            ref={ref}
            editable={!disabled}
            secureTextEntry={secureTextEntry && !isPasswordVisible}
            placeholderTextColor={theme.colors.text.tertiary}
            style={[
              styles.input,
              textStyles.body,
              { color: disabled ? theme.colors.text.disabled : theme.colors.text.primary },
            ]}
            onFocus={(e) => {
              setIsFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              onBlur?.(e);
            }}
            accessibilityLabel={label}
            accessibilityState={{ disabled }}
            accessibilityHint={errorText ?? helperText}
            {...inputProps}
          />

          {showPasswordToggle ? (
            <Pressable
              onPress={() => setIsPasswordVisible((v) => !v)}
              hitSlop={computeHitSlop(iconSizeToPx(iconSize))}
              accessibilityRole="button"
              accessibilityLabel={isPasswordVisible ? 'Hide password' : 'Show password'}
              style={styles.rightIconWrapper}
            >
              <Icon
                icon={isPasswordVisible ? EyeOff : Eye}
                size={iconSize}
                color={theme.colors.text.secondary}
              />
            </Pressable>
          ) : rightIcon ? (
            <View style={styles.rightIconWrapper}>
              <Icon
                icon={rightIcon}
                size={iconSize}
                color={disabled ? theme.colors.text.disabled : theme.colors.text.secondary}
              />
            </View>
          ) : null}
        </View>

        {/* Helper / Error text — error always takes priority over helper */}
        {errorText ? (
          <Caption style={styles.helperText} color={theme.colors.semantic.error}>
            {errorText}
          </Caption>
        ) : helperText ? (
          <Caption style={styles.helperText} color={theme.colors.text.tertiary}>
            {helperText}
          </Caption>
        ) : null}
      </View>
    );
  }
);

TextInput.displayName = 'TextInput';

// ─── Helpers ───────────────────────────────────────────────────────────────────

function iconSizeToPx(size: IconSize): number {
  const map: Record<IconSize, number> = { xs: 14, sm: 16, md: 20, lg: 24, xl: 32 };
  return map[size];
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    marginBottom: theme.spacing.xs,
  },
  inputWrapper: {
    flexDirection:     'row',
    alignItems:        'center',
    height:            theme.layout.inputHeight,
    borderRadius:      theme.radius.input,
    paddingHorizontal: theme.spacing.md,
  },
  input: {
    flex: 1,
    height: '100%',
    paddingVertical: 0, // RN Android adds default vertical padding — normalize to 0
  },
  leftIconWrapper: {
    marginRight: theme.spacing.xs,
  },
  rightIconWrapper: {
    marginLeft: theme.spacing.xs,
    minWidth:  theme.layout.touchTargetMin - theme.spacing.md, // partial — hitSlop covers rest
    alignItems: 'center',
    justifyContent: 'center',
  },
  helperText: {
    marginTop: theme.spacing.xxs,
  },
});
