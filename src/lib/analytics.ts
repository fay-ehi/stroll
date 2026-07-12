/**
 * Stroll — Analytics
 * src/lib/analytics.ts
 *
 * Requirement #7 — Analytics Preparation: "Without integrating analytics
 * services yet, create reusable event helpers for future tracking...
 * provider-agnostic."
 *
 * `trackEvent()` is the ONE seam a real provider (Segment, Amplitude,
 * PostHog, Mixpanel, ...) plugs into later — swap this function's body
 * for `Analytics.track(name, properties)` and every call site in the app
 * keeps working unchanged. Until then it just `devLog`s, which is exactly
 * as useful for verifying instrumentation is wired correctly during
 * development, without pretending to send anything anywhere.
 *
 * The typed per-event helpers below (`trackExperienceOpened`, etc.) exist
 * so call sites can't typo an event name or forget a required property —
 * every call site imports a specific function, not `trackEvent` with a
 * raw string.
 */

import { devLog } from '@/lib/config';

// ─── Event Vocabulary ────────────────────────────────────────────────────────────

export type AnalyticsEventName =
  | 'experience_opened'
  | 'category_selected'
  | 'feed_refreshed'
  | 'recommendation_opened'
  | 'experience_creation_started'
  | 'experience_draft_step_completed'
  | 'experience_draft_discarded'
  | 'experience_published'
  | 'experience_edit_started'
  | 'experience_updated'
  | 'experience_deleted'
  | 'place_viewed';

export interface AnalyticsEventProperties {
  experience_opened: {
    experienceId: string;
    source: 'discover_feed' | 'related' | 'continue_exploring' | 'place_detail';
  };
  /** Not fired anywhere in Discover as of this sprint — category selection lives in Search now (see CategoriesRow's doc). Defined and ready for Search to call. */
  category_selected: { categoryId: string };
  feed_refreshed: { screen: 'discover' };
  recommendation_opened: { experienceId: string; recommendationType: 'continue_exploring' };
  /** Fired once per wizard mount when a fresh draft is created (not on Resume — see experienceCreationStore.init). */
  experience_creation_started: { draftId: string };
  /** Fired when the user successfully advances past a step's validation. */
  experience_draft_step_completed: { draftId: string; step: string };
  /** Fired from the exit-confirmation sheet's "Discard" action. */
  experience_draft_discarded: { draftId: string; step: string };
  /** Fired once, on a successful Publish (Sprint 3 Prompt 2) — not on a failed attempt, so this stays a clean "experiences created" count rather than counting retries. */
  experience_published: { draftId: string; experienceId: string; placeId: string; photoCount: number };
  /** Fired once per wizard mount when an edit session is opened (Sprint 3 Prompt 3) — the edit-mode counterpart to experience_creation_started. */
  experience_edit_started: { experienceId: string };
  /** Fired once, on a successful Save Changes to a published experience — not on a failed attempt, mirroring experience_published's own reasoning. */
  experience_updated: { experienceId: string; photoCount: number };
  /** Fired once, on a successful delete from the creator Profile grid. */
  experience_deleted: { experienceId: string };
  /** Fired once per Place Detail screen load, when the place resolves (Sprint 4 Prompt 1) — mirrors useExperienceDetail's recordExperienceView keying, so a background refetch of the same place doesn't re-fire this. */
  place_viewed: { placeId: string };
}

// ─── Core ──────────────────────────────────────────────────────────────────────

function trackEvent<TName extends AnalyticsEventName>(
  name: TName,
  properties: AnalyticsEventProperties[TName],
): void {
  devLog(`[analytics] ${name}`, properties);
}

// ─── Per-Event Helpers ───────────────────────────────────────────────────────────

export function trackExperienceOpened(
  properties: AnalyticsEventProperties['experience_opened'],
): void {
  trackEvent('experience_opened', properties);
}

export function trackPlaceViewed(properties: AnalyticsEventProperties['place_viewed']): void {
  trackEvent('place_viewed', properties);
}

export function trackCategorySelected(
  properties: AnalyticsEventProperties['category_selected'],
): void {
  trackEvent('category_selected', properties);
}

export function trackFeedRefreshed(properties: AnalyticsEventProperties['feed_refreshed']): void {
  trackEvent('feed_refreshed', properties);
}

export function trackRecommendationOpened(
  properties: AnalyticsEventProperties['recommendation_opened'],
): void {
  trackEvent('recommendation_opened', properties);
}

export function trackExperienceCreationStarted(
  properties: AnalyticsEventProperties['experience_creation_started'],
): void {
  trackEvent('experience_creation_started', properties);
}

export function trackExperienceDraftStepCompleted(
  properties: AnalyticsEventProperties['experience_draft_step_completed'],
): void {
  trackEvent('experience_draft_step_completed', properties);
}

export function trackExperienceDraftDiscarded(
  properties: AnalyticsEventProperties['experience_draft_discarded'],
): void {
  trackEvent('experience_draft_discarded', properties);
}

export function trackExperiencePublished(
  properties: AnalyticsEventProperties['experience_published'],
): void {
  trackEvent('experience_published', properties);
}

export function trackExperienceEditStarted(
  properties: AnalyticsEventProperties['experience_edit_started'],
): void {
  trackEvent('experience_edit_started', properties);
}

export function trackExperienceUpdated(
  properties: AnalyticsEventProperties['experience_updated'],
): void {
  trackEvent('experience_updated', properties);
}

export function trackExperienceDeleted(
  properties: AnalyticsEventProperties['experience_deleted'],
): void {
  trackEvent('experience_deleted', properties);
}
