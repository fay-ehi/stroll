/**
 * Stroll — Manage Collaborators
 * app/(modals)/collection-collaborators/[collectionId].tsx
 *
 * Sprint 5 — Prompt 2, requirements #2 (Invite Collaborators), #3
 * (Collaboration Invitations — cancel is the owner-side of that
 * lifecycle), and #7 (Collaboration Management). One screen serves both
 * roles reading the same collection_collaborators rows, branching on
 * whether the signed-in user is this Collection's creator:
 *
 *   Owner:         search + select users → "Send Invites", plus a
 *                  Cancel/Remove action on every existing row.
 *   Collaborator:  a read-only version of that same list, plus a
 *                  "Leave Collection" button at the bottom.
 *
 * Opened only from Collection Detail's ••• management menu
 * (MODAL_ROUTES.collectionCollaborators) — never a persistent nav
 * destination, same as every other modal in this app.
 *
 * ── Search UI only renders for the owner ──
 * Invites are creator-only (requirement #7), enforced independently at
 * the RLS layer (collection_collaborators_insert policy) — this screen
 * simply doesn't render controls a collaborator couldn't use anyway.
 *
 * ── Select-then-send, not instant-toggle ──
 * Unlike CollectionSelectRow's (Add-to-Collection) instant-apply rows,
 * InviteUserRow toggles a LOCAL pending selection — "Send Invites"
 * commits the whole batch as one useInviteCollaborators call. Inviting
 * several people reads better as one deliberate action than as N
 * separate mutations firing mid-search.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { View, Pressable, FlatList, Alert, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { X, UserPlus } from 'lucide-react-native';

import { theme } from '@/theme';
import { ScreenContainer, H4, Body, Caption, TextInput, Button, Icon, Spinner, EmptyState, Divider } from '@/components/ui';
import { CollaboratorRow, InviteUserRow } from '@/components/collections';
import { useAuthState } from '@/hooks/useAuth';
import { useCollection } from '@/hooks/useCollections';
import {
  useCollectionCollaborators,
  useInvitableUserSearch,
  useInviteCollaborators,
  useCancelInvitation,
  useRemoveCollaborator,
  useLeaveCollection,
} from '@/hooks/useCollaboration';
import type { CreatorPreview } from '@/types/experience';
import type { CollaboratorModel } from '@/types/collaboration';

export default function CollectionCollaboratorsModal() {
  const { collectionId: rawId } = useLocalSearchParams<{ collectionId: string }>();
  const collectionId = rawId ?? '';

  const { user } = useAuthState();
  const { collection } = useCollection(collectionId);
  const isOwner = !!user && !!collection && collection.owner.id === user.id;

  const { collaborators, isLoading: isLoadingCollaborators } = useCollectionCollaborators(collectionId);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<Map<string, CreatorPreview>>(new Map());
  const { results: searchResults, isLoading: isSearching } = useInvitableUserSearch(collectionId, searchQuery);

  const inviteCollaborators = useInviteCollaborators(collectionId);
  const cancelInvitation = useCancelInvitation(collectionId);
  const removeCollaborator = useRemoveCollaborator(collectionId);
  const leaveCollection = useLeaveCollection(collectionId);

  const [pendingRowId, setPendingRowId] = useState<string | null>(null);

  const toggleSelected = useCallback((person: CreatorPreview) => {
    setSelectedUsers((prev) => {
      const next = new Map(prev);
      if (next.has(person.id)) {
        next.delete(person.id);
      } else {
        next.set(person.id, person);
      }
      return next;
    });
  }, []);

  const handleSendInvites = useCallback(() => {
    const userIds = Array.from(selectedUsers.keys());
    if (userIds.length === 0) return;

    inviteCollaborators.mutate(userIds, {
      onSuccess: () => {
        setSelectedUsers(new Map());
        setSearchQuery('');
      },
    });
  }, [selectedUsers, inviteCollaborators]);

  const handleRemoveRow = useCallback(
    (collaborator: CollaboratorModel) => {
      const isPending = collaborator.status === 'pending';
      Alert.alert(
        isPending ? 'Cancel this invitation?' : 'Remove this collaborator?',
        isPending
          ? "They won't be able to accept it anymore."
          : "They'll lose access to manage this collection. Their own experiences already in it stay put.",
        [
          { text: 'Back', style: 'cancel' },
          {
            text: isPending ? 'Cancel Invitation' : 'Remove',
            style: 'destructive',
            onPress: () => {
              setPendingRowId(collaborator.id);
              if (isPending) {
                cancelInvitation.mutate({ collaboratorId: collaborator.id }, { onSettled: () => setPendingRowId(null) });
              } else {
                removeCollaborator.mutate(
                  { collaboratorId: collaborator.id, userId: collaborator.user.id },
                  { onSettled: () => setPendingRowId(null) },
                );
              }
            },
          },
        ],
      );
    },
    [cancelInvitation, removeCollaborator],
  );

  const handleLeave = useCallback(() => {
    Alert.alert(
      'Leave this collection?',
      "You'll lose access to manage it. Your own experiences already in it stay put.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: () => leaveCollection.mutate(undefined, { onSuccess: () => router.back() }),
        },
      ],
    );
  }, [leaveCollection]);

  const selectedList = useMemo(() => Array.from(selectedUsers.values()), [selectedUsers]);

  const searchSection = isOwner ? (
    <View style={styles.searchSection}>
      <TextInput
        label="Invite collaborators"
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search by username or name"
        autoCapitalize="none"
        autoCorrect={false}
      />

      {selectedList.length > 0 ? (
        <View style={styles.selectedRow}>
          <Caption color={theme.colors.text.tertiary}>
            {selectedList.length === 1 ? '1 person selected' : `${selectedList.length} people selected`}
          </Caption>
          <Button
            label="Send Invites"
            size="sm"
            onPress={handleSendInvites}
            loading={inviteCollaborators.isPending}
          />
        </View>
      ) : null}

      {searchQuery.trim().length >= 2 ? (
        isSearching ? (
          <View style={styles.searchSpinner}>
            <Spinner size="small" />
          </View>
        ) : searchResults.length === 0 ? (
          <Caption color={theme.colors.text.tertiary} style={styles.noResults}>
            No one found matching &ldquo;{searchQuery.trim()}&rdquo;.
          </Caption>
        ) : (
          <View style={styles.searchResults}>
            {searchResults.map((person) => (
              <InviteUserRow
                key={person.id}
                user={person}
                isSelected={selectedUsers.has(person.id)}
                onToggle={() => toggleSelected(person)}
              />
            ))}
          </View>
        )
      ) : null}

      <Divider style={styles.divider} />
    </View>
  ) : null;

  return (
    <ScreenContainer scroll={false} padded={false}>
      <View style={styles.header}>
        <H4>Collaborators</H4>
        <Pressable
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Icon icon={X} size="md" color={theme.colors.text.primary} />
        </Pressable>
      </View>

      {isLoadingCollaborators ? (
        <View style={styles.centered}>
          <Spinner accessibilityLabel="Loading collaborators" />
        </View>
      ) : (
        <FlatList
          data={collaborators}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={searchSection}
          ListEmptyComponent={
            isOwner ? (
              <View style={styles.centered}>
                <EmptyState
                  icon={UserPlus}
                  title="No collaborators yet"
                  description="Search above to invite someone to co-curate this collection."
                />
              </View>
            ) : (
              <View style={styles.centered}>
                <Body color={theme.colors.text.secondary}>No other collaborators yet.</Body>
              </View>
            )
          }
          renderItem={({ item }) => (
            <CollaboratorRow
              collaborator={item}
              isPending={pendingRowId === item.id}
              onRemoveAction={isOwner ? () => handleRemoveRow(item) : undefined}
            />
          )}
          ListFooterComponent={
            !isOwner && user ? (
              <View style={styles.leaveSection}>
                <Button
                  label="Leave Collection"
                  variant="destructive"
                  onPress={handleLeave}
                  loading={leaveCollection.isPending}
                  fullWidth
                />
              </View>
            ) : null
          }
        />
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
    paddingTop: theme.spacing.xl,
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
  },
  list: {
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    paddingBottom: theme.spacing.lg,
    flexGrow: 1,
  },
  searchSection: {
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
  },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  searchSpinner: {
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  noResults: {
    paddingVertical: theme.spacing.md,
  },
  searchResults: {
    gap: 0,
  },
  divider: {
    marginTop: theme.spacing.sm,
  },
  leaveSection: {
    marginTop: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    borderTopWidth: theme.borders.width,
    borderTopColor: theme.colors.neutral.border,
  },
});
