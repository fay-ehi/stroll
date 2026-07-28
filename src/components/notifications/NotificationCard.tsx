/**
 * Stroll — Notification Card
 * src/components/notifications/NotificationCard.tsx
 *
 * Sprint 8 Prompt 2 (Notification Center UI). Renders one row of
 * src/hooks/useNotifications.ts's useNotifications() list.
 *
 * Title and message are never recomputed here — both are rendered once
 * at creation time and stored on the row itself (see
 * notificationsService.ts's own module doc: "Notification text...is
 * rendered once at creation time and stored"). This component only
 * decides how to *present* that already-final copy: an actor avatar (or
 * a muted system icon when `actor` is null — system notifications, and
 * the future-ready `collaboration_removed`, both carry no actor), the
 * title, the message, a compact relative timestamp, and a small unread
 * dot. Deliberately no per-type color coding beyond that — the prompt's
 * own Notification Philosophy asks for "informative, not addictive" and
 * "avoid visual clutter," and the stored message text already says who
 * did what ("James liked your experience..."), so the card doesn't need
 * a second visual system layered on top to repeat it.
 *
 * Memoized per this sprint's own Performance section ("Memoized
 * notification cards") — `onPress` must be a stable callback from the
 * caller (see app/(app)/notifications.tsx's own useCallback) for this
 * memoization to actually avoid re-renders as the list scrolls/paginates.
 */

import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import {
  UserPlus,
  Heart,
  Users,
  UserCheck,
  UserMinus,
  Sparkles,
  Bell,
  type LucideIcon,
} from 'lucide-react-native';

import { theme } from '@/theme';
import { Avatar, BodySemiBold, BodySmall, Caption, Icon } from '@/components/ui';
import { formatNotificationTime } from '@/lib/notificationTime';
import type { NotificationModel, NotificationType } from '@/types/notification';

// Muted fallback icon per type — used ONLY when `actor` is null. Every
// actor-present notification always renders the real Avatar instead, so
// `follow`/`experience_like`/`collaboration_invitation`/
// `collaboration_accepted` are listed here defensively (a notification
// whose actor profile was deleted still falls back to something
// sensible — see NotificationActorRow's own doc on actor_id's `on
// delete set null`) rather than because they're expected to hit this
// path in normal use.
const TYPE_ICON_MAP: Record<NotificationType, LucideIcon> = {
  follow: UserPlus,
  experience_like: Heart,
  collaboration_invitation: Users,
  collaboration_accepted: UserCheck,
  collaboration_removed: UserMinus,
  system: Sparkles,
};

function iconForType(type: NotificationType): LucideIcon {
  return TYPE_ICON_MAP[type] ?? Bell;
}

const AVATAR_DIAMETER = 44;

// Applied as a plain object, deliberately NOT run through StyleSheet.create
// below — after many Fast Refresh cycles in one dev session, a
// StyleSheet-registered style's native id can end up stale/corrupted,
// silently dropping back to RN's column default even though the source
// clearly says `flexDirection: 'row'`. A plain inline object is applied
// directly every render with no registry involved, so it can't drift.
const ROW_LAYOUT_STYLE = {
  flexDirection: 'row' as const,
  alignItems: 'flex-start' as const,
  gap: theme.spacing.sm,
  paddingVertical: theme.spacing.sm,
};

export interface NotificationCardProps {
  notification: NotificationModel;
  /** Called with the tapped notification — the caller owns marking it read and navigating (see the screen's own handlePressNotification). */
  onPress: (notification: NotificationModel) => void;
}

function NotificationCardBase({ notification, onPress }: NotificationCardProps) {
  const { actor, title, message, isRead, createdAt, type } = notification;
  const relativeTime = formatNotificationTime(createdAt);

  const accessibilityLabel = `${title}. ${message}. ${relativeTime}${isRead ? '' : '. Unread'}`;

  return (
    <Pressable
      style={({ pressed }) => [ROW_LAYOUT_STYLE, { opacity: pressed ? 0.7 : 1 }]}
      onPress={() => onPress(notification)}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {actor ? (
        <Avatar
          source={actor.avatarUrl ? { uri: actor.avatarUrl } : undefined}
          name={actor.displayName}
          size="md"
        />
      ) : (
        <View style={styles.systemIcon}>
          <Icon icon={iconForType(type)} size="sm" color={theme.colors.text.secondary} />
        </View>
      )}

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <BodySemiBold numberOfLines={1} style={styles.title}>
            {title}
          </BodySemiBold>
          <Caption color={theme.colors.text.tertiary}>{relativeTime}</Caption>
        </View>
        <BodySmall color={theme.colors.text.secondary} numberOfLines={2}>
          {message}
        </BodySmall>
      </View>

      {!isRead ? <View style={styles.unreadDot} accessibilityElementsHidden /> : <View style={styles.unreadDotSpacer} />}
    </Pressable>
  );
}

export const NotificationCard = React.memo(NotificationCardBase);

const styles = StyleSheet.create({
  systemIcon: {
    width: AVATAR_DIAMETER,
    height: AVATAR_DIAMETER,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.neutral.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.xs,
  },
  title: {
    flex: 1,
  },
  // Small, calm indicator — Design System's own Notification Philosophy:
  // "Do not make unread notifications dramatically different." A dot,
  // not a background tint or bold-everything treatment.
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.brand.primary,
    marginTop: theme.spacing.xs,
  },
  // Reserves the same width as the dot for read notifications, so read
  // and unread rows align identically instead of text reflowing by a
  // few pixels depending on read state.
  unreadDotSpacer: {
    width: 8,
  },
});
