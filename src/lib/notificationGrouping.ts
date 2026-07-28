/**
 * Stroll — Notification Date Grouping
 * src/lib/notificationGrouping.ts
 *
 * Sprint 8 Prompt 2 (Notification Center UI). Pure, presentation-only
 * grouping of a newest-first notification list into calendar sections —
 * Today / Yesterday / Earlier This Week / Earlier This Month / Earlier —
 * per the prompt's own "Notification Groups" example. "Earlier" (older
 * than the current calendar month) isn't one of the prompt's four named
 * examples, but the prompt also says every notification should land
 * somewhere sensible ("Only display sections that contain
 * notifications" implies an exhaustive partition, not an incomplete
 * one) — without it, anything older than this month would silently
 * vanish from the screen.
 *
 * Kept in its own file rather than inside src/hooks/useNotifications.ts
 * so Sprint 8 Prompt 1's own file stays exactly as shipped — this
 * sprint's own Acceptance Criteria: "Existing notification
 * infrastructure remains unchanged."
 *
 * Generic over T so it works directly against NotificationModel[]
 * without this file needing to import that type.
 */

export interface NotificationGroupSection<T> {
  /** Stable key for list rendering — one of SECTION_ORDER's values below. */
  key: string;
  /** Display label, e.g. "Today", "Earlier This Week". */
  label: string;
  data: T[];
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Monday-start week boundary — matches the prompt's own "Earlier This Week" example. */
function startOfWeek(date: Date): Date {
  const start = startOfDay(date);
  const weekday = start.getDay(); // 0 = Sunday
  const diffToMonday = weekday === 0 ? 6 : weekday - 1;
  start.setDate(start.getDate() - diffToMonday);
  return start;
}

type SectionKey = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'earlier';

const SECTION_LABELS: Record<SectionKey, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  this_week: 'Earlier This Week',
  this_month: 'Earlier This Month',
  earlier: 'Earlier',
};

// Render order — matches the prompt's own example ordering (newest section first).
const SECTION_ORDER: SectionKey[] = ['today', 'yesterday', 'this_week', 'this_month', 'earlier'];

function sectionKeyFor(createdAt: string, now: Date): SectionKey {
  const created = new Date(createdAt);
  const today = startOfDay(now);
  const createdDay = startOfDay(created);
  const dayDiff = Math.round((today.getTime() - createdDay.getTime()) / MS_PER_DAY);

  // dayDiff <= 0 covers both "actually today" and a defensive clamp for
  // clock skew (a row timestamped a few seconds in the future).
  if (dayDiff <= 0) return 'today';
  if (dayDiff === 1) return 'yesterday';
  if (createdDay.getTime() >= startOfWeek(now).getTime()) return 'this_week';
  if (created.getFullYear() === now.getFullYear() && created.getMonth() === now.getMonth()) return 'this_month';
  return 'earlier';
}

/**
 * Groups a newest-first notification list into calendar sections. Input
 * order is preserved within each section — notificationsService.ts's
 * getNotifications() (and therefore useNotifications()) always returns
 * newest-first, so this function only partitions; it never re-sorts.
 * Empty sections are omitted entirely, per the prompt's own "Only
 * display sections that contain notifications."
 *
 * `now` is injectable for deterministic testing; defaults to the real
 * current time.
 */
export function groupNotificationsByDate<T extends { createdAt: string }>(
  notifications: T[],
  now: Date = new Date(),
): NotificationGroupSection<T>[] {
  const buckets = new Map<SectionKey, T[]>();

  for (const notification of notifications) {
    const key = sectionKeyFor(notification.createdAt, now);
    const existing = buckets.get(key);
    if (existing) {
      existing.push(notification);
    } else {
      buckets.set(key, [notification]);
    }
  }

  return SECTION_ORDER.filter((key) => buckets.has(key)).map((key) => ({
    key,
    label: SECTION_LABELS[key],
    data: buckets.get(key)!,
  }));
}
