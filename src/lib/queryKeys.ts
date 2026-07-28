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
    /** Related experiences shown on an experience's detail page (Sprint 2 Prompt 2) — keyed by the experience they're related to, not by category/city, since that's an implementation detail of how "related" is computed today. */
    related: (experienceId: string) => ['experiences', 'related', experienceId] as const,
    /** A creator's total experience count (Sprint 2 Prompt 2, Creator section). Deliberately its own key, not `byUser` — that one's reserved for a future "experiences authored by this user" *list*, a different query shape than this count. */
    creatorExperienceCount: (userId: string) => ['experiences', 'creator-count', userId] as const,
    /** "Continue Exploring" (Sprint 2 Prompt 3) — reuses fetchRelatedExperiences() under the hood (see useContinueExploring in useDiscoverFeed.ts), keyed by the category/city it's recommending from rather than a source experience id, since there's no single "source" here. */
    recommended: (category: string, city: string) =>
      ['experiences', 'recommended', category, city] as const,
    /** Experiences attached to a place. */
    byPlace: (placeId: string) => ['experiences', 'by-place', placeId] as const,
    /**
     * Sprint 4 Prompt 2 (Nearby Surfacing) — the single latest Experience
     * for a place, used to pick the one Experience a nearby card surfaces.
     * Deliberately its own key, NOT `byPlace()` above — that key backs
     * `usePlaceExperiences()`'s `useInfiniteQuery` (Place Detail's
     * "Community Experiences" list), a different cache shape
     * (`{pages, pageParams}`) than the plain single-page result this
     * reuses `fetchExperiencesByPlace()` for. Sharing one key across an
     * infinite query and a regular query would corrupt whichever one
     * reads the cache second.
     */
    byPlaceLatest: (placeId: string) => ['experiences', 'by-place-latest', placeId] as const,
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
    /** First used by Sprint 3 Prompt 2's Place step (usePlaceSearch, usePlaces.ts) — city included since results are scoped per-city there, unlike a global search would be. */
    search: (query: string, city?: string) => ['places', 'search', query, city ?? 'all'] as const,
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
    /**
     * Sprint 4 Prompt 3 (Canonical Place Resolution) — Google Autocomplete
     * suggestions for the creation wizard's Place step. Keyed by session
     * token first: a fresh token means a fresh search session (see
     * usePlaces.ts's `useGooglePlaceAutocomplete`), so there's no risk of
     * serving a previous session's cached suggestions under a new one.
     */
    autocomplete: (sessionToken: string, input: string) =>
      ['places', 'autocomplete', sessionToken, input] as const,
  },

  // ── Experience Drafts (Sprint 3 Prompt 3) ───────────────────────────────────
  // Wraps a local AsyncStorage read (experienceDraftService.ts) in TanStack
  // Query purely for consistent loading-state/caching/invalidation ergonomics
  // with everything else in this app — same rationale as `personalization`
  // below, not because it's a network request. Powers the Profile screen's
  // Drafts tile (existence + count) and the Drafts modal (the list itself).
  // A user can have any number of drafts now — `list` resolves to
  // `ExperienceDraft[]`. There's no `one` key here: the creation store
  // reads a single draft straight from experienceDraftService (see
  // experienceCreationStore.ts's `initDraft`), not through TanStack Query.
  drafts: {
    list: (userId: string) => ['drafts', 'list', userId] as const,
  },

  // ── Personalization (Sprint 2 Prompt 3) ─────────────────────────────────────
  // Not server data — wraps a local AsyncStorage read (lib/recentlyViewed.ts)
  // in TanStack Query purely for consistent loading-state/caching ergonomics
  // with everything else in this app, not because it's a network request.
  personalization: {
    frequentCategories: () => ['personalization', 'frequent-categories'] as const,
  },

  // ── Collections ─────────────────────────────────────────────────────────────
  collections: {
    all: () => ['collections'] as const,
    detail: (id: string) => ['collections', 'detail', id] as const,
    byUser: (userId: string) => ['collections', 'by-user', userId] as const,
    trending: () => ['collections', 'trending'] as const,
    /**
     * Sprint 5 Prompt 3 — the public Collections feed (requirement #1's
     * Discover carousel, and any future "All Collections" directory
     * screen paging further into the same cursor). Folded in from
     * useCollectionsCarousel.ts's own local key factory now that
     * fetchPublicCollectionsFeed() is a real query — that hook's doc
     * comment called this out as the exact follow-up step. Not `city`
     * alone — kept as its own named key (not reusing `all()`) so
     * invalidating the rest of the Collections domain doesn't need to
     * know this one is city-scoped.
     */
    feed: (city?: string) => ['collections', 'feed', city ?? 'all'] as const,
    /** Sprint 5 Prompt 3 — architecture-preparation for Search (requirement #3); no Search screen calls this yet (see collectionsService.ts's searchCollections doc). */
    search: (query: string) => ['collections', 'search', query] as const,
    /** Sprint 5 Prompt 1 — which of `userId`'s own Collections already contain `experienceId`. Backs the Add-to-Collection modal's pre-checked state (see getCollectionsContainingExperience in collectionsService.ts). */
    containing: (userId: string, experienceId: string) =>
      ['collections', 'containing', userId, experienceId] as const,
    /** Sprint 5 Prompt 2 — the full collaborator/invitation list for a Collection (every status), owner- and collaborator-visible. Backs the Manage Collaborators screen. */
    collaborators: (collectionId: string) => ['collections', 'collaborators', collectionId] as const,
    /** Sprint 5 Prompt 2 — `userId`'s own pending invitations across every Collection. Backs the Profile screen's Invitations entry point and its list modal. */
    myInvitations: (userId: string) => ['collections', 'my-invitations', userId] as const,
  },

  // ── Users / Profiles ────────────────────────────────────────────────────────
  users: {
    all: () => ['users'] as const,
    detail: (id: string) => ['users', 'detail', id] as const,
    me: () => ['users', 'me'] as const,
    followers: (id: string) => ['users', 'followers', id] as const,
    following: (id: string) => ['users', 'following', id] as const,
    /**
     * Sprint 6 Prompt 1 — every user id the SIGNED-IN user follows, as a
     * flat array. Backs every Follow/Following button's own indicator
     * (useIsFollowing) the same shared-query-with-select shape
     * queryKeys.saved.experienceIds backs useIsExperienceSaved — one
     * request no matter how many Follow buttons are mounted (a Public
     * Profile's own button, plus one per row in any open Followers/
     * Following list), each re-rendering only when ITS OWN membership
     * flips. Deliberately separate from `following(id)` above, which is
     * a different shape (paginated FULL user-preview objects for
     * *any* user's Following list screen, not just "ids the viewer
     * themself follows").
     */
    followingIds: (userId: string) => ['users', 'following-ids', userId] as const,
    suggested: () => ['users', 'suggested'] as const,
    /** Sprint 5 Prompt 2 — live-typing user search for the Invite Collaborators screen, scoped per-Collection since the eligible/blocked set (already-invited, already-collaborating) differs per Collection. */
    invitableSearch: (collectionId: string, query: string) =>
      ['users', 'invitable-search', collectionId, query] as const,
  },

  // ── Saved ────────────────────────────────────────────────────────────────────
  // `places()` predates Sprint 5 Prompt 4 and stays as inert scaffolding —
  // no code reads/writes it (Saved Places is explicitly out of scope; see
  // the Core Product Architecture ADR: "Users save Experiences, not
  // Places"). The keys below back the real Saved domain.
  saved: {
    all: () => ['saved'] as const,
    places: () => ['saved', 'places'] as const,
    /** Sprint 5 Prompt 4 — every id of an Experience the signed-in user has saved. Backs every Experience Card's saved indicator (one shared query, not one per card — see savedService.ts's module doc) and the Saved tab's Experiences section. */
    experienceIds: (userId: string) => ['saved', 'experience-ids', userId] as const,
    /** Sprint 5 Prompt 4 — same shape as `experienceIds`, for Collections. */
    collectionIds: (userId: string) => ['saved', 'collection-ids', userId] as const,
    /** Sprint 5 Prompt 4 — the Saved tab's paginated Experiences section. */
    experiences: (userId: string) => ['saved', 'experiences', userId] as const,
    /** Sprint 5 Prompt 4 — the Saved tab's paginated Collections section. */
    collections: (userId: string) => ['saved', 'collections', userId] as const,
  },

  // ── Likes ────────────────────────────────────────────────────────────────────
  // Sprint 6 Prompt 2. Same shared-ids-query shape as `saved.experienceIds` /
  // `users.followingIds` — see useLikes.ts's module doc for why one query
  // backs every heart's indicator instead of one per card.
  likes: {
    all: () => ['likes'] as const,
    /** Every experience id the signed-in user has liked. Backs every heart's own indicator (useIsLiked) and the bulk membership set (useLikedExperienceIds). */
    likedExperienceIds: (userId: string) => ['likes', 'liked-experience-ids', userId] as const,
    /**
     * A single experience's LIVE like count, read straight from the
     * `likes` table rather than `experiences.like_count` (see the
     * migration's own header comment for why) — deliberately NOT used by
     * every ExperienceCard (that would be a query per card, the exact
     * thing requirement #14 rules out). Only Experience Detail's own
     * engagement row (one screen, one experience) mounts this; every
     * other surface displays the count already embedded in whichever
     * list query rendered that card, kept in sync via useLikes.ts's
     * optimistic cache patch instead.
     */
    count: (experienceId: string) => ['likes', 'count', experienceId] as const,
  },

  // ── Notifications ───────────────────────────────────────────────────────────
  // Predated Sprint 8 Prompt 1 as inert scaffolding (`all()`/`unread()`,
  // no params, nothing read/wrote them) — now made real, same
  // "scaffolding becomes real without changing shape for existing
  // callers" pattern `saved`/`search` above went through. `unread()`
  // becomes `unreadCount(userId)` (parametrized, matching every other
  // per-user key in this file — `saved.experienceIds(userId)`,
  // `likes.likedExperienceIds(userId)`) since a bare unparametrized key
  // can't scope to "MY unread count" the way the badge needs.
  notifications: {
    /** Matches ALL of a signed-in session's notification queries — use for broad invalidation. */
    all: () => ['notifications'] as const,
    /** A user's own notifications, newest-first (useNotifications' useInfiniteQuery). */
    list: (userId: string) => ['notifications', 'list', userId] as const,
    /** The notification badge count (useUnreadNotificationCount) — deliberately its own key, not a `select` over `list(userId)`, since the badge should stay correct even before/without the full list ever being fetched. */
    unreadCount: (userId: string) => ['notifications', 'unread-count', userId] as const,
  },

  // ── Search ──────────────────────────────────────────────────────────────────
  // `results`/`trending` predate Sprint 7 Prompt 1 as inert scaffolding —
  // `results(query)` is now real (see useSearch.ts's unified query,
  // src/services/searchService.ts); `trending()` stays reserved for
  // Sprint 7 Prompt 2's own "trending searches" (explicitly out of this
  // prompt's scope).
  search: {
    results: (query: string) => ['search', 'results', query] as const,
    trending: () => ['search', 'trending'] as const,
    /**
     * Sprint 7 Prompt 1 — the user's locally-stored recent search terms
     * (see lib/recentSearches.ts). Not server data — wrapped in TanStack
     * Query purely for consistent loading-state ergonomics, same
     * reasoning as queryKeys.personalization.frequentCategories.
     */
    recent: () => ['search', 'recent'] as const,
  },
} as const;
