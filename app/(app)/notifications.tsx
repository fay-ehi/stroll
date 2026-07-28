/**
 * Stroll — Notification Center
 * app/(app)/notifications.tsx
 *
 * Sprint 8 Prompt 2. Builds entirely on Sprint 8 Prompt 1's existing
 * infrastructure — src/hooks/useNotifications.ts's useNotifications() /
 * useUnreadNotificationCount() / useMarkNotificationAsRead() /
 * useMarkAllNotificationsAsRead() — none of which changes this sprint
 * (this sprint's own Acceptance Criteria: "Existing notification
 * infrastructure remains unchanged").
 *
 * Reached by pushing this route (a normal (app) stack screen, not a
 * modal) — currently only from DiscoverTopBar's bell icon (see that
 * component's own diff this sprint). A back arrow, not an X, matches
 * every other (app) stack screen (experience/[id], place/[id],
 * profile/[id] all use ArrowLeft + router.back()) rather than the X the
 * codebase's *modal* screens (follows/[userId], collection-invitations)
 * use — this is a push, not a sheet.
 *
 * ── Layout, per the prompt's own "Notification Screen" section ──
 *   Top App Bar → Mark All as Read (when applicable) → Grouped
 *   Notifications → Pull-to-refresh
 *
 * ── Grouping / flattening ──
 * src/lib/notificationGrouping.ts's groupNotificationsByDate() returns
 * date sections; this screen flattens them into a single FlatList data
 * array (header rows interleaved with notification rows) rather than
 * introducing SectionList — no other screen in this codebase uses
 * SectionList, and a flattened FlatList is what every other paginated
 * list here already does (see FollowListModal, saved.tsx), so pull-to-
 * refresh/onEndReached/RefreshControl all compose the same familiar way.
 *
 * ── Read behavior ──
 * Tapping a card marks it read (skipped if already read — no point
 * re-issuing the mutation) and navigates via
 * src/lib/notificationNavigation.ts's resolveNotificationRoute(). Mark-
 * as-read is optimistic (see useMarkNotificationAsRead's own onMutate),
 * so the unread dot disappears immediately, before navigation even
 * happens — satisfies the prompt's own "Remove the unread indicator
 * immediately."
 */

import React, { useCallback, useMemo } from 'react';
import { View, Pressable, FlatList, StyleSheet, RefreshControl, ScrollView, type ListRenderItemInfo } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, WifiOff, AlertCircle, Bell } from 'lucide-react-native';

import { theme } from '@/theme';
import { ScreenContainer, H4, Button, Icon, Spinner, EmptyState } from '@/components/ui';
import { NotificationCard, NotificationSectionHeader, NotificationListSkeleton } from '@/components/notifications';
import { useAuthState } from '@/hooks/useAuth';
import { useNetworkStatus } from '@/hooks';
import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
} from '@/hooks/useNotifications';
import { groupNotificationsByDate } from '@/lib/notificationGrouping';
import { resolveNotificationRoute } from '@/lib/notificationNavigation';
import { hitSlop } from '@/theme/utils';
import type { NotificationModel } from '@/types/notification';

const HEADER_BUTTON_SIZE = 40;

// ─── Flattened row shape ────────────────────────────────────────────────────────
// One FlatList, header rows interleaved with notification rows — see
// this file's own module doc for why not SectionList.

type NotificationListRow =
  | { kind: 'header'; id: string; label: string }
  | { kind: 'item'; id: string; notification: NotificationModel };

