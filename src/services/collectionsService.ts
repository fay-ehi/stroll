/**
 * Stroll — Collections Service
 * src/services/collectionsService.ts
 *
 * STATUS: Real as of Sprint 5 Prompt 1 for every Collection CRUD /
 * detail / membership operation below — backed by the `collections` and
 * `collection_items` tables (see
 * supabase/migrations/sprint5_prompt1_collections.sql). Mirrors the
 * Result-type pattern established in experiencesService.ts /
 * placesService.ts / profileService.ts. This is the ONLY file that talks
 * to the `collections` / `collection_items` tables or the
 * `COLLECTION_BUCKET` storage bucket directly — screens/hooks go through
 * src/hooks/useCollections.ts. `collection_collaborators` itself is
 * owned by src/services/collaborationService.ts — this file only ever
 * reads FROM it (via that service's exported helpers) to populate the
 * `collaborators` field below, never writes to it directly.
 *
 * ── Sprint 5 Prompt 3 — Collection Discovery is now real ──
 * `fetchCollectionsForCity()` and its MOCK_ROWS are gone — replaced by
 * `fetchPublicCollectionsFeed()` below, a real, cursor-paginated query
 * over `visibility = 'public'` collections (every Collection is public
 * per this prompt's ADR — see the Sprint 5 Prompt 3 prompt doc's
 * "Public Collections" section — so this is currently equivalent to
 * "every collection", filtered explicitly anyway so a future private-
 * profile sprint has one place to tighten). Backs
 * useCollectionsCarousel.ts (Discover) and is the same function a future
 * "All Collections" directory screen would page through further — same
 * "one real query, multiple callers at different page depths" shape
 * getMyCollections() already established. `searchCollections()` is new
 * architecture-preparation for Search (requirement #3) — title and
 * creator-name matching over public collections — with no Search screen
 * yet to call it (Search itself is explicitly out of this prompt's
 * scope; see the prompt doc's "Do Not Build Yet").
 *
 * ── Sprint 5 Prompt 2 — Collaborative Collections is now real ──
 * `attachCollaborators()` used to be a stub that always returned `[]`
 * (Collections were single-owner as of Prompt 1). It's now
 * `attachCollaboratorsToRows()`, an async batch lookup against
 * collaborationService.ts's `collection_collaborators` table, returning
 * only ACCEPTED collaborators — the shape src/types/collection.ts's
 * `CollectionFeedRow.collaborators` (and everything downstream:
 * `toCollectionCardModel`'s `isCollaborative`, CollectionCard.tsx's
 * avatar stack, CollectionDetailHeader's Contributors line) already
 * expected all along. `getMyCollections()` below also now unions in
 * Collections the user ACCEPTED an invitation to but didn't create — see
 * that function's own doc.
 *
 * ── Pagination strategy ──
 * Keyset (cursor) pagination for both getMyCollections() and
 * getCollectionExperiences(), same reasoning and same
 * encode/decodeCursor-token shape as experiencesService.ts — kept as
 * this file's own private helpers rather than imported from there, the
 * same "cursor helpers stay local to their own service file" call that
 * file already made for itself.
 */

import { supabase } from '@/lib/supabase';
import { normalizeError, makeError, type StrollError } from '@/lib/errors';
import { PAGINATION, IMAGE_CONFIG, COLLECTION_LIMITS } from '@/constants/app';
import { SELECT_COLUMNS as EXPERIENCE_SELECT_COLUMNS } from '@/services/experiencesService';
import { uniqueBy } from '@/utils';
import type { ExperienceFeedRow } from '@/types/experience';
import type { CollectionFeedRow, CollectionDetailRow, CollectionCoverType, CollectionCollaboratorRow } from '@/types/collection';
import {
  getAcceptedCollaboratorsForCollections,
  getMyCollaborationCollectionIds,
} from '@/services/collaborationService';
// Same as profileService.ts's uploadAvatar() — expo-file-system's `File`
// (the new expo-file-system/next-derived global class, not the DOM
// File constructor `tsc` otherwise resolves this name to) needs an
// explicit import to type-check as the single-argument, uri-based
// constructor uploadCollectionCover() below calls.
import { File } from 'expo-file-system';

