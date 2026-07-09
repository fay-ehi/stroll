/**
 * Stroll — Follow List Modal (Skeleton)
 * app/(modals)/follows/[userId].tsx
 *
 * STATUS: Real screen, mock data — see src/types/follow.ts's module doc.
 * Opened from the redesigned Profile screen's stat row ("Followers" /
 * "Following"). Route params: `userId` (whose list) and `kind`
 * ('followers' | 'following') — `kind` arrives as a query param since
 * expo-router file-based routes only capture path segments in brackets,
 * and adding a second dynamic segment (`[userId]/[kind].tsx`) would be
 * more routing structure than this simple a screen needs.
 */

import React from 'react';
import { View, Pressable, FlatList, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { X, Users } from 'lucide-react-native';

import { theme } from '@/theme';
import { ScreenContainer, H4, Body, BodySmall, Avatar, Icon, Spinner, EmptyState } from '@/components/ui';
import { useFollowList } from '@/hooks/useFollows';
import type { FollowUserPreview } from '@/types/follow';

export default function FollowListModal() {
  const { userId, kind } = useLocalSearchParams<{ userId: string; kind: string }>();
  const listKind = kind === 'following' ? 'following' : 'followers';
  const { users, isLoading, isError } = useFollowList(userId, listKind);

  const renderItem = ({ item }: { item: FollowUserPreview }) => (
    <View style={styles.row}>
      <Avatar
        source={item.avatarUrl ? { uri: item.avatarUrl } : undefined}
        name={item.displayName}
        size="md"
      />
      <View style={styles.rowText}>
        <Body numberOfLines={1}>{item.displayName}</Body>
        <BodySmall color={theme.colors.text.tertiary} numberOfLines={1}>
          @{item.username}
        </BodySmall>
      </View>
    </View>
  );

  return (
    <ScreenContainer scroll={false} padded={false}>
      <View style={styles.header}>
        <H4>{listKind === 'followers' ? 'Followers' : 'Following'}</H4>
        <Pressable
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Icon icon={X} size="md" color={theme.colors.text.primary} />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <Spinner accessibilityLabel={`Loading ${listKind}`} />
        </View>
      ) : isError || users.length === 0 ? (
        <View style={styles.centered}>
          <EmptyState
            icon={Users}
            title={isError ? 'Something went wrong' : `No ${listKind} yet`}
            description={
              isError
                ? 'Please try again.'
                : listKind === 'followers'
                  ? 'No one is following this profile yet.'
                  : "This profile isn't following anyone yet."
            }
          />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
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
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    paddingBottom: theme.spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  rowText: {
    flex: 1,
  },
});
