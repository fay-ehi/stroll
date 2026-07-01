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
    all:    ()                    => ['experiences'] as const,
    /** Feed queries — for-you, following, city-filtered. */
   feed:   (city: string, tab: 'for-you' | 'following') =>
                              ['experiences', 'feed', city, tab] as const,

    /** Single experience detail. */
    detail: (id: string)          => ['experiences', 'detail', id] as const,
    /** Experiences attached to a place. */
    byPlace:(placeId: string)     => ['experiences', 'by-place', placeId] as const,
    /** Experiences authored by a specific user. */
    byUser: (userId: string)      => ['experiences', 'by-user', userId] as const,
    /** Experiences in a specific collection. */
  byCollection: (collectionId: string) =>
                              ['experiences', 'by-collection', collectionId] as const,
  },
  // ── Places ──────────────────────────────────────────────────────────────────
  places: {
    all:    ()                    => ['places'] as const,
    detail: (id: string)          => ['places', 'detail', id] as const,
    search: (query: string)       => ['places', 'search', query] as const,
  },

  // ── Collections ─────────────────────────────────────────────────────────────
  collections: {
    all:    ()                    => ['collections'] as const,
    detail: (id: string)          => ['collections', 'detail', id] as const,
    byUser: (userId: string)      => ['collections', 'by-user', userId] as const,
    trending: ()                  => ['collections', 'trending'] as const,
  },

  // ── Users / Profiles ────────────────────────────────────────────────────────
  users: {
    all:         ()               => ['users'] as const,
    detail:      (id: string)     => ['users', 'detail', id] as const,
    me:          ()               => ['users', 'me'] as const,
    followers:   (id: string)     => ['users', 'followers', id] as const,
    following:   (id: string)     => ['users', 'following', id] as const,
    suggested:   ()               => ['users', 'suggested'] as const,
  },

  // ── Saved Places ────────────────────────────────────────────────────────────
  saved: {
    all:    ()                    => ['saved'] as const,
    places: ()                    => ['saved', 'places'] as const,
  },

  // ── Notifications ───────────────────────────────────────────────────────────
  notifications: {
    all:    ()                    => ['notifications'] as const,
    unread: ()                    => ['notifications', 'unread'] as const,
  },

  // ── Search ──────────────────────────────────────────────────────────────────
  search: {
    results: (query: string)      => ['search', 'results', query] as const,
    trending: ()                  => ['search', 'trending'] as const,
  },
} as const;
