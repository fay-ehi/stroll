/**
 * Stroll — Add to Collection
 * app/(modals)/add-to-collection.tsx
 *
 * Sprint 5 — Prompt 1, requirement #4. Opened via
 * MODAL_ROUTES.addToCollection(experienceId) — currently only from
 * ExperienceGridTile's long-press action sheet on the Profile grid (see
 * that component's doc for why that's the one entry point this prompt
 * wires up, and why it already guarantees the Experience belongs to the
 * signed-in user without a runtime check here).
 *
 * ── Instant toggle, not checkbox-then-Confirm ──
 * Tapping a row immediately adds or removes the Experience — there's no
 * separate "Confirm"/"Save" step. This is a deliberate reading of
 * "Multi-select Collections" (requirement #4): each row already reflects
 * current membership (via useCollectionsContainingExperience) before any
 * tap, so toggling a row is unambiguous with or without a batch-confirm
 * step, and instant application means a partial-failure (e.g. one
 * network call among several fails) never leaves the user unsure which
 * of their taps "took" — each one resolves (success or a specific error
 * toast) before they can move on to the next.
 *
 * ── Duplicate prevention ──
 * Rows start pre-checked from useCollectionsContainingExperience, so a
 * user can't even attempt to re-add through this UI; the unique
 * constraint on collection_items (see the migration SQL) is the backstop
 * for any race.
 */

import React, { useCallback, useState } from 'react';
import { View, Pressable, FlatList, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { X, Plus, FolderPlus } from 'lucide-react-native';

import { theme } from '@/theme';
import { ScreenContainer, H4, Body, Icon, Spinner, EmptyState } from '@/components/ui';
import { CollectionSelectRow } from '@/components/collections';
import { useAuthState } from '@/hooks/useAuth';
import {
  useMyCollections,
  useCollectionsContainingExperience,
  useAddExperienceToCollection,
  useRemoveExperienceFromCollection,
} from '@/hooks/useCollections';
import { MODAL_ROUTES } from '@/constants/routes';
import type { CollectionModel } from '@/types/collection';

export default function AddToCollectionModal() {
  const { experienceId } = useLocalSearchParams<{ experienceId: string }>();
  const { user } = useAuthState();
  const userId = user?.id;

  const { collections, isLoading: isLoadingCollections } = useMyCollections(userId);
  const { collectionIds: selectedIds, isLoading: isLoadingMembership } = useCollectionsContainingExperience(
    userId,
    experienceId,
  );

  const addExperience = useAddExperienceToCollection();
  const removeExperience = useRemoveExperienceFromCollection();
  const [pendingCollectionId, setPendingCollectionId] = useState<string | null>(null);

  const handleToggle = useCallback(
    (collection: CollectionModel) => {
      if (!experienceId) return;

      const isSelected = selectedIds.has(collection.id);
      const mutation = isSelected ? removeExperience : addExperience;

      setPendingCollectionId(collection.id);
      mutation.mutate(
        { collectionId: collection.id, experienceId },
        { onSettled: () => setPendingCollectionId(null) },
      );
    },
    [experienceId, selectedIds, addExperience, removeExperience],
  );

  const handleCreateNew = useCallback(() => {
    if (!experienceId) return;
    router.push(MODAL_ROUTES.createCollectionForExperience(experienceId) as never);
  }, [experienceId]);

  const isLoading = isLoadingCollections || isLoadingMembership;

  return (
    <ScreenContainer scroll={false} padded={false}>
      <View style={styles.header}>
        <H4>Add to Collection</H4>
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
          <Spinner accessibilityLabel="Loading collections" />
        </View>
      ) : collections.length === 0 ? (
        <View style={styles.centered}>
          <EmptyState
            icon={FolderPlus}
            title="No collections yet"
            description="Create your first collection to start organizing your experiences."
            action={{ label: 'Create Collection', onPress: handleCreateNew }}
          />
        </View>
      ) : (
        <FlatList
          data={collections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <Pressable
              onPress={handleCreateNew}
              style={styles.createRow}
              accessibilityRole="button"
              accessibilityLabel="Create a new collection"
            >
              <View style={styles.createIcon}>
                <Icon icon={Plus} size="md" color={theme.colors.brand.primary} />
              </View>
              <Body color={theme.colors.brand.primary}>New Collection</Body>
            </Pressable>
          }
          renderItem={({ item }) => (
            <CollectionSelectRow
              collection={item}
              isSelected={selectedIds.has(item.id)}
              isPending={pendingCollectionId === item.id}
              onToggle={() => handleToggle(item)}
            />
          )}
        />
      )}
    </ScreenContainer>
  );
}

const CREATE_ICON_DIAMETER = 44;

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
  },
  list: {
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    paddingBottom: theme.spacing.lg,
  },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
    borderBottomWidth: theme.borders.width,
    borderBottomColor: theme.colors.neutral.border,
  },
  createIcon: {
    width: CREATE_ICON_DIAMETER,
    height: CREATE_ICON_DIAMETER,
    borderRadius: theme.radius.full,
    borderWidth: theme.borders.width,
    borderColor: theme.colors.brand.primary,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
