/**
 * Stroll — Discover Top Bar
 * src/components/discover/DiscoverTopBar.tsx
 *
 * PRD §8.3 — Discover: "Contains a city selector and notification bell in
 * the header... 📍 City selector: tapping opens city switcher (Lagos,
 * Abuja, Port Harcourt, Ibadan)... 🔔 Notification bell: opens
 * notifications panel. Present in Discover header only."
 *
 * Replaces this sprint's earlier greeting-style DiscoverHeader — per
 * product direction (wireframe provided directly), Discover's header is
 * an app bar (city selector · "Stroll" wordmark · notification bell), not
 * a personalized greeting. No avatar shortcut here: the PRD lists exactly
 * these two interactive elements, and profile access already exists via
 * the bottom tab bar.
 *
 * Neither the city switcher nor the notifications panel exist yet (no
 * route, no screen) — both are real, tappable, give honest feedback via
 * the existing Toast system, and persist nothing, same placeholder
 * pattern as ExperienceCard's save button.
 */

import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { MapPin, ChevronDown, Bell } from 'lucide-react-native';

import { theme } from '@/theme';
import { H4, Caption, Icon } from '@/components/ui';
import { showToast } from '@/stores/toastStore';
import { hitSlop } from '@/theme/utils';

const TAP_TARGET = 40;

export interface DiscoverTopBarProps {
  city: string | null;
}

export function DiscoverTopBar({ city }: DiscoverTopBarProps) {
  const handleCityPress = () => {
    showToast({ type: 'info', message: 'Switching cities is coming soon.' });
  };

  const handleNotificationsPress = () => {
    showToast({ type: 'info', message: 'Notifications are coming soon.' });
  };

  return (
    <View style={styles.container}>
      {/* Wordmark is absolutely centered on the bar itself, so it stays
          visually centered regardless of how wide the city selector or
          bell end up (they're no longer equal width). */}
      <H4 style={styles.wordmark} pointerEvents="none">
        Stroll
      </H4>

      <Pressable
        onPress={handleCityPress}
        style={styles.cityButton}
        hitSlop={hitSlop(TAP_TARGET)}
        accessibilityRole="button"
        accessibilityLabel={city ? `Change city, currently ${city}` : 'Change city'}
      >
        <Icon icon={MapPin} size="sm" color={theme.colors.text.primary} />
        {city ? (
          <Caption numberOfLines={1} style={styles.cityLabel}>
            {city}
          </Caption>
        ) : null}
        <Icon icon={ChevronDown} size="xs" color={theme.colors.text.tertiary} />
      </Pressable>

      <Pressable
        onPress={handleNotificationsPress}
        style={styles.iconButton}
        hitSlop={hitSlop(TAP_TARGET)}
        accessibilityRole="button"
        accessibilityLabel="Notifications"
      >
        <Icon icon={Bell} size="sm" color={theme.colors.text.primary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    minHeight: TAP_TARGET,
    position: 'relative',
  },
  cityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xxs,
    maxWidth: '40%',
  },
  cityLabel: {
    flexShrink: 1,
  },
  wordmark: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    color: theme.colors.brand.primary,
  },
  iconButton: {
    width: TAP_TARGET,
    height: TAP_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
