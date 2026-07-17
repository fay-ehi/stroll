/**
 * Stroll — Add Experience (Collection-first)
 * app/(modals)/collection-add-experience/[collectionId].tsx
 *
 * Sprint 5 — Prompt 2, requirement #6 (Experience Contributions): "When
 * viewing a collaborative Collection: The 'Add Experiences' workflow
 * should display only the authenticated collaborator's published
 * Experiences. The selector must never include Experiences owned by
 * other collaborators."
 *
 * The Collection-first counterpart to app/(modals)/add-to-collection.tsx
 * (Experience-first — given one Experience, pick a Collection). Here
 * it's the reverse: given this Collection, pick from the SIGNED-IN
 * USER'S OWN published Experiences via useUserGallery(user.id) — the
 * same hook the Profile grid uses for "your own gallery" and, same as
 * that grid, inherently satisfies "never include Experiences owned by
 * other collaborators" by construction (it only ever queries the
 * caller's own rows; there's no parameter that could widen it to anyone
 * else's). Opened from Collection Detail's ••• management menu
 * (MODAL_ROUTES.collectionAddExperience) for both the owner and any
 * accepted collaborator — requirement #4's "Add their own published
 * Experiences" applies to both roles identically.
 *
 * ── "Already in this Collection" filtering — a documented limitation ──
 * Excludes rows already in the Collection using useCollectionExperiences'
 * currently-loaded pages, not a full membership fetch. For a Collection
 * whose Experience list hasn't been fully paged in, a handful of already-
 * added rows could theoretically still appear here — the
 * collection_items unique constraint (collections migration) is the real
 * backstop either way. addExperienceToCollection() surfaces a friendly
 * CONFLICT toast rather than a silent failure if that backstop is what
 * ends up catching it. Same trade-off getCollectionsContainingExperience
 * already accepted for the Experience-first flow's pre-checked state.
 */

import React, { useMemo, useState } from 'react';
import { View, Pressable, FlatList, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { X, Images } from 'lucide-react-native';

import { theme } from '@/theme';
import { ScreenContainer, H4, Body, Icon, Spinner, EmptyState } from '@/components/ui';
import { ExperiencePickRow } from '@/components/collections';
import { useAuthState } from '@/hooks/useAuth';
import { useUserGallery } from '@/hooks/useUserGallery';
import { useCollectionExperiences, useAddExperienceToCollection } from '@/hooks/useCollections';
import type { ExperienceCardModel } from '@/types/experience';

export default function CollectionAddExperienceModal() {
  const { collectionId: rawId } = useLocalSearchParams<{ collectionId: string }>();
  const collectionId = rawId ?? '';

  const { user } = useAuthState();
  const gallery = useUserGallery(user?.id);
  const collectionExperiences = useCollectionExperiences(collectionId);
  const addExperience = useAddExperienceToCollection();

  const [addingId, setAddingId] = useState<string | null>(null);
  const [justAddedIds, setJustAddedIds] = useState<Set<string>>(new Set());

  const existingIds = useMemo(
    () => new Set(collectionExperiences.experiences.map((e) => e.id)),
    [collectionExperiences.experiences],
  );

  const handleAdd = (experienceId: string) => {
    setAddingId(experienceId);
    addExperience.mutate(
      { collectionId, experienceId },
      {
        onSuccess: () => setJustAddedIds((prev) => new Set(prev).add(experienceId)),
        onSettled: () => setAddingId(null),
      },
    );
  };

  const renderItem = ({ item }: { item: ExperienceCardModel }) => (
    <ExperiencePickRow
      experience={item}
      isAdded={existingIds.has(item.id) || justAddedIds.has(item.id)}
      isAdding={addingId === item.id}
      onAdd={() => handleAdd(item.id)}
    />
  );

  return (
    <ScreenContainer scroll={false} padded={false}>
      <View style={styles.header}>
        <H4>Add Experience</H4>
        <Pressable
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Icon icon={X} size="md" color={theme.colors.text.primary} />
        </Pressable>
      </View>

      {gallery.isLoading ? (
        <View style={styles.centered}>
          <Spinner accessibilityLabel="Loading your experiences" />
        </View>
      ) : gallery.experiences.length === 0 ? (
        <View style={styles.centered}>
          <EmptyState
            icon={Images}
            title="No published experiences"
            description="Publish an experience first, then come back to add it here."
          />
        </View>
      ) : (
        <FlatList
          data={gallery.experiences}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          onEndReached={() => {
            if (gallery.hasNextPage && !gallery.isFetchingNextPage) gallery.fetchNextPage();
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            gallery.isFetchingNextPage ? (
              <View style={styles.footer}>
                <Spinner size="small" />
              </View>
            ) : (
              <View style={styles.footerNote}>
                <Body color={theme.colors.text.tertiary}>Only your own published experiences appear here.</Body>
              </View>
            )
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
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
  },
  list: {
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    paddingBottom: theme.spacing.xl,
  },
  footer: {
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
  },
  footerNote: {
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
  },
});
