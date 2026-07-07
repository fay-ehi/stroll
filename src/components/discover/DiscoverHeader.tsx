/**
 * Stroll — Discover Header
 * src/components/discover/DiscoverHeader.tsx
 *
 * This sprint's requirement #4: "greeting/header." A time-of-day greeting
 * personalized with the signed-in user's first name, plus their current
 * city — reusing ProfileModel from useProfile() (Sprint 1 Prompt 3) rather
 * than re-fetching anything. Falls back gracefully while the profile is
 * still loading or has no display name yet.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '@/theme';
import { H3, Body, Skeleton } from '@/components/ui';
import { DEFAULT_CITY } from '@/constants/app';

function greetingForHour(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function firstName(displayName: string | null | undefined): string | null {
  if (!displayName) return null;
  return displayName.trim().split(/\s+/)[0] ?? null;
}

export interface DiscoverHeaderProps {
  displayName: string | null;
  city: string | null;
  isLoading: boolean;
}

export function DiscoverHeader({ displayName, city, isLoading }: DiscoverHeaderProps) {
  const greeting = greetingForHour(new Date().getHours());
  const name = firstName(displayName);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Skeleton width="60%" height={28} />
        <Skeleton width="40%" height={18} style={styles.subtitleSkeleton} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <H3>{name ? `${greeting}, ${name} 👋` : greeting}</H3>
      <Body color={theme.colors.text.secondary}>Discovering {city ?? DEFAULT_CITY}</Body>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    gap: theme.spacing.xxs,
  },
  subtitleSkeleton: {
    marginTop: theme.spacing.xxs,
  },
});
