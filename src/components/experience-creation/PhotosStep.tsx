/**
 * Stroll — Photos Step (Experience Creation)
 * src/components/experience-creation/PhotosStep.tsx
 *
 * The entry point into Experience Creation — see
 * constants/experienceCreation.ts for the Photos → Compose → Preview
 * redesign this is step 1 of. Photos are compulsory here
 * (EXPERIENCE_LIMITS.MIN_PHOTOS is 1), not optional — you can't Continue
 * to Compose with zero photos, the same way Instagram/TikTok's composer
 * opens on "pick your media" before anything else. Photos upload as soon
 * as they're picked (see `pickPhotos` in useExperienceCreation.ts) rather
 * than waiting for Publish — this screen's job is purely to reflect each
 * photo's live status (pending/uploading/uploaded/failed) and let the
 * user reorder, remove, or retry, all pure/local operations against the
 * store.
 *
 * Cover image: there is no separate "isCover" flag anywhere (see
 * ExperienceDraftPhoto's doc in types/experienceDraft.ts) — the first
 * photo in the list IS the cover, always. "Change cover image" is
 * implemented as "move this photo to the front" (`onMakeCover`).
 * "Automatic cover selection when only one image exists" falls out of
 * that same rule for free — with one photo, it's already at index 0.
 *
 * No drag-and-drop library exists in this project (no
 * react-native-draggable-flatlist or similar), and accessibility asks
 * for keyboard navigation — a raw drag gesture serves neither well.
 * Reordering is instead a pair of left/right buttons per photo, which is
 * both simpler (no new dependency) and more accessible (works with a
 * screen reader / switch control, where a drag gesture wouldn't) than
 * adding one.
 *
 * The zero-photo state gets its own larger, centered "Add Photos" card
 * rather than reusing the small grid tile every subsequent add uses —
 * as the very first thing a user sees on opening Create, it earns a more
 * prominent, unmissable call to action; once at least one photo exists,
 * the compact grid tile takes over for adding more.
 */

