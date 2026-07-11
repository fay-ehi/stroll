/**
 * Stroll — Compose Step (Experience Creation)
 * src/components/experience-creation/ComposeStep.tsx
 *
 * Step 2 of the Photos → Compose → Preview flow (see
 * constants/experienceCreation.ts for the full redesign rationale).
 * Everything that isn't Photos or Preview lives on this one scrollable
 * screen, Instagram/TikTok caption-screen style, instead of the original
 * wizard's three separate required-feeling screens (Category, Place,
 * Story). Top to bottom:
 *
 *   1. The photos just picked, previewed in a horizontal strip (editing
 *      them happens back on the Photos step — `onEditPhotos` returns
 *      there, reusing the wizard's existing Back navigation rather than
 *      duplicating PhotosStep's picker/reorder UI here).
 *   2. Place — compulsory. Collapses to a single row once a place is
 *      selected (PlaceImage thumbnail + name/city, tap to change);
 *      expands to the full search+list (PlaceStep.tsx, reused as-is —
 *      its FlatList already renders with `scrollEnabled={false}` for
 *      exactly this kind of embedding) when nothing's selected yet, or
 *      the user taps to change it. Keeping the collapsed state is what
 *      makes this screen feel like one scrollable form instead of a
 *      search results page with fields bolted on top of it.
 *   3. Title — optional (see types/experienceDraft.ts's module doc: it's
 *      never published, purely a local working label).
 *   4. Caption — compulsory. This is the `story` field end to end (see
 *      PRD §8.7's "Experience Story" / ExperienceDescription.tsx on the
 *      published Experience Details page) — relabelled here per product
 *      direction to avoid "story" or "description" reading like a school
 *      assignment.
 *   5. Category + all of PRD §8.7 Screen 11's optional metadata (Amount
 *      Spent, Visit Type, Would Recommend, Good For, Vibe Tags), tucked
 *      behind a collapsed "Add more details" disclosure, closed by
 *      default — every one of these is optional, so none of them earn
 *      permanent space on a screen whose two compulsory fields (Place,
 *      Caption) should be what a user's eye lands on first.
 */

import React, { useState } from 'react';
import { View, Image, Pressable, ScrollView, StyleSheet } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';

import { theme } from '@/theme';
import { TextInput, Chip, Label, Caption, BodySmall, Icon } from '@/components/ui';
import { PlaceImage } from '@/components/places/PlaceImage';
import { PlaceStep } from './PlaceStep';
import {
  EXPERIENCE_LIMITS,
  EXPERIENCE_DRAFT_LIMITS,
  AMOUNT_SPENT_OPTIONS,
  VISIT_TYPES,
  GOOD_FOR_TAGS,
  VIBE_TAGS,
} from '@/constants/app';
import type { AmountSpent, VisitType, GoodForTag, VibeTag } from '@/constants/app';
import { PLACE_CATEGORIES, type PlaceCategoryId } from '@/constants/places';
import type { DraftPlaceSummary, ExperienceDraftPhoto, DraftValidationErrors } from '@/types/experienceDraft';

export interface ComposeStepProps {
  photos: ExperienceDraftPhoto[];
  onEditPhotos: () => void;

  categoryId: PlaceCategoryId | null;
  onSelectCategory: (categoryId: PlaceCategoryId) => void;

  cityFilter: string | null;
  place: DraftPlaceSummary | null;
  onSelectPlace: (place: DraftPlaceSummary) => void;

  title: string;
  onChangeTitle: (title: string) => void;

  story: string;
  onChangeStory: (story: string) => void;

  amountSpent: AmountSpent | null;
  onSetAmountSpent: (value: AmountSpent | null) => void;

  visitType: VisitType | null;
  onSetVisitType: (value: VisitType | null) => void;

  wouldRecommend: boolean | null;
  onSetWouldRecommend: (value: boolean | null) => void;

  goodForTags: GoodForTag[];
  onToggleGoodForTag: (tag: GoodForTag) => void;

  vibeTags: VibeTag[];
  onToggleVibeTag: (tag: VibeTag) => void;

  errors: DraftValidationErrors;
}

