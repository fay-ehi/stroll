/**
 * Stroll — City Switch Suggestion Banner
 * src/components/discover/CitySwitchSuggestionBanner.tsx
 *
 * Sprint 4 Prompt 2 — Location-Aware Nearby Experience Surfacing,
 * Requirement 4: a dismissible, non-blocking banner at the top of the
 * feed when the reverse-geocoded city differs from the active city
 * filter. Deliberately NOT a new filter/tab/screen — see this
 * component's caller (discover.tsx) for how "Switch" reuses the
 * existing city-change path (useUpdateProfile) rather than introducing
 * a parallel one.
 *
 * Rendered as a fixed (non-scrolling) element above the FlatList, the
 * same way OfflineBanner is — see ForYouFeed.tsx.
 */

import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { MapPin, X } from 'lucide-react-native';

import { theme } from '@/theme';
import { Icon, BodySmall } from '@/components/ui';
import { hitSlop } from '@/theme/utils';
import { citySwitchSuggestionMessage } from '@/constants/location';

export interface CitySwitchSuggestionBannerProps {
  /** The reverse-geocoded city the person is currently in — not the active filter. */
  city: string;
  onSwitch: () => void;
  onDismiss: () => void;
}

export function CitySwitchSuggestionBanner({ city, onSwitch, onDismiss }: CitySwitchSuggestionBannerProps) {
  const message = citySwitchSuggestionMessage(city);

  return (
    <View style={styles.container} accessibilityRole="alert" accessibilityLabel={message}>
      <Icon icon={MapPin} size="sm" color={theme.colors.brand.primary} />
      <BodySmall color={theme.colors.text.primary} style={styles.message} numberOfLines={2}>
        {message}
      </BodySmall>
      <Pressable
        onPress={onSwitch}
        hitSlop={hitSlop(8)}
        accessibilityRole="button"
        accessibilityLabel={`Switch your feed to ${city}`}
      >
        <BodySmall color={theme.colors.brand.primary} style={styles.switchLabel}>
          Switch
        </BodySmall>
      </Pressable>
      <Pressable
        onPress={onDismiss}
        hitSlop={hitSlop(20)}
        accessibilityRole="button"
        accessibilityLabel="Dismiss suggestion"
      >
        <Icon icon={X} size="sm" color={theme.colors.text.tertiary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.neutral.background,
    borderBottomWidth: theme.borders.width,
    borderBottomColor: theme.colors.neutral.divider,
  },
  message: {
    flex: 1,
  },
  switchLabel: {
    fontWeight: theme.typography.weights.semiBold,
  },
});
