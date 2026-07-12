/**
 * Stroll — Collections Featuring This Place
 * src/components/places/CollectionsFeaturingPlace.tsx
 *
 * Requirement #5 — Featured Collections Placeholder: "Reserve a section
 * titled 'Collections Featuring This Place'. Display an empty state for
 * now. Do not implement Collections yet. This section will be populated
 * during Sprint 5."
 *
 * Deliberately a dumb, static section — no query, no hook, no props
 * beyond layout. app/(app)/collections/index.tsx and collections/[id].tsx
 * are the same kind of placeholder today (see those files' own docs);
 * this is the Place Detail page's equivalent reservation, not an early
 * implementation of Collections.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Layers } from 'lucide-react-native';

import { theme } from '@/theme';
import { H5, EmptyState } from '@/components/ui';

export function CollectionsFeaturingPlace() {
  return (
    <View style={styles.container}>
      <H5 style={styles.title}>Collections Featuring This Place</H5>
      <EmptyState
        icon={Layers}
        title="No collections yet"
        description="Collections launch in a future update — this place may show up in one soon."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    marginTop: theme.spacing.xl,
  },
  title: {
    marginBottom: theme.spacing.sm,
  },
});
