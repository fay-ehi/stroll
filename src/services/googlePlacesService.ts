/**
 * Stroll — Google Places Service
 * src/services/googlePlacesService.ts
 *
 * Sprint 4 Prompt 3 — Canonical Place Resolution via Google Places.
 *
 * Thin wrapper around the Places API (New) REST endpoints — Autocomplete
 * (New) and Place Details (New). Pure async functions — no UI, no
 * Zustand, no Supabase. Mirrors locationService.ts's shape (a provider
 * client the Places domain's own service, placesService.ts, composes on
 * top of) and placesService.ts's Result-type pattern for consistency
 * across service modules.
 *
 * This is the ONLY file that talks to places.googleapis.com directly —
 * placesService.ts's `resolveGooglePlace()` is the only caller, and it's
 * the one that turns a resolved Google place into a Supabase `places`
 * row. See constants/googlePlaces.ts's module doc for why `displayName`
 * is deliberately never requested here (it's a Pro-tier field, not
 * Essentials) — a suggestion's name comes from the Autocomplete
 * response's own `structuredFormat.mainText` instead, which is free.
 *
 * ── Session tokens ──
 * One token per search session, reused across every keystroke
 * (`fetchAutocompleteSuggestions`), and passed one final time to the
 * single terminating `fetchPlaceDetails` call that ends the session.
 * Callers (usePlaces.ts) own the token's lifecycle — this file just
 * accepts whatever token it's given and a helper to mint a fresh one.
 * Reusing a token after it's been passed to Place Details, or never
 * passing one at all, reverts Autocomplete billing to expensive
 * per-keystroke pricing — see constants/googlePlaces.ts.
 */

import { config } from '@/lib/config';
import { normalizeError, makeError, type StrollError } from '@/lib/errors';
import { normalizeCityMatch } from '@/services/locationService';
import {
  GOOGLE_PLACES_ENDPOINTS,
  GOOGLE_PLACES_CONFIG,
  PLACE_DETAILS_FIELD_MASK,
} from '@/constants/googlePlaces';

// ─── Result Type ───────────────────────────────────────────────────────────────
// Mirrors placesService.ts's PlacesResult — kept as its own local alias
// (same shape) rather than a shared cross-service import, matching how
// every other service module in this codebase (profileService,
// placesService, ...) defines its own Result alias.

export type GooglePlacesResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: StrollError };

function ok<T>(data: T): GooglePlacesResult<T> {
  return { ok: true, data };
}
function fail(err: unknown): GooglePlacesResult<never> {
  return { ok: false, error: normalizeError(err) };
}

// ─── Session Tokens ─────────────────────────────────────────────────────────────
// Google recommends (not requires) a v4-UUID-shaped string — this is an
// opaque billing token, not parsed or validated by the caller, so a
// `crypto.randomUUID`-shaped string generated without pulling in a new
// dependency (expo-crypto, uuid) is fine, matching the same tradeoff
// utils.ts's `generateLocalId` already makes for local draft ids.

export function createAutocompleteSessionToken(): string {
  const hex = () => Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0');
  return `${hex()}-${hex().slice(0, 4)}-4${hex().slice(0, 3)}-${hex().slice(0, 4)}-${hex()}${hex().slice(0, 4)}`;
}

// ─── Fetch Helper ───────────────────────────────────────────────────────────────

async function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GOOGLE_PLACES_CONFIG.REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Google's REST error body shape — `{ error: { code, message, status } }`. Reshaped into the generic `{message, status}` shape `normalizeError` already recognizes, so HTTP-status-to-StrollError mapping is shared with every other service instead of duplicated here. */
async function toRequestError(response: Response): Promise<unknown> {
  try {
    const body = (await response.json()) as { error?: { message?: string } };
    return { message: body.error?.message ?? response.statusText, status: response.status };
  } catch {
    return { message: response.statusText || 'Google Places request failed.', status: response.status };
  }
}

function ensureApiKeyConfigured(): StrollError | null {
  if (config.googlePlaces.apiKey) return null;
  // Only reachable in development — config.ts requires this key outside
  // dev, so a missing key in staging/production would already have
  // thrown at app startup, not here.
  return makeError('SERVER_ERROR', 'EXPO_PUBLIC_GOOGLE_PLACES_API_KEY is not set.');
}

// ─── Autocomplete (New) ─────────────────────────────────────────────────────────

