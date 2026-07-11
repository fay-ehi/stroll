/**
 * Stroll — Photo Grid Picker (Experience Creation)
 * src/components/experience-creation/PhotoGridPicker.tsx
 *
 * The 'photos' step's screen — the entry point into Experience Creation
 * (see constants/experienceCreation.ts). Modeled directly on Instagram/
 * TikTok's "New Post" composer rather than handing off to the OS's own
 * picker sheet: a big preview of the current cover photo up top, then
 * the device's own camera roll browsable inline in a grid below it, with
 * a camera tile always first. Tapping a thumbnail selects/deselects it
 * immediately — there's no separate "confirm selection" step, the same
 * way there isn't one in either of those apps.
 *
 * This is the one step in the wizard that does NOT use WizardShell —
 * intentionally. WizardShell's back-arrow/progress-bar/title-subtitle
 * header is a "step N of a form" pattern; this screen is meant to read
 * as a media composer, not a form field, so it gets its own
 * Cancel / New Post / Next header instead, matching the reference
 * screenshot exactly. 'compose' and 'preview' — the two steps that
 * actually are form-like — still use WizardShell as normal.
 *
 * Device photos come from usePhotoLibrary.ts (a thin wrapper over
 * expo-media-library), paginated 60 at a time via the grid's
 * `onEndReached`. Selection state itself is NOT local to this
 * component — it's derived from the draft's real `photos` array (via
 * `localUri` matching an asset's `uri`), so this is always showing the
 * same selection Compose/Preview will see, never a separate "pending"
 * selection that needs reconciling later.
 *
 * The grid runs full-bleed (no screen-edge padding) — a deliberate,
 * narrow exception to Design System §13's standard 24px screen padding,
 * the same way Instagram's own grid runs edge-to-edge; a photo grid
 * reads as a continuous sheet of images, not a padded content section.
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  Pressable,
  FlatList,
  Modal,
  Linking,
  useWindowDimensions,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, ChevronDown, Check, X, Maximize2, Minimize2, ImageOff, AlertTriangle } from 'lucide-react-native';

import { theme } from '@/theme';
import { Body, BodySmall, Caption, Icon, Spinner, EmptyState } from '@/components/ui';
import { usePhotoLibrary, type PhotoLibraryAsset } from '@/hooks/usePhotoLibrary';
import type { ExperienceDraftPhoto } from '@/types/experienceDraft';

export interface PhotoGridPickerProps {
  photos: ExperienceDraftPhoto[];
  isAddingPhoto: boolean;
  onToggleAsset: (asset: { id?: string; uri: string; width: number; height: number }) => void;
  onCaptureFromCamera: () => void;
  onRemovePhoto: (photoId: string) => void;
  onRetryPhoto: (photoId: string) => void;
  onMakeCover: (photoId: string) => void;
  onCancel: () => void;
  onNext: () => void;
  canProceed: boolean;
  /** Shown under the header once the user has tried to proceed with nothing selected. */
  error?: string;
}

type GridItem = { kind: 'camera' } | { kind: 'asset'; asset: PhotoLibraryAsset };

const NUM_COLUMNS = 4;
const GRID_GAP = theme.spacing.xxs;

