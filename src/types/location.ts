/**
 * Stroll — Location Domain Types
 * src/types/location.ts
 *
 * Sprint 4 Prompt 2 — Location-Aware Nearby Experience Surfacing.
 *
 * Unlike Place/Experience, there's no raw-row-to-model mapper here —
 * nothing in this file comes from a single Supabase table. `NearbyExperienceModel`
 * is a composed value built by useNearbyExperiences.ts from TWO existing
 * domains it doesn't own (a PlaceModel's distance + an ExperienceCardModel),
 * not a new persisted entity — so there's no "row" shape to mirror.
 */

import type { ExperienceCardModel } from './experience';

// ─── Permission ─────────────────────────────────────────────────────────────────

/**
 * Mirrors expo-location's own PermissionStatus values ('granted' |
 * 'denied' | 'undetermined') as our own type, so nothing outside
 * useLocation.ts / locationService.ts needs to import expo-location
 * directly just to type a permission check.
 */
export type LocationPermissionStatus = 'undetermined' | 'granted' | 'denied';

// ─── Coordinates ────────────────────────────────────────────────────────────────

export interface Coordinates {
  latitude: number;
  longitude: number;
}

// ─── Nearby Experience ──────────────────────────────────────────────────────────

/**
 * One nearby card's worth of data: the Experience to render (via the
 * existing ExperienceCard, wrapped by NearbyExperienceCard) plus the
 * distance from the device's current fix, in kilometers — sourced
 * directly from the `nearby_places` RPC's own distance calculation
 * (PlaceModel.distanceKm), never recomputed client-side.
 */
export interface NearbyExperienceModel {
  placeId: string;
  distanceKm: number;
  experience: ExperienceCardModel;
}
