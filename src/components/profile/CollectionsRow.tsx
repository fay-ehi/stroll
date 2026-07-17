/**
 * Stroll — Collections Row
 * src/components/profile/CollectionsRow.tsx
 *
 * Sprint 5 — Prompt 1, requirement #8 (Profile Integration): "Collections
 * appear directly beneath the profile information, above the Experience
 * grid... displayed as a horizontally scrollable row" of compact pills.
 *
 * Three states:
 *   - Loading  — a row of pill-shaped skeletons.
 *   - Empty, viewing own profile — nothing but the "+ New Collection"
 *     pill (an empty state here doesn't need EmptyState's full
 *     icon/title/description treatment; a single actionable pill IS the
 *     empty state, the same "let the entry point double as the empty
 *     state" choice DraftsTile.tsx makes by simply not rendering when
 *     there's nothing to show).
 *   - Empty, viewing someone else's profile — renders nothing at all
 *     (no pill row, no placeholder) rather than an empty state a visitor
 *     can't act on.
 *
 * "+ New Collection" only ever appears for the profile owner —
 * requirement #8's "If the owner is viewing their own profile,
 * Collection management is available only after opening the Collection"
 * is about *managing existing* Collections, not creating new ones;
 * showing a create entry point directly in this row (rather than
 * burying it inside a Collection Detail screen that wouldn't exist yet)
 * is this component's own reasonable reading of "Users can create
 * Collections" (requirement's Acceptance Criteria) needing *some*
 * reachable entry point on Profile.
 *
 * Sprint 5 Prompt 2 addition: when `invitationCount` is positive (and
 * only on your own profile — nobody else needs to see your pending
 * invites), a leading "invite" pill opens
 * MODAL_ROUTES.collectionInvitations. This is the entire entry point
 * this sprint builds for responding to a collaboration invite outside
 * of landing directly on that Collection's own page.
 */

import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { theme } from '@/theme';
import { Skeleton } from '@/components/ui';
import { CollectionPill } from './CollectionPill';
import type { CollectionModel } from '@/types/collection';

export interface CollectionsRowProps {
  collections: CollectionModel[];
  isLoading: boolean;
  /** Whether the signed-in user is viewing their own profile — gates the "+ New Collection" pill, the invitations pill, and the empty state. */
  isOwnProfile: boolean;
  onSelectCollection: (collection: CollectionModel) => void;
  onCreateCollection: () => void;
  /** Sprint 5 Prompt 2 — count of the signed-in user's own pending Collection invitations. Omit or pass 0 to hide the pill entirely. */
  invitationCount?: number;
  onOpenInvitations?: () => void;
}

export function CollectionsRow({
  collections,
  isLoading,
  isOwnProfile,
  onSelectCollection,
  onCreateCollection,
  invitationCount = 0,
  onOpenInvitations,
}: CollectionsRowProps) {
  if (isLoading) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} width={96} height={36} borderRadius={theme.radius.full} />
        ))}
      </ScrollView>
    );
  }

  const showInvitationsPill = isOwnProfile && invitationCount > 0 && !!onOpenInvitations;

  if (collections.length === 0 && !isOwnProfile) {
    return null;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      accessibilityRole="list"
    >
      {showInvitationsPill ? (
        <CollectionPill
          label={invitationCount === 1 ? '1 Invitation' : `${invitationCount} Invitations`}
          variant="invite"
          onPress={onOpenInvitations!}
        />
      ) : null}

      {isOwnProfile ? <CollectionPill label="New Collection" variant="create" onPress={onCreateCollection} /> : null}

      {collections.map((collection) => (
        <CollectionPill key={collection.id} label={collection.title} onPress={() => onSelectCollection(collection)} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    gap: theme.spacing.sm,
  },
});