export function PhotoGridPicker({
  photos,
  isAddingPhoto,
  onToggleAsset,
  onCaptureFromCamera,
  onRemovePhoto,
  onRetryPhoto,
  onMakeCover,
  onCancel,
  onNext,
  canProceed,
  error,
}: PhotoGridPickerProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const tileSize = (width - GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

  const {
    permissionState,
    albums,
    currentAlbumId,
    currentAlbumTitle,
    selectAlbum,
    assets,
    isLoading,
    hasMore,
    loadMore,
  } = usePhotoLibrary();

  const [previewFit, setPreviewFit] = useState<'cover' | 'contain'>('cover');
  const [albumPickerOpen, setAlbumPickerOpen] = useState(false);

  const cover = photos[0] ?? null;
  const selectedUris = useMemo(() => new Set(photos.map((p) => p.localUri)), [photos]);

  const gridData = useMemo<GridItem[]>(
    () => [{ kind: 'camera' }, ...assets.map((asset) => ({ kind: 'asset' as const, asset }))],
    [assets]
  );

  return (
    <View style={styles.screen}>
      {/* ── Header: Cancel / New Post / Next ─────────────────────────────── */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top + theme.spacing.sm, theme.spacing.xl) }]}>
        <Pressable
          onPress={onCancel}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Cancel"
        >
          <Body color={theme.colors.text.primary}>Cancel</Body>
        </Pressable>
        <Body style={styles.headerTitle}>New Post</Body>
        <Pressable
          onPress={onNext}
          disabled={!canProceed}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Next"
          accessibilityState={{ disabled: !canProceed }}
        >
          <Body
            style={styles.headerAction}
            color={canProceed ? theme.colors.brand.primary : theme.colors.text.tertiary}
          >
            Next
          </Body>
        </Pressable>
      </View>

      {error ? (
        <Caption color={theme.colors.semantic.error} style={styles.errorBanner}>
          {error}
        </Caption>
      ) : null}

      {/* ── Cover preview ───────────────────────────────────────────────── */}
      <View style={styles.previewWrap}>
        {cover ? (
          <>
            <Image
              source={{ uri: cover.localUri }}
              style={styles.previewImage}
              contentFit={previewFit}
            />
            {cover.status === 'pending' || cover.status === 'uploading' ? (
              <View style={styles.previewStatusBadge}>
                <Spinner size="small" color={theme.colors.static.white} />
              </View>
            ) : cover.status === 'failed' ? (
              <Pressable
                onPress={() => onRetryPhoto(cover.id)}
                style={styles.previewStatusBadge}
                accessibilityRole="button"
                accessibilityLabel="Cover photo failed to upload. Tap to retry."
              >
                <Icon icon={AlertTriangle} size="sm" color={theme.colors.static.white} />
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => setPreviewFit((f) => (f === 'cover' ? 'contain' : 'cover'))}
              style={styles.previewFitButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={previewFit === 'cover' ? 'Fit whole photo' : 'Fill frame'}
            >
              <Icon
                icon={previewFit === 'cover' ? Maximize2 : Minimize2}
                size="sm"
                color={theme.colors.static.white}
              />
            </Pressable>
          </>
        ) : (
          <View style={styles.previewEmpty}>
            <Caption color={theme.colors.text.tertiary}>Select photos below</Caption>
          </View>
        )}
      </View>

      {/* ── Selected-photos strip — upload status + reorder/remove/retry ── */}
      {/* Shown from the first photo onward (not just once there are 2+):
          this is the only place a failed/still-uploading photo's status
          is visible, so it can't wait for a second photo to exist. */}
      {photos.length > 0 ? (
        <FlatList
          horizontal
          data={photos}
          keyExtractor={(p) => p.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.stripContent}
          style={styles.stripList}
          renderItem={({ item, index }) => {
            const isFailed = item.status === 'failed';
            const isUploading = item.status === 'pending' || item.status === 'uploading';
            return (
              <Pressable
                onPress={() => (isFailed ? onRetryPhoto(item.id) : onMakeCover(item.id))}
                style={styles.stripThumbWrap}
                accessibilityRole="button"
                accessibilityLabel={
                  isFailed
                    ? `Photo ${index + 1} failed to upload. Tap to retry.`
                    : index === 0
                      ? 'Cover photo'
                      : `Photo ${index + 1}. Tap to make cover.`
                }
              >
                <Image source={{ uri: item.localUri }} style={styles.stripThumb} contentFit="cover" />
                {index === 0 ? <View style={styles.stripCoverDot} /> : null}
                {isUploading ? (
                  <View style={styles.stripStatusOverlay}>
                    <Spinner size="small" color={theme.colors.static.white} />
                  </View>
                ) : null}
                {isFailed ? (
                  <View style={styles.stripStatusOverlay}>
                    <Icon icon={AlertTriangle} size="xs" color={theme.colors.static.white} />
                  </View>
                ) : null}
                <Pressable
                  onPress={() => onRemovePhoto(item.id)}
                  style={styles.stripRemoveButton}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="Remove photo"
                >
                  <Icon icon={X} size="xs" color={theme.colors.static.white} />
                </Pressable>
              </Pressable>
            );
          }}
        />
      ) : null}

      {/* ── Album row ────────────────────────────────────────────────────── */}
      <Pressable
        onPress={() => setAlbumPickerOpen(true)}
        style={styles.albumRow}
        accessibilityRole="button"
        accessibilityLabel={`Album: ${currentAlbumTitle}. Tap to switch.`}
      >
        <BodySmall style={styles.albumTitle}>{currentAlbumTitle}</BodySmall>
        <Icon icon={ChevronDown} size="sm" color={theme.colors.text.secondary} />
      </Pressable>

      {/* ── Grid ─────────────────────────────────────────────────────────── */}
      {permissionState === 'denied' ? (
        <View style={styles.deniedWrap}>
          <EmptyState
            icon={ImageOff}
            title="Photo access needed"
            description="Allow access to your photo library to add pictures to your experience."
            action={{ label: 'Open Settings', onPress: () => { void Linking.openSettings(); } }}
          />
        </View>
      ) : permissionState === 'checking' || (isLoading && assets.length === 0) ? (
        <View style={styles.loadingWrap}>
          <Spinner accessibilityLabel="Loading your photos" />
        </View>
      ) : (
        <FlatList
          data={gridData}
          keyExtractor={(item) => (item.kind === 'camera' ? 'camera' : item.asset.id)}
          numColumns={NUM_COLUMNS}
          style={styles.grid}
          onEndReached={hasMore ? loadMore : undefined}
          onEndReachedThreshold={0.6}
          renderItem={({ item, index }) => {
            // Every tile gets a bottom gap, but only non-last-column
            // tiles get a right gap — applying it to all four columns
            // would make each row NUM_COLUMNS * GRID_GAP too wide
            // (rather than the intended NUM_COLUMNS - 1 gaps) and push
            // the last column past the screen edge.
            const isLastColumn = (index + 1) % NUM_COLUMNS === 0;
            const tileStyle = [
              styles.tile,
              { width: tileSize, height: tileSize, marginRight: isLastColumn ? 0 : GRID_GAP },
            ];
            return item.kind === 'camera' ? (
              <Pressable
                onPress={onCaptureFromCamera}
                disabled={isAddingPhoto}
                style={tileStyle}
                accessibilityRole="button"
                accessibilityLabel="Take a photo"
              >
                <Icon icon={Camera} size="lg" color={theme.colors.text.secondary} />
              </Pressable>
            ) : (
              <AssetTile
                asset={item.asset}
                style={tileStyle}
                selected={selectedUris.has(item.asset.uri)}
                selectionNumber={
                  selectedUris.has(item.asset.uri)
                    ? photos.findIndex((p) => p.localUri === item.asset.uri) + 1
                    : undefined
                }
                onPress={() => onToggleAsset(item.asset)}
              />
            );
          }}
        />
      )}

      {/* ── Album switcher ───────────────────────────────────────────────── */}
      <Modal
        visible={albumPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setAlbumPickerOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setAlbumPickerOpen(false)} />
        <View style={[styles.albumSheet, { paddingBottom: Math.max(insets.bottom, theme.spacing.lg) }]}>
          <FlatList
            data={[{ id: null as string | null, title: 'Recents' }, ...albums]}
            keyExtractor={(a) => a.id ?? 'recents'}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  selectAlbum(item.id);
                  setAlbumPickerOpen(false);
                }}
                style={styles.albumOption}
                accessibilityRole="button"
                accessibilityLabel={item.title}
              >
                <Body>{item.title}</Body>
                {currentAlbumId === item.id ? (
                  <Icon icon={Check} size="sm" color={theme.colors.brand.primary} />
                ) : null}
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