export interface GooglePlaceAutocompleteSuggestion {
  placeId: string;
  /** Short name (e.g. "Nike Lekki") — Autocomplete's `structuredFormat.mainText`, free to request and used as the resolved Place's `name` (see module doc: `displayName` on Place Details is Pro-tier). */
  name: string;
  /** Rest of the description (street/area/city) — `structuredFormat.secondaryText`, shown as a suggestion row's secondary line. */
  secondaryText: string;
}

interface AutocompleteApiResponse {
  suggestions?: Array<{
    placePrediction?: {
      placeId: string;
      structuredFormat?: {
        mainText?: { text?: string };
        secondaryText?: { text?: string };
      };
      text?: { text?: string };
    };
  }>;
}

export interface FetchAutocompleteSuggestionsParams {
  input: string;
  sessionToken: string;
}

export async function fetchAutocompleteSuggestions(
  params: FetchAutocompleteSuggestionsParams
): Promise<GooglePlacesResult<GooglePlaceAutocompleteSuggestion[]>> {
  const configError = ensureApiKeyConfigured();
  if (configError) return { ok: false, error: configError };

  const trimmed = params.input.trim();
  if (!trimmed) return ok([]);

  try {
    const response = await fetchWithTimeout(GOOGLE_PLACES_ENDPOINTS.AUTOCOMPLETE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': config.googlePlaces.apiKey,
      },
      body: JSON.stringify({
        input: trimmed,
        sessionToken: params.sessionToken,
        includedRegionCodes: [GOOGLE_PLACES_CONFIG.REGION_CODE],
      }),
    });

    if (!response.ok) return fail(await toRequestError(response));

    const body = (await response.json()) as AutocompleteApiResponse;
    const suggestions = (body.suggestions ?? [])
      .map((s) => s.placePrediction)
      .filter((p): p is NonNullable<typeof p> => !!p?.placeId)
      .map((p) => ({
        placeId: p.placeId,
        name: p.structuredFormat?.mainText?.text ?? p.text?.text ?? '',
        secondaryText: p.structuredFormat?.secondaryText?.text ?? '',
      }))
      .filter((s) => s.name.length > 0);

    return ok(suggestions);
  } catch (err) {
    return fail(err);
  }
}

// ─── Place Details (New) — the terminating call ─────────────────────────────────

export interface GooglePlaceDetails {
  providerPlaceId: string;
  formattedAddress: string | null;
  city: string;
  latitude: number;
  longitude: number;
}

interface PlaceDetailsApiResponse {
  id?: string;
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  addressComponents?: Array<{ longText?: string; types?: string[] }>;
}

function deriveCity(components: PlaceDetailsApiResponse['addressComponents']): string {
  const list = components ?? [];
  const candidates = GOOGLE_PLACES_CONFIG.CITY_COMPONENT_TYPES.map(
    (type) => list.find((c) => c.types?.includes(type))?.longText
  );
  // Prefer a name that matches Stroll's own supported-city list (same
  // normalization reverse-geocoding already uses — see
  // locationService.ts) so a Google-sourced Place's `city` reads
  // identically to a device-location-derived one. Falls back to
  // whatever Google returned verbatim rather than failing outright —
  // `places.city` is a required column and a place genuinely outside
  // Stroll's launch cities is still a valid tag-able Place.
  return normalizeCityMatch(candidates) ?? candidates.find((c): c is string => !!c) ?? 'Unknown';
}

export interface FetchPlaceDetailsParams {
  placeId: string;
  sessionToken: string;
}

export async function fetchPlaceDetails(
  params: FetchPlaceDetailsParams
): Promise<GooglePlacesResult<GooglePlaceDetails>> {
  const configError = ensureApiKeyConfigured();
  if (configError) return { ok: false, error: configError };

  try {
    const url = `${GOOGLE_PLACES_ENDPOINTS.PLACE_DETAILS_BASE}/${encodeURIComponent(params.placeId)}?sessionToken=${encodeURIComponent(params.sessionToken)}`;
    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': config.googlePlaces.apiKey,
        'X-Goog-FieldMask': PLACE_DETAILS_FIELD_MASK,
      },
    });

    if (!response.ok) return fail(await toRequestError(response));

    const body = (await response.json()) as PlaceDetailsApiResponse;
    if (!body.id || body.location?.latitude === undefined || body.location?.longitude === undefined) {
      return fail(makeError('SERVER_ERROR', 'Place Details response was missing required fields.'));
    }

    return ok({
      providerPlaceId: body.id,
      formattedAddress: body.formattedAddress ?? null,
      city: deriveCity(body.addressComponents),
      latitude: body.location.latitude,
      longitude: body.location.longitude,
    });
  } catch (err) {
    return fail(err);
  }
}
