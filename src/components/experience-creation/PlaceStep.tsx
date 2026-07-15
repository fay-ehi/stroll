/**
 * Stroll — Place Step (Experience Creation)
 * src/components/experience-creation/PlaceStep.tsx
 *
 * Location Selection — Search + Select, per PRD §8.7, never free-text
 * name/address/coordinates entry. See types/experienceDraft.ts's module
 * doc for the full reasoning: the real `experiences` table requires a
 * `place_id` foreign key, and the PRD is explicit that place names are
 * searched and selected, never freely typed ("This prevents duplicates,
 * misspellings, and inconsistent data").
 *
 * Sprint 4 Prompt 3 (Canonical Place Resolution via Google Places): the
 * search itself is now real Google Places Autocomplete (New), not a
 * search over Stroll's own already-indexed places — see usePlaces.ts's
 * `useGooglePlaceSearch` doc and placesService.ts's `resolveGooglePlace`
 * for the full resolution flow. Selecting a suggestion doesn't select a
 * Place directly; it resolves one (reusing an existing Supabase row for
 * that Google Place ID, or creating one) and only then calls `onSelect`.
 * That round trip is why rows show a busy state instead of selecting
 * instantly.
 *
 * Embedded directly inside ComposeStep.tsx (the 'compose' step — see
 * constants/experienceCreation.ts) rather than being its own wizard
 * step, unchanged since Sprint 3: this component's public contract is
 * still `{ categoryId, cityFilter, selectedPlaceId, onSelect, error }`,
 * and ComposeStep collapses/expands this component in place rather than
 * the wizard navigating to a whole separate screen for it.
 */

import React, { useState } from 'react';
import { View, FlatList, Pressable, StyleSheet, TextInput as RNTextInput } from 'react-native';
import { Search, MapPin, SearchX } from 'lucide-react-native';

import { theme } from '@/theme';
import { BodySmall, Caption, Icon, EmptyState, Spinner } from '@/components/ui';
import { PlacesListSkeleton } from '@/components/places/PlaceCardSkeleton';
import { useGooglePlaceSearch } from '@/hooks/usePlaces';
import { GOOGLE_PLACES_COPY } from '@/constants/googlePlaces';
import type { PlaceCategoryId } from '@/constants/places';
import type { PlaceModel } from '@/types/place';
import type { DraftPlaceSummary } from '@/types/experienceDraft';
import type { GooglePlaceAutocompleteSuggestion } from '@/services/googlePlacesService';

export interface PlaceStepProps {
  /** Draft's selected category, if any (chosen within ComposeStep's "more details" section) — passed through to a newly-created Place row, since Google's Essentials-tier response has no category equivalent. See placesService.ts's `resolveGooglePlace` doc. */
  categoryId: PlaceCategoryId | null;
  /** The signed-in user's city, if set. No longer used to scope the search itself (Google Autocomplete is region-scoped to Nigeria as a whole — see constants/googlePlaces.ts) but kept in the prop contract unchanged. */
  cityFilter: string | null;
  /**
   * Kept for prop-contract stability (unchanged since Sprint 3) but
   * unused here: suggestions are unresolved Google predictions, not yet
   * Stroll Place ids, so there's nothing meaningful to compare against
   * until after a row is pressed and resolved — at which point
   * `onSelect` fires and ComposeStep collapses this component anyway.
   */
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

export function PlaceStep({ categoryId, selectedPlaceId: _selectedPlaceId, onSelect, error }: PlaceStepProps) {
  const [query, setQuery] = useState('');
  const trimmedQuery = query.trim();

  const { suggestions, isLoading, isError, refetch, resolve, resolvingPlaceId } =
    useGooglePlaceSearch(query);

  async function handleSelect(suggestion: GooglePlaceAutocompleteSuggestion) {
    const place = await resolve(suggestion, categoryId);
    if (place) onSelect(toDraftPlaceSummary(place));
  }

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

      {trimmedQuery.length === 0 ? (
        <BodySmall align="center" color={theme.colors.text.tertiary} style={styles.emptyText}>
          {GOOGLE_PLACES_COPY.searchPrompt}
        </BodySmall>
      ) : isLoading ? (
        <PlacesListSkeleton count={4} />
      ) : isError ? (
        <EmptyState
          icon={SearchX}
          title={GOOGLE_PLACES_COPY.loadFailedTitle}
          description={GOOGLE_PLACES_COPY.loadFailedDescription}
          action={{ label: 'Try Again', onPress: refetch, variant: 'secondary' }}
        />
      ) : (
        <FlatList
          data={suggestions}
          keyExtractor={(item) => item.placeId}
          scrollEnabled={false}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const isResolvingThisRow = resolvingPlaceId === item.placeId;
            const isDisabled = resolvingPlaceId !== null && !isResolvingThisRow;
            return (
              <Pressable
                onPress={() => { void handleSelect(item); }}
                disabled={resolvingPlaceId !== null}
                style={({ pressed }) => [
                  styles.row,
                  isDisabled && styles.rowDisabled,
                  pressed && !isDisabled && styles.rowPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${item.name}, ${item.secondaryText}`}
                accessibilityState={{ disabled: resolvingPlaceId !== null, busy: isResolvingThisRow }}
              >
                <View style={styles.pinWrapper}>
                  <Icon icon={MapPin} size="sm" color={theme.colors.text.tertiary} />
                </View>
                <View style={styles.rowInfo}>
                  <BodySmall numberOfLines={1} color={theme.colors.text.primary}>
                    {item.name}
                  </BodySmall>
                  {item.secondaryText ? (
                    <Caption numberOfLines={1} color={theme.colors.text.tertiary}>
                      {item.secondaryText}
                    </Caption>
                  ) : null}
                </View>
                {isResolvingThisRow ? <Spinner size="small" /> : null}
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <BodySmall align="center" color={theme.colors.text.tertiary} style={styles.emptyText}>
              {GOOGLE_PLACES_COPY.noResults(trimmedQuery)}
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

const PIN_SIZE = 36;

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
  rowDisabled: {
    opacity: theme.opacity.heavy,
  },
  rowPressed: {
    backgroundColor: theme.colors.neutral.backgroundSecondary,
    opacity:         theme.opacity.heavy,
  },
  pinWrapper: {
    width:            PIN_SIZE,
    height:           PIN_SIZE,
    borderRadius:     theme.radius.full,
    backgroundColor:  theme.colors.neutral.backgroundSecondary,
    alignItems:       'center',
    justifyContent:   'center',
  },
  rowInfo: {
    flex: 1,
    gap:  theme.spacing.xxs / 2,
  },
  emptyText: {
    marginTop: theme.spacing.xl,
  },
  errorText: {
    marginTop:         theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
});
