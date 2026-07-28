/**
 * Stroll — Notification Constants
 * src/constants/notifications.ts
 *
 * Sprint 8 Prompt 1. Static, UI-agnostic configuration for the
 * Notification domain — same "one small file per domain" convention as
 * constants/googlePlaces.ts, constants/places.ts, constants/onboarding.ts.
 * No screen reads this yet (no Notification UI this sprint), but
 * notificationsService.ts's default title-per-type and the future
 * Settings screen's category grouping both read from here rather than
 * hardcoding strings inline, so there's exactly one place to edit either.
 */

import type { NotificationType } from '@/types/notification';

// ─── Default Titles ─────────────────────────────────────────────────────────────
// The short, category-level `title` stored on every auto-generated
// notification row (distinct from `message`, which carries the specific,
// human-readable sentence — see the migration's own module doc for why
// both are stored). `system` has no single default — each system
// notification's title is supplied by its own caller (e.g. "Welcome to
// Stroll", "New Feature Available").

export const NOTIFICATION_TITLES: Record<Exclude<NotificationType, 'system'>, string> = {
  follow: 'New Follower',
  experience_like: 'New Like',
  collaboration_invitation: 'Collaboration Invitation',
  collaboration_accepted: 'Invitation Accepted',
  collaboration_removed: 'Removed from Collection',
} as const;

// ─── Notification Preferences Architecture (future-ready) ──────────────────────
// This sprint explicitly does NOT build a preferences UI or table ("Prepare
// the architecture for future notification preferences... Design the
// service so preferences can be integrated later without refactoring").
// `NOTIFICATION_PREFERENCE_CATEGORIES` is that seam: it's the grouping a
// future Settings screen would render as toggles ("Follow notifications",
// "Like notifications", "Collaboration notifications", "System
// notifications" — the exact four the prompt doc names), and it's what
// notificationsService.ts's shouldNotify() keys off internally. Adding a
// real `notification_preferences` table later only means teaching
// shouldNotify() to look one up by (userId, category) instead of always
// returning true — every call site of shouldNotify() (and every notify*
// helper that calls it) stays unchanged.

export type NotificationPreferenceCategory = 'follow' | 'like' | 'collaboration' | 'system';

export const NOTIFICATION_PREFERENCE_CATEGORIES: Record<NotificationType, NotificationPreferenceCategory> = {
  follow: 'follow',
  experience_like: 'like',
  collaboration_invitation: 'collaboration',
  collaboration_accepted: 'collaboration',
  collaboration_removed: 'collaboration',
  system: 'system',
} as const;

/** Every category a future Settings screen would render one toggle for. Derived from the map above rather than hand-listed a second time, so a new NotificationType can't silently go un-categorized. */
export const ALL_NOTIFICATION_PREFERENCE_CATEGORIES: NotificationPreferenceCategory[] = Array.from(
  new Set(Object.values(NOTIFICATION_PREFERENCE_CATEGORIES)),
);
