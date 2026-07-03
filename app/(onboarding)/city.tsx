/**
 * Stroll — Onboarding: Choose City
 * app/(onboarding)/city.tsx
 *
 * Step 1 of 5. User picks their home city from a searchable list of
 * Nigerian cities. Required — cannot be skipped.
 *
 * PRD §8.2: "Choose City — Sets the primary discovery context. Required."
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput as RNTextInput,
} from 'react-native';
import { router } from 'expo-router';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { OnboardingStepWrapper } from '@/components/onboarding/OnboardingStepWrapper';
import { Button, Body, BodySmall, Icon } from '@/components/ui';
import { theme } from '@/theme';
import { NIGERIAN_CITIES } from '@/constants/onboarding';
import { Search, Check } from 'lucide-react-native';

export default function OnboardingCityScreen() {
  const { data, setCity, goToNextStep } = useOnboardingStore();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return NIGERIAN_CITIES;
    return NIGERIAN_CITIES.filter((c) => c.toLowerCase().includes(q));
  }, [query]);

  const handleContinue = () => {
    if (!data.city) return;
    goToNextStep();
    router.push('/(onboarding)/interests');
  };

  return (
    <OnboardingStepWrapper
      step="city"
      title="Where are you based?"
      subtitle="We'll show you experiences in your city first. You can always change this."
      showBack={false}
      footer={
        <Button
          label="Continue"
          variant="primary"
          fullWidth
          disabled={!data.city}
          onPress={handleContinue}
        />
      }
    >
      {/* Search input */}
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
          accessibilityLabel="Search Nigerian cities"
        />
      </View>

      {/* City list */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item}
        scrollEnabled={false}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const selected = data.city === item;
          return (
            <Pressable
              onPress={() => setCity(item)}
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
              {selected && (
                <Icon icon={Check} size="sm" color={theme.colors.brand.primary} />
              )}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <BodySmall
            align="center"
            color={theme.colors.text.tertiary}
            style={styles.emptyText}
          >
            No cities match "{query}"
          </BodySmall>
        }
      />
    </OnboardingStepWrapper>
  );
}

const styles = StyleSheet.create({
  searchWrapper: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: theme.colors.neutral.backgroundSecondary,
    borderRadius:    theme.radius.full,
    paddingHorizontal: theme.spacing.md,
    height:          theme.layout.searchBarHeight,
    gap:             theme.spacing.xs,
    marginBottom:    theme.spacing.md,
  },
  searchInput: {
    flex:     1,
    height:   '100%',
    ...theme.typography.sizes && {
      fontSize:   theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    color: theme.colors.text.primary,
  },
  list: {
    gap: theme.spacing.xxs,
  },
  cityRow: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius:    theme.radius.input,
    minHeight:       theme.layout.touchTargetMin,
  },
  cityRowSelected: {
    backgroundColor: theme.colors.neutral.backgroundSecondary,
  },
  cityRowPressed: {
    backgroundColor: theme.colors.neutral.backgroundSecondary,
    opacity:         theme.opacity.heavy,
  },
  cityLabelSelected: {
    fontWeight: theme.typography.weights.semiBold,
  },
  emptyText: {
    marginTop: theme.spacing.xl,
  },
});
