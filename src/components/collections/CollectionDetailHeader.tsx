/**
 * Stroll — Collection Detail Header
 * src/components/collections/CollectionDetailHeader.tsx
 *
 * Sprint 5 — Prompt 1, requirement #6 (Collection Detail Screen):
 * "Display: Cover image (custom or generated), Collection title,
 * Description, Creator information, Experience count." Renders inside
 * app/(app)/collections/[id].tsx's ListHeaderComponent, the same
 * FlatList-header composition PlaceDetailInfo.tsx uses on Place Detail.
 *
 * Cover fills the full screen width at a 4:3 aspect ratio (taller than a
 * card's cover crop — this is the hero, not a list item) via expo-image
 * with cachePolicy="memory-disk", matching CollectionCard.tsx's own
 * image treatment. Falls back to a plain tinted placeholder (no cover
 * yet — a brand-new Collection with no Experiences has neither a custom
 * nor a generatable cover) rather than a broken image request.
 *
 * Sprint 5 Prompt 2 addition: the owner meta row branches on
 * `collection.isCollaborative` — a collaborative Collection renders
 * ContributorsLine.tsx's "Created by Alice & Bob" line instead of the
 * original single-owner "Curated by X" Caption below.
 *
 * Sprint 5 Prompt 3, requirement #4 (Collection Detail Improvements):
 * an optional "Updated <time ago>" Caption renders beneath the
 * owner/contributors row whenever `updatedAt` has actually diverged
 * from `createdAt` — see `showLastUpdated` below.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Images } from 'lucide-react-native';

import { theme } from '@/theme';
import { H2, Body, Caption, Avatar, Icon, TextInput } from '@/components/ui';
import { ContributorsLine } from './ContributorsLine';
import { COLLECTION_LIMITS } from '@/constants/app';
import { timeAgo } from '@/utils';
import type { CollectionModel } from '@/types/collection';

export interface CollectionEditDraft {
  title: string;
  description: string;
}

export interface CollectionDetailHeaderProps {
  collection: CollectionModel;
  /**
   * Sprint 5 Prompt 1 requirement #7 (Rename Collection / Edit
   * description). When present, swaps the title/description Text for
   * TextInput fields in place — same "toggle a form in place of the
   * read view" shape app/(app)/(tabs)/profile.tsx's own isEditing state
   * uses for bio/display name, rather than a separate edit screen for
   * what's just two fields.
   */
  editing?: {
    draft: CollectionEditDraft;
    onChangeDraft: (draft: CollectionEditDraft) => void;
  };
}

export function CollectionDetailHeader({ collection, editing }: CollectionDetailHeaderProps) {
  const experienceCountLabel =
    collection.experienceCount === 1 ? '1 experience' : `${collection.experienceCount} experiences`;

  // Sprint 5 Prompt 3, requirement #4 ("Last updated date (optional)").
  // Only shown once the Collection has actually been touched since
  // creation — a brand-new Collection's created_at/updated_at are set
  // in the same insert, so an identical timestamp means "nothing to
  // report yet" rather than "just updated." Reuses timeAgo() from
  // utils/index.ts, the same relative-time formatter
  // app/(modals)/drafts.tsx already uses for "Edited {timeAgo(...)}".
  const showLastUpdated = collection.updatedAt !== collection.createdAt;

  return (
    <View>
      <View style={styles.coverWrapper}>
        {collection.coverImage ? (
          <Image
            source={{ uri: collection.coverImage.url }}
            style={styles.cover}
            contentFit="cover"
            cachePolicy="memory-disk"
            accessibilityLabel={`Cover photo for ${collection.title}`}
          />
        ) : (
          <View style={[styles.cover, styles.coverPlaceholder]}>
            <Icon icon={Images} size="xl" color={theme.colors.text.tertiary} />
          </View>
        )}
      </View>

      <View style={styles.body}>
        {editing ? (
          <>
            <TextInput
              label="Title"
              value={editing.draft.title}
              onChangeText={(title) => editing.onChangeDraft({ ...editing.draft, title })}
              maxLength={COLLECTION_LIMITS.MAX_TITLE_LENGTH}
              helperText={`${editing.draft.title.length}/${COLLECTION_LIMITS.MAX_TITLE_LENGTH}`}
            />
            <TextInput
              label="Description"
              value={editing.draft.description}
              onChangeText={(description) => editing.onChangeDraft({ ...editing.draft, description })}
              multiline
              maxLength={COLLECTION_LIMITS.MAX_DESCRIPTION_LENGTH}
              helperText={`${editing.draft.description.length}/${COLLECTION_LIMITS.MAX_DESCRIPTION_LENGTH}`}
              containerStyle={styles.editDescriptionInput}
            />
          </>
        ) : (
          <>
            <H2>{collection.title}</H2>
            {collection.description ? (
              <Body color={theme.colors.text.secondary} style={styles.description}>
                {collection.description}
              </Body>
            ) : null}
          </>
        )}

        {collection.isCollaborative ? (
          <View style={styles.metaRow}>
            <ContributorsLine
              owner={collection.owner}
              collaborators={collection.collaborators}
              experienceCountLabel={experienceCountLabel}
            />
          </View>
        ) : (
          <View style={styles.metaRow}>
            <Avatar
              source={collection.owner.avatarUrl ? { uri: collection.owner.avatarUrl } : undefined}
              name={collection.owner.displayName}
              size="sm"
            />
            <Caption color={theme.colors.text.secondary}>
              Curated by {collection.owner.displayName} · {experienceCountLabel}
            </Caption>
          </View>
        )}

        {showLastUpdated ? (
          <Caption color={theme.colors.text.tertiary}>Updated {timeAgo(collection.updatedAt)}</Caption>
        ) : null}
      </View>
    </View>
  );
}

const COVER_ASPECT_RATIO = 4 / 3;

const styles = StyleSheet.create({
  coverWrapper: {
    width: '100%',
    aspectRatio: COVER_ASPECT_RATIO,
    backgroundColor: theme.colors.neutral.backgroundSecondary,
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    paddingTop: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  description: {
    marginTop: theme.spacing.xxs,
  },
  editDescriptionInput: {
    minHeight: 72,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
});
