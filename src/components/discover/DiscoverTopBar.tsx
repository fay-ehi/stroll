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
 * Sprint 11 Prompt 1 update: the city selector now opens the real City
 * Switcher (app/(modals)/city-switcher.tsx) instead of showing "coming
 * soon" — see that file for why it reuses the full NIGERIAN_CITIES list
 * rather than the four cities in the PRD's illustrative wireframe.
 *
 * Sprint 8 Prompt 2 update: the notification bell now opens the real
 * Notification Center (see app/(app)/notifications.tsx) instead of
 * showing "coming soon" — the screen this sprint builds needs an entry
 * point somewhere, and this bell (PRD §8.3's own "opens notifications
 * panel") is that entry point.
 *
 * Sprint 8 Prompt 3 update: the bell now carries a live unread-count
 * badge (NotificationBadge) — the count comes straight from
 * useUnreadNotificationCount(), the exact same cache
 * useRealtimeNotifications.ts (mounted once, app-wide, in AuthProvider)
 * keeps live, so this component needs no Realtime knowledge of its own;
 * it just reads the badge's number like any other query result. This is
 * also this codebase's literal stand-in for the prompt doc's "bottom
 * navigation notification icon" — Stroll's actual bottom tab bar is
 * Discover/Search/Saved/Profile only (app/(app)/(tabs)/_layout.tsx's own
 * doc, PRD §7 — no Notifications tab exists), and this bell is the
 * app's one real notification entry point (PRD §8.3), so the badge lives
 * here instead.
 */

import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { MapPin, ChevronDown, Bell } from 'lucide-react-native';

import { theme } from '@/theme';
import { H4, Caption, Icon } from '@/components/ui';
import { NotificationBadge } from '@/components/notifications';
import { useAuthStore } from '@/stores/authStore';
import { useUnreadNotificationCount } from '@/hooks/useNotifications';
import { hitSlop } from '@/theme/utils';
import { ROUTES } from '@/constants/routes';

const TAP_TARGET = 40;

export interface DiscoverTopBarProps {
  city: string | null;
}

export function DiscoverTopBar({ city }: DiscoverTopBarProps) {
  const userId = useAuthStore((s) => s.user?.id);
  const unreadCount = useUnreadNotificationCount(userId);

  const handleCityPress = () => {
    router.push(ROUTES.modals.citySwitcher as never);
  };

  const handleNotificationsPress = () => {
    router.push(ROUTES.app.notifications as never);
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
        accessibilityLabel={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
      >
        <Icon icon={Bell} size="sm" color={theme.colors.text.primary} />
        <NotificationBadge count={unreadCount} />
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
