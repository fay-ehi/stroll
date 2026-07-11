/**
 * Stroll — Place Step (Experience Creation)
 * src/components/experience-creation/PlaceStep.tsx
 *
 * Location Selection — reframed, per PRD §8.7, as Search + Select from
 * existing Places rather than free-text name/address/coordinates entry.
 * See types/experienceDraft.ts's module doc and usePlaces.ts's
 * `usePlaceSearch` doc for the full reasoning; in short: the real
 * `experiences` table requires a `place_id` foreign key, and the PRD is
 * explicit that place names are searched and selected, never freely
 * typed ("This prevents duplicates, misspellings, and inconsistent
 * data").
 *
 * Embedded directly inside ComposeStep.tsx (the 'compose' step — see
 * constants/experienceCreation.ts) rather than being its own wizard
 * step: this component's public contract is `{ categoryId, cityFilter,
 * selectedPlaceId, onSelect, error }`, so a future map-based picker (or
 * the real provider-backed search — see app/(modals)/place-search.tsx)
 * needs the exact same shape, and ComposeStep collapses/expands this
 * component in place rather than the wizard navigating to a whole
 * separate screen for it.
 *
 * A search+list pattern (search bar → filtered list → pressable row
 * with a Check icon on the selected item), extended with a thumbnail
 * (PlaceImage, already built for the Places domain) and a loading/empty
 * state, since this list comes from a network query.
 */

import React, { useState } from 'react';
import { View, FlatList, Pressable, StyleSheet, TextInput as RNTextInput } from 'react-native';
import { Search, Check, SearchX } from 'lucide-react-native';

import { theme } from '@/theme';
import { BodySmall, Caption, Icon, EmptyState } from '@/components/ui';
import { PlaceImage } from '@/components/places/PlaceImage';
import { PlacesListSkeleton } from '@/components/places/PlaceCardSkeleton';
import { usePlaceSearch } from '@/hooks/usePlaces';
import { getPlaceCategory, type PlaceCategoryId } from '@/constants/places';
import type { PlaceModel } from '@/types/place';
import type { DraftPlaceSummary } from '@/types/experienceDraft';

export interface PlaceStepProps {
  /** Draft's selected category, if any (chosen within ComposeStep's "more details" section) — pre-filters results per types/experienceDraft.ts's reconciliation note. */
  categoryId: PlaceCategoryId | null;
  /** The signed-in user's city, if set — search is scoped to it by default (see module doc). */
  cityFilter: string | null;
  selectedPlaceId: string | null;
  onSelect: (place: DraftPlaceSummary) => void;
  error?: string;
}

function toDraftPlaceSummary(place: PlaceModel): DraftPlaceSummary {
  return {
    id:        place.id,
    name:      place.name,
    slug:      place.slug,
    city:      place.city,
    address:   place.address,
    latitude:  place.latitude,
    longitude: place.longitude,
    category:  place.category,
    heroImage: place.heroImage,
  };
}

export function PlaceStep({ categoryId, cityFilter, selectedPlaceId, onSelect, error }: PlaceStepProps) {
  const [query, setQuery] = useState('');

  const { places, isLoading, isError, refetch } = usePlaceSearch({
    query,
    city: cityFilter ?? undefined,
    category: categoryId ?? undefined,
  });

  return (
    <View>
      {/* Search input — a plain search bar, not the shared TextInput
          component, since a search bar isn't a labeled form field. */}
      <View style={styles.searchWrapper}>
        <Icon icon={Search} size="sm" color={theme.colors.text.tertiary} />
        <RNTextInput
          style={styles.searchInput}
          placeholder="Search for a place"
          placeholderTextColor={theme.colors.text.tertiary}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Search for a place"
        />
      </View>

      {isLoading ? (
        <PlacesListSkeleton count={4} />
      ) : isError ? (
        <EmptyState
          icon={SearchX}
          title="We couldn't load places"
          description="Something went wrong. Please try again."
          action={{ label: 'Try Again', onPress: refetch, variant: 'secondary' }}
        />
      ) : (
        <FlatList
          data={places}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const selected = selectedPlaceId === item.id;
            const category = getPlaceCategory(item.category);
            return (
              <Pressable
                onPress={() => onSelect(toDraftPlaceSummary(item))}
                style={({ pressed }) => [
                  styles.row,
                  selected && styles.rowSelected,
                  pressed && styles.rowPressed,
                ]}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`${item.name}, ${item.city}`}
              >
                <PlaceImage
                  uri={item.heroImage}
                  accessibilityLabel={item.name}
                  aspectRatio={1}
                  style={styles.thumbnail}
                />
                <View style={styles.rowInfo}>
                  <BodySmall
                    numberOfLines={1}
                    color={selected ? theme.colors.brand.primary : theme.colors.text.primary}
                    style={selected ? styles.rowNameSelected : undefined}
                  >
                    {item.name}
                  </BodySmall>
                  <Caption numberOfLines={1} color={theme.colors.text.tertiary}>
                    {category ? `${category.emoji} ${category.label} · ` : ''}
                    {item.city}
                  </Caption>
                </View>
                {selected ? <Icon icon={Check} size="sm" color={theme.colors.brand.primary} /> : null}
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <BodySmall align="center" color={theme.colors.text.tertiary} style={styles.emptyText}>
              {query.trim() ? `No places match "${query}"` : 'No places found yet.'}
            </BodySmall>
          }
        />
      )}

      {error ? (
        <Caption style={styles.errorText} color={theme.colors.semantic.error}>
          {error}
        </Caption>
      ) : null}
    </View>
  );
}

const THUMBNAIL_SIZE = 48;

const styles = StyleSheet.create({
  searchWrapper: {
    flexDirection:     'row',
    alignItems:        'center',
    backgroundColor:   theme.colors.neutral.backgroundSecondary,
    borderRadius:      theme.radius.full,
    paddingHorizontal: theme.spacing.md,
    height:            theme.layout.searchBarHeight,
    gap:               theme.spacing.xs,
    marginBottom:      theme.spacing.md,
  },
  searchInput: {
    flex:   1,
    height: '100%',
    fontSize:   theme.typography.sizes.body,
    lineHeight: theme.typography.lineHeights.body,
    color:  theme.colors.text.primary,
  },
  list: {
    gap: theme.spacing.xxs,
  },
  row: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               theme.spacing.sm,
    paddingVertical:   theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius:      theme.radius.input,
    minHeight:         theme.layout.listItemMinHeight,
  },
  rowSelected: {
    backgroundColor: theme.colors.neutral.backgroundSecondary,
  },
  rowPressed: {
    backgroundColor: theme.colors.neutral.backgroundSecondary,
    opacity:         theme.opacity.heavy,
  },
  thumbnail: {
    width: THUMBNAIL_SIZE,
  },
  rowInfo: {
    flex: 1,
    gap:  theme.spacing.xxs / 2,
  },
  rowNameSelected: {
    fontWeight: theme.typography.weights.semiBold,
  },
  emptyText: {
    marginTop: theme.spacing.xl,
  },
  errorText: {
    marginTop:         theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
});
