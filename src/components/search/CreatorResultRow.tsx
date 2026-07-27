/**
 * Stroll — Creator Result Row
 * src/components/search/CreatorResultRow.tsx
 *
 * Sprint 7 Prompt 1 — Search Foundation. The Creators results section's
 * row: "Display: Avatar, Name, Bio, Follow button."
 *
 * Modeled directly on FollowListRow (app/(modals)/follows/[userId].tsx)
 * — same Avatar + name/username + Follow/Following button shape, reusing
 * `useIsFollowing`/`useFollow` from useFollows.ts rather than a new
 * follow-state implementation — with one addition (the bio line) this
 * section's spec asks for that a Followers/Following row doesn't show.
 * Not exported from that file / made generic across both, since a
 * Followers/Following row and a Search result row differ enough in
 * "what's the extra piece of text under the name" that forcing one
 * shared component would need its own extra prop either way; a second,
 * small, obviously-related component is simpler than that abstraction
 * for this little duplication.
 *
 * A result matching the SIGNED-IN user themself never renders the Follow
 * button — mirrors FollowListRow's own `isSelf` check (the Follow domain
 * rule: "a user can never follow themselves") — defense-in-depth
 * alongside searchService.ts already excluding the signed-in user from
 * this section's query.
 */

import React, { useCallback } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';

import { theme } from '@/theme';
import { Avatar, Body, BodySmall, Button, Icon, SkeletonCircle, SkeletonText } from '@/components/ui';
import { BadgeCheck } from 'lucide-react-native';
import { useIsFollowing, useFollow } from '@/hooks/useFollows';
import { ROUTES } from '@/constants/routes';
import { HighlightedText } from './HighlightedText';
import type { CreatorSearchResult } from '@/types/search';

export interface CreatorResultRowProps {
  creator: CreatorSearchResult;
  /** The signed-in user's own id — hides the Follow button on a self-match. Undefined when signed out, which also hides the button (can't follow while signed out). */
  currentUserId: string | undefined;
  /** Sprint 7 Prompt 2 — Smart Search & Discovery, "Keyword Highlighting". See ExperienceCardProps's identical field for the full rationale; highlights the display name here. */
  highlightQuery?: string;
}

export function CreatorResultRow({ creator, currentUserId, highlightQuery }: CreatorResultRowProps) {
  const isSelf = !!currentUserId && currentUserId === creator.id;
  const isFollowing = useIsFollowing(creator.id);
  const followMutation = useFollow();

  const handlePress = useCallback(() => {
    router.push(ROUTES.app.otherUserProfile(creator.id) as never);
  }, [creator.id]);

  const handleToggleFollow = useCallback(() => {
    followMutation.mutate({ targetUserId: creator.id, isFollowing });
  }, [followMutation, creator.id, isFollowing]);

  return (
    <Pressable
      style={styles.row}
      onPress={handlePress}
      accessibilityRole="link"
      accessibilityLabel={`View ${creator.displayName}'s profile`}
    >
      <Avatar
        source={creator.avatarUrl ? { uri: creator.avatarUrl } : undefined}
        name={creator.displayName}
        size="md"
      />

      <View style={styles.textColumn}>
        <View style={styles.nameRow}>
          <Body numberOfLines={1} style={styles.name}>
            <HighlightedText text={creator.displayName} query={highlightQuery} />
          </Body>
          {creator.isVerified ? (
            <Icon
              icon={BadgeCheck}
              size="xs"
              color={theme.colors.brand.primary}
              accessibilityLabel="Verified creator"
            />
          ) : null}
        </View>
        <BodySmall color={theme.colors.text.tertiary} numberOfLines={1}>
          @{creator.username}
        </BodySmall>
        {creator.bio ? (
          <BodySmall color={theme.colors.text.secondary} numberOfLines={1} style={styles.bio}>
            {creator.bio}
          </BodySmall>
        ) : null}
      </View>

      {isSelf || !currentUserId ? null : (
        <Button
          label={isFollowing ? 'Following' : 'Follow'}
          variant={isFollowing ? 'secondary' : 'primary'}
          size="sm"
          loading={followMutation.isPending}
          onPress={handleToggleFollow}
          accessibilityLabel={
            isFollowing ? `Unfollow ${creator.displayName}` : `Follow ${creator.displayName}`
          }
        />
      )}
    </Pressable>
  );
}

/** Loading placeholder for the Creators section — see search.tsx's loading state. */
export function CreatorResultRowSkeleton() {
  return (
    <View style={styles.row}>
      <SkeletonCircle diameter={44} />
      <View style={styles.textColumn}>
        <SkeletonText width="45%" />
        <SkeletonText width="30%" />
      </View>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    minHeight: theme.layout.listItemMinHeight,
  },
  textColumn: {
    flex: 1,
    gap: 2,
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
    marginTop: 2,
  },
});
