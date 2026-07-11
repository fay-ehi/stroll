/**
 * Stroll — Utility Functions
 * src/utils/index.ts
 *
 * Pure, reusable helpers with no side effects and no imports from
 * the rest of the Stroll codebase (except constants). Safe to import
 * anywhere including tests.
 *
 * Utilities are grouped into:
 *   date     — formatting and relative times
 *   currency — Nigerian naira formatting (PRD target market)
 *   string   — text truncation, initials, slugs
 *   validate — form input validation
 *   platform — device/OS detection helpers
 *   array    — common array transforms
 */

import { Platform } from 'react-native';

// ─── Date Utilities ────────────────────────────────────────────────────────────

/**
 * Returns a human-readable relative time string.
 * Examples: "just now", "2 minutes ago", "3 hours ago", "Yesterday", "Jan 12"
 */
export function timeAgo(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffS = Math.floor(diffMs / 1000);
  const diffM = Math.floor(diffS / 60);
  const diffH = Math.floor(diffM / 60);
  const diffD = Math.floor(diffH / 24);

  if (diffS < 30) return 'just now';
  if (diffS < 60) return `${diffS} seconds ago`;
  if (diffM < 60) return diffM === 1 ? '1 minute ago' : `${diffM} minutes ago`;
  if (diffH < 24) return diffH === 1 ? '1 hour ago' : `${diffH} hours ago`;
  if (diffD === 1) return 'Yesterday';
  if (diffD < 7) return `${diffD} days ago`;

  return formatDate(d);
}

/**
 * Formats a date as "Jan 12" or "Jan 12, 2024" if not current year.
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const opts: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    ...(d.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
  };
  return d.toLocaleDateString('en-NG', opts);
}

/**
 * Formats a date as "Monday, January 12" for detail screens.
 */
