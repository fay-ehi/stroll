/**
 * Stroll — Invite User Row
 * src/components/collections/InviteUserRow.tsx
 *
 * Sprint 5 — Prompt 2, requirement #2 (Invite Collaborators): "Selecting
 * multiple users, Sending invitations." Used by
 * app/(modals)/collection-collaborators.tsx's search results — tapping a
 * row toggles it into/out of the pending selection; a separate "Send
 * Invites" button (owned by the screen, not this row) commits the whole
 * batch at once. Deliberately a toggle-then-confirm pattern, unlike
 * CollectionSelectRow's instant-toggle — inviting several people at once
 * reads better as "pick everyone, then send" than as N separate
 * mutations firing as you tap.
 */

import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';

import { theme } from '@/theme';
import { Avatar, Body, Caption, Icon } from '@/components/ui';
import type { CreatorPreview } from '@/types/experience';

export interface InviteUserRowProps {
  user: CreatorPreview;
  isSelected: boolean;
  onToggle: () => void;
}

const CHECK_DIAMETER = 24;

export function InviteUserRow({ user, isSelected, onToggle }: InviteUserRowProps) {
  return (
    <Pressable
      onPress={onToggle}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isSelected }}
      accessibilityLabel={user.displayName}
    >
      <Avatar source={user.avatarUrl ? { uri: user.avatarUrl } : undefined} name={user.displayName} size="md" />

      <View style={styles.textColumn}>
        <Body numberOfLines={1}>{user.displayName}</Body>
        <Caption color={theme.colors.text.tertiary} numberOfLines={1}>
          @{user.username}
        </Caption>
      </View>

      <View style={[styles.checkCircle, isSelected && styles.checkCircleSelected]}>
        {isSelected ? <Icon icon={Check} size="sm" color={theme.colors.static.white} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  textColumn: {
    flex: 1,
    gap: 2,
  },
  checkCircle: {
    width: CHECK_DIAMETER,
    height: CHECK_DIAMETER,
    borderRadius: theme.radius.full,
    borderWidth: theme.borders.width,
    borderColor: theme.colors.neutral.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleSelected: {
    backgroundColor: theme.colors.brand.primary,
    borderColor: theme.colors.brand.primary,
  },
});
