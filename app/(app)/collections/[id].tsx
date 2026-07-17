/**
 * Stroll — Collection Detail
 * app/(app)/collections/[id].tsx
 *
 * Sprint 5 — Prompt 1, requirement #6 (Collection Detail Screen) and #7
 * (Collection Management — "lives exclusively inside the Collection
 * Detail screen"). Structurally mirrors app/(app)/place/[id].tsx: the
 * whole page is one FlatList, cover/title/description/creator/count live
 * in ListHeaderComponent (CollectionDetailHeader), pagination footer
 * below the list — same "map/name/category info in the header, the
 * page's own paginated list is the FlatList itself" shape, adapted from
 * Places' Community Experiences to a Collection's own Experience list.
 *
 * ── Ownership gates every management affordance ──
 * `isOwner` (collection.owner.id === signed-in user's id) gates
 * Delete Collection specifically. `canManage` (isOwner OR an ACCEPTED
 * collaborator — Sprint 5 Prompt 2) gates everything else: the manage
 * button itself, rename/cover, "Manage Collaborators", "Add Experience",
 * and long-pressing an Experience card. Within that long-press menu,
 * removing a specific card is further scoped to `canRemoveExperience()`
 * — the owner may remove any card, a collaborator only one they added
 * themselves (requirement #4's "Remove their own Experiences from the
 * Collection").
 *
 * ── Collaboration entry points (Sprint 5 Prompt 2) ──
 * "Manage Collaborators" (in the ••• menu, canManage-gated) opens
 * MODAL_ROUTES.collectionCollaborators — invite/cancel/remove for the
 * owner, a read-only list + "Leave Collection" for a collaborator, both
 * in one screen (see that modal's own doc). "Add Experience" (same
 * menu) opens MODAL_ROUTES.collectionAddExperience, the Collection-first
 * counterpart to the Profile grid's Experience-first Add-to-Collection
 * flow — requirement #6. If the signed-in user has a pending invitation
 * to THIS Collection, an inline banner above the Experience list offers
 * Accept/Decline right where they landed, without a separate
 * Notifications surface (requirement #9 defers building one).
 *
 * ── Reorder without a drag library ──
 * requirement #7's "Rearrange Experiences" is Move Up / Move Down on a
 * long-pressed card rather than drag-and-drop — no drag-and-drop library
 * is a dependency of this project yet ((modals)/_layout.tsx's own doc
 * makes the same call for a bottom-sheet library: a real dependency
 * decision shouldn't be introduced silently inside an unrelated sprint).
 * Move Up/Down is also more accessible by construction — no gesture a
 * screen reader has to simulate.
 */

import React, { useCallback, useState } from 'react';
import { View, FlatList, Pressable, Alert, RefreshControl, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, MoreVertical, WifiOff, AlertCircle, SearchX, Images } from 'lucide-react-native';

import { theme } from '@/theme';
import { EmptyState, ScreenContainer, OfflineBanner, Spinner, Caption, Body, Chip, Button } from '@/components/ui';
import { ExperienceCard, ExperienceFeedSkeleton } from '@/components/discover';
import { CollectionDetailHeader, type CollectionEditDraft } from '@/components/collections';
import { useAuthState } from '@/hooks/useAuth';
import { useNetworkStatus } from '@/hooks';
import {
  useCollectionDetailPage,
  useUpdateCollection,
  useDeleteCollection,
  useUploadCollectionCover,
  useRemoveCollectionCover,
  useRemoveExperienceFromCollection,
  useReorderCollectionExperiences,
  pickCollectionCoverAsset,
} from '@/hooks/useCollections';
import { useMyPendingInvitations, useAcceptInvitation, useDeclineInvitation } from '@/hooks/useCollaboration';
import { MODAL_ROUTES } from '@/constants/routes';
import type { ExperienceCardModel } from '@/types/experience';

function BackButton() {
  return (
    <Pressable
      onPress={() => router.back()}
      style={styles.backButton}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel="Go back"
    >
      <View style={styles.backButtonScrim} />
      <ArrowLeft size={20} color={theme.colors.static.white} />
    </Pressable>
  );
}

