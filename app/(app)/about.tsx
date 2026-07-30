/**
 * Stroll — About
 * app/(app)/about.tsx
 *
 * Sprint 9 Prompt 2 — Help, About & Legal. "The About section should
 * communicate professionalism" (Philosophy) — logo, description,
 * mission statement, then the quieter facts (version/build/copyright)
 * at the bottom, in that order of visual weight.
 *
 * Version/build both come from useAppVersionInfo (Sprint 9 Prompt 2's
 * shared hook — see its own doc) so this screen and the Settings
 * screen's "Version" row can never show two different numbers.
 */

import React from 'react';
import { View, ScrollView, Pressable, Image, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

import { theme } from '@/theme';
import { ScreenContainer, H2, H4, Label, Body, Caption, Icon } from '@/components/ui';
import { useAppVersionInfo } from '@/hooks/useAppVersionInfo';
import { ABOUT_DESCRIPTION, MISSION_STATEMENT, copyrightLine } from '@/constants/appInfo';
import { APP_META } from '@/constants/app';
import { hitSlop } from '@/theme/utils';

const HEADER_BUTTON_SIZE = 40;
const LOGO_SIZE = 88;

export default function AboutScreen() {
  const versionInfo = useAppVersionInfo();

  return (
    <ScreenContainer scroll={false} padded={false}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.headerButton}
          hitSlop={hitSlop(HEADER_BUTTON_SIZE)}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Icon icon={ArrowLeft} size="md" color={theme.colors.text.primary} />
        </Pressable>
        <H4 style={styles.headerTitle}>About</H4>
        <View style={styles.headerButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.logoWrapper}>
          {/* Sprint 9 Prompt 2: reuses the app's own icon asset as the
              "Stroll logo" (prompt doc) rather than adding a new image —
              same source app.json points to for the actual app icon. */}
          <Image
            source={require('../../assets/images/icon.png')}
            style={styles.logo}
            accessibilityLabel={`${APP_META.name} logo`}
          />
        </View>

        <H2 align="center" style={styles.appName}>{APP_META.name}</H2>
        <Body align="center" color={theme.colors.text.secondary} style={styles.description}>
          {ABOUT_DESCRIPTION}
        </Body>

        <View style={styles.section}>
          <Label style={styles.sectionLabel}>OUR MISSION</Label>
          <Body color={theme.colors.text.secondary}>{MISSION_STATEMENT}</Body>
        </View>

        <View style={styles.footer}>
          <Caption color={theme.colors.text.tertiary} align="center">
            Version {versionInfo.displayString}
            {versionInfo.environment === 'Development' ? ' · Development' : ''}
          </Caption>
          <Caption color={theme.colors.text.tertiary} align="center" style={styles.copyright}>
            {copyrightLine()}
          </Caption>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    paddingVertical:   theme.spacing.md,
  },
  headerButton: {
    width:          HEADER_BUTTON_SIZE,
    height:         HEADER_BUTTON_SIZE,
    alignItems:     'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex:      1,
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    paddingTop:        theme.spacing.lg,
    paddingBottom:     theme.spacing['4xl'],
    alignItems:        'center',
  },
  logoWrapper: {
    marginBottom: theme.spacing.md,
  },
  logo: {
    width:        LOGO_SIZE,
    height:       LOGO_SIZE,
    borderRadius: theme.radius.card,
  },
  appName: {
    marginBottom: theme.spacing.xs,
  },
  description: {
    marginBottom: theme.spacing.xl,
    maxWidth:     320,
  },
  section: {
    width:        '100%',
    marginBottom: theme.spacing.xl,
  },
  sectionLabel: {
    marginBottom: theme.spacing.sm,
  },
  footer: {
    marginTop: theme.spacing.lg,
  },
  copyright: {
    marginTop: theme.spacing.xs,
  },
});
