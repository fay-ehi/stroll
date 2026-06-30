/**
 * Stroll UI — Typography Components
 * src/components/ui/Typography.tsx
 *
 * Reusable text components for every typographic role defined in the
 * Design System (§6, §7). Each component consumes `textStyles` presets
 * from the theme — no font values are ever hardcoded here.
 *
 * Usage:
 *   <H2>Discover your city</H2>
 *   <Body color={theme.colors.text.secondary}>Supporting copy</Body>
 *   <Caption numberOfLines={1}>Truncated metadata</Caption>
 *
 * Design Philosophy §17 — Typography should feel calm, modern, confident.
 * Text should never compete with imagery. These components default to
 * theme.colors.text.primary and accept a `color` override for hierarchy.
 */

import React from 'react';
import { Text, type TextProps, type TextStyle, StyleSheet } from 'react-native';
import { theme } from '@/theme';
import { textStyles } from '@/theme/typography';

// ─── Shared Props ──────────────────────────────────────────────────────────────

export interface StrollTextProps extends TextProps {
  /** Override the default text color. Defaults to theme.colors.text.primary. */
  color?: string;
  /** Text alignment. */
  align?: 'left' | 'center' | 'right';
  /** Additional style merged after the preset (use sparingly). */
  style?: TextStyle;
  children?: React.ReactNode;
}

// ─── Factory ───────────────────────────────────────────────────────────────────
// Internal factory that creates a typed component bound to one textStyles preset.
// Avoids repeating the same component body eleven times.

function createTextComponent(
  presetKey: keyof typeof textStyles,
  defaultColor: string,
  displayName: string
) {
  const Component = React.forwardRef<Text, StrollTextProps>(
    ({ color, align, style, children, ...rest }, ref) => {
      return (
        <Text
          ref={ref}
          style={[
            styles[presetKey as keyof typeof styles],
            { color: color ?? defaultColor },
            align ? { textAlign: align } : undefined,
            style,
          ]}
          // Typography components render meaningful content — always
          // accessible by default unless explicitly suppressed by caller.
          accessibilityRole={rest.accessibilityRole ?? 'text'}
          {...rest}
        >
          {children}
        </Text>
      );
    }
  );
  Component.displayName = displayName;
  return Component;
}

// ─── StyleSheet from textStyles presets ────────────────────────────────────────
// Pre-built once at module load — never recreated per render.

const styles = StyleSheet.create({
  display:           textStyles.display,
  h1:                textStyles.h1,
  h2:                textStyles.h2,
  h3:                textStyles.h3,
  h4:                textStyles.h4,
  h5:                textStyles.h5,
  bodyLarge:         textStyles.bodyLarge,
  bodyLargeMedium:   textStyles.bodyLargeMedium,
  bodyLargeSemiBold: textStyles.bodyLargeSemiBold,
  body:              textStyles.body,
  bodyMedium:        textStyles.bodyMedium,
  bodySemiBold:      textStyles.bodySemiBold,
  bodySmall:         textStyles.bodySmall,
  bodySmallMedium:   textStyles.bodySmallMedium,
  bodySmallSemiBold: textStyles.bodySmallSemiBold,
  caption:           textStyles.caption,
  captionMedium:     textStyles.captionMedium,
  tiny:              textStyles.tiny,
  tinyMedium:        textStyles.tinyMedium,
  buttonLabel:       textStyles.buttonLabel,
  label:             textStyles.label,
});

// ─── Exported Components ───────────────────────────────────────────────────────
// Headings default to primary text color and use Plus Jakarta Sans (via preset).
// Body variants default to primary text color and use Inter (via preset).

export const Display = createTextComponent('display', theme.colors.text.primary, 'Display');
export const H1 = createTextComponent('h1', theme.colors.text.primary, 'H1');
export const H2 = createTextComponent('h2', theme.colors.text.primary, 'H2');
export const H3 = createTextComponent('h3', theme.colors.text.primary, 'H3');
export const H4 = createTextComponent('h4', theme.colors.text.primary, 'H4');
export const H5 = createTextComponent('h5', theme.colors.text.primary, 'H5');

export const BodyLarge = createTextComponent('bodyLarge', theme.colors.text.primary, 'BodyLarge');
export const Body = createTextComponent('body', theme.colors.text.primary, 'Body');
export const BodySmall = createTextComponent('bodySmall', theme.colors.text.secondary, 'BodySmall');
export const Caption = createTextComponent('caption', theme.colors.text.tertiary, 'Caption');
export const Tiny = createTextComponent('tiny', theme.colors.text.tertiary, 'Tiny');

// ─── Weight Variants ────────────────────────────────────────────────────────────
// Medium/SemiBold variants of body sizes, for inline emphasis without
// switching typographic role (e.g. a bolded label inside a paragraph).

export const BodyMedium = createTextComponent('bodyMedium', theme.colors.text.primary, 'BodyMedium');
export const BodySemiBold = createTextComponent('bodySemiBold', theme.colors.text.primary, 'BodySemiBold');
export const Label = createTextComponent('label', theme.colors.text.secondary, 'Label');
