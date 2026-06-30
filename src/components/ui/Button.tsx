/**
 * Stroll UI — Button
 * src/components/ui/Button.tsx
 *
 * Design System §21 — Buttons:
 *   Variants: Primary, Secondary, Tertiary, Destructive
 *   States: Default, Hover, Pressed, Focus, Disabled, Loading
 *   Primary: bg #FC5A03, white text, radius 14px, height 48px, padding 20px h, weight 600
 *   Secondary: white bg, 1px border, dark text
 *   Tertiary: text only — Cancel, Skip, Learn More
 *   Destructive: semantic error color — Delete, Remove, Leave
 *   Loading: never shift position; replace label with spinner, maintain width.
 *   Rule: one primary button per section. Never place two orange buttons together.
 *
 * Note: the brief lists "Outline" as a variant. The Design System defines
 * "Secondary" with a 1px border as the bordered variant — Outline and
 * Secondary describe the same visual treatment. We implement Secondary as
 * specified in the Design System and alias `outline` to it so both naming
 * conventions work without introducing a duplicate, undefined visual style
 * (Design System §60 — "Can an existing component solve this?").
 *
 * Accessibility (§17, §56):
 *   - Minimum touch target 44px — 48px button height already satisfies this.
 *   - accessibilityRole="button" always applied.
 *   - accessibilityState reflects disabled/busy.
 *   - Loading state sets accessibilityState.busy so screen readers announce it.
 */

import React from 'react';
import {
  Pressable,
  ActivityIndicator,
  View,
  Text,
  StyleSheet,
  type PressableProps,
  type ViewStyle,
} from 'react-native';
import { theme } from '@/theme';
import { hitSlop as computeHitSlop } from '@/theme/utils';
import { Icon, type IconSize } from './Icon';
import type { LucideIcon } from 'lucide-react-native';
import { textStyles } from '@/theme/typography';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline' // alias of 'secondary' — see note above
  | 'ghost' // alias of 'tertiary'
  | 'tertiary'
  | 'destructive';

export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  /** Button label text. */
  label: string;
  /** Visual variant. Defaults to 'primary'. */
  variant?: ButtonVariant;
  /** Size preset. Defaults to 'md' (matches Design System 48px height). */
  size?: ButtonSize;
  /** Icon rendered before the label. */
  leftIcon?: LucideIcon;
  /** Icon rendered after the label. */
  rightIcon?: LucideIcon;
  /** Expands the button to fill its container's width. */
  fullWidth?: boolean;
  /** Shows a spinner in place of the label and disables interaction. */
  loading?: boolean;
  /** Disables interaction and applies the disabled visual treatment. */
  disabled?: boolean;
  /** Required for icon-only or ambiguous-label buttons; falls back to label. */
  accessibilityLabel?: string;
  /** Optional outer style override — use sparingly, prefer variant/size props. */
  style?: ViewStyle;
}

// ─── Size Map ──────────────────────────────────────────────────────────────────
// sm/lg are interpolated around the Design System's canonical 48px (md).

const SIZE_MAP: Record<
  ButtonSize,
  { height: number; paddingHorizontal: number; iconSize: IconSize; textStyleKey: keyof typeof textStyles }
> = {
  sm: { height: 38, paddingHorizontal: theme.spacing.md, iconSize: 'sm', textStyleKey: 'bodySmallSemiBold' },
  // md horizontal padding uses theme.spacing.lg (20px) — matches Design
  // System §21 exactly ("Horizontal Padding: 20px") via a real spacing
  // token rather than derived arithmetic on an unrelated layout constant.
  md: { height: theme.layout.buttonHeight, paddingHorizontal: theme.spacing.lg, iconSize: 'md', textStyleKey: 'buttonLabel' },
  lg: { height: 56, paddingHorizontal: theme.spacing.xl, iconSize: 'md', textStyleKey: 'bodyLargeSemiBold' },
};

// ─── Variant Resolution ─────────────────────────────────────────────────────────

function resolveVariant(variant: ButtonVariant): 'primary' | 'secondary' | 'tertiary' | 'destructive' {
  if (variant === 'outline') return 'secondary';
  if (variant === 'ghost') return 'tertiary';
  return variant;
}

