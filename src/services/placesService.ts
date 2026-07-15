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
 * Sprint 3 Prompt 2 added `searchPlaces()` as a deliberately interim,
 * in-table search — see its own doc comment below. Sprint 4 Prompt 3
 * (Canonical Place Resolution via Google Places) is the real provider
 * integration that comment anticipated: `resolveGooglePlace()`, at the
 * bottom of this file, is what PlaceStep.tsx now calls after a Google
 * Autocomplete selection. `searchPlaces()` itself is untouched and no
 * longer used by the creation wizard, but stays as general in-table
 * search infra for any future place-browsing feature (e.g. Discover's
 * own place search) that doesn't need provider resolution.
 */

import { supabase } from '@/lib/supabase';
import { normalizeError, type StrollError } from '@/lib/errors';
import { PAGINATION } from '@/constants/app';
import { fetchPlaceDetails, type GooglePlaceAutocompleteSuggestion } from '@/services/googlePlacesService';
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

// ─── Find Place By Provider Id ───────────────────────────────────────────────────
// Sprint 4 Prompt 3 — the dedup check `resolveGooglePlace()` runs before
// ever inserting a new row: two Experiences tagging the same real-world
// place (same Google Place ID) must resolve to the same `places` row.

export async function findPlaceByProviderId(
  providerPlaceId: string
): Promise<PlacesResult<PlaceRow | null>> {
  try {
    const { data, error } = await supabase
      .from('places')
      .select('*')
      .eq('provider_place_id', providerPlaceId)
      .maybeSingle();

    if (error) return fail(error);
    return ok(data);
  } catch (err) {
    return fail(err);
  }
}

// ─── Create Place ───────────────────────────────────────────────────────────────
// Sprint 4 Prompt 3 — the only place a new `places` row is ever written
// from client code. `slug` is deliberately omitted from the insert (left
// to whatever DB-side default/trigger already populates it for every
// existing row — see types/database.ts's `Insert.slug?` being optional),
// same as every other server-assigned column.

export interface CreatePlaceParams {
  name: string;
  city: string;
  address: string | null;
  latitude: number;
  longitude: number;
  category: PlaceCategoryId;
  providerPlaceId: string;
}

export async function createPlace(params: CreatePlaceParams): Promise<PlacesResult<PlaceRow>> {
  try {
    const { data, error } = await supabase
      .from('places')
      .insert({
        name: params.name,
        city: params.city,
        address: params.address,
        latitude: params.latitude,
        longitude: params.longitude,
        category: params.category,
        source: 'google_places',
        provider_place_id: params.providerPlaceId,
      })
      .select('*')
      .single();

    if (error) return fail(error);
    return ok(data);
  } catch (err) {
    return fail(err);
  }
}

// ─── Resolve Google Place (Sprint 4 Prompt 3) ────────────────────────────────────
// The heart of this prompt: turns a selected Google Autocomplete
// suggestion into one canonical `places` row, never a fresh row per
// Experience. Owns the full round trip — the terminating Place Details
// (New) call (via googlePlacesService, this file's only provider
// dependency), the existing-row check, and the insert — so PlaceStep.tsx
// calls one function and gets back a real, persisted PlaceRow either way.
//
// Race handling: two users resolving the same real-world place at
// nearly the same moment can both pass the `findPlaceByProviderId` check
// before either has inserted. If the `places` table has (or gets) a
// unique constraint on `provider_place_id` — the correct schema for this
// prompt's whole premise — the loser's insert fails with Postgres' unique
// violation code ('23505'); rather than surfacing that as an error, this
// re-queries and returns the winner's row, so the caller only ever sees
// success with one canonical Place, regardless of which request lost
// the race.

const POSTGRES_UNIQUE_VIOLATION = '23505';

export interface ResolveGooglePlaceParams {
  suggestion: GooglePlaceAutocompleteSuggestion;
  sessionToken: string;
  /** The draft's currently-selected category, if any — the required `places.category` column has no equivalent on Google's Essentials-tier response, so this is the best available signal. Falls back to 'attractions', matching toPlaceModel's own fallback for unrecognized categories. */
  categoryId: PlaceCategoryId | null;
}

export async function resolveGooglePlace(
  params: ResolveGooglePlaceParams
): Promise<PlacesResult<PlaceRow>> {
  const detailsResult = await fetchPlaceDetails({
    placeId: params.suggestion.placeId,
    sessionToken: params.sessionToken,
  });
  if (!detailsResult.ok) return { ok: false, error: detailsResult.error };
  const details = detailsResult.data;

  const existing = await findPlaceByProviderId(details.providerPlaceId);
  if (!existing.ok) return existing;
  if (existing.data) return ok(existing.data);

  const created = await createPlace({
    name: params.suggestion.name,
    city: details.city,
    address: details.formattedAddress,
    latitude: details.latitude,
    longitude: details.longitude,
    category: params.categoryId ?? 'attractions',
    providerPlaceId: details.providerPlaceId,
  });

  if (!created.ok && isUniqueViolation(created.error)) {
    const winner = await findPlaceByProviderId(details.providerPlaceId);
    if (winner.ok && winner.data) return ok(winner.data);
  }

  return created;
}

function isUniqueViolation(error: StrollError): boolean {
  const original = error.originalError;
  return (
    typeof original === 'object' &&
    original !== null &&
    'code' in original &&
    (original as { code?: unknown }).code === POSTGRES_UNIQUE_VIOLATION
  );
}