export type CollectionsResult<T> = { ok: true; data: T } | { ok: false; error: StrollError };

function ok<T>(data: T): CollectionsResult<T> {
  return { ok: true, data };
}

// Sprint 5 Prompt 1 fix: previously hardcoded to `makeError('UNKNOWN', ...)`
// — harmless while only the never-failing mock above used it, but every
// real function below needs this to actually distinguish NOT_FOUND /
// VALIDATION_ERROR / CONFLICT / NETWORK_ERROR / etc. `normalizeError` is
// a safe no-op passthrough for an already-constructed StrollError (see
// its own `isStrollError` early-return), so this still works unchanged
// for call sites that pass a raw Postgres/network error.
export function failCollections(err: unknown): CollectionsResult<never> {
  return { ok: false, error: normalizeError(err) };
}

const DEFAULT_LIMIT = PAGINATION.DEFAULT_PAGE_SIZE;

// ─── Shared Select Shape ────────────────────────────────────────────────────────
// Every real query below embeds the owner the same way experiencesService.ts's
// SELECT_COLUMNS embeds an Experience's creator. `collaborators` is never
// part of this select (see this file's module doc + types/collection.ts's) —
// `attachCollaboratorsToRow(s)` below fill it in with a separate,
// batched lookup against collaborationService.ts.

const COLLECTION_SELECT_COLUMNS = `
  id, creator_id, title, description, city, cover_image_url, cover_type, visibility,
  experience_count, created_at, updated_at, is_featured, featured_order,
  owner:profiles(id, username, display_name, avatar_url, is_verified)
`;

type RawCollectionRow = Omit<CollectionFeedRow, 'collaborators'>;

// One query for however many rows are on a page/feed, not one query per
// row — the same "fetch once, group in TS" shape
// getCollectionsContainingExperience() already uses elsewhere in this
// file. Any row this batch lookup errors on (or that legitimately has no
// accepted collaborators) simply gets `[]`, matching the single-owner
// display Prompt 1 already had before this table existed.
async function attachCollaboratorsToRows(rows: RawCollectionRow[]): Promise<CollectionFeedRow[]> {
  if (rows.length === 0) return [];

  const result = await getAcceptedCollaboratorsForCollections(rows.map((row) => row.id));
  const grouped = result.ok ? result.data : new Map<string, CollectionCollaboratorRow[]>();

  return rows.map((row) => ({ ...row, collaborators: grouped.get(row.id) ?? [] }));
}

async function attachCollaboratorsToRow(row: RawCollectionRow): Promise<CollectionFeedRow> {
  const [attached] = await attachCollaboratorsToRows([row]);
  return attached ?? { ...row, collaborators: [] };
}

// ─── Cursors ────────────────────────────────────────────────────────────────────
// Copied (not imported) from experiencesService.ts's own private
// encodeCursor/decodeCursor/buildKeysetFilter — that file doesn't export
// them, and per this file's module doc, cursor helpers stay local to
// whichever service file actually paginates with them.

interface MyCollectionsCursor {
  createdAt: string;
  id: string;
}

interface CollectionItemsCursor {
  position: number;
}

function encodeCollectionCursor(payload: MyCollectionsCursor | CollectionItemsCursor): string {
  return encodeURIComponent(JSON.stringify(payload));
}

function decodeCollectionCursor<T>(cursor: string): T | null {
  try {
    return JSON.parse(decodeURIComponent(cursor)) as T;
  } catch {
    return null;
  }
}

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

// ─── Get Collection (detail) ────────────────────────────────────────────────────

export async function getCollection(id: string): Promise<CollectionsResult<CollectionDetailRow | null>> {
  try {
    const { data, error } = await supabase
      .from('collections')
      .select(COLLECTION_SELECT_COLUMNS)
      .eq('id', id)
      .maybeSingle();

    if (error) return failCollections(error);
    if (!data) return ok(null);
    return ok(await attachCollaboratorsToRow(data as unknown as RawCollectionRow));
  } catch (err) {
    return failCollections(err);
  }
}