// ─── AssetTile ──────────────────────────────────────────────────────────────────
// A memo-free component is fine here: FlatList's own windowing already
// keeps offscreen tiles from re-rendering, and this list is bounded (60
// photos per page) rather than the thousands a full camera roll could
// have — same trade-off PlaceStep.tsx already makes for its own list.

function AssetTile({
  asset,
  style,
  selected,
  selectionNumber,
  onPress,
}: {
  asset: PhotoLibraryAsset;
  style: StyleProp<ViewStyle>;
  selected: boolean;
  selectionNumber?: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={style}
      accessibilityRole="button"
      accessibilityLabel={selected ? `Photo, selected as ${selectionNumber}. Tap to remove.` : 'Photo. Tap to select.'}
      accessibilityState={{ selected }}
    >
      <Image source={{ uri: asset.uri }} style={styles.tileImage} contentFit="cover" />
      {selected ? (
        <>
          <View style={styles.tileDim} />
          <View style={styles.tileBadge}>
            <Caption color={theme.colors.static.white} style={styles.tileBadgeText}>
              {selectionNumber}
            </Caption>
          </View>
        </>
      ) : null}
    </Pressable>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────────

const PREVIEW_ASPECT_RATIO = 1;
const STRIP_THUMB_SIZE = 56;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.neutral.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    paddingBottom: theme.spacing.sm,
  },
  headerTitle: {
    fontWeight: theme.typography.weights.semiBold,
  },
  headerAction: {
    fontWeight: theme.typography.weights.semiBold,
  },
  errorBanner: {
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    paddingBottom: theme.spacing.xs,
  },
  previewWrap: {
    width: '100%',
    aspectRatio: PREVIEW_ASPECT_RATIO,
    backgroundColor: theme.colors.neutral.backgroundSecondary,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewFitButton: {
    position: 'absolute',
    bottom: theme.spacing.sm,
    left: theme.spacing.sm,
    width: theme.layout.touchTargetMin,
    height: theme.layout.touchTargetMin,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  previewStatusBadge: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    width: theme.layout.touchTargetMin,
    height: theme.layout.touchTargetMin,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  stripList: {
    flexGrow: 0,
  },
  stripContent: {
    gap: theme.spacing.xs,
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    paddingVertical: theme.spacing.sm,
  },
  stripThumbWrap: {
    width: STRIP_THUMB_SIZE,
    height: STRIP_THUMB_SIZE,
    borderRadius: theme.radius.image,
    overflow: 'hidden',
    backgroundColor: theme.colors.neutral.backgroundSecondary,
  },
  stripThumb: {
    width: '100%',
    height: '100%',
  },
  stripCoverDot: {
    position: 'absolute',
    bottom: theme.spacing.xxs,
    left: theme.spacing.xxs,
    width: 8,
    height: 8,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.brand.primary,
    borderWidth: 1,
    borderColor: theme.colors.static.white,
  },
  stripStatusOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  stripRemoveButton: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  albumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xxs,
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    paddingVertical: theme.spacing.sm,
  },
  albumTitle: {
    fontWeight: theme.typography.weights.semiBold,
  },
  grid: {
    flex: 1,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deniedWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  tile: {
    padding: 0,
    marginBottom: GRID_GAP,
    backgroundColor: theme.colors.neutral.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileImage: {
    width: '100%',
    height: '100%',
  },
  tileDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
  },
  tileBadge: {
    position: 'absolute',
    top: theme.spacing.xxs,
    right: theme.spacing.xxs,
    width: 20,
    height: 20,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.brand.primary,
  },
  tileBadgeText: {
    fontWeight: theme.typography.weights.bold,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  albumSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '60%',
    backgroundColor: theme.colors.neutral.background,
    borderTopLeftRadius: theme.radius.bottomSheet,
    borderTopRightRadius: theme.radius.bottomSheet,
    paddingTop: theme.spacing.sm,
  },
  albumOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    minHeight: theme.layout.listItemMinHeight,
  },
});
