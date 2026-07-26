/**
 * Stroll — Follow List Modal
 * app/(modals)/follows/[userId].tsx
 *
 * Sprint 6 — Prompt 1. Real, paginated data — this screen previously
 * rendered against a mock (see src/types/follow.ts's former module doc,
 * preserved in git history); src/services/followsService.ts /
 * src/hooks/useFollows.ts are now backed by the real `follows` table
 * (see supabase/migrations/sprint6_prompt1_follows.sql). Opened from
 * both the Profile tab's own stat row (app/(app)/(tabs)/profile.tsx)
 * and the Public Profile screen's stat row
 * (app/(app)/profile/[id].tsx), via the same
 * `{ pathname: '/(modals)/follows/[userId]', params: { userId, kind } }`
 * push shape.
 *
 * Each row shows the SIGNED-IN user's own follow relationship toward
 * that row's person (a Follow/Following button) — not the profile
 * owner's — the same "my relationship to each person in this list"
 * convention any social app's followers/following screen uses. A row
 * representing the signed-in user themself has no button (can't follow
 * yourself). Tapping a row (not its button) navigates to that person's
 * own Public Profile and closes this modal's place in the stack the
 * normal push way.
 */

import React, { useCallback } from 'react';
import { View, Pressable, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { X, Users, WifiOff, AlertCircle } from 'lucide-react-native';

import { theme } from '@/theme';
import { ScreenContainer, H4, Body, BodySmall, Avatar, Button, Icon, Spinner, EmptyState } from '@/components/ui';
import { useFollowers, useFollowing, useIsFollowing, useFollow } from '@/hooks/useFollows';
import { useAuthState } from '@/hooks/useAuth';
import { useNetworkStatus } from '@/hooks';
import { ROUTES } from '@/constants/routes';
import type { FollowUserPreview } from '@/types/follow';

type FollowListKind = 'followers' | 'following';

// ─── Row ────────────────────────────────────────────────────────────────────────

interface FollowListRowProps {
  person: FollowUserPreview;
  currentUserId: string | undefined;
  onPressPerson: (personId: string) => void;
}

function FollowListRow({ person, currentUserId, onPressPerson }: FollowListRowProps) {
  const isSelf = !!currentUserId && currentUserId === person.id;
  const isFollowing = useIsFollowing(person.id);
  const followMutation = useFollow();

  const handleToggleFollow = useCallback(() => {
    followMutation.mutate({ targetUserId: person.id, isFollowing });
  }, [followMutation, person.id, isFollowing]);

  return (
    <Pressable
      style={styles.row}
      onPress={() => onPressPerson(person.id)}
      accessibilityRole="link"
      accessibilityLabel={`View ${person.displayName}'s profile`}
    >
      <Avatar
        source={person.avatarUrl ? { uri: person.avatarUrl } : undefined}
        name={person.displayName}
        size="md"
      />
      <View style={styles.rowText}>
        <Body numberOfLines={1}>{person.displayName}</Body>
        <BodySmall color={theme.colors.text.tertiary} numberOfLines={1}>
          @{person.username}
        </BodySmall>
      </View>
      {isSelf || !currentUserId ? null : (
        <Button
          label={isFollowing ? 'Following' : 'Follow'}
          variant={isFollowing ? 'secondary' : 'primary'}
          size="sm"
          loading={followMutation.isPending}
          onPress={handleToggleFollow}
          accessibilityLabel={
            isFollowing ? `Unfollow ${person.displayName}` : `Follow ${person.displayName}`
          }
        />
      )}
    </Pressable>
  );
}

// ─── Screen ─────────────────────────────────────────────────────────────────────

export default function FollowListModal() {
  const { userId, kind: rawKind } = useLocalSearchParams<{ userId: string; kind: string }>();
  const kind: FollowListKind = rawKind === 'following' ? 'following' : 'followers';

  const { user } = useAuthState();
  const network = useNetworkStatus();
  const isOffline = !network.isConnected || network.isInternetReachable === false;

  // Only ONE of these is ever enabled (see useFollows.ts's useFollowers/
  // useFollowing — both no-op when passed undefined), so mounting both
  // hooks here doesn't cost a second request.
  const followers = useFollowers(kind === 'followers' ? userId : undefined);
  const following = useFollowing(kind === 'following' ? userId : undefined);
  const list = kind === 'followers' ? followers : following;

  const handlePressPerson = useCallback((personId: string) => {
    router.push(ROUTES.app.otherUserProfile(personId) as never);
  }, []);

  const handleEndReached = useCallback(() => {
    if (list.hasNextPage && !list.isFetchingNextPage && !list.isError) {
      list.fetchNextPage();
    }
  }, [list]);

  const renderItem = useCallback(
    ({ item }: { item: FollowUserPreview }) => (
      <FollowListRow person={item} currentUserId={user?.id} onPressPerson={handlePressPerson} />
    ),
    [user?.id, handlePressPerson],
  );

  const keyExtractor = useCallback((item: FollowUserPreview) => item.id, []);

  const title = kind === 'followers' ? 'Followers' : 'Following';

  return (
    <ScreenContainer scroll={false} padded={false}>
      <View style={styles.header}>
        <H4>{title}</H4>
        <Pressable
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Icon icon={X} size="md" color={theme.colors.text.primary} />
        </Pressable>
      </View>

      {isOffline ? (
        <View style={styles.centered}>
          <EmptyState
            icon={WifiOff}
            title="You're offline"
            description="Connect to the internet to view this list."
            action={{ label: 'Try Again', onPress: list.refetch }}
          />
        </View>
      ) : list.isLoading ? (
        <View style={styles.centered}>
          <Spinner accessibilityLabel={`Loading ${title.toLowerCase()}`} />
        </View>
      ) : list.isError ? (
        <View style={styles.centered}>
          <EmptyState
            icon={AlertCircle}
            title="Something went wrong"
            description={list.error?.userMessage ?? 'Please try again.'}
            action={{ label: 'Try Again', onPress: list.refetch }}
          />
        </View>
      ) : list.users.length === 0 ? (
        <View style={styles.centered}>
          <EmptyState
            icon={Users}
            title={`No ${title.toLowerCase()} yet`}
            description={
              kind === 'followers'
                ? 'No one is following this profile yet.'
                : "This profile isn't following anyone yet."
            }
          />
        </View>
      ) : (
        <FlatList
          data={list.users}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            list.isFetchingNextPage ? (
              <View style={styles.footer}>
                <Spinner accessibilityLabel={`Loading more ${title.toLowerCase()}`} />
              </View>
            ) : null
          }
          refreshControl={
            <RefreshControl
              refreshing={list.isRefetching}
              onRefresh={list.refetch}
              tintColor={theme.colors.brand.primary}
              accessibilityLabel={`Pull to refresh ${title.toLowerCase()}`}
            />
          }
          accessibilityLabel={title}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: theme.borders.width,
    borderBottomColor: theme.colors.neutral.border,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing['4xl'],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  footer: {
    paddingVertical: theme.spacing.xl,
    alignItems: 'center',
  },
});
