/**
 * Stroll — Places Service
 * src/services/placesService.ts
 *
 * Supabase operations for places (raw DB row shape — snake_case).
 * Pure async functions — no UI, no Zustand, no navigation. Mirrors the
 * Result-type pattern established in profileService.ts for consistency
 * across service modules.
 *
 * This is the ONLY file that talks to the `places` table or the
 * `nearby_places` RPC directly. Screens/hooks go through `usePlaces.ts`.
 *
 * Sprint 3 Prompt 2 adds `searchPlaces()` — the first use of
 * `queryKeys.places.search`, reserved since the Sprint 0 scaffold. This
 * is deliberately a search over places already indexed in THIS table,
 * not the real PRD §8.7 Place Search (an external Google Places/Mapbox
 * lookup) — that's still Sprint 4 scope; see app/(modals)/place-search.tsx's
 * own doc comment. Framing it this way (rather than quietly expanding
 * this sprint into a provider integration) keeps this an interim,
 * swappable implementation: PlaceStep.tsx (the caller) only depends on
 * this function's signature, so replacing the body with a real provider
 * call in Sprint 4 doesn't touch the wizard at all.
 */

import { supabase } from '@/lib/supabase';
import { normalizeError, type StrollError } from '@/lib/errors';
import { PAGINATION } from '@/constants/app';
import type { PlaceRow } from '@/types/place';
import type { PlaceCategoryId } from '@/constants/places';

// ─── Result Type ───────────────────────────────────────────────────────────────

export type PlacesResult<T> =
  | { ok: true;  data: T }
  | { ok: false; error: StrollError };

function ok<T>(data: T): PlacesResult<T> {
  return { ok: true, data };
}
function fail(err: unknown): PlacesResult<never> {
  return { ok: false, error: normalizeError(err) };
}

const DEFAULT_LIMIT = PAGINATION.DEFAULT_PAGE_SIZE;

/** A place row extended with the RPC-computed distance from the search point. */
export interface PlaceRowWithDistance extends PlaceRow {
  distance_km: number;
}

// ─── Fetch Featured Places ─────────────────────────────────────────────────────

export async function fetchFeaturedPlaces(params?: {
  city?:  string;
  limit?: number;
}): Promise<PlacesResult<PlaceRow[]>> {
  try {
    let query = supabase
      .from('places')
      .select('*')
      .eq('featured', true);

    if (params?.city) query = query.eq('city', params.city);

    const { data, error } = await query
      .order('experience_count', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(params?.limit ?? DEFAULT_LIMIT);

    if (error) return fail(error);
    return ok(data);
  } catch (err) {
    return fail(err);
  }
}

// ─── Fetch Nearby Places ────────────────────────────────────────────────────────

const DEFAULT_RADIUS_KM = 10;

export async function fetchNearbyPlaces(params: {
  latitude:  number;
  longitude: number;
  radiusKm?: number;
  category?: PlaceCategoryId;
  limit?:    number;
}): Promise<PlacesResult<PlaceRowWithDistance[]>> {
  try {
    const { data, error } = await supabase.rpc('nearby_places', {
      lat:             params.latitude,
      lng:             params.longitude,
      radius_km:       params.radiusKm ?? DEFAULT_RADIUS_KM,
      max_results:     params.limit ?? DEFAULT_LIMIT,
      category_filter: params.category ?? null,
    });

    if (error) return fail(error);
    return ok(data);
  } catch (err) {
    return fail(err);
  }
}

// ─── Fetch Places By City ───────────────────────────────────────────────────────

export async function fetchPlacesByCity(params: {
  city:      string;
  category?: PlaceCategoryId;
  limit?:    number;
}): Promise<PlacesResult<PlaceRow[]>> {
  try {
    let query = supabase
      .from('places')
      .select('*')
      .eq('city', params.city);

    if (params.category) query = query.eq('category', params.category);

    const { data, error } = await query
      .order('name', { ascending: true })
      .limit(params.limit ?? DEFAULT_LIMIT);

    if (error) return fail(error);
    return ok(data);
  } catch (err) {
    return fail(err);
  }
}

// ─── Fetch Places By Category ───────────────────────────────────────────────────

export async function fetchPlacesByCategory(params: {
  category: PlaceCategoryId;
  city?:    string;
  limit?:   number;
}): Promise<PlacesResult<PlaceRow[]>> {
  try {
    let query = supabase
      .from('places')
      .select('*')
      .eq('category', params.category);

    if (params.city) query = query.eq('city', params.city);

    const { data, error } = await query
      .order('name', { ascending: true })
      .limit(params.limit ?? DEFAULT_LIMIT);

    if (error) return fail(error);
    return ok(data);
  } catch (err) {
    return fail(err);
  }
}

// ─── Fetch Place By Id ───────────────────────────────────────────────────────────

export async function fetchPlaceById(
  id: string
): Promise<PlacesResult<PlaceRow | null>> {
  try {
    const { data, error } = await supabase
      .from('places')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) return fail(error);
    return ok(data);
  } catch (err) {
    return fail(err);
  }
}

// ─── Search Places (Sprint 3 Prompt 2 — Experience Creation's Place step) ────────
// See this file's module doc for why this is an interim, in-table search
// rather than the real PRD §8.7 provider-backed Place Search.

export interface SearchPlacesParams {
  /** Empty/whitespace-only query returns a browsable default list (alphabetical) instead of no results — a blank search field shouldn't read as "nothing to show". */
  query:     string;
  city?:     string;
  category?: PlaceCategoryId;
  limit?:    number;
}

export async function searchPlaces(params: SearchPlacesParams): Promise<PlacesResult<PlaceRow[]>> {
  try {
    const trimmed = params.query.trim();

    let query = supabase.from('places').select('*');

    if (trimmed) {
      // Actively searching by name: name match is the whole point, so
      // it's the ONLY filter applied. Originally this also AND-ed in
      // `.eq('city', ...)` / `.eq('category', ...)` whenever they were
      // provided — but those are plain-text/enum equality checks, and a
      // profile city like "Abuja" vs. a place row stored as "abuja" (or
      // any other casing/formatting drift) silently zeroed out the
      // entire result set even for an exact, correct name match. A
      // search bar should never come back empty just because of an
      // unrelated filter the user can't see or control.
      query = query.ilike('name', `%${trimmed}%`).order('experience_count', { ascending: false });
    } else {
      // Browsing (no query yet): city/category are safe here since
      // there's no name match they could contradict — worst case is an
      // empty *browse* list, not a broken search.
      if (params.city) query = query.ilike('city', params.city);
      if (params.category) query = query.eq('category', params.category);
      query = query.order('name', { ascending: true });
    }

    const { data, error } = await query.limit(params.limit ?? DEFAULT_LIMIT);

    if (error) return fail(error);
    return ok(data);
  } catch (err) {
    return fail(err);
  }
}