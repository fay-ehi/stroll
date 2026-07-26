/**
 * Stroll — Saved Service
 * src/services/savedService.ts
 *
 * Sprint 5 Prompt 4. Supabase operations for the Saved domain — personal
 * bookmarks over Experiences and Collections, kept deliberately separate
 * from the Collections domain (see this sprint's prompt doc: "Saved is
 * not Collections... Saving an item never modifies its ownership or
 * contents"). Pure async functions — no UI, no Zustand, no navigation.
 * Mirrors the Result-type pattern established in experiencesService.ts /
 * collectionsService.ts.
 *
 * This is the ONLY file that talks to the `saved_items` table directly
 * (see supabase/migrations/sprint5_prompt4_saved.sql) — screens/hooks go
 * through src/hooks/useSaved.ts. `saved_items` is polymorphic (`item_id`
 * + `item_type`, no FK on `item_id` — see the migration's own header
 * comment for why), so hydrating a Saved page needs the actual
 * Experience/Collection rows behind those ids. Rather than querying
 * `experiences`/`collections` directly — which would violate
 * experiencesService.ts's and collectionsService.ts's own "ONLY file
 * that talks to this table" module docs — this file asks those services
 * for what it needs via their exported `fetchExperiencesByIds()` /
 * `getCollectionsByIds()` (both added this sprint for exactly this
 * purpose).
 *
 * ── Repository methods (this sprint's requirement #2) ──
 * saveExperience() / unsaveExperience() / saveCollection() /
 * unsaveCollection() / getSavedExperiences() / getSavedCollections() /
 * isExperienceSaved() / isCollectionSaved() are the eight methods the
 * prompt doc names explicitly. getSavedExperienceIds() /
 * getSavedCollectionIds() are an additional pair of bulk-lookup helpers,
 * the same "fetch once, let every card check the same in-memory set"
 * shape collectionsService.ts's getCollectionsContainingExperience()
 * already established — every Experience/Collection Card's saved
 * indicator (requirement #7) reads from these via useSaved.ts rather than
 * each card making its own isExperienceSaved()/isCollectionSaved() call,
 * which would be one network round trip per rendered card.
 *
 * ── Pagination strategy ──
 * Keyset (cursor) pagination on `saved_items.created_at` (+ `id` as a
 * tie-breaker), same reasoning and same encode/decodeCursor-token shape
 * as experiencesService.ts / collectionsService.ts — kept as this file's
 * own private helpers rather than imported from either, the same "cursor
 * helpers stay local to their own service file" call those files already
 * made for themselves.
 */

import { supabase } from '@/lib/supabase';
import { normalizeError, makeError, type StrollError } from '@/lib/errors';
import { PAGINATION } from '@/constants/app';
import { fetchExperiencesByIds } from '@/services/experiencesService';
import { getCollectionsByIds } from '@/services/collectionsService';
import type { ExperienceFeedRow } from '@/types/experience';
import type { CollectionFeedRow } from '@/types/collection';

export type SavedResult<T> = { ok: true; data: T } | { ok: false; error: StrollError };

function ok<T>(data: T): SavedResult<T> {
  return { ok: true, data };
}

export function failSaved(err: unknown): SavedResult<never> {
  return { ok: false, error: normalizeError(err) };
}

const DEFAULT_LIMIT = PAGINATION.DEFAULT_PAGE_SIZE;

export type SavedItemType = 'experience' | 'collection';

// ─── Cursors ────────────────────────────────────────────────────────────────────

interface SavedItemCursor {
  createdAt: string;
  id: string;
}

function encodeSavedCursor(payload: SavedItemCursor): string {
  return encodeURIComponent(JSON.stringify(payload));
}