export default function CollectionDetailScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const id = rawId ?? '';

  const { user } = useAuthState();
  const network = useNetworkStatus();
  const isOffline = !network.isConnected || network.isInternetReachable === false;

  const { collection, experiences, refresh, isRefreshing } = useCollectionDetailPage(id);
  const isOwner = !!user && !!collection.collection && collection.collection.owner.id === user.id;
  const isCollaborator =
    !!user && !!collection.collection && collection.collection.collaborators.some((c) => c.id === user.id);
  const canManage = isOwner || isCollaborator;

  const { invitations: myInvitations } = useMyPendingInvitations(user?.id);
  const pendingInvitation = myInvitations.find((invitation) => invitation.collectionId === id);
  const acceptInvitation = useAcceptInvitation();
  const declineInvitation = useDeclineInvitation();

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<CollectionEditDraft>({ title: '', description: '' });
  const [isPickingCover, setIsPickingCover] = useState(false);

  const updateCollection = useUpdateCollection(id);
  const deleteCollection = useDeleteCollection();
  const uploadCover = useUploadCollectionCover(id);
  const removeCover = useRemoveCollectionCover(id);
  const removeExperience = useRemoveExperienceFromCollection();
  const reorderExperiences = useReorderCollectionExperiences(id);

  const beginEditing = useCallback(() => {
    if (!collection.collection) return;
    setDraft({ title: collection.collection.title, description: collection.collection.description ?? '' });
    setIsEditing(true);
  }, [collection.collection]);

  const cancelEditing = useCallback(() => setIsEditing(false), []);

  const saveEditing = useCallback(async () => {
    if (!draft.title.trim()) {
      Alert.alert('Title is required', 'Give this collection a title before saving.');
      return;
    }
    try {
      await updateCollection.mutateAsync({
        title: draft.title,
        description: draft.description.trim() || null,
      });
      setIsEditing(false);
    } catch {
      // useUpdateCollection's onError already surfaced a toast — stay in edit mode so the user can retry.
    }
  }, [draft, updateCollection]);

  const handleChangeCover = useCallback(async () => {
    setIsPickingCover(true);
    try {
      const asset = await pickCollectionCoverAsset();
      if (asset) await uploadCover.mutateAsync(asset);
    } catch {
      // useUploadCollectionCover's onError already surfaced a toast.
    } finally {
      setIsPickingCover(false);
    }
  }, [uploadCover]);

  const handleRemoveCover = useCallback(() => {
    if (!collection.collection) return;
    removeCover.mutate({ currentCoverUrl: collection.collection.coverImage?.url ?? null });
  }, [collection.collection, removeCover]);

  const handleDelete = useCallback(() => {
    if (!collection.collection) return;
    const current = collection.collection;
    Alert.alert(
      'Delete this collection?',
      "This can't be undone. The experiences inside it will not be deleted.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteCollection.mutate(
              { id: current.id, coverImageUrl: current.coverImage?.url ?? null, coverType: current.coverType },
              { onSuccess: () => router.back() },
            );
          },
        },
      ],
    );
  }, [collection.collection, deleteCollection]);

  const handleManagePress = useCallback(() => {
    if (!collection.collection) return;
    const current = collection.collection;

    const options: Parameters<typeof Alert.alert>[2] = [
      { text: 'Add Experience', onPress: () => router.push(MODAL_ROUTES.collectionAddExperience(current.id) as never) },
      { text: 'Rename & Edit Description', onPress: beginEditing },
      { text: current.coverType === 'custom' ? 'Replace Cover' : 'Add Custom Cover', onPress: handleChangeCover },
    ];

    if (current.coverType === 'custom') {
      options.push({ text: 'Remove Custom Cover', onPress: handleRemoveCover });
    }

    options.push({
      text: 'Manage Collaborators',
      onPress: () => router.push(MODAL_ROUTES.collectionCollaborators(current.id) as never),
    });

    if (isOwner) {
      options.push({ text: 'Delete Collection', style: 'destructive', onPress: handleDelete });
    }

    options.push({ text: 'Cancel', style: 'cancel' });

    Alert.alert('Manage Collection', undefined, options);
  }, [collection.collection, isOwner, beginEditing, handleChangeCover, handleRemoveCover, handleDelete]);

  const handleMoveExperience = useCallback(
    (experienceId: string, direction: 'up' | 'down') => {
      const currentOrder = experiences.experiences.map((e) => e.id);
      const index = currentOrder.indexOf(experienceId);
      const swapIndex = direction === 'up' ? index - 1 : index + 1;
      if (index === -1 || swapIndex < 0 || swapIndex >= currentOrder.length) return;

      const reordered = [...currentOrder];
      [reordered[index], reordered[swapIndex]] = [reordered[swapIndex]!, reordered[index]!];
      reorderExperiences.mutate(reordered);
    },
    [experiences.experiences, reorderExperiences],
  );

  const canRemoveExperience = useCallback(
    (experience: ExperienceCardModel) => isOwner || (!!user && experience.creator.id === user.id),
    [isOwner, user],
  );

  const handleLongPressExperience = useCallback(
    (experience: ExperienceCardModel) => {
      if (!canManage) return;
      const index = experiences.experiences.findIndex((e) => e.id === experience.id);

      const options: Parameters<typeof Alert.alert>[2] = [];
      if (index > 0) options.push({ text: 'Move Up', onPress: () => handleMoveExperience(experience.id, 'up') });
      if (index < experiences.experiences.length - 1) {
        options.push({ text: 'Move Down', onPress: () => handleMoveExperience(experience.id, 'down') });
      }
      if (canRemoveExperience(experience)) {
        options.push({
          text: 'Remove from Collection',
          style: 'destructive',
          onPress: () => {
            if (!collection.collection) return;
            removeExperience.mutate({ collectionId: collection.collection.id, experienceId: experience.id });
          },
        });
      }
      options.push({ text: 'Cancel', style: 'cancel' });

      Alert.alert(experience.title, undefined, options);
    },
    [canManage, canRemoveExperience, experiences.experiences, handleMoveExperience, collection.collection, removeExperience],
  );

  const handleEndReached = useCallback(() => {
    if (experiences.hasNextPage && !experiences.isFetchingNextPage && !experiences.isError) {
      experiences.fetchNextPage();
    }
  }, [experiences.hasNextPage, experiences.isFetchingNextPage, experiences.isError, experiences.fetchNextPage]);

  const renderItem = useCallback(
    ({ item }: { item: ExperienceCardModel }) => (
      <Pressable
        style={styles.cardWrapper}
        onLongPress={canManage ? () => handleLongPressExperience(item) : undefined}
        delayLongPress={350}
      >
        <ExperienceCard experience={item} source="collection_detail" />
      </Pressable>
    ),
    [canManage, handleLongPressExperience],
  );

  const keyExtractor = useCallback((item: ExperienceCardModel) => item.id, []);

  // ── Initial loading ──────────────────────────────────────────────────────
  if (collection.isLoading) {
    return (
      <ScreenContainer scroll={false} padded={false}>
        <OfflineBanner />
        <View style={styles.coverSkeleton} />
        <BackButton />
      </ScreenContainer>
    );
  }

  // ── Empty/error states ───────────────────────────────────────────────────
  if (!collection.collection) {
    let emptyState: React.ReactNode;

    if (isOffline) {
      emptyState = (
        <EmptyState
          icon={WifiOff}
          title="You're offline"
          description="Connect to the internet to view this collection."
          action={{ label: 'Try Again', onPress: collection.refetch }}
        />
      );
    } else if (collection.error?.code === 'NOT_FOUND') {
      emptyState = (
        <EmptyState icon={SearchX} title="Collection unavailable" description="This collection may have been removed." />
      );
    } else {
      emptyState = (
        <EmptyState
          icon={AlertCircle}
          title="We couldn't load this collection"
          description={collection.error?.userMessage ?? 'Something went wrong. Please try again.'}
          action={{ label: 'Try Again', onPress: collection.refetch }}
        />
      );
    }

    return (
      <ScreenContainer scroll={false} padded={false}>
        <OfflineBanner />
        <View style={styles.emptyBody}>{emptyState}</View>
        <BackButton />
      </ScreenContainer>
    );
  }

  const collectionModel = collection.collection;

  const listHeader = (
    <View>
      <CollectionDetailHeader
        collection={collectionModel}
        editing={isEditing ? { draft, onChangeDraft: setDraft } : undefined}
      />

      {pendingInvitation ? (
        <View style={styles.invitationBanner}>
          <Body>{pendingInvitation.invitedBy.displayName} invited you to collaborate on this collection.</Body>
          <View style={styles.invitationActions}>
            <Button
              label="Decline"
              variant="secondary"
              size="sm"
              onPress={() => declineInvitation.mutate({ collaboratorId: pendingInvitation.id, collectionId: id })}
              disabled={acceptInvitation.isPending || declineInvitation.isPending}
            />
            <Button
              label="Accept"
              size="sm"
              onPress={() => acceptInvitation.mutate({ collaboratorId: pendingInvitation.id, collectionId: id })}
              loading={acceptInvitation.isPending}
              disabled={declineInvitation.isPending}
            />
          </View>
        </View>
      ) : null}

      {isEditing ? (
        <View style={styles.editActions}>
          <Button label="Cancel" variant="secondary" onPress={cancelEditing} disabled={updateCollection.isPending} />
          <Button label="Save" onPress={saveEditing} loading={updateCollection.isPending} />
        </View>
      ) : null}

      {isPickingCover || uploadCover.isPending || removeCover.isPending ? (
        <View style={styles.coverBusyRow}>
          <Spinner size="small" />
          <Caption color={theme.colors.text.tertiary}>Updating cover…</Caption>
        </View>
      ) : null}
    </View>
  );

  const listEmpty = (() => {
    if (experiences.isLoading) {
      return <ExperienceFeedSkeleton count={2} />;
    }
    if (experiences.isError) {
      return (
        <View style={styles.emptyExperiences}>
          <EmptyState
            icon={AlertCircle}
            title="Couldn't load experiences"
            description={experiences.error?.userMessage ?? 'Something went wrong. Please try again.'}
            action={{ label: 'Try Again', onPress: experiences.refetch }}
          />
        </View>
      );
    }
    return (
      <View style={styles.emptyExperiences}>
        <EmptyState
          icon={Images}
          title="No experiences yet"
          description={
            canManage
              ? 'Add your own experiences to this collection from your profile.'
              : `${collectionModel.owner.displayName} hasn't added any experiences yet.`
          }
        />
      </View>
    );
  })();

  const paginationFooter = (() => {
    if (experiences.experiences.length === 0) return null;

    if (experiences.isFetchingNextPage) {
      return (
        <View style={styles.footer}>
          <Spinner accessibilityLabel="Loading more experiences" />
        </View>
      );
    }

    if (experiences.isError) {
      return (
        <View style={[styles.footer, styles.inlineError]}>
          <Caption color={theme.colors.text.tertiary}>Couldn&apos;t load more experiences.</Caption>
          <Chip label="Retry" onPress={experiences.fetchNextPage} style={styles.inlineRetryChip} />
        </View>
      );
    }

    if (!experiences.hasNextPage) {
      return (
        <View style={styles.footer}>
          <Caption color={theme.colors.text.tertiary}>You&apos;ve reached the end 👣</Caption>
        </View>
      );
    }

    return null;
  })();

  return (
    <ScreenContainer scroll={false} padded={false}>
      <OfflineBanner />
      <FlatList
        data={experiences.experiences}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        ListFooterComponent={paginationFooter}
        contentContainerStyle={styles.listContent}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
        windowSize={7}
        maxToRenderPerBatch={6}
        updateCellsBatchingPeriod={50}
        initialNumToRender={6}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              void refresh();
            }}
            tintColor={theme.colors.brand.primary}
            accessibilityLabel="Pull to refresh this collection"
          />
        }
        accessibilityLabel={`${collectionModel.title} details`}
      />
      <BackButton />
      {canManage && !isEditing ? (
        <Pressable
          onPress={handleManagePress}
          style={styles.manageButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Manage collection"
        >
          <View style={styles.backButtonScrim} />
          <MoreVertical size={20} color={theme.colors.static.white} />
        </Pressable>
      ) : null}
    </ScreenContainer>
  );
}

