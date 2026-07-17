/**
 * Stroll — Route Constants
 * src/constants/routes.ts
 *
 * Single source of truth for every navigable path in the application.
 * Never hardcode a route string at a call site — always import from here.
 *
 * Usage:
 *   import { router } from 'expo-router';
 *   import { ROUTES } from '@/constants/routes';
 *
 *   router.push(ROUTES.placeDetail(placeId));
 *   router.push(ROUTES.tabs.discover);
 *
 * Structure mirrors the PRD's Navigation Architecture (§7):
 *   - (app)   → authenticated app shell, contains the 5-tab bottom nav
 *   - (auth)  → Welcome, Sign Up, Log In, Forgot Password
 *   - (modals)→ bottom sheets / full-screen modals presented over (app)
 *
 * PRD §7 Bottom Navigation (exact, 5 tabs):
 *   Discover | Search | Create | Saved | Profile
 * "Create" is the center action — it does not own a persistent screen of
 * its own the way the other four do; tapping it opens the Create
 * Experience flow as a modal (PRD §8.7: "Accessed via the centre Create
 * button in the bottom navigation").
 *
 * PRD §7 — Collections and Place Pages are explicitly NOT bottom nav items.
 * Place pages are only reachable via an Experience, a Collection, or
 * Saved Places (never a public directory / search). Collections are reached
 * via Discover's carousel, Search results, or a Profile's Collections tab.
 */

// ─── Auth Group ────────────────────────────────────────────────────────────────

export const AUTH_ROUTES = {
  welcome:        '/(auth)/welcome',
  signUp:         '/(auth)/sign-up',
  logIn:          '/(auth)/log-in',
  forgotPassword: '/(auth)/forgot-password',
} as const;

// ─── App Group — Bottom Tabs (PRD §7, exact 5) ─────────────────────────────────

export const TAB_ROUTES = {
  discover: '/(app)/(tabs)/discover',
  search:   '/(app)/(tabs)/search',
  saved:    '/(app)/(tabs)/saved',
  profile:  '/(app)/(tabs)/profile',
  // Note: "Create" intentionally has no tab route — see module doc above.
  // It is wired as a button that opens MODAL_ROUTES.createExperience.
} as const;

// ─── App Group — Stack Screens (reachable, not tab-level) ─────────────────────
// Functions because these routes require a dynamic id segment.

export const APP_ROUTES = {
  placeDetail:      (placeId: string) => `/(app)/place/${placeId}` as const,
  experienceDetail: (experienceId: string) => `/(app)/experience/${experienceId}` as const,
  collectionsFeed:  '/(app)/collections' as const,
  collectionDetail: (collectionId: string) => `/(app)/collections/${collectionId}` as const,
  otherUserProfile: (userId: string) => `/(app)/profile/${userId}` as const,
  editProfile:      '/(app)/profile/edit' as const,
  settings:         '/(app)/settings' as const,
} as const;

// ─── Modal Group ───────────────────────────────────────────────────────────────
// PRD §8 "Modals & Bottom Sheets": Add To Collection, Comment Sheet,
// Place Search, Share. Plus Create Experience itself, which the PRD
// describes as opened "via the centre Create button" — modal presentation.

