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
 * `experience_photos` tables directly, and — as of Sprint 3 Prompt 2 —
 * the ONLY file that talks to the `EXPERIENCE_BUCKET` storage bucket
 * (mirrors profileService.ts owning `AVATAR_BUCKET` for the same
 * reason). Screens/hooks go through `useDiscoverFeed.ts` for reads and
 * `useExperienceCreation.ts` for the write path (`uploadExperiencePhoto`
 * / `createExperience`).
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
import { PAGINATION, IMAGE_CONFIG } from '@/constants/app';
import { VALIDATION } from '@/utils';
import type { PlaceCategoryId } from '@/constants/places';
import type { ExperienceFeedRow, ExperienceDetailRow, DiscoverSortMode } from '@/types/experience';
import type { AmountSpent, VisitType, GoodForTag, VibeTag } from '@/constants/app';

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

// ─── Fetch Experience By Id (Sprint 2 Prompt 2 — Experience Details) ────────────
// A wider select than SELECT_COLUMNS above — the detail screen's header,
// gallery, description, creator section, and location preview need place
// address/coordinates/description/gallery and the creator's bio, neither
// of which the feed ever renders. Kept as its own query+column-list
// rather than widening SELECT_COLUMNS, so every Discover feed page isn't
// paying to fetch data it never displays.

const DETAIL_SELECT_COLUMNS = `
  id, user_id, place_id, city, story, would_recommend, amount_spent, visit_type,
  good_for_tags, vibe_tags, like_count, comment_count, featured, created_at, updated_at,
  creator:profiles(id, username, display_name, avatar_url, is_verified, bio),
  place:places(id, name, slug, city, category, hero_image, address, latitude, longitude, description, gallery),
  experience_photos(photo_url, position)
`;

export async function fetchExperienceById(
  id: string,
): Promise<ExperiencesResult<ExperienceDetailRow>> {
  // Reject an obviously-malformed id (a garbled deep link, a stale/typo'd
  // route param) before it ever reaches the network — this sprint's brief
  // explicitly calls out "Invalid IDs" as their own error case, distinct
  // from "not found" (a well-formed id for an experience that's been
  // deleted) and from a genuine network/server failure.
  if (!VALIDATION.isValidUuid(id)) {
    return fail(makeError('VALIDATION_ERROR', `"${id}" is not a valid experience id.`));
  }

  try {
    const { data, error } = await supabase
      .from('experiences')
      .select(DETAIL_SELECT_COLUMNS)
      .eq('id', id)
      .maybeSingle();

    if (error) return fail(error);
    if (!data) return fail(makeError('NOT_FOUND', `Experience ${id} was not found.`));

    return ok(data as unknown as ExperienceDetailRow);
  } catch (err) {
    return fail(err);
  }
}

// ─── Fetch Related Experiences (Sprint 2 Prompt 2) ──────────────────────────────
// Single strategy, deliberately not blended with "nearby" or "similar
// tags" — see the RelatedExperiencesParams doc in types/experience.ts.
// Filtering by the embedded place's category requires `!inner` (a plain
// left-embed's dot-notation filter only filters rows *within* the embed,
// not the top-level query) — a one-off cost worth paying here since,
// unlike the main feed, this isn't a hot, repeatedly-paginated path.

export async function fetchRelatedExperiences(params: {
  experienceId: string;
  category: PlaceCategoryId;
  city: string;
  limit?: number;
}): Promise<ExperiencesResult<ExperienceFeedRow[]>> {
  try {
    const { data, error } = await supabase
      .from('experiences')
      .select(
        `
          id, user_id, place_id, city, story, would_recommend, amount_spent, visit_type,
          good_for_tags, vibe_tags, like_count, comment_count, featured, created_at, updated_at,
          creator:profiles(id, username, display_name, avatar_url, is_verified),
          place:places!inner(id, name, slug, city, category, hero_image),
          experience_photos(photo_url, position)
        `,
      )
      .eq('city', params.city)
      .eq('place.category', params.category)
      .neq('id', params.experienceId)
      .order('created_at', { ascending: false })
      .limit(params.limit ?? 10);

    if (error) return fail(error);
    return ok(data as unknown as ExperienceFeedRow[]);
  } catch (err) {
    return fail(err);
  }
}

