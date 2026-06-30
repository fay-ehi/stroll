/**
 * Stroll UI — ScreenContainer
 * src/components/ui/ScreenContainer.tsx
 *
 * Design System §41 — Screen Structure:
 *   Status Bar → Top Navigation → Primary Content → Secondary Content →
 *   Bottom Navigation. "The objective is predictability."
 *
 * Design System §13 — Grid:
 *   Standard Screen Padding: 24px
 *
 * This is the structural wrapper every screen in Stroll should render at
 * its root. It centralizes:
 *   - SafeAreaView (top/bottom insets)
 *   - Background color (theme.colors.neutral.background)
 *   - Standard horizontal padding (theme.layout.screenPaddingHorizontal)
 *   - Scrollable vs static layout
 *   - Keyboard avoidance for forms (Create Experience, Auth screens, etc.)
 *
 * Usage:
 *   <ScreenContainer scroll>
 *     <H2>Discover</H2>
 *     ...
 *   </ScreenContainer>
 *
 *   <ScreenContainer scroll={false} padded={false}>
 *     // full-bleed content, e.g. a map or image gallery
 *   </ScreenContainer>
 *
 *   <ScreenContainer scroll avoidKeyboard>
 *     // a form screen, e.g. Create Experience
 *   </ScreenContainer>
 */

import React from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  type ViewStyle,
  type ScrollViewProps,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { theme } from '@/theme';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface ScreenContainerProps {
  children: React.ReactNode;
  /** Wraps content in a ScrollView. Defaults to true — most screens scroll. */
  scroll?: boolean;
  /** Applies standard horizontal screen padding. Defaults to true. */
  padded?: boolean;
  /** Wraps content in KeyboardAvoidingView — use on screens with text inputs. */
  avoidKeyboard?: boolean;
  /** Background color override. Defaults to theme.colors.neutral.background. */
  backgroundColor?: string;
  /** Which safe area edges to respect. Defaults to top + bottom.
   *  Screens with a custom header may want to exclude 'top'. */
  edges?: Edge[];
  /** Additional style applied to the outer content area. */
  style?: ViewStyle;
  /** Props passed through to the underlying ScrollView (only used when scroll=true). */
  scrollViewProps?: Omit<ScrollViewProps, 'style' | 'contentContainerStyle'>;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function ScreenContainer({
  children,
  scroll = true,
  padded = true,
  avoidKeyboard = false,
  backgroundColor = theme.colors.neutral.background,
  edges = ['top', 'bottom'],
  style,
  scrollViewProps,
}: ScreenContainerProps) {
  const contentPadding = padded ? theme.layout.screenPaddingHorizontal : 0;

  const content = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        { paddingHorizontal: contentPadding, paddingBottom: theme.spacing['4xl'] },
        style,
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      {...scrollViewProps}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, { paddingHorizontal: contentPadding }, style]}>
      {children}
    </View>
  );

  const body = avoidKeyboard ? (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      // 0 is the correct default here: ScreenContainer has no knowledge of
      // any fixed-height header rendered above it by a parent navigator.
      // Screens with a custom header that overlaps content should pass
      // their own offset via a future `keyboardVerticalOffset` prop rather
      // than this component guessing a platform-specific magic number.
      keyboardVerticalOffset={0}
    >
      {content}
    </KeyboardAvoidingView>
  ) : (
    content
  );

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor }]} edges={edges}>
      {body}
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
