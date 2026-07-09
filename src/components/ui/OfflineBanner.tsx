/**
 * Stroll — Offline Banner
 * src/components/ui/OfflineBanner.tsx
 *
 * Requirement #4 (Offline Experience) — "Offline indicator." Requirement
 * #9 explicitly calls out reusing the existing network status hook
 * (useNetworkStatus, Sprint 0), so this wraps it directly rather than
 * taking an `isOffline` prop — drop `<OfflineBanner />` in anywhere and
 * it renders itself only when actually offline, no wiring required at
 * each call site. Used on both Discover and Experience Details (Offline
 * Experience explicitly asks for both "Cached Discover feed" AND "Cached
 * Experience Details" to have this).
 *
 * Warning-toned, not error-toned — being offline isn't a failure of the
 * app, and error-red should stay reserved for things that are actually
 * broken (theme/colors.ts: semantic colors "communicate system status
 * only"). Background stays neutral with warning-colored icon/text/border
 * rather than a tinted warning fill — same reasoning Badge.tsx's own
 * doc comment already gives: "low-opacity semantic color isn't a token,"
 * so a translucent fill would mean inventing a color the design system
 * doesn't define, instead of composing existing tokens.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { WifiOff } from 'lucide-react-native';
import { theme } from '@/theme';
import { Caption } from './Typography';
import { Icon } from './Icon';
import { useNetworkStatus } from '@/hooks';

export function OfflineBanner() {
  const { isConnected, isInternetReachable } = useNetworkStatus();
  const isOffline = !isConnected || isInternetReachable === false;

  if (!isOffline) return null;

  return (
    <View style={styles.container} accessibilityRole="alert" accessibilityLabel="You're offline">
      <Icon icon={WifiOff} size="xs" color={theme.colors.semantic.warning} />
      <Caption color={theme.colors.semantic.warning}>
        You&apos;re offline — showing saved content
      </Caption>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xxs,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    backgroundColor: theme.colors.neutral.background,
    borderBottomWidth: theme.borders.width,
    borderBottomColor: theme.colors.semantic.warning,
  },
});
