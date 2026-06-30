/**
 * Stroll — Other User Profile
 * app/(app)/profile/[id].tsx
 *
 * PRD §8.11 — Same as My Profile, but Edit Profile is replaced by a
 * Follow/Unfollow action. Sprint 4: placeholder only.
 */

import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { PlaceholderScreen } from '@/components/placeholder/PlaceholderScreen';

export default function OtherUserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <PlaceholderScreen
      title="User Profile"
      description={`Experiences and collections for user "${id ?? 'unknown'}" will appear here.`}
    />
  );
}
