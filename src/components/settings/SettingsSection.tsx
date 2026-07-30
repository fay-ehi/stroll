/**
 * Stroll — Settings Section
 * src/components/settings/SettingsSection.tsx
 *
 * Sprint 9 Prompt 1 — Account Settings.
 *
 * Groups a set of SettingsRows under a section title (Account / Session /
 * Danger Zone, per the sprint doc's screen structure), inserting a
 * <Divider /> between children automatically so no individual row needs
 * to know whether it's the last one in its section.
 *
 * "Keep the interface simple, spacious and easy to scan" (Philosophy) —
 * generous vertical rhythm between sections is this component's whole
 * job; each row's own internal padding (SettingsRow) handles rhythm
 * within a section.
 */

import React, { Children, Fragment, isValidElement } from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '@/theme';
import { Label } from '../ui/Typography';
import { Divider } from '../ui/Divider';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface SettingsSectionProps {
  /** Section heading, e.g. "Account", "Session", "Danger Zone". */
  title: string;
  /** Tinted heading color for Danger Zone — the one section the sprint doc singles out as "clearly separated." */
  destructive?: boolean;
  children: React.ReactNode;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function SettingsSection({ title, destructive = false, children }: SettingsSectionProps) {
  const rows = Children.toArray(children).filter(isValidElement);

  return (
    <View style={styles.section}>
      <Label
        style={styles.title}
        color={destructive ? theme.colors.semantic.error : theme.colors.text.tertiary}
      >
        {title.toUpperCase()}
      </Label>
      <View style={styles.card}>
        {rows.map((row, index) => (
          <Fragment key={row.key ?? index}>
            {row}
            {index < rows.length - 1 ? <Divider /> : null}
          </Fragment>
        ))}
      </View>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  section: {
    marginBottom: theme.spacing.xxl,
  },
  title: {
    marginBottom:      theme.spacing.sm,
    marginLeft:        theme.spacing.xxs,
    letterSpacing:      0.5,
  },
  card: {
    backgroundColor:   theme.colors.neutral.background,
    borderRadius:      theme.radius.card,
    borderWidth:       theme.borders.width,
    borderColor:       theme.colors.neutral.border,
    paddingHorizontal: theme.spacing.md,
  },
});
