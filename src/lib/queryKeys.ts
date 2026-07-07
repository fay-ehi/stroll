/**
 * Stroll — Query Keys
 * src/lib/queryKeys.ts
 *
 * Centralized, typed TanStack Query key factory.
 * All query hooks must derive their keys from here — never construct
 * raw key arrays inline. This ensures:
 *   - Invalidation targets the right queries every time
 *   - Key collisions are impossible
 *   - Refactoring a key string requires one edit
 *
 * Pattern: each domain object has a factory that returns increasingly
 * specific keys. TanStack Query matches keys by prefix, so invalidating
 * `experiences.all()` also invalidates every `experiences.detail(id)`.
 *
 * Usage:
 *   import { queryKeys } from '@/lib/queryKeys';
 *
 *   // In a query hook:
 *   useQuery({
 *     queryKey: queryKeys.experiences.detail(experienceId),
 *     queryFn: () => fetchExperience(experienceId),
 *   });
 *
 *   // On mutation success (invalidate the parent list):
 *   queryClient.invalidateQueries({ queryKey: queryKeys.experiences.all() });
 */

// ─── Key Factories ─────────────────────────────────────────────────────────────

export const queryKeys = {
  // ── Experiences ─────────────────────────────────────────────────────────────
  experiences: {
    /** Matches ALL experience queries — use for broad invalidation. */
    all: () => ['experiences'] as const,
    /** Feed queries — for-you, following, city-filtered. Reserved for a
     *  later sprint's social (Following) feed — untouched by Sprint 2
     *  Prompt 1, which adds `featured` / `discover` below instead. */
    feed: (city: string, tab: 'for-you' | 'following') =>
      ['experiences', 'feed', city, tab] as const,

    /** Featured Carousel (Sprint 2 Prompt 1) — small curated set, not paginated. */
    featured: (city?: string) => ['experiences', 'featured', city ?? 'all'] as const,

    /**
     * The Discover feed's infinite scroll (Sprint 2 Prompt 1). One key per
     * (sort, city) combination — the cursor itself is NOT part of the key,
     * since TanStack Query's `useInfiniteQuery` tracks pages under a
     * single key via `pageParam`, the same way `queryKeys.places.featured`
     * doesn't encode "how many have been fetched so far" either.
     */
    discover: (sort: 'newest' | 'trending', city?: string) =>
      ['experiences', 'discover', sort, city ?? 'all'] as const,

    /** Single experience detail. */
    detail: (id: string) => ['experiences', 'detail', id] as const,
    /** Experiences attached to a place. */
    byPlace: (placeId: string) => ['experiences', 'by-place', placeId] as const,
    /** Experiences authored by a specific user. */
    byUser: (userId: string) => ['experiences', 'by-user', userId] as const,
    /** Experiences in a specific collection. */
    byCollection: (collectionId: string) => ['experiences', 'by-collection', collectionId] as const,
  },
  // ── Places ──────────────────────────────────────────────────────────────────
  // `all`, `detail`, `search` predate this addition (Sprint 0 scaffold).
  // Sprint 1 Prompt 4 adds featured/nearby/byCity/byCategory for the new
  // Places domain hooks. `category` param is kept as plain `string` (not
  // the domain's PlaceCategoryId type) so this file — otherwise entirely
  // dependency-free — doesn't have to import from the types layer just for
  // a cache-key label; callers already have the properly-typed value.
  places: {
    all: () => ['places'] as const,
    detail: (id: string) => ['places', 'detail', id] as const,
    search: (query: string) => ['places', 'search', query] as const,
    featured: (city?: string) => ['places', 'featured', city ?? 'all'] as const,
    byCity: (city: string, category?: string) =>
      ['places', 'by-city', city, category ?? 'all'] as const,
    byCategory: (category: string, city?: string) =>
      ['places', 'by-category', category, city ?? 'all'] as const,
    /**
     * Rounded to ~1km precision (2 decimal places) so repeat calls from
     * roughly the same spot — normal GPS jitter, or re-opening the same
     * screen — reuse the cached result instead of fragmenting the cache
     * with a new key for every fractional coordinate change.
     */
    nearby: (lat: number, lng: number, radiusKm: number, category?: string) =>
      [
        'places',
        'nearby',
        Math.round(lat * 100) / 100,
        Math.round(lng * 100) / 100,
        radiusKm,
        category ?? 'all',
      ] as const,
  },

  // ── Collections ─────────────────────────────────────────────────────────────
  collections: {
    all: () => ['collections'] as const,
    detail: (id: string) => ['collections', 'detail', id] as const,
    byUser: (userId: string) => ['collections', 'by-user', userId] as const,
    trending: () => ['collections', 'trending'] as const,
  },

  // ── Users / Profiles ────────────────────────────────────────────────────────
  users: {
    all: () => ['users'] as const,
    detail: (id: string) => ['users', 'detail', id] as const,
    me: () => ['users', 'me'] as const,
    followers: (id: string) => ['users', 'followers', id] as const,
    following: (id: string) => ['users', 'following', id] as const,
    suggested: () => ['users', 'suggested'] as const,
  },

  // ── Saved Places ────────────────────────────────────────────────────────────
  saved: {
    all: () => ['saved'] as const,
    places: () => ['saved', 'places'] as const,
  },

  // ── Notifications ───────────────────────────────────────────────────────────
  notifications: {
    all: () => ['notifications'] as const,
    unread: () => ['notifications', 'unread'] as const,
  },

  // ── Search ──────────────────────────────────────────────────────────────────
  search: {
    results: (query: string) => ['search', 'results', query] as const,
    trending: () => ['search', 'trending'] as const,
  },
} as const;