// ─── Get Public Collections Feed (Sprint 5 Prompt 3) ────────────────────────────
// Backs the Discover carousel (requirement #1) via useCollectionsCarousel.ts,
// and is the same query a future "All Collections" directory screen would
// page through further (requirement #7's "Support: Infinite scrolling ...
// Reuse existing pagination architecture" — the cursor is real and keyset-
// paginated exactly like getMyCollections() below, even though the
// carousel itself only ever consumes the first page, the same way a
// horizontal rail elsewhere in this app — ExperienceRail, FeaturedCarousel
// — is a bounded, non-infinite consumer of an otherwise-paginated shape).
//
// Ordered by `created_at` (newest first), not by `is_featured`/
// `featured_order` — see types/collection.ts's module doc: those columns
// exist for a future editorial sprint but nothing sets `is_featured` yet,
// so ordering by it today would be a silent no-op dressed up as a real
// feature. Swap the `.order()` calls below (featured first, by
// featured_order, then created_at as the tiebreaker) the day an admin
// surface actually starts setting them — no other part of this function
// needs to change.
//
// Filters `visibility = 'public'` explicitly even though every Collection
// is public today (this prompt's ADR — see the Sprint 5 Prompt 3 prompt
// doc's "Public Collections" section: "Collections inherit the visibility
// of the profile... Future profile privacy may affect Collection
// visibility but should not be implemented now") — so a future private-
// profile sprint only has to change what sets `visibility`, not add a
// filter here that was missing.

export interface PublicCollectionsPage {
  rows: CollectionFeedRow[];
  nextCursor: string | null;
}

export async function fetchPublicCollectionsFeed(params: {
  city?: string;
  limit?: number;
  cursor?: string | null;
}): Promise<CollectionsResult<PublicCollectionsPage>> {
  try {
    const limit = params.limit ?? DEFAULT_LIMIT;

    let query = supabase
      .from('collections')
      .select(COLLECTION_SELECT_COLUMNS)
      .eq('visibility', 'public');

    if (params.city) query = query.eq('city', params.city);

    if (params.cursor) {
      const cursor = decodeCollectionCursor<MyCollectionsCursor>(params.cursor);
      if (cursor) {
        query = query.or(
          buildKeysetFilter([
            { name: 'created_at', value: cursor.createdAt },
            { name: 'id', value: cursor.id },
          ]),
        );
      }
    }

    // Fetch one extra row to know whether a next page exists without a
    // separate count query — the same "limit + 1" trick
    // fetchDiscoverFeedPage() (experiencesService.ts) uses.
    const { data, error } = await query
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit + 1);

    if (error) return failCollections(error);

    const rows = (data as unknown as RawCollectionRow[]) ?? [];
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const last = page[page.length - 1];

    const nextCursor =
      hasMore && last ? encodeCollectionCursor({ createdAt: last.created_at, id: last.id }) : null;

    return ok({ rows: await attachCollaboratorsToRows(page), nextCursor });
  } catch (err) {
    return failCollections(err);
  }
}