export const MODAL_ROUTES = {
  createExperience: '/(modals)/create-experience',
  /**
   * Sprint 3 Prompt 3 — Edit Experience. Deliberately NOT a separate route
   * file/UI — reuses create-experience.tsx's exact same wizard, opened with
   * an `experienceId` query param it reads via useLocalSearchParams to
   * switch into edit mode (see useExperienceCreation.ts). A query param
   * rather than a `[experienceId]` path segment (the pattern `comments`
   * below uses) because this is the same screen component as
   * `createExperience` above, not a distinct one — a second dynamic-segment
   * file would just be a second entry point into identical UI.
   */
  editExperience:   (experienceId: string) => `/(modals)/create-experience?experienceId=${experienceId}` as const,
  /**
   * Resume a specific, already-saved draft — same reasoning as
   * `editExperience` above (same screen component, a query param rather
   * than a distinct route file), now that a user can have more than one
   * draft. Opened only from the Drafts tile/modal's "Resume" action.
   */
  resumeDraft:      (draftId: string) => `/(modals)/create-experience?draftId=${draftId}` as const,
  createCollection: '/(modals)/create-collection' as const,
  /**
   * Sprint 5 Prompt 1 — opened from the Add-to-Collection modal's own
   * "+ New Collection" entry (requirement #4: "Create new Collection
   * from inside the modal"). `forExperienceId`, read via
   * useLocalSearchParams, tells create-collection.tsx to add that
   * Experience to the new Collection right after creating it, then
   * navigate into Collection Detail the same way a standalone create
   * always does (requirement #3) — not back to this modal.
   */
  createCollectionForExperience: (experienceId: string) =>
    `/(modals)/create-collection?forExperienceId=${experienceId}` as const,
  /**
   * Sprint 5 Prompt 1 — was a bare, unparameterized route with no
   * caller yet (nothing in the app referenced MODAL_ROUTES.addToCollection
   * before this sprint). A required `experienceId` param is the only way
   * the modal can know which of the user's own Experiences it's adding —
   * see requirement #4.
   */
  addToCollection: (experienceId: string) => `/(modals)/add-to-collection?experienceId=${experienceId}` as const,
  comments:         (experienceId: string) => `/(modals)/comments/${experienceId}` as const,
  placeSearch:      '/(modals)/place-search',
  share:            '/(modals)/share',
  /** Sprint 3 Prompt 3 — opened only from the Profile screen's Drafts tile, never a persistent nav destination (see drafts.tsx's module doc). */
  drafts:           '/(modals)/drafts',
  /**
   * Sprint 5 Prompt 2 — Manage Collaborators. One screen serves both
   * roles reading the same collection_collaborators rows: the creator
   * sees search/invite + cancel/remove controls; an accepted
   * collaborator sees a read-only list + "Leave Collection" (see
   * app/(modals)/collection-collaborators.tsx). Opened only from
   * Collection Detail's management menu.
   */
  collectionCollaborators: (collectionId: string) =>
    `/(modals)/collection-collaborators/${collectionId}` as const,
  /**
   * Sprint 5 Prompt 2, requirement #6 — the Collection-first counterpart
   * to `addToCollection` above (Experience-first). Lists the signed-in
   * user's own published Experiences not already in this Collection, so
   * an owner or collaborator can contribute directly from Collection
   * Detail rather than going through their Profile grid.
   */
  collectionAddExperience: (collectionId: string) =>
    `/(modals)/collection-add-experience/${collectionId}` as const,
  /**
   * Sprint 5 Prompt 2 — "My Invitations": every pending invitation
   * across all of the signed-in user's Collections, with Accept/Decline.
   * Opened only from the Profile screen's Invitations pill (see
   * CollectionsRow.tsx) — deliberately not a persistent nav destination,
   * same reasoning as `drafts` above. This is the full extent of this
   * sprint's invitation-response UI; requirement #9 explicitly defers
   * the Notifications UI/push delivery this would otherwise live behind.
   */
  collectionInvitations: '/(modals)/collection-invitations',
} as const;

// ─── Combined Export ────────────────────────────────────────────────────────────

export const ROUTES = {
  auth:   AUTH_ROUTES,
  tabs:   TAB_ROUTES,
  app:    APP_ROUTES,
  modals: MODAL_ROUTES,
} as const;

// ─── Deep Linking ──────────────────────────────────────────────────────────────
// expo-router auto-generates linking config from the file system, but the
// custom scheme must be declared in app.json (already configured in Sprint 0:
// the project uses the Expo-managed `scheme` field). This constant documents
// the expected scheme for any future manual Linking.createURL() calls.

export const APP_SCHEME = 'stroll';

/**
 * Builds a deep-link-safe URL for sharing (e.g. share sheet, push notification).
 * Usage: buildShareableLink(APP_ROUTES.placeDetail(placeId))
 */
export function buildShareableLink(path: string): string {
  return `${APP_SCHEME}://${path.replace(/^\//, '')}`;
}
