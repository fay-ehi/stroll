/**
 * Stroll — Location Permission Card
 * src/components/discover/LocationPermissionCard.tsx
 *
 * Sprint 4 Prompt 2 — Location-Aware Nearby Experience Surfacing,
 * Requirement 1: the in-app contextual card shown BEFORE the OS system
 * permission dialog. Rendered as one item inside the Discover feed
 * itself (see useDiscoverFeed.ts's buildDiscoverFeedItems) — this is
 * what makes the prompt contextual rather than an app-launch interstitial:
 * it only enters the feed's data the first time a nearby-card slot is
 * reached, so it only appears once the person is already scrolling
 * through real content.
 *
 * Copy must stay consistent with the location section of the privacy
 * policy and with app.json's NSLocationWhenInUseUsageDescription — see
 * constants/location.ts's LOCATION_PERMISSION_COPY, the single source
 * for this card's text.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Navigation } from 'lucide-react-native';

import { theme } from '@/theme';
import { Card, Icon, H5, Body, Button } from '@/components/ui';
import { LOCATION_PERMISSION_COPY } from '@/constants/location';

export interface LocationPermissionCardProps {
  onEnable: () => void;
  onDismiss: () => void;
}

export function LocationPermissionCard({ onEnable, onDismiss }: LocationPermissionCardProps) {
  return (
    <Card variant="outlined" style={styles.card}>
      <View style={styles.iconWrap}>
        <Icon icon={Navigation} size="lg" color={theme.colors.brand.primary} />
      </View>
      <H5 align="center" style={styles.title}>
        {LOCATION_PERMISSION_COPY.title}
      </H5>
      <Body color={theme.colors.text.secondary} align="center" style={styles.body}>
        {LOCATION_PERMISSION_COPY.body}
      </Body>
      <View style={styles.actions}>
        <Button
          label={LOCATION_PERMISSION_COPY.enableLabel}
          variant="primary"
          onPress={onEnable}
          fullWidth
          accessibilityLabel={LOCATION_PERMISSION_COPY.enableLabel}
        />
        <Button
          label={LOCATION_PERMISSION_COPY.dismissLabel}
          variant="tertiary"
          onPress={onDismiss}
          fullWidth
          accessibilityLabel={`${LOCATION_PERMISSION_COPY.dismissLabel} — dismiss for this session`}
        />
      </View>
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
  actions: {
    width: '100%',
    gap: theme.spacing.xs,
  },
});
