/**
 * Stroll — Settings Row
 * src/components/settings/SettingsRow.tsx
 *
 * Sprint 9 Prompt 1 — Account Settings.
 *
 * The one reusable building block every row in the Settings screen is
 * built from (Username, Email, Password, Log Out, Delete Account) — the
 * same "one domain component the screen composes repeatedly" pattern as
 * NotificationCard for the Notifications screen.
 *
 * Design System §45 / notification-card precedent: flat list rows, 1px
 * divider between them (rendered by the parent via <Divider />, not by
 * this component, so SettingsSection controls spacing/edge cases like
 * "no divider after the last row"), generous touch targets
 * (theme.layout.touchTargetMin), label always visible text (never
 * icon-only).
 */

import React from 'react';
import { View, Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { theme } from '@/theme';
import { hitSlop as computeHitSlop } from '@/theme/utils';
import { Icon } from '../ui/Icon';
import { Body, Caption } from '../ui/Typography';
import { Spinner } from '../ui/Loading';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface SettingsRowProps {
  /** Always visible text — Design System §22's "always use labels" rule applies to list rows too, not just text fields. */
  label: string;
  /** Optional leading icon. */
  icon?: LucideIcon;
  /** Current value / subtitle shown on the right (e.g. "@handle", the current email, "••••••••"). Ignored when `loading` or `rightElement` is set. */
  value?: string;
  /** Tappable row. Omit for a purely informational row (none currently, but keeps this component honest about when a chevron makes sense). */
  onPress?: () => void;
  /** Shows a trailing chevron. Defaults to true whenever onPress is set. */
  chevron?: boolean;
  /** Red label/value — reserved for the Danger Zone (Delete Account). Log Out is a normal row per the sprint doc's own Session/Danger-Zone split — it is NOT styled destructive. */
  destructive?: boolean;
  /** Disables the row (e.g. Password row when the signed-in user has no password identity — see SettingsScreen). */
  disabled?: boolean;
  /** Replaces the value+chevron with a spinner — for in-flight mutations (Sprint 9 Prompt 1's "never leave users wondering whether an action is processing"). */
  loading?: boolean;
  /** Full override of the right-hand side. Rarely needed — prefer `value`. */
  rightElement?: React.ReactNode;
  /** Additional context for screen readers beyond the label/value (e.g. "Opens account deletion confirmation"). */
  accessibilityHint?: string;
  style?: ViewStyle;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function SettingsRow({
  label,
  icon,
  value,
  onPress,
  chevron,
  destructive = false,
  disabled = false,
  loading = false,
  rightElement,
  accessibilityHint,
  style,
}: SettingsRowProps) {
  const showChevron = chevron ?? Boolean(onPress);
  const textColor = destructive ? theme.colors.semantic.error : theme.colors.text.primary;
  const iconColor = destructive ? theme.colors.semantic.error : theme.colors.text.secondary;

  const content = (
    <View style={[styles.row, style]}>
      {icon ? (
        <View style={styles.iconWrapper}>
          <Icon icon={icon} size="md" color={disabled ? theme.colors.text.disabled : iconColor} />
        </View>
      ) : null}

      <Body
        style={styles.label}
        color={disabled ? theme.colors.text.disabled : textColor}
        numberOfLines={1}
      >
        {label}
      </Body>

      <View style={styles.right}>
        {loading ? (
          <Spinner size="small" accessibilityLabel={`Updating ${label}`} />
        ) : rightElement ? (
          rightElement
        ) : (
          <>
            {value ? (
              <Caption
                style={styles.value}
                color={disabled ? theme.colors.text.disabled : theme.colors.text.tertiary}
                numberOfLines={1}
              >
                {value}
              </Caption>
            ) : null}
            {showChevron ? (
              <Icon
                icon={ChevronRight}
                size="sm"
                color={disabled ? theme.colors.text.disabled : theme.colors.text.tertiary}
              />
            ) : null}
          </>
        )}
      </View>
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      hitSlop={computeHitSlop(0)}
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}, ${value}` : label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: disabled || loading }}
      style={({ pressed }) => [
        pressed && !disabled ? styles.pressed : null,
      ]}
    >
      {content}
    </Pressable>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  row: {
    flexDirection:     'row',
    alignItems:        'center',
    minHeight:          theme.layout.touchTargetMin + theme.spacing.sm, // 56px — comfortably above the 44px minimum
    paddingVertical:    theme.spacing.sm,
  },
  pressed: {
    backgroundColor: theme.colors.neutral.backgroundSecondary,
  },
  iconWrapper: {
    marginRight: theme.spacing.sm,
  },
  label: {
    flex: 1,
  },
  right: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           theme.spacing.xs,
    marginLeft:    theme.spacing.sm,
  },
  value: {
    maxWidth: 160,
  },
});