// ─── Search Collections (Sprint 5 Prompt 3) ─────────────────────────────────────
// Architecture preparation for requirement #3 ("Search Integration") —
// there is no Search screen to call this yet (Search itself is out of
// this prompt's scope, per the prompt doc's "Do Not Build Yet"; see
// app/(app)/(tabs)/search.tsx, still a placeholder). Supports the two
// match types the requirement names: Collection title, and creator
// (username/display name).
//
// Two separate queries, merged and de-duplicated in TS by id, rather than
// one query with an embedded-resource filter — the same "fetch once,
// group/filter in TS" call getCollectionsContainingExperience() already
// makes above, and for the same reason its own comment gives: a
// PostgREST embedded-resource filter needs `!inner()` join syntax this
// codebase hasn't used anywhere yet, and a title-only query plus a
// small, bounded creator-id lookup is simpler and just as correct.
export async function searchCollections(params: {
  query: string;
  limit?: number;
}): Promise<CollectionsResult<CollectionFeedRow[]>> {
  try {
    const q = params.query.trim();
    if (!q) return ok([]);
    const limit = params.limit ?? DEFAULT_LIMIT;
    const likePattern = `%${q}%`;

    const titleQuery = supabase
      .from('collections')
      .select(COLLECTION_SELECT_COLUMNS)
      .eq('visibility', 'public')
      .ilike('title', likePattern)
      .order('created_at', { ascending: false })
      .limit(limit);

    const matchingCreatorsQuery = supabase
      .from('profiles')
      .select('id')
      .or(`username.ilike.${likePattern},display_name.ilike.${likePattern}`)
      .limit(limit);

    const [{ data: titleRows, error: titleError }, { data: creatorRows, error: creatorError }] =
      await Promise.all([titleQuery, matchingCreatorsQuery]);

    if (titleError) return failCollections(titleError);
    if (creatorError) return failCollections(creatorError);

    let creatorMatchRows: RawCollectionRow[] = [];
    const creatorIds = (creatorRows ?? []).map((row) => (row as { id: string }).id);

    if (creatorIds.length > 0) {
      const { data, error } = await supabase
        .from('collections')
        .select(COLLECTION_SELECT_COLUMNS)
        .eq('visibility', 'public')
        .in('creator_id', creatorIds)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) return failCollections(error);
      creatorMatchRows = (data as unknown as RawCollectionRow[]) ?? [];
    }

    const merged = uniqueBy(
      [...((titleRows as unknown as RawCollectionRow[]) ?? []), ...creatorMatchRows],
      (row) => row.id,
    ).slice(0, limit);

    return ok(await attachCollaboratorsToRows(merged));
  } catch (err) {
    return failCollections(err);
  }
}

// ─── Get My Collections ─────────────────────────────────────────────────────────
// Backs the Profile screen's Collections pill row (requirement #8) and
// the Add-to-Collection modal's collection picker (requirement #4).
// Cursor-paginated per the repository spec even though both current
// callers (useCollections.ts's useMyCollections) fetch a single generous
// page — a horizontal pill row and a modal's picker list don't need
// infinite scroll, but a future "All My Collections" screen can use this
// same function's cursor as-is.
//
// Sprint 5 Prompt 2: "my collections" now means "Collections I created OR
// am an accepted collaborator on" — a collaborator needs some way to
// reach a Collection Detail screen to manage their contributions or
// leave, and Instagram-style collaborative posts appear on every
// collaborator's own profile, not just the original poster's. The
// creator-owned half stays exactly as it was (keyset-paginated); the
// collaborative half is folded in only on the FIRST page (see inline
// comment below) since it isn't part of that keyset.

export interface MyCollectionsPage {
  rows: CollectionDetailRow[];
  nextCursor: string | null;
}

export async function getMyCollections(params: {
  creatorId: string;
  limit?: number;
  cursor?: string | null;
}): Promise<CollectionsResult<MyCollectionsPage>> {
  try {
    const limit = params.limit ?? DEFAULT_LIMIT;
    let query = supabase
      .from('collections')
      .select(COLLECTION_SELECT_COLUMNS)
      .eq('creator_id', params.creatorId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit);

    if (params.cursor) {
      const cursor = decodeCollectionCursor<MyCollectionsCursor>(params.cursor);
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
    if (error) return failCollections(error);

    const ownedRows = data as unknown as RawCollectionRow[];
    const last = ownedRows[ownedRows.length - 1];
    const nextCursor =
      ownedRows.length === limit && last
        ? encodeCollectionCursor({ createdAt: last.created_at, id: last.id })
        : null;

    let combinedRows = ownedRows;

    // Only on the un-cursored (first) page — see this function's own doc.
    // A collaborative Collection has a different creator_id than
    // params.creatorId, so interleaving it into a later, cursored page
    // would break the keyset above; appending it once up front instead
    // matches both current callers' actual "single generous page" usage.
    if (!params.cursor) {
      const collabIdsResult = await getMyCollaborationCollectionIds(params.creatorId);
      if (collabIdsResult.ok && collabIdsResult.data.length > 0) {
        const { data: collabData, error: collabError } = await supabase
          .from('collections')
          .select(COLLECTION_SELECT_COLUMNS)
          .in('id', collabIdsResult.data)
          .order('created_at', { ascending: false });

        if (!collabError && collabData) {
          combinedRows = [...ownedRows, ...(collabData as unknown as RawCollectionRow[])].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
          );
        }
      }
    }

    const rows = await attachCollaboratorsToRows(combinedRows);
    return ok({ rows, nextCursor });
  } catch (err) {
    return failCollections(err);
  }
}