export default function NotificationsScreen() {
  const { user } = useAuthState();
  const network = useNetworkStatus();
  const isOffline = !network.isConnected || network.isInternetReachable === false;

  const list = useNotifications(user?.id);
  const unreadCount = useUnreadNotificationCount(user?.id);
  const markAsRead = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllNotificationsAsRead();

  const rows = useMemo<NotificationListRow[]>(() => {
    const sections = groupNotificationsByDate(list.notifications);
    const flattened: NotificationListRow[] = [];
    for (const section of sections) {
      flattened.push({ kind: 'header', id: `header-${section.key}`, label: section.label });
      for (const notification of section.data) {
        flattened.push({ kind: 'item', id: notification.id, notification });
      }
    }
    return flattened;
  }, [list.notifications]);

  const handlePressNotification = useCallback(
    (notification: NotificationModel) => {
      if (!notification.isRead) {
        markAsRead.mutate({ notificationId: notification.id });
      }
      const destination = resolveNotificationRoute(notification);
      if (destination) {
        router.push(destination as never);
      }
    },
    [markAsRead],
  );

  const handleMarkAllAsRead = useCallback(() => {
    markAllAsRead.mutate();
  }, [markAllAsRead]);

  const handleEndReached = useCallback(() => {
    if (list.hasNextPage && !list.isFetchingNextPage && !list.isError) {
      list.fetchNextPage();
    }
  }, [list]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<NotificationListRow>) => {
      if (item.kind === 'header') {
        return <NotificationSectionHeader label={item.label} />;
      }
      return <NotificationCard notification={item.notification} onPress={handlePressNotification} />;
    },
    [handlePressNotification],
  );

  const keyExtractor = useCallback((item: NotificationListRow) => item.id, []);

  return (
    <ScreenContainer scroll={false} padded={false}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.headerButton}
          hitSlop={hitSlop(HEADER_BUTTON_SIZE)}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Icon icon={ArrowLeft} size="md" color={theme.colors.text.primary} />
        </Pressable>
        <H4 style={styles.headerTitle}>Notifications</H4>
        {/* Empty spacer balances the back button's width so the title stays visually centered. */}
        <View style={styles.headerButton} />
      </View>

      {unreadCount > 0 ? (
        <View style={styles.markAllRow}>
          <Button
            label="Mark all as read"
            variant="tertiary"
            size="sm"
            onPress={handleMarkAllAsRead}
            loading={markAllAsRead.isPending}
            accessibilityLabel="Mark all notifications as read"
          />
        </View>
      ) : null}

      {isOffline ? (
        <ScrollView
          contentContainerStyle={styles.centeredScroll}
          refreshControl={
            <RefreshControl
              refreshing={list.isRefetching}
              onRefresh={list.refetch}
              tintColor={theme.colors.brand.primary}
              accessibilityLabel="Pull to refresh notifications"
            />
          }
        >
          <EmptyState
            icon={WifiOff}
            title="You're offline"
            description="Connect to the internet to view your notifications."
            action={{ label: 'Try Again', onPress: list.refetch }}
          />
        </ScrollView>
      ) : list.isLoading ? (
        <NotificationListSkeleton />
      ) : list.isError ? (
        // Pull-to-refresh needs to work here too — a fresh install, a
        // just-applied migration, or a transient network blip land here
        // first, and this used to be a dead-end plain View with no
        // RefreshControl at all (only the "has data" FlatList branch
        // below had one).
        <ScrollView
          contentContainerStyle={styles.centeredScroll}
          refreshControl={
            <RefreshControl
              refreshing={list.isRefetching}
              onRefresh={list.refetch}
              tintColor={theme.colors.brand.primary}
              accessibilityLabel="Pull to refresh notifications"
            />
          }
        >
          <EmptyState
            icon={AlertCircle}
            title="We couldn't load your notifications."
            description={list.error?.userMessage ?? 'Please try again.'}
            action={{ label: 'Try Again', onPress: list.refetch }}
          />
        </ScrollView>
      ) : list.notifications.length === 0 ? (
        // Same fix as the error branch above — an empty list is exactly
        // when someone is most likely to pull down to check for
        // something new, and it silently did nothing before.
        <ScrollView
          contentContainerStyle={styles.centeredScroll}
          refreshControl={
            <RefreshControl
              refreshing={list.isRefetching}
              onRefresh={list.refetch}
              tintColor={theme.colors.brand.primary}
              accessibilityLabel="Pull to refresh notifications"
            />
          }
        >
          <EmptyState
            icon={Bell}
            title="You're all caught up"
            description="When people interact with your experiences, you'll see it here."
          />
        </ScrollView>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            list.isFetchingNextPage ? (
              <View style={styles.footer}>
                <Spinner accessibilityLabel="Loading more notifications" />
              </View>
            ) : null
          }
          refreshControl={
            <RefreshControl
              refreshing={list.isRefetching}
              onRefresh={list.refetch}
              tintColor={theme.colors.brand.primary}
              accessibilityLabel="Pull to refresh notifications"
            />
          }
          accessibilityLabel="Notifications"
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
  headerButton: {
    width: HEADER_BUTTON_SIZE,
    height: HEADER_BUTTON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  markAllRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    paddingBottom: theme.spacing.xs,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
  },
  // Used by the offline/error/empty ScrollView wrappers above — flexGrow
  // (not flex) so short content still centers vertically while the
  // ScrollView itself remains scrollable enough for RefreshControl's
  // pull gesture to register.
  centeredScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
  },
  listContent: {
    paddingHorizontal: theme.layout.screenPaddingHorizontal,
    paddingBottom: theme.spacing['4xl'],
  },
  footer: {
    paddingVertical: theme.spacing.xl,
    alignItems: 'center',
  },
});
