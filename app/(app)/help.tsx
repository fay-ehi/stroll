/**
 * Stroll — Help & Support
 * app/(app)/help.tsx
 *
 * Sprint 9 Prompt 2 — Help, About & Legal. Reached from Settings' new
 * Help section (see app/(app)/settings.tsx's diff this sprint).
 *
 * FAQ_ITEMS + FAQAccordionItem are the "placeholder architecture" the
 * prompt doc asks for — see src/constants/appInfo.ts's own doc for how
 * this is meant to be swapped for a real content source later without
 * this screen changing shape.
 *
 * FAQ and Contact Support both reuse SettingsSection/SettingsRow from
 * the settings component domain (Sprint 9 Prompt 1) rather than
 * introducing new section/card components — SettingsSection's
 * divider-between-children behavior works for any children, not just
 * SettingsRow, which is what makes wrapping FAQAccordionItem in it here
 * free.
 *
 * "Do not implement live chat" (prompt doc) — Contact Support opens the
 * device's mail client via React Native's built-in `Linking`, nothing
 * more.
 */

import React from 'react';
import { View, ScrollView, Pressable, Linking, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Mail } from 'lucide-react-native';

import { theme } from '@/theme';
import { ScreenContainer, H4, Icon } from '@/components/ui';
import { SettingsSection, SettingsRow } from '@/components/settings';
import { FAQAccordionItem } from '@/components/help';
import { FAQ_ITEMS, SUPPORT_EMAIL } from '@/constants/appInfo';
import { hitSlop } from '@/theme/utils';

const HEADER_BUTTON_SIZE = 40;

export default function HelpScreen() {
  const handleEmailSupport = () => {
    const subject = encodeURIComponent('Stroll Support');
    void Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}`);
  };

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
        <H4 style={styles.headerTitle}>Help & Support</H4>
        <View style={styles.headerButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SettingsSection title="Frequently Asked Questions">
          {FAQ_ITEMS.map((item) => (
            <FAQAccordionItem key={item.id} item={item} />
          ))}
        </SettingsSection>

        <SettingsSection title="Contact Support">
          <SettingsRow
            label="Email Support"
            icon={Mail}
            value={SUPPORT_EMAIL}
            onPress={handleEmailSupport}
            accessibilityHint="Opens your email app to message Stroll support"
          />
        </SettingsSection>
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
    paddingTop:        theme.spacing.md,
    paddingBottom:     theme.spacing['4xl'],
  },
});
