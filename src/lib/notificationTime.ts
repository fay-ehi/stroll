/**
 * Stroll — Notification Relative Time
 * src/lib/notificationTime.ts
 *
 * Sprint 8 Prompt 2 (Notification Center UI). The prompt's own
 * "Relative Time" section asks for a shorter, denser vocabulary than
 * src/utils/index.ts's existing timeAgo() produces:
 *
 *   this file    → Now, 5m, 32m, 2h, Yesterday, Monday, Jul 24
 *   timeAgo()    → just now, 5 minutes ago, 2 hours ago, Yesterday, Jan 12
 *
 * timeAgo() is used throughout the rest of the app (Experience/
 * Collection detail, comments) — changing its output format would
 * ripple across every existing caller for a change this sprint doesn't
 * need elsewhere. This is a small, standalone formatter scoped to the
 * Notification Center's own compact card layout instead.
 */

const MS_PER_MINUTE = 60 * 1000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Formats an ISO timestamp as a short, glanceable relative time per the
 * prompt's own examples. `now` is injectable for deterministic testing;
 * defaults to the real current time.
 *
 *   < 1 minute            → "Now"
 *   < 1 hour               → "{m}m"
 *   < 24 hours              → "{h}h"
 *   yesterday (calendar day) → "Yesterday"
 *   2–6 days ago             → weekday name, e.g. "Monday"
 *   older                    → "Jul 24" (adds ", {year}" only if not the current year)
 */
export function formatNotificationTime(dateIso: string, now: Date = new Date()): string {
  const created = new Date(dateIso);
  // Clamp negative diffs (clock skew / a just-inserted row racing this
  // render) to "Now" rather than surfacing a nonsensical result.
  const diffMs = Math.max(0, now.getTime() - created.getTime());

  if (diffMs < MS_PER_MINUTE) return 'Now';
  if (diffMs < MS_PER_HOUR) return `${Math.floor(diffMs / MS_PER_MINUTE)}m`;
  if (diffMs < MS_PER_DAY) return `${Math.floor(diffMs / MS_PER_HOUR)}h`;

  const today = startOfDay(now);
  const createdDay = startOfDay(created);
  const dayDiff = Math.round((today.getTime() - createdDay.getTime()) / MS_PER_DAY);

  if (dayDiff === 1) return 'Yesterday';
  if (dayDiff >= 2 && dayDiff <= 6) return WEEKDAY_NAMES[created.getDay()]!;

  const sameYear = created.getFullYear() === now.getFullYear();
  return created.toLocaleDateString('en-NG', {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}