export function ComposeStep({
  photos,
  onEditPhotos,
  categoryId,
  onSelectCategory,
  cityFilter,
  place,
  onSelectPlace,
  title,
  onChangeTitle,
  story,
  onChangeStory,
  amountSpent,
  onSetAmountSpent,
  visitType,
  onSetVisitType,
  wouldRecommend,
  onSetWouldRecommend,
  goodForTags,
  onToggleGoodForTag,
  vibeTags,
  onToggleVibeTag,
  errors,
}: ComposeStepProps) {
  // Starts expanded when there's nothing selected yet — there's no
  // "collapsed" state to show until a place actually exists.
  const [placeSearchOpen, setPlaceSearchOpen] = useState(place === null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const handleSelectPlace = (selected: DraftPlaceSummary) => {
    onSelectPlace(selected);
    setPlaceSearchOpen(false);
  };

  return (
    <View style={styles.container}>
      {/* ── Photos preview ─────────────────────────────────────────────── */}
      <View style={styles.photoStripRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.photoStrip}
        >
          {photos.map((photo, index) => (
            <View
              key={photo.id}
              style={styles.photoThumbWrap}
              accessibilityLabel={index === 0 ? 'Cover photo' : undefined}
            >
              <Image source={{ uri: photo.localUri }} style={styles.photoThumb} resizeMode="cover" />
              {index === 0 ? <View style={styles.coverDot} /> : null}
            </View>
          ))}
        </ScrollView>
        <Pressable
          onPress={onEditPhotos}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Edit photos"
        >
          <Caption color={theme.colors.brand.primary} style={styles.editLabel}>
            Edit
          </Caption>
        </Pressable>
      </View>

      {/* ── Place ───────────────────────────────────────────────────────── */}
      <View style={styles.section}>
        {place && !placeSearchOpen ? (
          <Pressable
            onPress={() => setPlaceSearchOpen(true)}
            style={({ pressed }) => [styles.placeRow, pressed && styles.placeRowPressed]}
            accessibilityRole="button"
            accessibilityLabel={`Location: ${place.name}, ${place.city}. Tap to change.`}
          >
            <PlaceImage
              uri={place.heroImage}
              accessibilityLabel={place.name}
              aspectRatio={1}
              style={styles.placeThumb}
            />
            <View style={styles.placeInfo}>
              <BodySmall numberOfLines={1}>{place.name}</BodySmall>
              <Caption numberOfLines={1} color={theme.colors.text.tertiary}>
                {place.city}
              </Caption>
            </View>
            <Icon icon={ChevronDown} size="sm" color={theme.colors.text.tertiary} />
          </Pressable>
        ) : (
          <>
            <View style={styles.sectionHeader}>
              <Label>Location</Label>
              {place ? (
                <Pressable
                  onPress={() => setPlaceSearchOpen(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel changing location"
                >
                  <Caption color={theme.colors.brand.primary}>Cancel</Caption>
                </Pressable>
              ) : null}
            </View>
            <PlaceStep
              categoryId={categoryId}
              cityFilter={cityFilter}
              selectedPlaceId={place?.id ?? null}
              onSelect={handleSelectPlace}
              error={errors.place}
            />
          </>
        )}
      </View>

      {/* ── Title (optional) ───────────────────────────────────────────── */}
      <TextInput
        label="Title"
        value={title}
        onChangeText={onChangeTitle}
        placeholder="Add a title (optional)"
        maxLength={EXPERIENCE_DRAFT_LIMITS.MAX_TITLE_LENGTH}
        errorText={errors.title}
        autoCapitalize="sentences"
        returnKeyType="next"
      />

      {/* ── Caption (compulsory) ───────────────────────────────────────── */}
      <TextInput
        label="Caption *"
        value={story}
        onChangeText={onChangeStory}
        placeholder="What made this worth sharing?"
        multiline
        maxLength={EXPERIENCE_LIMITS.MAX_STORY_LENGTH}
        errorText={errors.story}
        helperText={errors.story ? undefined : `${story.length}/${EXPERIENCE_LIMITS.MAX_STORY_LENGTH}`}
        containerStyle={styles.captionInput}
        autoCapitalize="sentences"
      />

      {/* ── More details (collapsed by default — everything below is optional) ── */}
      <Pressable
        onPress={() => setDetailsOpen((open) => !open)}
        style={styles.detailsToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: detailsOpen }}
        accessibilityLabel="Add category, tags, and more details"
      >
        <BodySmall style={styles.detailsToggleLabel}>Add category, tags & more</BodySmall>
        <Icon
          icon={detailsOpen ? ChevronUp : ChevronDown}
          size="sm"
          color={theme.colors.text.secondary}
        />
      </Pressable>

      {detailsOpen ? (
        <View style={styles.detailsPanel}>
          <View style={styles.section}>
            <Label>Category</Label>
            <Caption color={theme.colors.text.tertiary}>Optional</Caption>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              {PLACE_CATEGORIES.map((category) => (
                <Chip
                  key={category.id}
                  label={`${category.emoji} ${category.label}`}
                  selected={categoryId === category.id}
                  onPress={() => onSelectCategory(category.id)}
                />
              ))}
            </ScrollView>
          </View>

          <View style={styles.section}>
            <Label>Amount Spent</Label>
            <Caption color={theme.colors.text.tertiary}>Optional</Caption>
            <View style={styles.chipRow}>
              {AMOUNT_SPENT_OPTIONS.map((option) => (
                <Chip
                  key={option}
                  label={option}
                  selected={amountSpent === option}
                  onPress={() => onSetAmountSpent(amountSpent === option ? null : option)}
                />
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Label>Visit Type</Label>
            <Caption color={theme.colors.text.tertiary}>Optional</Caption>
            <View style={styles.chipRow}>
              {VISIT_TYPES.map((option) => (
                <Chip
                  key={option}
                  label={option}
                  selected={visitType === option}
                  onPress={() => onSetVisitType(visitType === option ? null : option)}
                />
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Label>Would You Recommend It?</Label>
            <Caption color={theme.colors.text.tertiary}>Optional</Caption>
            <View style={styles.chipRow}>
              <Chip label="Yes" selected={wouldRecommend === true} onPress={() => onSetWouldRecommend(true)} />
              <Chip label="No" selected={wouldRecommend === false} onPress={() => onSetWouldRecommend(false)} />
            </View>
          </View>

          <View style={styles.section}>
            <Label>Who Is It Good For?</Label>
            <Caption color={theme.colors.text.tertiary}>Optional · Select any that apply</Caption>
            <View style={styles.chipRow}>
              {GOOD_FOR_TAGS.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  selected={goodForTags.includes(tag)}
                  onPress={() => onToggleGoodForTag(tag)}
                />
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Label>Vibe Tags</Label>
            <Caption color={theme.colors.text.tertiary}>Optional · Select any that apply</Caption>
            <View style={styles.chipRow}>
              {VIBE_TAGS.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  selected={vibeTags.includes(tag)}
                  onPress={() => onToggleVibeTag(tag)}
                />
              ))}
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const PHOTO_THUMB_SIZE = 64;
const PLACE_THUMB_SIZE = 48;

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.lg,
  },
  photoStripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  photoStrip: {
    gap: theme.spacing.xs,
  },
  photoThumbWrap: {
    width: PHOTO_THUMB_SIZE,
    height: PHOTO_THUMB_SIZE,
    borderRadius: theme.radius.image,
    overflow: 'hidden',
    backgroundColor: theme.colors.neutral.backgroundSecondary,
  },
  photoThumb: {
    width: '100%',
    height: '100%',
  },
  coverDot: {
    position: 'absolute',
    bottom: theme.spacing.xxs,
    right: theme.spacing.xxs,
    width: 8,
    height: 8,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.brand.primary,
    borderWidth: 1,
    borderColor: theme.colors.static.white,
  },
  editLabel: {
    fontWeight: theme.typography.weights.semiBold,
  },
  section: {
    gap: theme.spacing.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.input,
    borderWidth: theme.borders.width,
    borderColor: theme.colors.neutral.border,
    minHeight: theme.layout.listItemMinHeight,
  },
  placeRowPressed: {
    backgroundColor: theme.colors.neutral.backgroundSecondary,
  },
  placeThumb: {
    width: PLACE_THUMB_SIZE,
  },
  placeInfo: {
    flex: 1,
    gap: theme.spacing.xxs / 2,
  },
  captionInput: {
    marginTop: 0,
  },
  detailsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
  },
  detailsToggleLabel: {
    fontWeight: theme.typography.weights.semiBold,
  },
  detailsPanel: {
    gap: theme.spacing.xl,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xxs,
  },
});
