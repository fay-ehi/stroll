/**
 * Stroll — Image Gallery
 * src/components/experience-detail/ImageGallery.tsx
 *
 * Experience Details requirement #4 — Image Gallery:
 *   "Multiple images, Horizontal swiping, Pagination dots, Full-width
 *   hero image, Lazy image loading, Placeholder while loading. Structure
 *   the gallery so it can later support fullscreen viewing without major
 *   refactoring. Do not implement fullscreen viewing yet."
 *
 * The "structure for future fullscreen" requirement is satisfied by the
 * optional `onImagePress` prop below: each image is already a Pressable
 * reporting its own index. Wiring that callback to open a fullscreen
 * viewer later is a one-line change at the call site — nothing about
 * this component's internals needs to change.
 *
 * Lazy loading: FlatList only mounts images near the viewport
 * (`initialNumToRender={1}`, a conservative `windowSize`) — a gallery
 * with up to 10 photos never decodes more than a couple at once. Each
 * image also shows its own Skeleton placeholder until its `onLoad` fires,
 * independent of the others, so a slow photo never blocks the ones
 * around it from appearing as soon as they're ready.
 *
 * Slide width is computed from `useWindowDimensions`, not a `'100%'`
 * style — a percentage width on an item inside a *horizontal* FlatList
 * doesn't resolve against the screen the way it would in a vertical list,
 * and silently breaks `pagingEnabled` snapping.
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Image,
  Pressable,
  FlatList,
  StyleSheet,
  useWindowDimensions,
  type ViewToken,
} from 'react-native';
import { ImageOff } from 'lucide-react-native';

import { theme } from '@/theme';
import { Icon, Skeleton } from '@/components/ui';
import { useImageLoadFailed } from '@/hooks';
import type { ImagePreview } from '@/types/experience';

const GALLERY_ASPECT_RATIO = 4 / 3;

// ─── Single Image ────────────────────────────────────────────────────────────────

interface GalleryImageProps {
  image: ImagePreview;
  index: number;
  title: string;
  width: number;
  onPress?: (index: number) => void;
}

function GalleryImage({ image, index, title, width, onPress }: GalleryImageProps) {
  const [failed, markFailed] = useImageLoadFailed(image.url);
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <Pressable
      onPress={onPress ? () => onPress(index) : undefined}
      disabled={!onPress}
      style={[styles.slide, { width, aspectRatio: GALLERY_ASPECT_RATIO }]}
      accessibilityRole={onPress ? 'imagebutton' : 'image'}
      accessibilityLabel={`Photo ${index + 1} from an experience at ${title}`}
    >
      {failed ? (
        <View style={styles.fallback}>
          <Icon icon={ImageOff} size="lg" color={theme.colors.text.tertiary} />
        </View>
      ) : (
        <>
          {!isLoaded ? <Skeleton style={StyleSheet.absoluteFillObject} borderRadius={0} /> : null}
          <Image
            source={{ uri: image.url }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
            onLoad={() => setIsLoaded(true)}
            onError={markFailed}
          />
        </>
      )}
    </Pressable>
  );
}

// ─── Gallery ────────────────────────────────────────────────────────────────────

export interface ImageGalleryProps {
  images: ImagePreview[];
  /** Used for the place's name in each image's accessibility label. */
  title: string;
  /** Reserved for future fullscreen viewing (see module doc) — not wired to anything this sprint. */
  onImagePress?: (index: number) => void;
}

export function ImageGallery({ images, title, onImagePress }: ImageGalleryProps) {
  const { width: windowWidth } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const firstVisible = viewableItems[0];
    if (firstVisible?.index != null) setActiveIndex(firstVisible.index);
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  const renderItem = useCallback(
    ({ item, index }: { item: ImagePreview; index: number }) => (
      <GalleryImage
        image={item}
        index={index}
        title={title}
        width={windowWidth}
        onPress={onImagePress}
      />
    ),
    [title, windowWidth, onImagePress],
  );

  const keyExtractor = useCallback((item: ImagePreview) => `${item.position}-${item.url}`, []);

  if (images.length === 0) {
    return (
      <View
        style={[
          styles.slide,
          styles.fallback,
          { width: windowWidth, aspectRatio: GALLERY_ASPECT_RATIO },
        ]}
        accessibilityLabel={`No photos yet for ${title}`}
      >
        <Icon icon={ImageOff} size="lg" color={theme.colors.text.tertiary} />
      </View>
    );
  }

  return (
    <View>
      <FlatList
        data={images}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialNumToRender={1}
        windowSize={3}
        maxToRenderPerBatch={2}
        getItemLayout={(_, index) => ({
          length: windowWidth,
          offset: windowWidth * index,
          index,
        })}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        accessibilityLabel={`Photo gallery, ${images.length} photo${images.length === 1 ? '' : 's'}`}
      />

      {images.length > 1 ? (
        <View
          style={styles.dots}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {images.map((image, index) => (
            <View
              key={`${image.position}-${image.url}`}
              style={[styles.dot, index === activeIndex && styles.dotActive]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  slide: {
    overflow: 'hidden',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.neutral.backgroundSecondary,
  },
  dots: {
    position: 'absolute',
    bottom: theme.spacing.sm,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.xxs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.static.white,
    opacity: theme.opacity.medium,
  },
  dotActive: {
    width: 18,
    opacity: 1,
    backgroundColor: theme.colors.static.white,
  },
});