// ─── Create Collection ───────────────────────────────────────────────────────────
// Cover upload is a deliberately separate step (uploadCollectionCover()
// below) — a Collection needs a real id before a cover can live at
// `${creatorId}/${collectionId}.${ext}`, so useCreateCollection() (see
// useCollections.ts) creates the row first (cover_type defaults to
// 'generated', matching requirement #5's priority order), then uploads
// the picked image and flips cover_type to 'custom' if the user chose one.

export interface CreateCollectionInput {
  creatorId: string;
  title: string;
  description?: string | null;
}

export async function createCollection(
  input: CreateCollectionInput,
): Promise<CollectionsResult<CollectionDetailRow>> {
  try {
    const title = input.title.trim();
    if (!title) return failCollections(makeError('VALIDATION_ERROR', 'Title is required.'));
    if (title.length > COLLECTION_LIMITS.MAX_TITLE_LENGTH) {
      return failCollections(
        makeError('VALIDATION_ERROR', `Title must be ${COLLECTION_LIMITS.MAX_TITLE_LENGTH} characters or fewer.`),
      );
    }

    const description = input.description?.trim() || null;
    if (description && description.length > COLLECTION_LIMITS.MAX_DESCRIPTION_LENGTH) {
      return failCollections(
        makeError(
          'VALIDATION_ERROR',
          `Description must be ${COLLECTION_LIMITS.MAX_DESCRIPTION_LENGTH} characters or fewer.`,
        ),
      );
    }

    const { data, error } = await supabase
      .from('collections')
      .insert({
        creator_id: input.creatorId,
        title,
        description,
        cover_type: 'generated',
        visibility: 'public',
      })
      .select(COLLECTION_SELECT_COLUMNS)
      .single();

    if (error) return failCollections(error);
    return ok(await attachCollaboratorsToRow(data as unknown as RawCollectionRow));
  } catch (err) {
    return failCollections(err);
  }
}

// ─── Update Collection ───────────────────────────────────────────────────────────

export interface UpdateCollectionInput {
  title?: string;
  description?: string | null;
}

export async function updateCollection(
  id: string,
  patch: UpdateCollectionInput,
): Promise<CollectionsResult<CollectionDetailRow>> {
  try {
    const update: { title?: string; description?: string | null } = {};

    if (patch.title !== undefined) {
      const title = patch.title.trim();
      if (!title) return failCollections(makeError('VALIDATION_ERROR', 'Title is required.'));
      if (title.length > COLLECTION_LIMITS.MAX_TITLE_LENGTH) {
        return failCollections(
          makeError('VALIDATION_ERROR', `Title must be ${COLLECTION_LIMITS.MAX_TITLE_LENGTH} characters or fewer.`),
        );
      }
      update.title = title;
    }

    if (patch.description !== undefined) {
      const description = patch.description?.trim() || null;
      if (description && description.length > COLLECTION_LIMITS.MAX_DESCRIPTION_LENGTH) {
        return failCollections(
          makeError(
            'VALIDATION_ERROR',
            `Description must be ${COLLECTION_LIMITS.MAX_DESCRIPTION_LENGTH} characters or fewer.`,
          ),
        );
      }
      update.description = description;
    }

    const { data, error } = await supabase
      .from('collections')
      .update(update)
      .eq('id', id)
      .select(COLLECTION_SELECT_COLUMNS)
      .single();

    if (error) return failCollections(error);
    return ok(await attachCollaboratorsToRow(data as unknown as RawCollectionRow));
  } catch (err) {
    return failCollections(err);
  }
}

