/**
 * Stroll — Nearby Location Denied Card
 * src/components/discover/NearbyLocationDeniedCard.tsx
 *
 * Sprint 11 — Prompt 1, "Nearby Section Behaviour": once location
 * permission has actually been denied, the Nearby slot should not just
 * disappear — it should teach the person the feature exists instead of
 * hiding it entirely. Rendered at the first eligible feed slot when
 * permission is denied (see useDiscoverFeed.ts's buildDiscoverFeedItems),
 * at most once per session (locationStore.deniedCardShownThisSession) —
 * same never-nag rule as LocationPermissionCard.
 *
 * Distinct from LocationPermissionCard: that one triggers the OS
 * dialog directly (permission is still undetermined). Once denied,
 * requestForegroundPermissionsAsync() won't show the system dialog
 * again — only the device Settings app can change it — so this card's
 * action opens Settings instead (Linking.openSettings(), same pattern
 * PhotoGridPicker.tsx already uses for denied photo-library access).
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MapPin } from 'lucide-react-native';

import { theme } from '@/theme';
import { Card, Icon, H5, Body, Button } from '@/components/ui';
import { LOCATION_DENIED_COPY } from '@/constants/location';

export interface NearbyLocationDeniedCardProps {
  onOpenSettings: () => void;
}

export function NearbyLocationDeniedCard({ onOpenSettings }: NearbyLocationDeniedCardProps) {
  return (
    <Card variant="outlined" style={styles.card}>
      <View style={styles.iconWrap}>
        <Icon icon={MapPin} size="lg" color={theme.colors.brand.primary} />
      </View>
      <H5 align="center" style={styles.title}>
        {LOCATION_DENIED_COPY.title}
      </H5>
      <Body color={theme.colors.text.secondary} align="center" style={styles.body}>
        {LOCATION_DENIED_COPY.body}
      </Body>
      <Button
        label={LOCATION_DENIED_COPY.actionLabel}
        variant="primary"
        onPress={onOpenSettings}
        fullWidth
        accessibilityLabel={LOCATION_DENIED_COPY.actionLabel}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.neutral.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xxs,
  },
  title: {
    textAlign: 'center',
  },
  body: {
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
});