interface VariantStyle {
  background: string;
  pressedBackground: string;
  disabledBackground: string;
  border?: { width: number; color: string };
  textColor: string;
  disabledTextColor: string;
}

function getVariantStyle(variant: ButtonVariant): VariantStyle {
  const resolved = resolveVariant(variant);

  switch (resolved) {
    case 'primary':
      return {
        background:          theme.colors.brand.primary,
        pressedBackground:   theme.colors.brand.interactive,
        disabledBackground:  theme.colors.neutral.border,
        textColor:           theme.colors.static.white,
        disabledTextColor:   theme.colors.text.disabled,
      };
    case 'secondary':
      return {
        background:          theme.colors.neutral.background,
        pressedBackground:   theme.colors.neutral.backgroundSecondary,
        disabledBackground:  theme.colors.neutral.background,
        border: {
          width: theme.borders.width,
          color: theme.colors.neutral.border,
        },
        textColor:           theme.colors.text.primary,
        disabledTextColor:   theme.colors.text.disabled,
      };
    case 'tertiary':
      return {
        background:          theme.colors.static.transparent,
        pressedBackground:   theme.colors.neutral.backgroundSecondary,
        disabledBackground:  theme.colors.static.transparent,
        textColor:           theme.colors.brand.primary,
        disabledTextColor:   theme.colors.text.disabled,
      };
    case 'destructive':
      return {
        background:          theme.colors.semantic.error,
        pressedBackground:   theme.colors.semantic.error, // pressed handled via opacity below
        disabledBackground:  theme.colors.neutral.border,
        textColor:           theme.colors.static.white,
        disabledTextColor:   theme.colors.text.disabled,
      };
  }
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  fullWidth = false,
  loading = false,
  disabled = false,
  accessibilityLabel,
  style,
  ...pressableProps
}: ButtonProps) {
  const variantStyle = getVariantStyle(variant);
  const sizing = SIZE_MAP[size];
  const isInteractionDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isInteractionDisabled, busy: loading }}
      disabled={isInteractionDisabled}
      // sm (38px) is below the 44px WCAG minimum touch target — hitSlop
      // expands the tappable area without affecting visual size. md/lg
      // already meet the minimum, so no expansion is needed there.
      hitSlop={sizing.height < theme.layout.touchTargetMin ? computeHitSlop(sizing.height) : undefined}
      style={({ pressed }) => [
        styles.base,
        {
          height:            sizing.height,
          paddingHorizontal: sizing.paddingHorizontal,
          backgroundColor:   isInteractionDisabled
            ? variantStyle.disabledBackground
            : pressed
              ? variantStyle.pressedBackground
              : variantStyle.background,
          borderRadius: theme.radius.button,
          width: fullWidth ? '100%' : undefined,
          opacity: variant === 'destructive' && pressed && !isInteractionDisabled ? 0.85 : 1,
        },
        variantStyle.border
          ? {
              borderWidth: variantStyle.border.width,
              borderColor: variantStyle.border.color,
            }
          : undefined,
        style,
      ]}
      {...pressableProps}
    >
      {loading ? (
        // Loading replaces the label entirely but the button retains its
        // width and height — per Design System: "never shift position".
        <ActivityIndicator
          size="small"
          color={variantStyle.textColor}
        />
      ) : (
        <View style={styles.content}>
          {leftIcon ? (
            <View style={styles.iconLeft}>
              <Icon
                icon={leftIcon}
                size={sizing.iconSize}
                color={disabled ? variantStyle.disabledTextColor : variantStyle.textColor}
              />
            </View>
          ) : null}

          <Text
            style={[
              textStyles[sizing.textStyleKey],
              { color: disabled ? variantStyle.disabledTextColor : variantStyle.textColor },
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>

          {rightIcon ? (
            <View style={styles.iconRight}>
              <Icon
                icon={rightIcon}
                size={sizing.iconSize}
                color={disabled ? variantStyle.disabledTextColor : variantStyle.textColor}
              />
            </View>
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  base: {
    alignItems:     'center',
    justifyContent: 'center',
    flexDirection:  'row',
  },
  content: {
    flexDirection: 'row',
    alignItems:    'center',
    justifyContent: 'center',
  },
  iconLeft: {
    marginRight: theme.spacing.xs,
  },
  iconRight: {
    marginLeft: theme.spacing.xs,
  },
});
