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
 * own (no tab, no header button anywhere else links here). That's the
 * distinction from the explicitly-forbidden separate "My Experiences"
 * screen: this is reached the same way Comments or Place Search are.
 *
 * ── One draft, not a list ──
 * See useExperienceDrafts.ts's module doc for the full reasoning. This
 * screen is written to degrade correctly across the two states that
 * therefore exist — an empty state, and a single draft card — rather
 * than a FlatList expecting to one day render more.
 */

import React, { useCallback } from 'react';
import { View, Pressable, StyleSheet, Alert } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { X, FileEdit, Trash2 } from 'lucide-react-native';

import { theme } from '@/theme';
import { ScreenContainer, H4, Body, Caption, Card, Button, Icon, Spinner, EmptyState } from '@/components/ui';
import { useAuthState } from '@/hooks/useAuth';
import { useDraftQuery, useDeleteDraftMutation } from '@/hooks/useExperienceDrafts';
import { MODAL_ROUTES } from '@/constants/routes';
import { timeAgo } from '@/utils';

export default function DraftsModal() {
  const { user } = useAuthState();
  const userId = user?.id;

  const { draft, isLoading } = useDraftQuery(userId);
  const { deleteDraft, isDeleting } = useDeleteDraftMutation(userId);

  const handleResume = useCallback(() => {
    // Swap this modal for the creation wizard rather than stacking a
    // second modal on top — mirrors create-experience.tsx's own
    // back-then-push shape for a "leave this screen for that one" move.
    router.back();
    router.push(MODAL_ROUTES.createExperience as never);
  }, []);

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete this draft?',
      "This can't be undone. Any photos you've added will be removed too.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => { void deleteDraft(); },
        },
      ],
    );
  }, [deleteDraft]);

  const previewPhoto = draft?.photos[0]?.localUri ?? null;
  const captionPreview = draft?.story.trim() || null;

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
      ) : !draft ? (
        <View style={styles.centered}>
          <EmptyState
            icon={FileEdit}
            title="No drafts yet"
            description="Experiences you start but don't publish will appear here."
          />
        </View>
      ) : (
        <View style={styles.content}>
          <Card variant="outlined" padding={0} style={styles.draftCard}>
            <View style={styles.draftRow}>
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

              <Pressable
                onPress={handleDelete}
                disabled={isDeleting}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Delete draft"
                style={styles.deleteButton}
              >
                <Icon icon={Trash2} size="sm" color={theme.colors.semantic.error} />
              </Pressable>
            </View>
          </Card>

          <Button
            label="Resume Draft"
            variant="primary"
            fullWidth
            loading={isDeleting}
            onPress={handleResume}
            style={styles.resumeButton}
          />
        </View>
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
  content: {
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    paddingTop:         theme.spacing.sm,
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
  resumeButton: {
    marginTop: theme.spacing.lg,
  },
});