// ─── Delete Collection ───────────────────────────────────────────────────────────
// Only ever deletes the `collections` row (and, via ON DELETE CASCADE,
// its `collection_items` join rows) — never touches `experiences`, so
// requirement #7's "Deleting a Collection must never delete Experiences"
// holds by construction, not by convention this function has to
// remember. Best-effort deletes the stored cover file the same way
// profileService.ts's removeAvatar() does for an avatar.

export async function deleteCollection(
  id: string,
  currentCoverUrl: string | null,
  coverType: CollectionCoverType,
): Promise<CollectionsResult<void>> {
  try {
    if (coverType === 'custom' && currentCoverUrl) {
      const path = extractCollectionCoverPath(currentCoverUrl);
      if (path) {
        await supabase.storage.from(IMAGE_CONFIG.COLLECTION_BUCKET).remove([path]);
      }
    }

    const { error } = await supabase.from('collections').delete().eq('id', id);
    if (error) return failCollections(error);
    return ok(undefined);
  } catch (err) {
    return failCollections(err);
  }
}

// ─── Collection Cover ────────────────────────────────────────────────────────────

/** Extracts the storage object path (e.g. "{creatorId}/{collectionId}.jpg") from a public cover URL, stripping uploadCollectionCover's cache-busting query string. Mirrors profileService.ts's extractStoragePath for AVATAR_BUCKET. */
function extractCollectionCoverPath(publicUrl: string): string | null {
  const marker = `/${IMAGE_CONFIG.COLLECTION_BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return publicUrl.slice(idx + marker.length).split('?')[0] ?? null;
}

/**
 * Uploads a custom cover and sets it as the Collection's cover
 * (requirement #5's highest-priority case: "user-uploaded custom cover
 * always overrides the automatically generated cover"). Mirrors
 * profileService.ts's uploadAvatar() almost exactly — same size check,
 * same `new File(uri)` / `file.bytes()` read, same `upsert: true` at a
 * stable per-entity path — except the path is per-Collection
 * (`${creatorId}/${collectionId}.${ext}`) rather than per-user, since one
 * creator can have many Collections needing independent covers.
 *
 * Appends a cache-busting query string to the returned public URL —
 * unlike an avatar (plain React Native `Image`, no persistent disk
 * cache), Collection covers render through `expo-image` with
 * `cachePolicy="memory-disk"` (CollectionCard.tsx) keyed by URL string;
 * without this, replacing a cover at the same upsert path would keep
 * showing the old cached image everywhere the card is already mounted.
 */
export async function uploadCollectionCover(
  collectionId: string,
  creatorId: string,
  uri: string,
  mimeType: string = 'image/jpeg',
): Promise<CollectionsResult<CollectionDetailRow>> {
  try {
    const file = new File(uri);

    if (file.size > IMAGE_CONFIG.MAX_FILE_SIZE_BYTES) {
      return failCollections(makeError('VALIDATION_ERROR', 'Image is too large. Please choose a file under 5MB.'));
    }

    const bytes = await file.bytes();
    const ext = mimeType.split('/')[1] ?? 'jpg';
    const filePath = `${creatorId}/${collectionId}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(IMAGE_CONFIG.COLLECTION_BUCKET)
      .upload(filePath, bytes, { contentType: mimeType, upsert: true });

    if (uploadError) return failCollections(uploadError);

    const { data: publicUrlData } = supabase.storage.from(IMAGE_CONFIG.COLLECTION_BUCKET).getPublicUrl(filePath);
    const coverUrl = `${publicUrlData.publicUrl}?updated=${Date.now()}`;

    const { data, error } = await supabase
      .from('collections')
      .update({ cover_image_url: coverUrl, cover_type: 'custom' })
      .eq('id', collectionId)
      .select(COLLECTION_SELECT_COLUMNS)
      .single();

    if (error) return failCollections(error);
    return ok(await attachCollaboratorsToRow(data as unknown as RawCollectionRow));
  } catch (err) {
    return failCollections(err);
  }
}

