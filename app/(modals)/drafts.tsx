/**
 * Stroll — Drafts
 * app/(modals)/drafts.tsx
 *
 * Sprint 3 Prompt 3 — Draft Management (Profile Integration).
 *
 * Requirement #2 is explicit: "Drafts should NOT appear in a standalone
 * management screen. Instead: Users access drafts by tapping the Drafts
 * tile from the Profile." This route is exactly that access point — a
 * modal (same navigational tier as follows/[userId].tsx, place-search,
 * comments, etc.), reachable only via MODAL_ROUTES.drafts from the
 * Profile screen's DraftsTile, never a persistent nav destination of its
 * own (no tab, no header button anywhere else links here).
 *
 * ── Any number of drafts ──
 * A user can have any number of drafts now (see
 * experienceDraftService.ts's module doc for the storage-layout change
 * behind it) — this screen is a scrollable list of draft cards, each
 * with its own Resume (→ MODAL_ROUTES.resumeDraft, which seeds the
 * wizard from that specific draft) and Delete, plus the same empty
 * state as before when the list is empty.
 */

import React, { useCallback } from 'react';
import { View, Pressable, StyleSheet, Alert, FlatList } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { X, FileEdit, Trash2 } from 'lucide-react-native';

import { theme } from '@/theme';
import { ScreenContainer, H4, Body, Caption, Card, Icon, Spinner, EmptyState } from '@/components/ui';
import { useAuthState } from '@/hooks/useAuth';
import { useDraftsQuery, useDeleteDraftMutation } from '@/hooks/useExperienceDrafts';
import { MODAL_ROUTES } from '@/constants/routes';
import { timeAgo } from '@/utils';
import type { ExperienceDraft } from '@/types/experienceDraft';

export default function DraftsModal() {
  const { user } = useAuthState();
  const userId = user?.id;

  const { drafts, isLoading } = useDraftsQuery(userId);
  const { deleteDraft, deletingDraftId } = useDeleteDraftMutation(userId);

  const handleResume = useCallback((draftId: string) => {
    // A single atomic navigation, not back() immediately followed by
    // push() — dispatching two separate navigation actions in the same
    // tick on the same stack is a known-fragile pattern (the second can
    // race the first's in-flight state update and silently not apply).
    // replace() swaps this modal for the creation wizard in one action —
    // same visual result ("leave Drafts for Create"), but reliable.
    router.replace(MODAL_ROUTES.resumeDraft(draftId) as never);
  }, []);

  const handleDelete = useCallback(
    (draft: ExperienceDraft) => {
      Alert.alert(
        'Delete this draft?',
        "This can't be undone. Any photos you've added will be removed too.",
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => { void deleteDraft(draft.id); },
          },
        ],
      );
    },
    [deleteDraft],
  );

  const renderDraft = useCallback(
    ({ item: draft }: { item: ExperienceDraft }) => {
      const previewPhoto = draft.photos[0]?.localUri ?? null;
      const captionPreview = draft.story.trim() || null;
      const isDeleting = deletingDraftId === draft.id;

      return (
        <Card variant="outlined" padding={0} style={styles.draftCard}>
          <Pressable
            style={styles.draftRow}
            onPress={() => handleResume(draft.id)}
            disabled={isDeleting}
            accessibilityRole="button"
            accessibilityLabel={`Resume draft: ${captionPreview ?? 'Untitled draft'}`}
          >
            {previewPhoto ? (
              <Image
                source={{ uri: previewPhoto }}
                style={styles.draftThumb}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
            ) : (
              <View style={[styles.draftThumb, styles.draftThumbFallback]}>
                <Icon icon={FileEdit} size="md" color={theme.colors.text.tertiary} />
              </View>
            )}

            <View style={styles.draftText}>
              <Body numberOfLines={2}>
                {captionPreview ?? 'Untitled draft'}
              </Body>
              <Caption color={theme.colors.text.tertiary}>
                Edited {timeAgo(draft.updatedAt)}
              </Caption>
            </View>

            {isDeleting ? (
              <Spinner size="small" accessibilityLabel="Deleting draft" />
            ) : (
              <Pressable
                onPress={() => handleDelete(draft)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Delete draft"
                style={styles.deleteButton}
              >
                <Icon icon={Trash2} size="sm" color={theme.colors.semantic.error} />
              </Pressable>
            )}
          </Pressable>
        </Card>
      );
    },
    [deletingDraftId, handleResume, handleDelete],
  );

  return (
    <ScreenContainer scroll={false} padded={false}>
      <View style={styles.header}>
        <H4>Drafts</H4>
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
          <Spinner accessibilityLabel="Loading drafts" />
        </View>
      ) : drafts.length === 0 ? (
        <View style={styles.centered}>
          <EmptyState
            icon={FileEdit}
            title="No drafts yet"
            description="Experiences you start but don't publish will appear here."
          />
        </View>
      ) : (
        <FlatList
          data={drafts}
          keyExtractor={(item) => item.id}
          renderItem={renderDraft}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection:     'row',
    alignItems:         'center',
    justifyContent:     'space-between',
    paddingHorizontal:  theme.layout.screenPaddingHorizontal,
    paddingVertical:    theme.spacing.md,
  },
  centered: {
    flex:            1,
    justifyContent:  'center',
  },
  list: {
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    paddingTop:         theme.spacing.sm,
    paddingBottom:      theme.spacing.lg,
  },
  separator: {
    height: theme.spacing.sm,
  },
  draftCard: {
    overflow: 'hidden',
  },
  draftRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           theme.spacing.sm,
    padding:       theme.spacing.sm,
  },
  draftThumb: {
    width:        56,
    height:       56,
    borderRadius: theme.radius.image,
  },
  draftThumbFallback: {
    alignItems:       'center',
    justifyContent:   'center',
    backgroundColor:  theme.colors.neutral.backgroundSecondary,
  },
  draftText: {
    flex: 1,
    gap:  theme.spacing.xxs,
  },
  deleteButton: {
    padding: theme.spacing.xxs,
  },
});
