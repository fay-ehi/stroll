/**
 * Stroll — My Invitations
 * app/(modals)/collection-invitations.tsx
 *
 * Sprint 5 — Prompt 2, requirement #3 (Collaboration Invitations): "An
 * invited user should be able to Accept invitation / Decline
 * invitation." This screen is the full extent of this sprint's
 * invitation-response surface — every pending invitation across every
 * Collection the signed-in user has been invited to, each with Accept/
 * Decline.
 *
 * Reachable only via MODAL_ROUTES.collectionInvitations from the
 * Profile screen's Invitations pill (CollectionsRow.tsx, shown only
 * when useMyPendingInvitations returns at least one) — a modal, same
 * navigational tier as drafts.tsx, never a persistent nav destination.
 * Requirement #9 explicitly defers building a real Notifications UI/push
 * surface; this is a deliberately minimal, self-contained stand-in that
 * satisfies "invitations can be accepted or declined" without one.
 */

import React, { useCallback, useState } from 'react';
import { View, Pressable, StyleSheet, FlatList } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { X, Mail } from 'lucide-react-native';

import { theme } from '@/theme';
import { ScreenContainer, H4, Body, Caption, Card, Icon, Button, EmptyState, Spinner } from '@/components/ui';
import { useAuthState } from '@/hooks/useAuth';
import { useMyPendingInvitations, useAcceptInvitation, useDeclineInvitation } from '@/hooks/useCollaboration';
import type { PendingInvitationModel } from '@/types/collaboration';

export default function CollectionInvitationsModal() {
  const { user } = useAuthState();
  const { invitations, isLoading } = useMyPendingInvitations(user?.id);
  const acceptInvitation = useAcceptInvitation();
  const declineInvitation = useDeclineInvitation();

  const [respondingId, setRespondingId] = useState<string | null>(null);

  const handleAccept = useCallback(
    (invitation: PendingInvitationModel) => {
      setRespondingId(invitation.id);
      acceptInvitation.mutate(
        { collaboratorId: invitation.id, collectionId: invitation.collectionId },
        { onSettled: () => setRespondingId(null) },
      );
    },
    [acceptInvitation],
  );

  const handleDecline = useCallback(
    (invitation: PendingInvitationModel) => {
      setRespondingId(invitation.id);
      declineInvitation.mutate(
        { collaboratorId: invitation.id, collectionId: invitation.collectionId },
        { onSettled: () => setRespondingId(null) },
      );
    },
    [declineInvitation],
  );

  const renderItem = ({ item }: { item: PendingInvitationModel }) => {
    const isResponding = respondingId === item.id;

    return (
      <Card style={styles.card}>
        <View style={styles.cardRow}>
          {item.collectionCoverUrl ? (
            <Image source={{ uri: item.collectionCoverUrl }} style={styles.cover} cachePolicy="memory-disk" contentFit="cover" />
          ) : (
            <View style={[styles.cover, styles.coverPlaceholder]} />
          )}

          <View style={styles.textColumn}>
            <Body numberOfLines={1}>{item.collectionTitle}</Body>
            <Caption color={theme.colors.text.tertiary} numberOfLines={1}>
              Invited by {item.invitedBy.displayName}
            </Caption>
          </View>
        </View>

        <View style={styles.cardActions}>
          <Button
            label="Decline"
            variant="secondary"
            size="sm"
            onPress={() => handleDecline(item)}
            disabled={isResponding}
          />
          <Button label="Accept" size="sm" onPress={() => handleAccept(item)} loading={isResponding} />
        </View>
      </Card>
    );
  };

  return (
    <ScreenContainer scroll={false} padded={false}>
      <View style={styles.header}>
        <H4>Invitations</H4>
        <Pressable
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Icon icon={X} size="md" color={theme.colors.text.primary} />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <Spinner accessibilityLabel="Loading invitations" />
        </View>
      ) : invitations.length === 0 ? (
        <View style={styles.centered}>
          <EmptyState icon={Mail} title="No pending invitations" description="Collection invites you receive will show up here." />
        </View>
      ) : (
        <FlatList data={invitations} keyExtractor={(item) => item.id} renderItem={renderItem} contentContainerStyle={styles.list} />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    paddingVertical: theme.spacing.md,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
  },
  list: {
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  card: {
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  cover: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.image,
  },
  coverPlaceholder: {
    backgroundColor: theme.colors.neutral.backgroundSecondary,
  },
  textColumn: {
    flex: 1,
    gap: 2,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
  },
});