// ─── Fetch Creator Experience Count (Sprint 2 Prompt 2) ─────────────────────────
// Backs CreatorDetail.totalExperiences — deliberately a separate, tiny
// `head: true` count query rather than a column on the main detail
// select, so a slow aggregate can never block the header/gallery/
// description from rendering. See CreatorDetail's doc in types/experience.ts.

export async function fetchCreatorExperienceCount(
  userId: string,
): Promise<ExperiencesResult<number>> {
  try {
    const { count, error } = await supabase
      .from('experiences')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) return fail(error);
    return ok(count ?? 0);
  } catch (err) {
    return fail(err);
  }
}

// ─── Fetch Experiences By User ──────────────────────────────────────────────────
// Backs the Profile screen's gallery of a user's own published
// experiences — the "experiences authored by this user" list
// queryKeys.experiences.byUser() was already reserved for (see that
// key's own comment). Cursor-paginated the same way fetchDiscoverFeedPage
// is, reusing that function's own encodeCursor/decodeCursor/
// buildKeysetFilter helpers rather than a second cursor implementation —
// but simpler: no sort mode, since a profile gallery is always
// newest-first, and no personalization pass, since re-ranking someone's
// own gallery by their own interests doesn't make sense the way
// re-ranking a discovery feed does.

interface UserGalleryCursor {
  createdAt: string;
  id: string;
}

export interface UserExperiencesPage {
  rows: ExperienceFeedRow[];
  nextCursor: string | null;
}

export async function fetchExperiencesByUser(params: {
  userId: string;
  limit?: number;
  cursor?: string | null;
}): Promise<ExperiencesResult<UserExperiencesPage>> {
  try {
    const limit = params.limit ?? DEFAULT_LIMIT;
    let query = supabase
      .from('experiences')
      .select(SELECT_COLUMNS)
      .eq('user_id', params.userId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit);

    if (params.cursor) {
      const cursor = decodeCursor<UserGalleryCursor>(params.cursor);
      if (cursor) {
        query = query.or(
          buildKeysetFilter([
            { name: 'created_at', value: cursor.createdAt },
            { name: 'id', value: cursor.id },
          ]),
        );
      }
    }

    const { data, error } = await query;
    if (error) return fail(error);

    const rows = data as unknown as ExperienceFeedRow[];
    const last = rows[rows.length - 1];
    const nextCursor =
      rows.length === limit && last
        ? encodeCursor({ createdAt: last.created_at, id: last.id })
        : null;

    return ok({ rows, nextCursor });
  } catch (err) {
    return fail(err);
  }
}

// ─── Fetch Experiences By Place (Sprint 4 Prompt 1) ─────────────────────────────
// Backs the Place Detail screen's "Community Experiences" section — the
// same "experiences filtered by a foreign key" shape as
// fetchExperiencesByUser() immediately above, reusing its cursor helpers
// rather than a third pagination implementation. queryKeys.experiences
// .byPlace() was already reserved for exactly this (see that key's own
// comment in queryKeys.ts). Newest-first, same reasoning as the user
// gallery: a place page isn't personalized or re-ranked.

interface PlaceExperiencesCursor {
  createdAt: string;
  id: string;
}

export interface PlaceExperiencesPage {
  rows: ExperienceFeedRow[];
  nextCursor: string | null;
}

export async function fetchExperiencesByPlace(params: {
  placeId: string;
  limit?: number;
  cursor?: string | null;
}): Promise<ExperiencesResult<PlaceExperiencesPage>> {
  try {
    const limit = params.limit ?? DEFAULT_LIMIT;
    let query = supabase
      .from('experiences')
      .select(SELECT_COLUMNS)
      .eq('place_id', params.placeId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit);

    if (params.cursor) {
      const cursor = decodeCursor<PlaceExperiencesCursor>(params.cursor);
      if (cursor) {
        query = query.or(
          buildKeysetFilter([
            { name: 'created_at', value: cursor.createdAt },
            { name: 'id', value: cursor.id },
          ]),
        );
      }
    }

    const { data, error } = await query;
    if (error) return fail(error);

    const rows = data as unknown as ExperienceFeedRow[];
    const last = rows[rows.length - 1];
    const nextCursor =
      rows.length === limit && last
        ? encodeCursor({ createdAt: last.created_at, id: last.id })
        : null;

    return ok({ rows, nextCursor });
  } catch (err) {
    return fail(err);
  }
}