function decodeSavedCursor(cursor: string): SavedItemCursor | null {
  try {
    return JSON.parse(decodeURIComponent(cursor)) as SavedItemCursor;
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

// ─── Save / Unsave ──────────────────────────────────────────────────────────────
// Checks for an existing row first so a duplicate save surfaces as a
// specific, friendly CONFLICT rather than a raw unique-constraint
// Postgres error — the exact same shape
// collectionsService.ts's addExperienceToCollection() already
// established. `saved_items_unique_per_user` (see the migration SQL) is
// still the backstop for any race between this check and the insert.
// Unsave never checks existence first — deleting a row that isn't there
// is a no-op, not an error (same as removeExperienceFromCollection()).

async function saveItem(userId: string, itemId: string, itemType: SavedItemType): Promise<SavedResult<void>> {
  try {
    const { data: existing, error: checkError } = await supabase
      .from('saved_items')
      .select('id')
      .eq('user_id', userId)
      .eq('item_id', itemId)
      .eq('item_type', itemType)
      .maybeSingle();

    if (checkError) return failSaved(checkError);
    if (existing) return failSaved(makeError('CONFLICT', `This ${itemType} is already saved.`));

    const { error } = await supabase.from('saved_items').insert({ user_id: userId, item_id: itemId, item_type: itemType });
    if (error) return failSaved(error);
    return ok(undefined);
  } catch (err) {
    return failSaved(err);
  }
}

async function unsaveItem(userId: string, itemId: string, itemType: SavedItemType): Promise<SavedResult<void>> {
  try {
    const { error } = await supabase
      .from('saved_items')
      .delete()
      .eq('user_id', userId)
      .eq('item_id', itemId)
      .eq('item_type', itemType);

    if (error) return failSaved(error);
    return ok(undefined);
  } catch (err) {
    return failSaved(err);
  }
}

export async function saveExperience(userId: string, experienceId: string): Promise<SavedResult<void>> {
  return saveItem(userId, experienceId, 'experience');
}

export async function unsaveExperience(userId: string, experienceId: string): Promise<SavedResult<void>> {
  return unsaveItem(userId, experienceId, 'experience');
}

export async function saveCollection(userId: string, collectionId: string): Promise<SavedResult<void>> {
  return saveItem(userId, collectionId, 'collection');
}

export async function unsaveCollection(userId: string, collectionId: string): Promise<SavedResult<void>> {
  return unsaveItem(userId, collectionId, 'collection');
}

// ─── Is Saved (single item) ─────────────────────────────────────────────────────
// The literal per-item repository primitive the prompt doc names.
// useSaved.ts's card-level indicators use the bulk id lookups below
// instead (see this file's module doc) — these two exist for any future
// caller that only needs a single yes/no answer without paying for the
// full saved-ids set.

async function isItemSaved(userId: string, itemId: string, itemType: SavedItemType): Promise<SavedResult<boolean>> {
  try {
    const { data, error } = await supabase
      .from('saved_items')
      .select('id')
      .eq('user_id', userId)
      .eq('item_id', itemId)
      .eq('item_type', itemType)
      .maybeSingle();

    if (error) return failSaved(error);
    return ok(!!data);
  } catch (err) {
    return failSaved(err);
  }
}

export async function isExperienceSaved(userId: string, experienceId: string): Promise<SavedResult<boolean>> {
  return isItemSaved(userId, experienceId, 'experience');
}

export async function isCollectionSaved(userId: string, collectionId: string): Promise<SavedResult<boolean>> {
  return isItemSaved(userId, collectionId, 'collection');
}

// ─── Saved Ids (bulk) ────────────────────────────────────────────────────────────
// See module doc — backs every card's saved indicator via one shared
// query instead of one per card.

async function getSavedItemIds(userId: string, itemType: SavedItemType): Promise<SavedResult<string[]>> {
  try {
    const { data, error } = await supabase
      .from('saved_items')
      .select('item_id')
      .eq('user_id', userId)
      .eq('item_type', itemType);

    if (error) return failSaved(error);
    return ok(((data ?? []) as { item_id: string }[]).map((row) => row.item_id));
  } catch (err) {
    return failSaved(err);
  }
}

export async function getSavedExperienceIds(userId: string): Promise<SavedResult<string[]>> {
  return getSavedItemIds(userId, 'experience');
}

export async function getSavedCollectionIds(userId: string): Promise<SavedResult<string[]>> {
  return getSavedItemIds(userId, 'collection');
}

// ─── Get Saved Experiences / Get Saved Collections (paginated) ─────────────────
// Two-step: page through `saved_items` (cheap — just ids + timestamps),
// then batch-fetch the full rows for that page's ids from the owning
// service. `.in()` doesn't preserve order, so the page is re-sorted back
// into saved-order (most-recently-saved first) afterward; any id that no
// longer resolves (the Experience/Collection was deleted since being
// saved — requirement #11's "Deleted content") is simply absent from
// `byId` and silently dropped, rather than the whole page failing.

interface SavedItemsPage {
  itemIds: string[];
  nextCursor: string | null;
}

async function fetchSavedItemsPage(
  userId: string,
  itemType: SavedItemType,
  cursor: string | null | undefined,
  limit: number,
): Promise<SavedResult<SavedItemsPage>> {
  try {
    let query = supabase
      .from('saved_items')
      .select('id, item_id, created_at')
      .eq('user_id', userId)
      .eq('item_type', itemType);

    if (cursor) {
      const decoded = decodeSavedCursor(cursor);
      if (decoded) {
        query = query.or(
          buildKeysetFilter([
            { name: 'created_at', value: decoded.createdAt },
            { name: 'id', value: decoded.id },
          ]),
        );
      }
    }

    // Fetch one extra row to know whether a next page exists without a
    // separate count query — the same "limit + 1" trick used throughout
    // this codebase's other paginated queries.
    const { data, error } = await query
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit + 1);

    if (error) return failSaved(error);

    const rows = (data ?? []) as { id: string; item_id: string; created_at: string }[];
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const last = page[page.length - 1];

    const nextCursor =
      hasMore && last ? encodeSavedCursor({ createdAt: last.created_at, id: last.id }) : null;

    return ok({ itemIds: page.map((row) => row.item_id), nextCursor });
  } catch (err) {
    return failSaved(err);
  }
}

export interface SavedExperiencesPage {
  rows: ExperienceFeedRow[];
  nextCursor: string | null;
}

export async function getSavedExperiences(params: {
  userId: string;
  cursor?: string | null;
  limit?: number;
}): Promise<SavedResult<SavedExperiencesPage>> {
  const limit = params.limit ?? DEFAULT_LIMIT;
  const pageResult = await fetchSavedItemsPage(params.userId, 'experience', params.cursor, limit);
  if (!pageResult.ok) return pageResult;

  const { itemIds, nextCursor } = pageResult.data;
  if (itemIds.length === 0) return ok({ rows: [], nextCursor });

  const experiencesResult = await fetchExperiencesByIds(itemIds);
  if (!experiencesResult.ok) return failSaved(experiencesResult.error);

  const byId = new Map(experiencesResult.data.map((row) => [row.id, row]));
  const rows = itemIds
    .map((id) => byId.get(id))
    .filter((row): row is ExperienceFeedRow => row !== undefined);

  return ok({ rows, nextCursor });
}

export interface SavedCollectionsPage {
  rows: CollectionFeedRow[];
  nextCursor: string | null;
}

export async function getSavedCollections(params: {
  userId: string;
  cursor?: string | null;
  limit?: number;
}): Promise<SavedResult<SavedCollectionsPage>> {
  const limit = params.limit ?? DEFAULT_LIMIT;
  const pageResult = await fetchSavedItemsPage(params.userId, 'collection', params.cursor, limit);
  if (!pageResult.ok) return pageResult;

  const { itemIds, nextCursor } = pageResult.data;
  if (itemIds.length === 0) return ok({ rows: [], nextCursor });

  const collectionsResult = await getCollectionsByIds(itemIds);
  if (!collectionsResult.ok) return failSaved(collectionsResult.error);

  const byId = new Map(collectionsResult.data.map((row) => [row.id, row]));
  const rows = itemIds
    .map((id) => byId.get(id))
    .filter((row): row is CollectionFeedRow => row !== undefined);

  return ok({ rows, nextCursor });
}
