/**
 * Stroll — Open Source Licenses
 * app/(app)/licenses.tsx
 *
 * Sprint 9 Prompt 2 — Help, About & Legal. Reached from Settings' About
 * section.
 *
 * Reuses SettingsRow purely as a read-only display row here (no
 * onPress, so no chevron, no press feedback — SettingsRow already
 * supports that combination, see its own props doc) rather than building
 * a second "list row" component just for this screen.
 *
 * "Prepare the architecture for future additions" (prompt doc): this
 * screen has zero domain logic of its own — it only renders
 * OSS_LICENSES (src/constants/appInfo.ts). Adding, updating, or removing
 * an entry there is the entire maintenance surface; see that file's own
 * doc for how the current list was generated and what's intentionally
 * excluded from it.
 */

import React from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

import { theme } from '@/theme';
import { ScreenContainer, H4, Caption, Icon } from '@/components/ui';
import { SettingsSection, SettingsRow } from '@/components/settings';
import { OSS_LICENSES } from '@/constants/appInfo';
import { hitSlop } from '@/theme/utils';

const HEADER_BUTTON_SIZE = 40;

export default function LicensesScreen() {
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
        <H4 style={styles.headerTitle}>Open Source Licenses</H4>
        <View style={styles.headerButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Caption color={theme.colors.text.tertiary} style={styles.intro}>
          Stroll is built with the help of these open source libraries.
        </Caption>

        <SettingsSection title={`${OSS_LICENSES.length} Libraries`}>
          {OSS_LICENSES.map((entry) => (
            <SettingsRow
              key={entry.name}
              label={entry.name}
              value={`v${entry.version} · ${entry.license}`}
              chevron={false}
            />
          ))}
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
  intro: {
    marginBottom: theme.spacing.md,
  },
});