import React from 'react';
import { View, Image, Pressable, StyleSheet } from 'react-native';
import { ImagePlus, X, RotateCw, Star, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react-native';

import { theme } from '@/theme';
import { Caption, BodySmall, Icon, Spinner, Badge } from '@/components/ui';
import { EXPERIENCE_LIMITS } from '@/constants/app';
import type { ExperienceDraftPhoto } from '@/types/experienceDraft';

export interface PhotosStepProps {
  photos: ExperienceDraftPhoto[];
  isPicking: boolean;
  onPickPhotos: () => void;
  onRemove: (photoId: string) => void;
  onRetry: (photoId: string) => void;
  onMakeCover: (photoId: string) => void;
  onMoveLeft: (photoId: string) => void;
  onMoveRight: (photoId: string) => void;
  /** Shown when the user tries to continue with zero photos. */
  error?: string;
}

export function PhotosStep({
  photos,
  isPicking,
  onPickPhotos,
  onRemove,
  onRetry,
  onMakeCover,
  onMoveLeft,
  onMoveRight,
  error,
}: PhotosStepProps) {
  const canAddMore = photos.length < EXPERIENCE_LIMITS.MAX_PHOTOS;

  if (photos.length === 0) {
    return (
      <View>
        <Pressable
          onPress={onPickPhotos}
          disabled={isPicking}
          style={({ pressed }) => [styles.emptyTile, pressed && styles.addTilePressed]}
          accessibilityRole="button"
          accessibilityLabel="Add photos"
        >
          {isPicking ? (
            <Spinner size="small" />
          ) : (
            <>
              <Icon icon={ImagePlus} size="xl" color={theme.colors.text.tertiary} />
              <BodySmall color={theme.colors.text.secondary} style={styles.emptyTileLabel}>
                Add Photos
              </BodySmall>
              <Caption color={theme.colors.text.tertiary}>Tap to choose from your library</Caption>
            </>
          )}
        </Pressable>

        {error ? (
          <Caption style={styles.errorText} color={theme.colors.semantic.error}>
            {error}
          </Caption>
        ) : (
          <Caption color={theme.colors.text.tertiary} style={styles.helperText}>
            Up to {EXPERIENCE_LIMITS.MAX_PHOTOS} photos · The first photo you add is your cover.
          </Caption>
        )}
      </View>
    );
  }

  return (
    <View>
      <View style={styles.grid}>
        {photos.map((photo, index) => (
          <View key={photo.id} style={styles.tile}>
            <Image source={{ uri: photo.localUri }} style={styles.image} resizeMode="cover" />

            {/* Status overlay — uploading spinner or failed/retry state.
                'pending' renders no overlay at all: it's a transient
                instant between pick and the batch upload starting (see
                uploadDraftPhotos in useExperienceCreation.ts), not
                something worth its own visual. */}
            {photo.status === 'uploading' ? (
              <View style={styles.overlay}>
                <Spinner size="small" color={theme.colors.static.white} accessibilityLabel="Uploading" />
              </View>
            ) : photo.status === 'failed' ? (
              <Pressable
                onPress={() => onRetry(photo.id)}
                style={styles.overlay}
                accessibilityRole="button"
                accessibilityLabel="Upload failed. Tap to retry."
              >
                <Icon icon={AlertTriangle} size="sm" color={theme.colors.static.white} />
                <View style={styles.retryRow}>
                  <Icon icon={RotateCw} size="xs" color={theme.colors.static.white} />
                  <Caption color={theme.colors.static.white} style={styles.retryLabel}>Retry</Caption>
                </View>
              </Pressable>
            ) : null}

            {index === 0 ? (
              <View style={styles.coverBadge}>
                <Badge label="Cover" variant="primary" />
              </View>
            ) : null}

            <Pressable
              onPress={() => onRemove(photo.id)}
              style={styles.removeButton}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityRole="button"
              accessibilityLabel="Remove photo"
            >
              <Icon icon={X} size="xs" color={theme.colors.static.white} />
            </Pressable>

            <View style={styles.controlsRow}>
              <Pressable
                onPress={() => onMoveLeft(photo.id)}
                disabled={index === 0}
                style={styles.controlButton}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                accessibilityRole="button"
                accessibilityLabel="Move photo earlier"
              >
                <View style={index === 0 ? styles.controlDisabled : undefined}>
                  <Icon icon={ChevronLeft} size="xs" color={theme.colors.static.white} />
                </View>
              </Pressable>

              {index !== 0 ? (
                <Pressable
                  onPress={() => onMakeCover(photo.id)}
                  style={styles.controlButton}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  accessibilityRole="button"
                  accessibilityLabel="Make cover photo"
                >
                  <Icon icon={Star} size="xs" color={theme.colors.static.white} />
                </Pressable>
              ) : (
                <View style={styles.controlButton} />
              )}

              <Pressable
                onPress={() => onMoveRight(photo.id)}
                disabled={index === photos.length - 1}
                style={styles.controlButton}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                accessibilityRole="button"
                accessibilityLabel="Move photo later"
              >
                <View style={index === photos.length - 1 ? styles.controlDisabled : undefined}>
                  <Icon icon={ChevronRight} size="xs" color={theme.colors.static.white} />
                </View>
              </Pressable>
            </View>
          </View>
        ))}

        {canAddMore ? (
          <Pressable
            onPress={onPickPhotos}
            disabled={isPicking}
            style={({ pressed }) => [styles.addTile, pressed && styles.addTilePressed]}
            accessibilityRole="button"
            accessibilityLabel="Add photos"
          >
            {isPicking ? (
              <Spinner size="small" />
            ) : (
              <>
                <Icon icon={ImagePlus} size="lg" color={theme.colors.text.tertiary} />
                <Caption color={theme.colors.text.tertiary}>Add Photos</Caption>
              </>
            )}
          </Pressable>
        ) : null}
      </View>

      <Caption color={theme.colors.text.tertiary} style={styles.helperText}>
        {photos.length}/{EXPERIENCE_LIMITS.MAX_PHOTOS} photos · The first photo is your cover — use
        the star to change it.
      </Caption>
    </View>
  );
}

const TILE_SIZE = 100;
const TILE_GAP = theme.spacing.sm;
const EMPTY_TILE_ASPECT_RATIO = 4 / 3;

const styles = StyleSheet.create({
  emptyTile: {
    width: '100%',
    aspectRatio: EMPTY_TILE_ASPECT_RATIO,
    borderRadius: theme.radius.image,
    borderWidth: theme.borders.width,
    borderColor: theme.colors.neutral.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xxs,
    backgroundColor: theme.colors.neutral.backgroundSecondary,
  },
  emptyTileLabel: {
    marginTop: theme.spacing.xs,
    fontWeight: theme.typography.weights.semiBold,
  },
  errorText: {
    marginTop: theme.spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: TILE_GAP,
  },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: theme.radius.image,
    overflow: 'hidden',
    backgroundColor: theme.colors.neutral.backgroundSecondary,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xxs,
    backgroundColor: theme.colors.static.black,
    opacity: theme.opacity.heavy,
  },
  retryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  retryLabel: {
    fontWeight: theme.typography.weights.semiBold,
  },
  coverBadge: {
    position: 'absolute',
    top: theme.spacing.xxs,
    left: theme.spacing.xxs,
  },
  removeButton: {
    position: 'absolute',
    top: theme.spacing.xxs,
    right: theme.spacing.xxs,
    width: 22,
    height: 22,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.static.black,
    opacity: theme.opacity.heavy,
  },
  controlsRow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xxs,
    paddingVertical: theme.spacing.xxs,
    backgroundColor: theme.colors.static.black,
    opacity: theme.opacity.heavy,
  },
  controlButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlDisabled: {
    opacity: theme.opacity.disabled,
  },
  addTile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: theme.radius.image,
    borderWidth: theme.borders.width,
    borderColor: theme.colors.neutral.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xxs,
  },
  addTilePressed: {
    backgroundColor: theme.colors.neutral.backgroundSecondary,
  },
  helperText: {
    marginTop: theme.spacing.md,
  },
});