/** Finds the current "first Experience in the Collection" and its first photo — the same computation the DB trigger (stroll_update_collection_generated_cover in the migration SQL) runs after an add/remove, done here in TS for removeCollectionCover() below since that trigger only fires on collection_items insert/delete, not on a cover_type transition back to 'generated'. */
async function resolveGeneratedCoverUrl(collectionId: string): Promise<string | null> {
  const { data: firstItem } = await supabase
    .from('collection_items')
    .select('experience_id')
    .eq('collection_id', collectionId)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!firstItem) return null;

  const { data: firstPhoto } = await supabase
    .from('experience_photos')
    .select('photo_url')
    .eq('experience_id', firstItem.experience_id)
    .order('position', { ascending: true })
    .limit(1)
    .maybeSingle();

  return firstPhoto?.photo_url ?? null;
}

/** Removes a custom cover and reverts to the automatically generated one (requirement #7 — "Remove custom cover (reverting to automatic cover generation)"). Best-effort deletes the stored file the same way deleteCollection() does. */
export async function removeCollectionCover(
  collectionId: string,
  currentCoverUrl: string | null,
): Promise<CollectionsResult<CollectionDetailRow>> {
  try {
    if (currentCoverUrl) {
      const path = extractCollectionCoverPath(currentCoverUrl);
      if (path) {
        await supabase.storage.from(IMAGE_CONFIG.COLLECTION_BUCKET).remove([path]);
      }
    }

    const generatedCoverUrl = await resolveGeneratedCoverUrl(collectionId);

    const { data, error } = await supabase
      .from('collections')
      .update({ cover_type: 'generated', cover_image_url: generatedCoverUrl })
      .eq('id', collectionId)
      .select(COLLECTION_SELECT_COLUMNS)
      .single();

    if (error) return failCollections(error);
    return ok(await attachCollaboratorsToRow(data as unknown as RawCollectionRow));
  } catch (err) {
    return failCollections(err);
  }
}

// ─── Collection ↔ Experience Membership ──────────────────────────────────────────

/**
 * Adds an Experience to a Collection (requirement #4). Checks for an
 * existing row first so a duplicate add surfaces as a specific, friendly
 * CONFLICT rather than a raw unique-constraint Postgres error — the
 * `collection_items` unique(collection_id, experience_id) constraint
 * (see the migration SQL) is still the backstop for any race between
 * this check and the insert.
 */
export async function addExperienceToCollection(
  collectionId: string,
  experienceId: string,
  userId: string,
): Promise<CollectionsResult<void>> {
  try {
    const { data: existing, error: checkError } = await supabase
      .from('collection_items')
      .select('id')
      .eq('collection_id', collectionId)
      .eq('experience_id', experienceId)
      .maybeSingle();

    if (checkError) return failCollections(checkError);
    if (existing) return failCollections(makeError('CONFLICT', 'This experience is already in that collection.'));

    const { data: maxPositionRow } = await supabase
      .from('collection_items')
      .select('position')
      .eq('collection_id', collectionId)
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextPosition = (maxPositionRow?.position ?? -1) + 1;

    const { error } = await supabase.from('collection_items').insert({
      collection_id: collectionId,
      experience_id: experienceId,
      added_by: userId,
      position: nextPosition,
    });

    if (error) return failCollections(error);
    return ok(undefined);
  } catch (err) {
    return failCollections(err);
  }
}

/** Removes an Experience from a Collection. Only ever deletes the join row — the Experience itself is untouched. */
export async function removeExperienceFromCollection(
  collectionId: string,
  experienceId: string,
): Promise<CollectionsResult<void>> {
  try {
    const { error } = await supabase
      .from('collection_items')
      .delete()
      .eq('collection_id', collectionId)
      .eq('experience_id', experienceId);

    if (error) return failCollections(error);
    return ok(undefined);
  } catch (err) {
    return failCollections(err);
  }
}

