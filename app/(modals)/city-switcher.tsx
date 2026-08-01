/**
 * Stroll — City Switcher
 * app/(modals)/city-switcher.tsx
 *
 * Sprint 11 — Prompt 1: City Switcher, Location Permission & Nearby
 * Architecture.
 *
 * PRD §8.3: "📍 City selector: Tapping opens city switcher... Changing
 * city refreshes feed, search results, and recommendations." This
 * replaces DiscoverTopBar's placeholder ("Switching cities is coming
 * soon.") with the real feature.
 *
 * ── Selected City vs. GPS ──
 * This screen only ever touches the Selected City (`profile.city`) —
 * the content-context preference that controls Discover/Search/
 * Collections. It has nothing to do with device GPS. Per this sprint's
 * Core Philosophy, changing the Selected City here is the ONLY way that
 * value ever changes automatically-adjacent — GPS (useLocation.ts) only
 * ever *suggests* a switch via CitySwitchSuggestionBanner; it never
 * calls updateProfile itself. This screen and that banner's "Switch"
 * action both funnel through the exact same useUpdateProfile() mutation
 * below — one city-change path, not two.
 *
 * ── Why the full city list, not just the four in the PRD wireframe ──
 * The PRD's Discover-header mockup shows four illustrative cities
 * (Lagos, Abuja, Port Harcourt, Accra/Nairobi in the Sprint 11 brief's
 * own examples — the two documents don't even agree with each other).
 * Onboarding's Choose City step (app/(onboarding)/city.tsx) — which
 * PRD §8.2 describes as setting this exact same "primary discovery
 * context" — already ships against the full NIGERIAN_CITIES list with
 * search. Restricting this switcher to a handful of cities would mean a
 * person who onboarded in, say, Kano couldn't select their own city
 * back if they ever switched away from it. Reusing NIGERIAN_CITIES (and
 * the same search-list UI pattern as city.tsx) is the reading that's
 * actually consistent with what's already shipped, not a parallel
 * implementation of "pick a city."
 *
 * ── Instant apply, no separate Confirm step ──
 * Tapping a city applies immediately (same instant-apply reasoning as
 * add-to-collection.tsx) — useUpdateProfile() already writes the change
 * into the profile cache optimistically, so every screen reading
 * `profile.city` (Discover, Search, Collections) updates the moment
 * this closes, with no separate loading state for the person to wait
 * through here.
 */

import React, { useMemo, useState } from 'react';
import { View, FlatList, Pressable, StyleSheet, TextInput as RNTextInput } from 'react-native';
import { router } from 'expo-router';
import { Search, Check, X } from 'lucide-react-native';

import { theme } from '@/theme';
import { ScreenContainer, H4, Body, BodySmall, Icon } from '@/components/ui';
import { hitSlop } from '@/theme/utils';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { NIGERIAN_CITIES } from '@/constants/onboarding';

export default function CitySwitcherModal() {
  const { profile } = useProfile();
  const updateProfileMutation = useUpdateProfile();
  const [query, setQuery] = useState('');

  const currentCity = profile?.city ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return NIGERIAN_CITIES;
    return NIGERIAN_CITIES.filter((c) => c.toLowerCase().includes(q));
  }, [query]);

  const handleSelectCity = (city: string) => {
    if (city === currentCity) {
      router.back();
      return;
    }
    // Optimistic — the cache (and every screen reading profile.city)
    // updates instantly inside the mutation's onMutate, so it's safe to
    // close right away. A failure rolls back and surfaces its own error
    // toast (see useUpdateProfile), same as everywhere else this
    // mutation is used.
    updateProfileMutation.mutate({ city });
    router.back();
  };

  return (
    <ScreenContainer scroll={false} padded={false}>
      <View style={styles.header}>
        <H4>Switch City</H4>
        <Pressable
          onPress={() => router.back()}
          hitSlop={hitSlop(8)}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Icon icon={X} size="md" color={theme.colors.text.primary} />
        </Pressable>
      </View>

      <View style={styles.searchWrapper}>
        <Icon icon={Search} size="sm" color={theme.colors.text.tertiary} />
        <RNTextInput
          style={styles.searchInput}
          placeholder="Search cities"
          placeholderTextColor={theme.colors.text.tertiary}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Search cities"
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          const selected = item === currentCity;
          return (
            <Pressable
              onPress={() => handleSelectCity(item)}
              style={({ pressed }) => [
                styles.cityRow,
                selected && styles.cityRowSelected,
                pressed && styles.cityRowPressed,
              ]}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={item}
            >
              <Body
                color={selected ? theme.colors.brand.primary : theme.colors.text.primary}
                style={selected ? styles.cityLabelSelected : undefined}
              >
                {item}
              </Body>
              {selected ? <Icon icon={Check} size="sm" color={theme.colors.brand.primary} /> : null}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <BodySmall align="center" color={theme.colors.text.tertiary} style={styles.emptyText}>
            No cities match "{query}"
          </BodySmall>
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    paddingVertical: theme.spacing.md,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.neutral.backgroundSecondary,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.md,
    height: theme.layout.searchBarHeight,
    gap: theme.spacing.xs,
    marginHorizontal: theme.layout.screenPaddingHorizontal,
    marginBottom: theme.spacing.md,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: theme.typography.sizes.body,
    lineHeight: theme.typography.lineHeights.body,
    color: theme.colors.text.primary,
  },
  list: {
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    paddingBottom: theme.spacing.lg,
    gap: theme.spacing.xxs,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.input,
    minHeight: theme.layout.touchTargetMin,
  },
  cityRowSelected: {
    backgroundColor: theme.colors.neutral.backgroundSecondary,
  },
  cityRowPressed: {
    backgroundColor: theme.colors.neutral.backgroundSecondary,
    opacity: theme.opacity.heavy,
  },
  cityLabelSelected: {
    fontWeight: theme.typography.weights.semiBold,
  },
  emptyText: {
    marginTop: theme.spacing.xl,
  },
});
