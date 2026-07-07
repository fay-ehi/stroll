/**
 * Stroll — Experiences Service (Discover Repository)
 * src/services/experiencesService.ts
 *
 * Supabase operations for the Discover feed (raw joined row shape — see
 * `ExperienceFeedRow` in src/types/experience.ts). Pure async functions —
 * no UI, no Zustand, no navigation. Mirrors the Result-type pattern
 * established in placesService.ts / profileService.ts for consistency
 * across service modules.
 *
 * Named `experiencesService.ts`, not `discoverRepository.ts`, to match
 * this codebase's existing convention (authService, profileService,
 * placesService — every domain's data-access module is a "service",
 * exported from services/index.ts). It plays exactly the "Repository"
 * role this sprint's brief describes: UI-independent, the only file that
 * talks to the `experiences` table directly, reusable by any future
 * screen (Place Detail's "Experiences at this Place", a Profile's
 * "Experiences by this user", etc.) the same way placesService already is.
 *
 * This is the ONLY file that talks to the `experiences` /
 * `experience_photos` tables directly. Screens/hooks go through
 * `useDiscoverFeed.ts`.
 *
 * ── Pagination strategy ──
 * Keyset (cursor) pagination, not offset — offset pagination silently
 * skips/repeats rows when new experiences are published while a user is
 * scrolling (a near-certainty on a live feed), which keyset pagination
 * doesn't suffer from. The cursor is an opaque JSON token (see
 * `encodeCursor`/`decodeCursor`) carrying whatever columns that sort mode
 * orders by, plus `id` as a final tie-breaker so two rows with an
 * identical `created_at` (or `like_count`) never get silently dropped or
 * duplicated across a page boundary.
 */

import { supabase } from '@/lib/supabase';
import { normalizeError, makeError, type StrollError } from '@/lib/errors';
import { PAGINATION } from '@/constants/app';
import type { ExperienceFeedRow, DiscoverSortMode } from '@/types/experience';

// ─── Result Type ───────────────────────────────────────────────────────────────

export type ExperiencesResult<T> = { ok: true; data: T } | { ok: false; error: StrollError };

function ok<T>(data: T): ExperiencesResult<T> {
  return { ok: true, data };
}
function fail(err: unknown): ExperiencesResult<never> {
  return { ok: false, error: normalizeError(err) };
}

const DEFAULT_LIMIT = PAGINATION.DEFAULT_PAGE_SIZE;

// ─── Shared Select Shape ────────────────────────────────────────────────────────
// Every Discover query embeds the creator, the place, and the (unordered —
// sorted client-side in the mapper) photo set in one round trip, so the
// feed never needs a waterfall of follow-up queries per card.

const SELECT_COLUMNS = `
  id, user_id, place_id, city, story, would_recommend, amount_spent, visit_type,
  good_for_tags, vibe_tags, like_count, comment_count, featured, created_at, updated_at,
  creator:profiles(id, username, display_name, avatar_url, is_verified),
  place:places(id, name, slug, city, category, hero_image),
  experience_photos(photo_url, position)
`;

// ─── Fetch Featured Experiences ─────────────────────────────────────────────────
// Deliberately not paginated — the PRD's Featured Carousel (§8.3 "Collections
// You May Like" sibling section for Experiences) is a small curated set, the
// same reasoning fetchFeaturedPlaces() already uses for the Places domain.

export async function fetchFeaturedExperiences(params?: {
  city?: string;
  limit?: number;
}): Promise<ExperiencesResult<ExperienceFeedRow[]>> {
  try {
    let query = supabase.from('experiences').select(SELECT_COLUMNS).eq('featured', true);

    if (params?.city) query = query.eq('city', params.city);

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(params?.limit ?? DEFAULT_LIMIT);

    if (error) return fail(error);
    return ok(data as unknown as ExperienceFeedRow[]);
  } catch (err) {
    return fail(err);
  }
}

// ─── Cursors ────────────────────────────────────────────────────────────────────

interface NewestCursor {
  createdAt: string;
  id: string;
}

interface TrendingCursor {
  likeCount: number;
  createdAt: string;
  id: string;
}

