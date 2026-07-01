/**
 * Stroll UI — Typography Components
 * src/components/ui/Typography.tsx
 *
 * Reusable text components for every typographic role defined in the
 * Design System (§6, §7). Each component consumes `textStyles` presets
 * from the theme — no font values are ever hardcoded here.
 *
 * Fix log (Sprint 5 tsc pass):
 *   - StyleSheet.create() now receives an explicit cast to
 *     Record<string, TextStyle> so TypeScript accepts TextStylePreset
 *     values as valid style entries. TextStylePreset is structurally
 *     compatible with TextStyle — the cast is safe, not a lie.
 *   - Style lookup cast to `TextStyle | undefined` to satisfy the
 *     Text style prop type under noUncheckedIndexedAccess.
 */

import React from 'react';
import {
  Text,
  StyleSheet,
  type TextProps,
  type TextStyle,
} from 'react-native';
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

// ─── StyleSheet ────────────────────────────────────────────────────────────────
// Cast as Record<string, TextStyle> so StyleSheet.create() accepts our
// TextStylePreset objects. TextStylePreset is structurally compatible with
// TextStyle — fontFamily, fontSize, lineHeight, fontWeight, letterSpacing
// are all valid TextStyle fields. The cast is safe.

const styles = StyleSheet.create(
  textStyles as unknown as Record<string, TextStyle>
);

// ─── Factory ───────────────────────────────────────────────────────────────────
// Internal factory that creates a typed component bound to one textStyles
// preset. Avoids repeating the same component body fourteen times.

function createTextComponent(
  presetKey: keyof typeof textStyles,
  defaultColor: string,
  displayName: string
) {
  const Component = React.forwardRef<Text, StrollTextProps>(
    ({ color, align, style, children, ...rest }, ref) => {
      // Cast the indexed lookup to TextStyle — safe because every key in
      // textStyles maps to a TextStyle-compatible object (verified by
      // TextStylePreset's structure), and StyleSheet.create processed them
      // all as TextStyle entries above.
      const presetStyle = styles[presetKey] as TextStyle | undefined;

      return (
        <Text
          ref={ref}
          style={[
            presetStyle,
            { color: color ?? defaultColor },
            align ? { textAlign: align } : undefined,
            style,
          ]}
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

// ─── Exported Components ───────────────────────────────────────────────────────
// Headings use Plus Jakarta Sans (via preset), body uses Inter (via preset).

export const Display    = createTextComponent('display',    theme.colors.text.primary,   'Display');
export const H1         = createTextComponent('h1',         theme.colors.text.primary,   'H1');
export const H2         = createTextComponent('h2',         theme.colors.text.primary,   'H2');
export const H3         = createTextComponent('h3',         theme.colors.text.primary,   'H3');
export const H4         = createTextComponent('h4',         theme.colors.text.primary,   'H4');
export const H5         = createTextComponent('h5',         theme.colors.text.primary,   'H5');

export const BodyLarge  = createTextComponent('bodyLarge',  theme.colors.text.primary,   'BodyLarge');
export const Body       = createTextComponent('body',       theme.colors.text.primary,   'Body');
export const BodySmall  = createTextComponent('bodySmall',  theme.colors.text.secondary, 'BodySmall');
export const Caption    = createTextComponent('caption',    theme.colors.text.tertiary,  'Caption');
export const Tiny       = createTextComponent('tiny',       theme.colors.text.tertiary,  'Tiny');

export const BodyMedium   = createTextComponent('bodyMedium',   theme.colors.text.primary,   'BodyMedium');
export const BodySemiBold = createTextComponent('bodySemiBold', theme.colors.text.primary,   'BodySemiBold');
export const Label        = createTextComponent('label',        theme.colors.text.secondary, 'Label');
