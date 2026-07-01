/**
 * Stroll — Welcome Screen
 * app/(auth)/welcome.tsx
 *
 * PRD Screen Inventory §1, Screen 1:
 *   Purpose: Introduce Stroll.
 *   Actions: Sign Up, Log In
 *   Content: Hero, Product Description, Sample Experiences, Sample Collections
 *
 * Sprint 1 scope: functional welcome with branding, tagline, and the two
 * primary CTAs. Sample content (real Experiences/Collections) requires
 * data from Supabase — that's a future sprint concern.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/theme';
import { Display, Body, Caption, Button } from '@/components/ui';
import { ROUTES } from '@/constants/routes';

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop:    Math.max(insets.top + theme.spacing.xxl, theme.spacing['4xl']),
          paddingBottom: Math.max(insets.bottom + theme.spacing.xl, theme.spacing.xxl),
        },
      ]}
    >
      {/* Brand + Tagline */}
      <View style={styles.hero}>
        <Body
          color={theme.colors.brand.primary}
          style={styles.wordmark}
        >
          Stroll
        </Body>

        <Display style={styles.headline}>
          Discover your city.
        </Display>

        <Body
          color={theme.colors.text.secondary}
          style={styles.tagline}
        >
          Find the best places through people who actually know them.
        </Body>
      </View>

      {/* CTAs */}
      <View style={styles.actions}>
        <Button
          label="Create an account"
          variant="primary"
          fullWidth
          onPress={() => router.push(ROUTES.auth.signUp as never)}
          accessibilityLabel="Create a new Stroll account"
        />

        <Button
          label="Sign in"
          variant="secondary"
          fullWidth
          onPress={() => router.push(ROUTES.auth.logIn as never)}
          accessibilityLabel="Sign in to your existing Stroll account"
          style={styles.secondaryButton}
        />

        <Caption
          align="center"
          color={theme.colors.text.tertiary}
          style={styles.legal}
        >
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </Caption>
      </View>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex:              1,
    backgroundColor:   theme.colors.neutral.background,
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    justifyContent:    'space-between',
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
  },
  wordmark: {
    fontWeight:    theme.typography.weights.bold,
    fontSize:      theme.typography.sizes.h4,
    letterSpacing: theme.typography.letterSpacings.tight,
    marginBottom:  theme.spacing.xxl,
  },
  headline: {
    marginBottom: theme.spacing.md,
  },
  tagline: {
    maxWidth: theme.spacing['5xl'] * 5,
  },
  actions: {
    gap: theme.spacing.sm,
  },
  secondaryButton: {
    marginTop: theme.spacing.xs,
  },
  legal: {
    marginTop: theme.spacing.sm,
  },
});
