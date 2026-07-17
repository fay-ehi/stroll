/**
 * Stroll — Create Collection
 * app/(modals)/create-collection.tsx
 *
 * Sprint 5 — Prompt 1, requirement #3. Full-screen modal (Design System
 * §40 — creation flows read as full-screen modals, not bottom sheets;
 * see (modals)/_layout.tsx's doc). Collects Title (required),
 * Description (optional), and an optional custom cover — "Support:
 * Image picker, Preview before saving, Replace selected image, Remove
 * selected image before saving" is exactly what CollectionCoverField
 * (src/components/collections) renders; the actual picking happens here
 * via pickCollectionCoverAsset (useCollections.ts) so the picked image
 * stays in local state until Create is tapped — the Collection doesn't
 * exist yet, so there's nothing to upload a cover *to* until
 * useCreateCollection creates the row first.
 *
 * "After successful creation: Navigate directly into the Collection
 * Detail page" — holds whether this screen was opened bare
 * (MODAL_ROUTES.createCollection) or with a `forExperienceId` param
 * (MODAL_ROUTES.createCollectionForExperience, from the Add-to-
 * Collection modal's "+ New Collection" entry, requirement #4): either
 * way, a successful create ends on Collection Detail, with the
 * Experience already added in the `forExperienceId` case.
 */

import React, { useCallback, useState } from 'react';
import { View, Pressable, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { X } from 'lucide-react-native';

import { theme } from '@/theme';
import { ScreenContainer, H4, TextInput, Button, Icon } from '@/components/ui';
import { CollectionCoverField } from '@/components/collections';
import { useCreateCollection, useAddExperienceToCollection, pickCollectionCoverAsset } from '@/hooks/useCollections';
import { COLLECTION_LIMITS } from '@/constants/app';
import { ROUTES } from '@/constants/routes';

export default function CreateCollectionModal() {
  const { forExperienceId } = useLocalSearchParams<{ forExperienceId?: string }>();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [cover, setCover] = useState<{ uri: string; mimeType: string } | null>(null);
  const [isPickingCover, setIsPickingCover] = useState(false);

  const createCollection = useCreateCollection();
  const addExperience = useAddExperienceToCollection();

  const trimmedTitle = title.trim();
  const isSubmitting = createCollection.isPending || addExperience.isPending;
  const canSubmit = trimmedTitle.length > 0 && !isSubmitting;

  const handlePickCover = useCallback(async () => {
    setIsPickingCover(true);
    try {
      const asset = await pickCollectionCoverAsset();
      if (asset) setCover(asset);
    } finally {
      setIsPickingCover(false);
    }
  }, []);

  const handleRemoveCover = useCallback(() => setCover(null), []);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;

    try {
      const collection = await createCollection.mutateAsync({
        title: trimmedTitle,
        description: description.trim() || null,
        cover,
      });

      if (forExperienceId) {
        // Best-effort — a failure here still leaves the Collection
        // created (useAddExperienceToCollection surfaces its own error
        // toast), so the user isn't blocked from reaching Collection
        // Detail and adding the Experience manually if this add fails.
        await addExperience.mutateAsync({ collectionId: collection.id, experienceId: forExperienceId }).catch(() => {});
      }

      router.replace(ROUTES.app.collectionDetail(collection.id) as never);
    } catch {
      // useCreateCollection already surfaced a toast — stay on this screen so the user can retry.
    }
  }, [canSubmit, createCollection, addExperience, trimmedTitle, description, cover, forExperienceId]);

  return (
    <ScreenContainer scroll={false} padded={false}>
      <View style={styles.header}>
        <H4>New Collection</H4>
        <Pressable
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Close"
          disabled={isSubmitting}
        >
          <Icon icon={X} size="md" color={theme.colors.text.primary} />
        </Pressable>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.form}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <CollectionCoverField
            uri={cover?.uri ?? null}
            onPick={handlePickCover}
            onRemove={handleRemoveCover}
            disabled={isPickingCover || isSubmitting}
          />

          <TextInput
            label="Title"
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Lagos Rooftop Bars"
            maxLength={COLLECTION_LIMITS.MAX_TITLE_LENGTH}
            helperText={`${title.length}/${COLLECTION_LIMITS.MAX_TITLE_LENGTH}`}
            editable={!isSubmitting}
          />

          <TextInput
            label="Description"
            value={description}
            onChangeText={setDescription}
            placeholder="What ties these experiences together? (optional)"
            multiline
            maxLength={COLLECTION_LIMITS.MAX_DESCRIPTION_LENGTH}
            helperText={`${description.length}/${COLLECTION_LIMITS.MAX_DESCRIPTION_LENGTH}`}
            editable={!isSubmitting}
            containerStyle={styles.descriptionInput}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <Button label="Create Collection" onPress={handleSubmit} disabled={!canSubmit} loading={isSubmitting} fullWidth />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    paddingVertical: theme.spacing.md,
  },
  form: {
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.lg,
  },
  descriptionInput: {
    minHeight: 88,
  },
  footer: {
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
    borderTopWidth: theme.borders.width,
    borderTopColor: theme.colors.neutral.border,
  },
});