export function formatDateLong(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-NG', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

// ─── Currency Utilities ────────────────────────────────────────────────────────

/**
 * Formats a number as Nigerian naira.
 * Examples: 5000 → "₦5,000" | 1500000 → "₦1,500,000"
 */
export function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString('en-NG')}`;
}

/**
 * Parses the AmountSpent range label into a sortable midpoint for display.
 * "₦5,000 – ₦10,000" → 7500
 */
export function amountSpentToMidpoint(label: string): number {
  // Strip currency symbols, commas, spaces; extract numbers.
  const numbers = label
    .replace(/₦/g, '')
    .replace(/,/g, '')
    .split(/[\s–\-+]+/)
    .map(Number)
    .filter((n) => !isNaN(n) && n > 0);

  if (numbers.length === 0) return 0;
  if (numbers.length === 1) {
    // "₦50,000+" — treat as 75,000 for sorting
    return (numbers[0] ?? 0) * 1.5;
  }
  return ((numbers[0] ?? 0) + (numbers[1] ?? 0)) / 2;
}

// ─── String Utilities ──────────────────────────────────────────────────────────

/**
 * Truncates text to maxLength characters, appending an ellipsis if needed.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

/**
 * Derives initials from a display name (1–2 characters).
 * "Ada Obi" → "AO" | "Temi" → "T" | "" → "?"
 */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return (parts[0]![0] ?? '').toUpperCase();
  return ((parts[0]![0] ?? '') + (parts[parts.length - 1]![0] ?? '')).toUpperCase();
}

/**
 * Capitalizes the first letter of a string.
 */
export function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Converts a string to a URL-safe slug.
 * "Best Date Spots In Lagos" → "best-date-spots-in-lagos"
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Formats a follower/experience count for display.
 * 1000 → "1K" | 1500 → "1.5K" | 1000000 → "1M"
 */
export function formatCount(count: number): string {
  if (count < 1000) return String(count);
  if (count < 10_000) return `${(count / 1000).toFixed(1)}K`;
  if (count < 1_000_000) return `${Math.floor(count / 1000)}K`;
  return `${(count / 1_000_000).toFixed(1)}M`;
}

// ─── Validation Utilities ──────────────────────────────────────────────────────

export const VALIDATION = {
  /**
   * Valid email per RFC 5322 (simplified).
   */
  isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  },

  /**
   * Username: 3–30 chars, alphanumeric + underscores, no leading/trailing underscore.
   */
  isValidUsername(username: string): boolean {
    return /^[a-zA-Z0-9][a-zA-Z0-9_]{1,28}[a-zA-Z0-9]$/.test(username);
  },

  /**
   * Password: minimum 8 characters.
   * Deliberately not over-complex — password managers handle complexity.
   */
  isValidPassword(password: string): boolean {
    return password.length >= 8;
  },

  /**
   * Display name: 1–50 characters, not empty or only whitespace.
   */
  isValidDisplayName(name: string): boolean {
    return name.trim().length >= 1 && name.trim().length <= 50;
  },

  /**
   * Bio: optional, up to PROFILE_LIMITS.MAX_BIO_LENGTH characters.
   * An empty/undefined bio is always valid — bio is not required.
   */
  isValidBio(bio: string | null | undefined, maxLength: number): boolean {
    if (!bio) return true;
    return bio.length <= maxLength;
  },

  /**
   * City: must be one of the app's supported cities (or empty/undefined —
   * city is not required to update a profile, only to complete onboarding).
   */
  isValidCity(city: string | null | undefined, availableCities: readonly string[]): boolean {
    if (!city) return true;
    return availableCities.includes(city);
  },

  /**
   * Interests: when provided, must be within the min/max selection count
   * allowed for onboarding/profile interest tags.
   */
  isValidInterests(interests: string[], min: number, max: number): boolean {
    return interests.length >= min && interests.length <= max;
  },

  /**
   * Avatar MIME type: must be one of the app's accepted image types.
   */
  isValidAvatarMimeType(mimeType: string, acceptedTypes: readonly string[]): boolean {
    return acceptedTypes.includes(mimeType);
  },

  /**
   * Avatar file size: must not exceed the configured maximum, in bytes.
   */
  isValidAvatarFileSize(sizeBytes: number, maxBytes: number): boolean {
    return sizeBytes > 0 && sizeBytes <= maxBytes;
  },

  /**
   * UUID v1–v5 (Supabase's `uuid` primary key format). Used to reject an
   * obviously-malformed id (e.g. a garbled deep link) before it ever
   * reaches the network — see fetchExperienceById() in
   * experiencesService.ts.
   */
  isValidUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  },

  /**
   * Generic bounded-text check: trims, then requires length within
   * [min, max]. Used by domain validators (e.g. an experience draft's
   * title/description in types/experienceDraft.ts) that need the same
   * shape of check `isValidDisplayName`/`isValidBio` already apply, but
   * for a field whose limits live in a different constants object —
   * kept here instead of copy-pasting the trim+length-check pattern a
   * third time.
   */
  isWithinLength(value: string, min: number, max: number): boolean {
    const trimmed = value.trim();
    return trimmed.length >= min && trimmed.length <= max;
  },
} as const;

// ─── Platform Utilities ────────────────────────────────────────────────────────

export const PLATFORM = {
  isIOS: Platform.OS === 'ios',
  isAndroid: Platform.OS === 'android',
  isWeb: Platform.OS === 'web',

  /**
   * Returns the platform-appropriate value.
   * Usage: PLATFORM.select({ ios: 'padding', android: 'height' })
   */
  select<T>(options: { ios?: T; android?: T; web?: T; default?: T }): T | undefined {
    if (Platform.OS === 'ios' && options.ios !== undefined) return options.ios;
    if (Platform.OS === 'android' && options.android !== undefined) return options.android;
    if (Platform.OS === 'web' && options.web !== undefined) return options.web;
    return options.default;
  },
} as const;

// ─── Id Utilities ───────────────────────────────────────────────────────────────

/**
 * Generates a client-side-only unique id for records that don't have a
 * server-assigned id yet (e.g. a local Experience Draft — see
 * types/experienceDraft.ts — before it's ever synced to Supabase).
 *
 * Deliberately NOT a UUID — `VALIDATION.isValidUuid` exists specifically
 * to recognize Supabase's server-assigned uuid primary keys, and a local
 * id should be visually distinguishable from one so a future sync bug
 * (accidentally treating a local id as a real row id) fails loudly
 * instead of silently querying Supabase with a well-formed-looking uuid
 * that just happens not to exist. No new dependency (e.g. `expo-crypto`,
 * `uuid`) is warranted for what's otherwise a one-line generator.
 */
export function generateLocalId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}${random}`;
}

// ─── Array Utilities ───────────────────────────────────────────────────────────

/**
 * Removes duplicate values from an array using a key selector.
 * Usage: uniqueBy(experiences, e => e.placeId)
 */
export function uniqueBy<T>(arr: T[], key: (item: T) => unknown): T[] {
  const seen = new Set<unknown>();
  return arr.filter((item) => {
    const k = key(item);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/**
 * Splits an array into chunks of the given size.
 * Usage: chunk([1,2,3,4,5], 2) → [[1,2],[3,4],[5]]
 */
export function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}