/**
 * Persists a new manual order for a Collection's Experiences
 * (requirement #7 — "Rearrange Experiences"). Individual per-row
 * `position` updates rather than a delete-then-reinsert — simpler, and
 * unlike delete+reinsert it never fires the insert/delete triggers in
 * the migration SQL, so a reorder can never transiently miscount
 * experience_count or flap the generated cover mid-operation. No
 * Postgres transaction/RPC wraps these updates (same tradeoff already
 * made elsewhere in this codebase for multi-row writes without a
 * dedicated RPC) — a failure partway through leaves a partially-applied
 * order, which the caller's query invalidation (see
 * useReorderCollectionExperiences in useCollections.ts) corrects on the
 * next fetch either way.
 */
export async function reorderCollectionExperiences(
  collectionId: string,
  orderedExperienceIds: string[],
): Promise<CollectionsResult<void>> {
  try {
    const results = await Promise.all(
      orderedExperienceIds.map((experienceId, index) =>
        supabase
          .from('collection_items')
          .update({ position: index })
          .eq('collection_id', collectionId)
          .eq('experience_id', experienceId),
      ),
    );

    const firstError = results.find((r) => r.error)?.error;
    if (firstError) return failCollections(firstError);
    return ok(undefined);
  } catch (err) {
    return failCollections(err);
  }
}

/**
 * Which of the current user's own Collections already contain a given
 * Experience — used to pre-check the Add-to-Collection modal's rows
 * (requirement #4's "Prevent duplicate additions" starts with the UI
 * already reflecting current membership, not just blocking a re-add
 * after the fact). Filters client-side rather than with a `.eq()` on the
 * embedded `collections.creator_id` column — PostgREST supports
 * filtering embedded resources, but only via `!inner()` join syntax this
 * codebase hasn't used elsewhere yet; a single Experience realistically
 * has a small, bounded number of collection_items rows regardless of
 * owner, so fetching all of them and filtering in TS is simpler and just
 * as fast in practice.
 */
export async function getCollectionsContainingExperience(
  userId: string,
  experienceId: string,
): Promise<CollectionsResult<string[]>> {
  try {
    const { data, error } = await supabase
      .from('collection_items')
      .select('collection_id, collections(creator_id)')
      .eq('experience_id', experienceId);

    if (error) return failCollections(error);

    const rows = (data ?? []) as unknown as {
      collection_id: string;
      collections: { creator_id: string } | null;
    }[];

    return ok(rows.filter((row) => row.collections?.creator_id === userId).map((row) => row.collection_id));
  } catch (err) {
    return failCollections(err);
  }
}

// ─── Get Collection Experiences ──────────────────────────────────────────────────
// Backs the Collection Detail screen's paginated Experience list
// (requirement #6). Ordered by the creator's own `position`, not
// `created_at` — a Collection's order is a deliberate curation choice
// (requirement #7's "Rearrange Experiences"), not a feed. Reuses
// experiencesService.ts's exported SELECT_COLUMNS so an Experience
// embedded here has exactly the same shape ExperienceCard.tsx already
// knows how to render, via the same `toExperienceCardModel` mapper.

export interface CollectionExperiencesPage {
  rows: ExperienceFeedRow[];
  nextCursor: string | null;
}

export async function getCollectionExperiences(params: {
  collectionId: string;
  limit?: number;
  cursor?: string | null;
}): Promise<CollectionsResult<CollectionExperiencesPage>> {
  try {
    const limit = params.limit ?? DEFAULT_LIMIT;
    let query = supabase
      .from('collection_items')
      .select(`position, experience:experiences(${EXPERIENCE_SELECT_COLUMNS})`)
      .eq('collection_id', params.collectionId)
      .order('position', { ascending: true })
      .limit(limit);

    if (params.cursor) {
      const cursor = decodeCollectionCursor<CollectionItemsCursor>(params.cursor);
      if (cursor) query = query.gt('position', cursor.position);
    }

    const { data, error } = await query;
    if (error) return failCollections(error);

    const items = (data ?? []) as unknown as { position: number; experience: ExperienceFeedRow | null }[];
    const rows = items.map((item) => item.experience).filter((e): e is ExperienceFeedRow => e !== null);
    const last = items[items.length - 1];
    const nextCursor = items.length === limit && last ? encodeCollectionCursor({ position: last.position }) : null;

    return ok({ rows, nextCursor });
  } catch (err) {
    return failCollections(err);
  }
}
