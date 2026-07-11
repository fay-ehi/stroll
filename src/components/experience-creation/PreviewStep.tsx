/**
 * Stroll — Preview Step (Experience Creation)
 * src/components/experience-creation/PreviewStep.tsx
 *
 * Step 3 of the Photos → Compose → Preview flow (see
 * constants/experienceCreation.ts). Mirrors the final Experience Details
 * page as closely as possible by reusing the exact same components
 * app/(app)/experience/[id].tsx renders (ImageGallery,
 * ExperienceDetailHeader, ExperienceDescription, ExperienceMetadata,
 * LocationPreview) around a locally-built `ExperienceDetailModel` — not
 * a real fetch, since this experience doesn't exist in Supabase yet.
 *
 * CreatorSection — the larger creator card with bio, normally rendered
 * near the bottom of the real Experience Details page — is deliberately
 * left out here. ExperienceDetailHeader, right at the top, already shows
 * the creator's avatar and name; repeating that identity a second time
 * lower on the same preview added a redundant block with no new
 * information, on a screen whose whole point is to look like the
 * finished post at a glance.
 *
 * RelatedExperiences and ExperienceActionBar (like/save/comment) are
 * deliberately NOT reused here either — there's nothing to relate to or
 * act on before this exists as a real row.
 *
 * Photo URLs: a photo still uploading (or one that failed and hasn't
 * been retried) has no `remoteUrl` yet — this falls back to its
 * `localUri` so the preview always shows something, exactly as the
 * device camera roll would. That fallback is a preview-only concern; the
 * real Publish call (usePublishExperience, useExperienceCreation.ts)
 * only ever sends `remoteUrl`s.
 */

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { theme } from '@/theme';
import { Caption, Icon } from '@/components/ui';
import {
  ImageGallery,
  ExperienceDetailHeader,
  ExperienceDescription,
  ExperienceMetadata,
  LocationPreview,
} from '@/components/experience-detail';
import { useProfile } from '@/hooks/useProfile';
import { truncate } from '@/utils';
import { getPlaceCategory } from '@/constants/places';
import type { ExperienceDraft } from '@/types/experienceDraft';
import type { ExperienceDetailModel, ImagePreview } from '@/types/experience';

const CARD_STORY_PREVIEW_CHAR_BUDGET = 140;

export interface PreviewStepProps {
  draft: ExperienceDraft;
}

export function PreviewStep({ draft }: PreviewStepProps) {
  const { profile } = useProfile();

  const previewModel: ExperienceDetailModel | null = useMemo(() => {
    if (!draft.place || !profile) return null;

    const photos: ImagePreview[] = draft.photos.map((photo, index) => ({
      url: photo.remoteUrl ?? photo.localUri,
      position: index,
    }));

    const category = draft.place.category ? getPlaceCategory(draft.place.category) ?? null : null;

    return {
      id: draft.id,
      title: draft.place.name,
      storyPreview: truncate(draft.story, CARD_STORY_PREVIEW_CHAR_BUDGET),
      location: draft.place.city,
      placeId: draft.place.id,
      coverImage: photos[0] ?? null,
      creator: {
        id: profile.id,
        username: profile.username,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        isVerified: profile.isVerified,
        bio: profile.bio,
      },
      category,
      likeCount: 0,
      commentCount: 0,
      featured: false,
      createdAt: new Date().toISOString(),
      story: draft.story,
      photos,
      wouldRecommend: draft.wouldRecommend,
      amountSpent: draft.amountSpent,
      visitType: draft.visitType,
      goodForTags: draft.goodForTags,
      vibeTags: draft.vibeTags,
      updatedAt: new Date().toISOString(),
      place: {
        id: draft.place.id,
        name: draft.place.name,
        slug: draft.place.slug,
        city: draft.place.city,
        address: draft.place.address,
        latitude: draft.place.latitude,
        longitude: draft.place.longitude,
        description: null,
        category,
      },
    };
  }, [draft, profile]);

  if (!previewModel) {
    // Reachable only if a user somehow lands on this step without a
    // place selected/profile loaded (e.g. a fast double-tap past
    // validation) — validateForPublish (types/experienceDraft.ts) is the
    // real gate before Publish; this is just a quiet fallback, not a new
    // error state to design for.
    return null;
  }

  const pendingPhotoCount = draft.photos.filter((p) => p.status !== 'uploaded').length;

  return (
    <View>
      <Caption color={theme.colors.text.tertiary} style={styles.banner}>
        Preview — this is how your experience will look once published.
      </Caption>

      {pendingPhotoCount > 0 ? (
        <View style={styles.warningBanner}>
          <Icon icon={AlertTriangle} size="sm" color={theme.colors.semantic.warning} />
          <Caption color={theme.colors.semantic.warning} style={styles.warningText}>
            {pendingPhotoCount === 1
              ? "1 photo hasn't finished uploading yet"
              : `${pendingPhotoCount} photos haven't finished uploading yet`}
            {' '}— what you see below is the photo on your device, not yet what's on the
            server. It'll be retried automatically when you publish.
          </Caption>
        </View>
      ) : null}

      <View style={styles.gallery}>
        <ImageGallery images={previewModel.photos} title={previewModel.title} />
      </View>

      <View style={styles.content}>
        <ExperienceDetailHeader experience={previewModel} />
        <ExperienceDescription story={previewModel.story} />
        <ExperienceMetadata experience={previewModel} />
        <LocationPreview place={previewModel.place} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.neutral.backgroundSecondary,
    borderRadius: theme.radius.input,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  warningText: {
    flex: 1,
  },
  gallery: {
    marginHorizontal: -theme.layout.screenPaddingHorizontal,
    borderRadius: theme.radius.image,
    overflow: 'hidden',
  },
  content: {
    marginTop: theme.spacing.xl,
    gap: theme.spacing.xl,
  },
});