// ─── Upload Experience Photo (Sprint 3 Prompt 2) ─────────────────────────────────
// Same File-based read + `.upload()` pattern as profileService.ts's
// uploadAvatar — see that function's doc for why `expo-file-system`'s
// `File` class is used instead of fetch()-ing the URI into a blob (the
// approach this codebase settled on for React Native/Hermes). Namespaced
// `${userId}/${draftId}/${photoId}.${ext}` rather than avatar's flatter
// `${userId}/avatar.${ext}` — a draft can hold up to
// EXPERIENCE_LIMITS.MAX_PHOTOS files, and a user can have more than one
// abandoned draft over time, so both segments are needed to avoid
// collisions.

import { File } from 'expo-file-system';

export async function uploadExperiencePhoto(params: {
  userId:   string;
  draftId:  string;
  photoId:  string;
  uri:      string;
  mimeType?: string;
}): Promise<ExperiencesResult<string>> {
  const mimeType = params.mimeType ?? 'image/jpeg';

  try {
    const file = new File(params.uri);

    if (file.size > IMAGE_CONFIG.MAX_FILE_SIZE_BYTES) {
      return fail(makeError('VALIDATION_ERROR', 'Image is too large. Please choose a file under 5MB.'));
    }

    const bytes = await file.bytes();
    const ext = mimeType.split('/')[1] ?? 'jpg';
    const filePath = `${params.userId}/${params.draftId}/${params.photoId}.${ext}`;

    

    const { error: uploadError } = await supabase.storage
      .from(IMAGE_CONFIG.EXPERIENCE_BUCKET)
      // upsert: false (the default) is deliberate, not an oversight —
      // `photoId` comes from generateLocalId('photo'), so this exact
      // path has never been written before; there's nothing to upsert
      // over. `upsert: true` (copied from profileService.ts's
      // uploadAvatar, where overwriting the SAME path on every re-upload
      // is the whole point) makes Storage check whether the object
      // already exists to decide insert-vs-update, and that existence
      // check needs permissions this bucket's policies don't grant (only
      // INSERT/DELETE exist on `experience-photos` — no SELECT/UPDATE,
      // unlike `avatars`, which has both). That mismatch is what was
      // actually surfacing as "new row violates row-level security
      // policy" — not an auth/token problem, which the diagnostic above
      // already ruled out.
      .upload(filePath, bytes, { contentType: mimeType });

    if (uploadError) return fail(uploadError);

    const { data } = supabase.storage.from(IMAGE_CONFIG.EXPERIENCE_BUCKET).getPublicUrl(filePath);
    return ok(data.publicUrl);
  } catch (err) {
    return fail(err);
  }
}

// ─── Update Experience (Sprint 3 Prompt 3 — Creator Editing) ─────────────────────
// Mirrors createExperience's shape/approach — the same two-write
// (experience row + experience_photos rows), same lack of a Postgres
// transaction/RPC, same "delete + reinsert" treatment of experience_photos
// rather than diffing individual rows for insert/update/delete: simpler,
// and cheap, since a photo row is just (experience_id, photo_url,
// position). Callers (see usePublishExperience's edit-mode path in
// useExperienceCreation.ts) are responsible for only including
// already-uploaded/newly-uploaded URLs in `photoUrls` — "Upload only newly
// added media, preserve unchanged media" (this sprint's brief) is achieved
// upstream, by never re-uploading a photo that already has a `remoteUrl`
// (the same `status !== 'uploaded'` filter usePublishExperience already
// uses for Create) — this function doesn't know or care which URLs are new.
//
// `userId` is required and filtered on (`.eq('user_id', userId)`) as
// defense-in-depth alongside RLS — "Only creators may delete their own
// experiences" (this sprint's brief says this about Delete, and the same
// rule applies to Edit) should already be enforced by a Supabase RLS
// policy on `experiences`, but scoping the update's WHERE clause here
// means a missing/misconfigured policy fails closed (zero rows updated,
// surfaced as NOT_FOUND) instead of silently succeeding against someone
// else's row.