/**
 * Opaque pagination token. Encoded as `encodeURIComponent(JSON.stringify(...))`
 * rather than base64 — there's no meaningful size/readability advantage to
 * base64 for a token this small, and this avoids depending on a base64
 * polyfill's exact behavior across the app's Hermes/web targets. Callers
 * must treat the result as opaque either way.
 */
function encodeCursor(payload: NewestCursor | TrendingCursor): string {
  return encodeURIComponent(JSON.stringify(payload));
}

function decodeCursor<T>(cursor: string): T | null {
  try {
    return JSON.parse(decodeURIComponent(cursor)) as T;
  } catch {
    return null;
  }
}

/**
 * Builds the PostgREST `.or()` filter string implementing composite
 * keyset ("row value") pagination: `(sortCols..., id) < (cursorCols..., cursorId)`
 * in descending order, expressed as the standard "OR of ANDs" expansion
 * since PostgREST has no native row-comparison operator.
 *
 * `columns` must be given most-significant-first and already
 * PostgREST-filter-safe (numbers, or ISO date/uuid strings — none of
 * which can contain the comma/parenthesis characters that would break
 * the filter string).
 */
function buildKeysetFilter(columns: { name: string; value: string | number }[]): string {
  const branches: string[] = [];

  for (let i = 0; i < columns.length; i++) {
    const strictColumn = columns[i]!;
    const equalPrefix = columns.slice(0, i).map((c) => `${c.name}.eq.${c.value}`);
    const clause = [...equalPrefix, `${strictColumn.name}.lt.${strictColumn.value}`];

    branches.push(clause.length === 1 ? clause[0]! : `and(${clause.join(',')})`);
  }

  return branches.join(',');
}

// ─── Fetch Discover Feed Page ────────────────────────────────────────────────────

export interface DiscoverFeedPage {
  rows: ExperienceFeedRow[];
  nextCursor: string | null;
}

export async function fetchDiscoverFeedPage(params: {
  sort: DiscoverSortMode;
  city?: string;
  cursor?: string | null;
  limit?: number;
}): Promise<ExperiencesResult<DiscoverFeedPage>> {
  try {
    const limit = params.limit ?? DEFAULT_LIMIT;

    let query = supabase.from('experiences').select(SELECT_COLUMNS);

    if (params.city) query = query.eq('city', params.city);

    if (params.cursor) {
      if (params.sort === 'newest') {
        const cursor = decodeCursor<NewestCursor>(params.cursor);
        if (!cursor) return fail(makeError('VALIDATION_ERROR', 'Invalid pagination cursor.'));
        query = query.or(
          buildKeysetFilter([
            { name: 'created_at', value: cursor.createdAt },
            { name: 'id', value: cursor.id },
          ]),
        );
      } else {
        const cursor = decodeCursor<TrendingCursor>(params.cursor);
        if (!cursor) return fail(makeError('VALIDATION_ERROR', 'Invalid pagination cursor.'));
        query = query.or(
          buildKeysetFilter([
            { name: 'like_count', value: cursor.likeCount },
            { name: 'created_at', value: cursor.createdAt },
            { name: 'id', value: cursor.id },
          ]),
        );
      }
    }

    query =
      params.sort === 'newest'
        ? query.order('created_at', { ascending: false }).order('id', { ascending: false })
        : query
            .order('like_count', { ascending: false })
            .order('created_at', { ascending: false })
            .order('id', { ascending: false });

    // Fetch one extra row to know whether a next page exists without a
    // separate count query — the common "limit + 1" trick.
    const { data, error } = await query.limit(limit + 1);

    if (error) return fail(error);

    const rows = (data as unknown as ExperienceFeedRow[]) ?? [];
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const last = page[page.length - 1];

    const nextCursor =
      hasMore && last
        ? encodeCursor(
            params.sort === 'newest'
              ? { createdAt: last.created_at, id: last.id }
              : { likeCount: last.like_count, createdAt: last.created_at, id: last.id },
          )
        : null;

    return ok({ rows: page, nextCursor });
  } catch (err) {
    return fail(err);
  }
}
