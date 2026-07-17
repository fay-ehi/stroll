/**
 * Stroll — Collaborator Row
 * src/components/collections/CollaboratorRow.tsx
 *
 * Sprint 5 — Prompt 2. A single row on the Manage Collaborators screen
 * (app/(modals)/collection-collaborators.tsx) — one person's avatar,
 * name, invitation status Badge, and (owner-only) a Cancel/Remove
 * action. Mirrors CollectionSelectRow.tsx's row layout (thumbnail/avatar
 * + text column + trailing control) but the trailing control here is a
 * status Badge plus an optional Button, not a checkbox — this list
 * isn't something you toggle, it's something you review and, if you're
 * the owner, prune.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';

import { theme } from '@/theme';
import { Avatar, Body, Badge, Button, type BadgeVariant, Spinner } from '@/components/ui';
import type { CollaboratorModel } from '@/types/collaboration';

const STATUS_LABEL: Record<CollaboratorModel['status'], string> = {
  pending: 'Pending',
  accepted: 'Collaborator',
  declined: 'Declined',
  expired: 'Expired',
};

const STATUS_VARIANT: Record<CollaboratorModel['status'], BadgeVariant> = {
  pending: 'warning',
  accepted: 'success',
  declined: 'neutral',
  expired: 'neutral',
};

export interface CollaboratorRowProps {
  collaborator: CollaboratorModel;
  /** Present only for the collection's creator — cancels a pending invite or removes an accepted collaborator. Absent renders the row read-only. */
  onRemoveAction?: () => void;
  isPending?: boolean;
}

export function CollaboratorRow({ collaborator, onRemoveAction, isPending }: CollaboratorRowProps) {
  const { user, status } = collaborator;
  const removeLabel = status === 'pending' ? 'Cancel' : 'Remove';

  return (
    <View style={styles.row}>
      <Avatar source={user.avatarUrl ? { uri: user.avatarUrl } : undefined} name={user.displayName} size="md" />

      <View style={styles.textColumn}>
        <Body numberOfLines={1}>{user.displayName}</Body>
        <Badge label={STATUS_LABEL[status]} variant={STATUS_VARIANT[status]} style={styles.badge} />
      </View>

      {isPending ? (
        <Spinner size="small" />
      ) : onRemoveAction && (status === 'pending' || status === 'accepted') ? (
        <Button label={removeLabel} variant="tertiary" size="sm" onPress={onRemoveAction} />
      ) : null}
    </View>
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
    gap: theme.spacing.xxs,
  },
  badge: {
    alignSelf: 'flex-start',
  },
});