export interface UpdateExperienceInput {
  experienceId:   string;
  userId:         string;
  placeId:        string;
  city:           string;
  story:          string;
  amountSpent:    AmountSpent | null;
  visitType:      VisitType | null;
  wouldRecommend: boolean | null;
  goodForTags:    GoodForTag[];
  vibeTags:       VibeTag[];
  /** Already in final display order — index 0 becomes `experience_photos.position` 0, the cover. A mix of preserved (already-remote) and newly-uploaded URLs. */
  photoUrls:      string[];
}

export async function updateExperience(
  input: UpdateExperienceInput,
): Promise<ExperiencesResult<string>> {
  try {
    const { data: updated, error: updateError } = await supabase
      .from('experiences')
      .update({
        place_id:        input.placeId,
        city:            input.city,
        story:           input.story,
        amount_spent:    input.amountSpent,
        visit_type:      input.visitType,
        would_recommend: input.wouldRecommend,
        good_for_tags:   input.goodForTags,
        vibe_tags:       input.vibeTags,
      })
      .eq('id', input.experienceId)
      .eq('user_id', input.userId)
      .select('id')
      .maybeSingle();

    if (updateError) return fail(updateError);
    if (!updated) {
      return fail(
        makeError(
          'NOT_FOUND',
          `Experience ${input.experienceId} was not found, or you don't have permission to edit it.`,
        ),
      );
    }

    // Replace the photo set wholesale — see module doc above for why this
    // doesn't try to diff individual rows.
    const { error: deletePhotosError } = await supabase
      .from('experience_photos')
      .delete()
      .eq('experience_id', input.experienceId);

    if (deletePhotosError) return fail(deletePhotosError);

    if (input.photoUrls.length > 0) {
      const photoRows = input.photoUrls.map((photo_url, position) => ({
        experience_id: input.experienceId,
        photo_url,
        position,
      }));

      const { error: insertPhotosError } = await supabase.from('experience_photos').insert(photoRows);

      if (insertPhotosError) {
        // Unlike createExperience, there's no clean rollback here — the
        // experience row itself was already a valid, previously-published
        // row before this update started, so deleting it would be far
        // worse than leaving it temporarily photo-less. Surface the
        // failure instead; nothing the user typed is lost either way — an
        // edit session lives entirely in memory (see
        // experienceCreationStore.ts's `mode` doc), so "try again" just
        // means pressing Save again.
        return fail(
          makeError('SERVER_ERROR', "Your changes couldn't be fully saved. Please try again."),
        );
      }
    }

    return ok(updated.id);
  } catch (err) {
    return fail(err);
  }
}

// ─── Delete Experience (Sprint 3 Prompt 3 — Creator Management) ──────────────────
// Returns the deleted row's photo URLs so the caller can best-effort clean
// up EXPERIENCE_BUCKET storage objects afterwards (see
// deleteExperiencePhoto below) — this function itself only ever deletes
// database rows; it doesn't touch Storage directly, the same division of
// labor createExperience's compensating rollback already uses.
//
// experience_photos rows are deleted explicitly rather than assumed to
// cascade — safe either way (an explicit delete of zero rows is a no-op if
// a cascade already handled it), and doesn't depend on a migration this
// sprint has no visibility into.

export interface DeleteExperienceResult {
  photoUrls: string[];
}

export async function deleteExperience(
  experienceId: string,
  userId: string,
): Promise<ExperiencesResult<DeleteExperienceResult>> {
  try {
    const { data: photoRows, error: fetchError } = await supabase
      .from('experience_photos')
      .select('photo_url')
      .eq('experience_id', experienceId);

    if (fetchError) return fail(fetchError);

    const { error: deletePhotosError } = await supabase
      .from('experience_photos')
      .delete()
      .eq('experience_id', experienceId);

    if (deletePhotosError) return fail(deletePhotosError);

    const { data: deleted, error: deleteError } = await supabase
      .from('experiences')
      .delete()
      .eq('id', experienceId)
      .eq('user_id', userId) // defense-in-depth alongside RLS — see updateExperience's doc above.
      .select('id')
      .maybeSingle();

    if (deleteError) return fail(deleteError);
    if (!deleted) {
      return fail(
        makeError(
          'NOT_FOUND',
          `Experience ${experienceId} was not found, or you don't have permission to delete it.`,
        ),
      );
    }

    return ok({ photoUrls: (photoRows ?? []).map((r) => r.photo_url) });
  } catch (err) {
    return fail(err);
  }
}

