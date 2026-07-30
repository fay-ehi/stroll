/**
 * Stroll — Legal Document Layout
 * src/components/legal/LegalDocumentLayout.tsx
 *
 * Sprint 9 Prompt 2 — Help, About & Legal. "Create a Terms screen using
 * the same reusable document layout" (prompt doc, Terms of Service
 * section) — this is that one shared layout. Privacy Policy, Terms of
 * Service, and Community Guidelines (app/(app)/legal/*.tsx) are each a
 * few lines that pick which LegalDocument (src/constants/legalContent.ts)
 * to hand this component; none of them own their own scroll/header/
 * section-rendering logic.
 *
 * Plain text, not markdown — no markdown-renderer dependency added for
 * three static documents; a section's `body` is split on `\n\n` into
 * paragraphs, same as any other multi-paragraph Body block elsewhere in
 * this app.
 *
 * "Support: Scrollable content, External links if necessary" (prompt
 * doc) — scrolling is a plain ScrollView; the external link only renders
 * when a document actually sets `externalUrl` (none do yet — see
 * legalContent.ts's own doc), opened via React Native's built-in
 * `Linking` (no new dependency).
 */

import React from 'react';
import { View, ScrollView, Pressable, Linking, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, AlertTriangle, ExternalLink } from 'lucide-react-native';

import { theme } from '@/theme';
import { ScreenContainer, H4, H5, Body, Caption, Icon } from '@/components/ui';
import { hitSlop } from '@/theme/utils';
import type { LegalDocument } from '@/constants/legalContent';

const HEADER_BUTTON_SIZE = 40;

export interface LegalDocumentLayoutProps {
  document: LegalDocument;
}

export function LegalDocumentLayout({ document }: LegalDocumentLayoutProps) {
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
        <H4 style={styles.headerTitle} numberOfLines={1}>{document.title}</H4>
        <View style={styles.headerButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {document.status === 'draft' ? (
          <View style={styles.draftBanner}>
            <Icon icon={AlertTriangle} size="sm" color={theme.colors.semantic.warning} />
            <Caption color={theme.colors.semantic.warning} style={styles.draftBannerText}>
              This is a working draft and has not been finalized.
            </Caption>
          </View>
        ) : null}

        <Caption color={theme.colors.text.tertiary} style={styles.lastUpdated}>
          {document.lastUpdated}
        </Caption>

        <Body color={theme.colors.text.secondary} style={styles.intro}>
          {document.intro}
        </Body>

        {document.sections.map((section) => (
          <View key={section.heading} style={styles.section}>
            <H5 style={styles.sectionHeading}>{section.heading}</H5>
            {section.body.split('\n\n').map((paragraph, index) => (
              <Body
                key={index}
                color={theme.colors.text.secondary}
                style={index > 0 ? styles.paragraphSpaced : undefined}
              >
                {paragraph}
              </Body>
            ))}
          </View>
        ))}

        {document.externalUrl ? (
          <Pressable
            onPress={() => { void Linking.openURL(document.externalUrl!); }}
            style={styles.externalLink}
            accessibilityRole="link"
            accessibilityLabel={`View the full ${document.title} online`}
          >
            <Body color={theme.colors.brand.primary}>View full {document.title.toLowerCase()} online</Body>
            <Icon icon={ExternalLink} size="xs" color={theme.colors.brand.primary} />
          </Pressable>
        ) : null}
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
    marginHorizontal: theme.spacing.sm,
  },
  content: {
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    paddingBottom:     theme.spacing['4xl'],
  },
  draftBanner: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               theme.spacing.sm,
    // No dedicated "warning background" token exists in theme.colors.semantic
    // (only the solid warning/error/success/info accent colors) — using the
    // neutral secondary background keeps this readable without inventing an
    // undocumented color value.
    backgroundColor:   theme.colors.neutral.backgroundSecondary,
    borderRadius:      theme.radius.card,
    paddingHorizontal: theme.spacing.md,
    paddingVertical:   theme.spacing.sm,
    marginBottom:      theme.spacing.md,
  },
  draftBannerText: {
    flex: 1,
  },
  lastUpdated: {
    marginBottom: theme.spacing.md,
  },
  intro: {
    marginBottom: theme.spacing.xl,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionHeading: {
    marginBottom: theme.spacing.xs,
  },
  paragraphSpaced: {
    marginTop: theme.spacing.sm,
  },
  externalLink: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           theme.spacing.xs,
    marginTop:     theme.spacing.sm,
  },
});
