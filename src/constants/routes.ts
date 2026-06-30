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
  createCollection: '/(modals)/create-collection',
  addToCollection:  '/(modals)/add-to-collection',
  comments:         (experienceId: string) => `/(modals)/comments/${experienceId}` as const,
  placeSearch:      '/(modals)/place-search',
  share:            '/(modals)/share',
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
