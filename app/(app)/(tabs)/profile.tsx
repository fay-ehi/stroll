/**
 * Stroll — Profile Tab
 * app/(app)/(tabs)/profile.tsx
 *
 * PRD §8.11 — My Profile: avatar, display name, city, Experiences and
 * Collections tabs, follower/following counts, Edit Profile action.
 * Sprint 4 scope: placeholder content — real profile UI still pending.
 *
 * Log Out lives here (not Settings) for now, since Settings is still a
 * placeholder (Sprint 4). Move this into Settings once that screen ships.
 */

import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { ScreenContainer, H2, Body, Button } from '@/components/ui';
import { useSignOut } from '@/hooks/useAuth';
import { theme } from '@/theme';

export default function ProfileScreen() {
  const { signOut, loading } = useSignOut();

  const confirmSignOut = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  return (
    <ScreenContainer scroll={false}>
      <View style={styles.content}>
        <H2 align="center" style={styles.title}>
          Profile
        </H2>
        <Body align="center" color={theme.colors.text.secondary}>
          Your profile, experiences, and collections will appear here.
        </Body>
      </View>

      <View style={styles.footer}>
        <Button
          label="Log out"
          variant="destructive"
          fullWidth
          loading={loading}
          onPress={confirmSignOut}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex:              1,
    alignItems:        'center',
    justifyContent:    'center',
    paddingHorizontal: theme.spacing.xl,
  },
  title: {
    marginBottom: theme.spacing.xs,
  },
  footer: {
    paddingTop:    theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
});