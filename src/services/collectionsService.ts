/**
 * Stroll — Collections Service (MOCK — Skeleton Only)
 * src/services/collectionsService.ts
 *
 * STATUS: Not a real Supabase-backed service. This repo has no
 * migrations checked in, so it's unknown whether a `collections` table
 * exists server-side yet — see src/types/collection.ts's module doc for
 * the proposed schema and the concrete steps to make this real.
 *
 * Returns realistic, hand-written mock data through the exact same
 * `ExperiencesResult`-style Result type and async signature a real
 * service function would use, so:
 *   - useCollectionsCarousel.ts (and anything built on top of it later)
 *     never has to change its call shape when this becomes real.
 *   - Swapping this file's body for real `supabase.from('collections')`
 *     queries is the entire migration — nothing upstream needs to know.
 *
 * Deliberately NOT wired into any live screen — see discover.tsx's
 * module doc for where it's meant to plug in once this sprint starts.
 */

import type { CollectionFeedRow } from '@/types/collection';
import type { StrollError } from '@/lib/errors';
import { makeError } from '@/lib/errors';

export type CollectionsResult<T> = { ok: true; data: T } | { ok: false; error: StrollError };

function ok<T>(data: T): CollectionsResult<T> {
  return { ok: true, data };
}

// A fixed, deliberately small set of realistic rows — enough to exercise
// single-owner vs. collaborative rendering and a loading/empty case, not
// meant to simulate real pagination or filtering.
const MOCK_ROWS: CollectionFeedRow[] = [
  {
    id: 'mock-collection-1',
    title: 'Cozy Cafes to Eat in Abuja',
    description: 'Quiet corners, good wifi, better coffee.',
    city: 'Abuja',
    cover_image_url: null,
    experience_count: 8,
    created_at: '2026-05-01T09:00:00Z',
    updated_at: '2026-06-20T09:00:00Z',
    owner: {
      id: 'mock-user-1',
      username: 'amaka.explores',
      display_name: 'Amaka',
      avatar_url: null,
      is_verified: false,
    },
    collaborators: [
      {
        id: 'mock-user-2',
        username: 'tunde.eats',
        display_name: 'Tunde',
        avatar_url: null,
        is_verified: false,
      },
    ],
  },
  {
    id: 'mock-collection-2',
    title: 'Sunday Brunch Spots',
    description: 'Worth the wait.',
    city: 'Abuja',
    cover_image_url: null,
    experience_count: 5,
    created_at: '2026-04-12T09:00:00Z',
    updated_at: '2026-06-01T09:00:00Z',
    owner: {
      id: 'mock-user-3',
      username: 'chioma.b',
      display_name: 'Chioma',
      avatar_url: null,
      is_verified: true,
    },
    collaborators: [],
  },
  {
    id: 'mock-collection-3',
    title: 'Rooftop Views After Dark',
    description: null,
    city: 'Abuja',
    cover_image_url: null,
    experience_count: 3,
    created_at: '2026-06-02T09:00:00Z',
    updated_at: '2026-06-25T09:00:00Z',
    owner: {
      id: 'mock-user-4',
      username: 'dbanks',
      display_name: 'David',
      avatar_url: null,
      is_verified: false,
    },
    collaborators: [],
  },
];

/** MOCK — returns a fixed set of collections for a city. Signature matches what a real cursor/city-filtered query would return, so this can be swapped for a real fetchCollectionsFeedPage without changing callers. */
export async function fetchCollectionsForCity(params: {
  city?: string;
}): Promise<CollectionsResult<CollectionFeedRow[]>> {
  const { city } = params;
  // Simulated network latency, so a loading skeleton is actually visible
  // in dev if this ever gets test-wired — remove once this is a real query.
  await new Promise((resolve) => setTimeout(resolve, 300));

  const rows = city ? MOCK_ROWS.filter((row) => row.city === city) : MOCK_ROWS;
  return ok(rows);
}

// Kept for symmetry with experiencesService.ts's `fail()` helper, even
// though the mock above never fails — a real implementation will need it
// immediately, and having the shape ready avoids a slightly different
// error convention sneaking in when this becomes real.
export function failCollections(err: unknown): CollectionsResult<never> {
  return { ok: false, error: makeError('UNKNOWN', 'Failed to load collections.', err) };
}