const BUTTON_DIAMETER = 40;

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: theme.spacing['4xl'],
  },
  cardWrapper: {
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    marginTop: theme.spacing.md,
  },
  emptyExperiences: {
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    minHeight: 240,
    justifyContent: 'center',
  },
  footer: {
    paddingVertical: theme.spacing.xl,
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  inlineError: {
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    alignItems: 'flex-start',
    gap: theme.spacing.xs,
  },
  inlineRetryChip: {
    marginTop: 0,
  },
  emptyBody: {
    flex: 1,
    justifyContent: 'center',
  },
  coverSkeleton: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: theme.colors.neutral.backgroundSecondary,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    marginTop: theme.spacing.sm,
  },
  invitationBanner: {
    marginHorizontal: theme.layout.screenPaddingHorizontal,
    marginTop: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.neutral.backgroundSecondary,
    gap: theme.spacing.sm,
  },
  invitationActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
  },
  coverBusyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    marginTop: theme.spacing.sm,
  },
  backButton: {
    position: 'absolute',
    top: theme.spacing.md,
    left: theme.spacing.md,
    width: BUTTON_DIAMETER,
    height: BUTTON_DIAMETER,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  manageButton: {
    position: 'absolute',
    top: theme.spacing.md,
    right: theme.spacing.md,
    width: BUTTON_DIAMETER,
    height: BUTTON_DIAMETER,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  backButtonScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.static.black,
    opacity: theme.opacity.heavy,
  },
});
