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
  'experience_opened' | 'category_selected' | 'feed_refreshed' | 'recommendation_opened';

export interface AnalyticsEventProperties {
  experience_opened: {
    experienceId: string;
    source: 'discover_feed' | 'related' | 'continue_exploring';
  };
  /** Not fired anywhere in Discover as of this sprint — category selection lives in Search now (see CategoriesRow's doc). Defined and ready for Search to call. */
  category_selected: { categoryId: string };
  feed_refreshed: { screen: 'discover' };
  recommendation_opened: { experienceId: string; recommendationType: 'continue_exploring' };
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
