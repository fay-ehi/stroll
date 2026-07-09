/**
 * Stroll — Creator Section
 * src/components/experience-detail/CreatorSection.tsx
 *
 * Requirement #6 — Creator Section: "Avatar, Display name, Username,
 * Verification badge (if applicable), Bio preview, Total experiences
 * count (if available). Tapping this section should be architected for
 * future navigation to the user's public profile, but do not build the
 * public profile yet."
 *
 * "Architected for future navigation" — `onPress` is a plain required
 * prop, not baked in here as a route push, since Public Profile
 * (app/(app)/profile/[id].tsx) is an existing placeholder route with no
 * real screen behind it yet (Sprint 1 scaffold). The screen wires
 * `onPress` to a Toast placeholder for now (see
 * app/(app)/experience/[id].tsx); swapping that one line for
 * `router.push(ROUTES.app.profileDetail(creator.id))` once Public Profile
 * is built is the entire migration — nothing here needs to change.
 *
 * `totalExperiences` is optional and only rendered when present — it's
 * fetched by a separate query (useCreatorExperienceCount) that can
 * resolve after the rest of the section already painted; see
 * CreatorDetail's doc in types/experience.ts.
 */

import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { theme } from '@/theme';
import { H5, Body, BodySmall, Caption, Avatar, Icon } from '@/components/ui';
import { BadgeCheck, ChevronRight } from 'lucide-react-native';
import type { CreatorDetail } from '@/types/experience';

export interface CreatorSectionProps {
  creator: CreatorDetail;
  onPress: () => void;
}

export function CreatorSection({ creator, onPress }: CreatorSectionProps) {
  const { displayName, username, avatarUrl, isVerified, bio, totalExperiences } = creator;

  return (
    <Pressable
      onPress={onPress}
      style={styles.container}
      accessibilityRole="button"
      accessibilityLabel={`View ${displayName}'s profile`}
    >
      <Avatar source={avatarUrl ? { uri: avatarUrl } : undefined} name={displayName} size="md" />

      <View style={styles.info}>
        <View style={styles.nameRow}>
          <H5 numberOfLines={1} style={styles.name}>
            {displayName}
          </H5>
          {isVerified ? (
            <Icon
              icon={BadgeCheck}
              size="xs"
              color={theme.colors.brand.primary}
              accessibilityLabel="Verified creator"
            />
          ) : null}
        </View>

        <BodySmall numberOfLines={1} color={theme.colors.text.tertiary}>
          @{username}
        </BodySmall>

        {bio ? (
          <Body numberOfLines={2} style={styles.bio}>
            {bio}
          </Body>
        ) : null}

        {totalExperiences !== undefined ? (
          <Caption color={theme.colors.text.tertiary} style={styles.count}>
            {totalExperiences} {totalExperiences === 1 ? 'experience' : 'experiences'} shared
          </Caption>
        ) : null}
      </View>

      <Icon icon={ChevronRight} size="sm" color={theme.colors.text.tertiary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  info: {
    flex: 1,
    gap: theme.spacing.xxs,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xxs,
  },
  name: {
    flexShrink: 1,
  },
  bio: {
    marginTop: theme.spacing.xxs,
  },
  count: {
    marginTop: theme.spacing.xxs,
  },
});