/** Extracts the storage object path from a public URL — see profileService.ts's identically-shaped (but AVATAR_BUCKET-scoped) private helper; kept as its own small per-file copy rather than a shared cross-cutting utility, matching that file's existing convention. */
function extractExperiencePhotoPath(publicUrl: string): string | null {
  const marker = `/${IMAGE_CONFIG.EXPERIENCE_BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return publicUrl.slice(idx + marker.length);
}

/**
 * Best-effort delete of an uploaded photo's storage object — used when a
 * user removes a photo mid-draft, or discards a draft that had already
 * uploaded some photos. Never throws: an orphaned file left behind if
 * this fails is a minor cleanup cost, not something that should block
 * the user's remove/discard action (same tradeoff removeAvatar() in
 * profileService.ts already makes).
 */
export async function deleteExperiencePhoto(publicUrl: string): Promise<void> {
  const path = extractExperiencePhotoPath(publicUrl);
  if (!path) return;
  try {
    await supabase.storage.from(IMAGE_CONFIG.EXPERIENCE_BUCKET).remove([path]);
  } catch {
    // Best-effort — see doc above.
  }
}

// ─── Create Experience (Sprint 3 Prompt 2 — Publishing) ──────────────────────────
// The only place a new `experiences` row (and its `experience_photos`
// rows) is ever written from the client.
//
// No Postgres function/RPC exists for this yet (that would need a
// migration this sprint doesn't have visibility into), so the two
// inserts below aren't atomic the way a single transaction would be.
// Rather than leave a photo-less "orphan" Experience behind if the
// second insert fails, the first insert is compensated with a best-effort
// delete — the net effect is the same as a transaction from the caller's
// point of view: either both rows exist, or neither does, so retrying a
// failed publish from scratch (see usePublishExperience in
// useExperienceCreation.ts) can never create a duplicate.

export interface CreateExperienceInput {
  userId:         string;
  placeId:        string;
  city:           string;
  story:          string;
  amountSpent:    AmountSpent | null;
  visitType:      VisitType | null;
  wouldRecommend: boolean | null;
  goodForTags:    GoodForTag[];
  vibeTags:       VibeTag[];
  /** Already in final display order — index 0 becomes `experience_photos.position` 0, the cover. */
  photoUrls:      string[];
}

export async function createExperience(input: CreateExperienceInput): Promise<ExperiencesResult<string>> {
  try {
    const { data: inserted, error: insertError } = await supabase
      .from('experiences')
      .insert({
        user_id:         input.userId,
        place_id:        input.placeId,
        city:            input.city,
        story:           input.story,
        amount_spent:    input.amountSpent,
        visit_type:      input.visitType,
        would_recommend: input.wouldRecommend,
        good_for_tags:   input.goodForTags,
        vibe_tags:       input.vibeTags,
      })
      .select('id')
      .single();

    if (insertError) return fail(insertError);
    if (!inserted) return fail(makeError('SERVER_ERROR', 'Experience insert returned no row.'));

    if (input.photoUrls.length > 0) {
      const photoRows = input.photoUrls.map((photo_url, position) => ({
        experience_id: inserted.id,
        photo_url,
        position,
      }));

      const { error: photosError } = await supabase.from('experience_photos').insert(photoRows);

      if (photosError) {
        // Compensating rollback — see module doc above. Best-effort: if
        // this delete itself fails, the experience row is left behind
        // without photos rather than risking a worse, silent data-loss
        // path; either way the caller still reports failure and
        // preserves the local draft so the user can retry cleanly.
        await supabase.from('experiences').delete().eq('id', inserted.id);
        return fail(makeError('SERVER_ERROR', "Your experience couldn't be fully saved. Please try again."));
      }
    }

    return ok(inserted.id);
  } catch (err) {
    return fail(err);
  }
}