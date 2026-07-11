/**
 * Stroll — Experience Draft Domain Types
 * src/types/experienceDraft.ts
 *
 * `ExperienceDraft` is a LOCAL-ONLY model: it lives entirely in
 * AsyncStorage (via experienceDraftService.ts) until Publish writes a
 * real row to Supabase. It is deliberately NOT typed as a partial
 * `Tables<'experiences'>` the way every other domain model in this
 * codebase is derived from its Supabase row (see types/profile.ts,
 * types/place.ts, types/experience.ts) — the `experiences` table has no
 * `title` or `category` column at all; a published Experience's "title"
 * is its tagged Place's name and its category is the Place's structural
 * category (see ExperienceCardModel.title's doc comment in
 * types/experience.ts).
 *
 * `place` is a tagged Place, not the free-text "Location Selection" a
 * generic brief would ask for — PRD §8.7 is explicit that place names
 * are searched and selected, never freely typed. `photos`, `story`
 * (the published Experience's write-up — labelled "Caption" in the UI,
 * see ComposeStep.tsx), and the optional metadata PRD §8.7 defines
 * (amountSpent, visitType, wouldRecommend, goodForTags, vibeTags) are
 * the rest of the real `experiences` insert shape.
 *
 * `title` and `categoryId` have no equivalent in the real schema:
 *   - `title` is never written to Supabase (an Experience's "title" is
 *     always its place's name — see module doc above). It exists purely
 *     as an optional, local working label so a user recognizes their own
 *     in-progress draft in a drafts list; Publish reads `story`, not
 *     `title`.
 *   - `categoryId` is never written to Supabase either — it's used
 *     purely to pre-filter Place Search results on the 'compose' step
 *     (see PlaceStep.tsx, embedded within ComposeStep.tsx).
 *
 * ── Photos → Compose → Preview redesign ──
 * The creation flow used to be six required-feeling steps (Basics →
 * Category → Place → Photos → Story → Preview), each gated behind its
 * own "Continue". `title` and `description` lived on a since-removed
 * 'basics' step; `description` had its own 10–300 char short-teaser
 * bounds and was never published (only `story` is), so it's been
 * dropped from this model entirely rather than carried forward as dead
 * weight — see constants/experienceCreation.ts for the full redesign
 * rationale. Everything description used to do is now just `story`
 * (the required Caption on the 'compose' step).
 */

import { VALIDATION } from '@/utils';
import { EXPERIENCE_DRAFT_LIMITS, EXPERIENCE_LIMITS } from '@/constants/app';
import { CREATION_STEPS, type CreationStep } from '@/constants/experienceCreation';
import type { PlaceCategoryId } from '@/constants/places';
import type { AmountSpent, VisitType, GoodForTag, VibeTag } from '@/constants/app';

// ─── Draft Place Selection ──────────────────────────────────────────────────────
// A lightweight, denormalized snapshot of the Place tagged on the
// 'compose' step — same tradeoff types/experience.ts's module doc already
// accepts for `experiences.city` duplicating `places.city`: a small
// write-time (here, selection-time) copy in exchange for every read
// (PlaceStep's "currently selected" row, PreviewStep's header/location)
// staying a plain field access instead of a second network round trip.
// `id` is the only field that's actually load-bearing for Publish (it
// becomes `experiences.place_id`) — everything else here is display-only.

export interface DraftPlaceSummary {
  id: string;
  name: string;
  slug: string;
  city: string;
  address: string | null;
  latitude: number;
  longitude: number;
  category: PlaceCategoryId | null;
  heroImage: string | null;
}

// ─── Draft Photos ───────────────────────────────────────────────────────────────
// Position within `ExperienceDraft.photos` IS the photo's order — the
// first element is always the cover (mirrors how `toExperienceCardModel`
// already treats `experience_photos` position 0 as the cover once
// published — see types/experience.ts). There's no separate "isCover"
// flag to keep in sync; making a photo the cover is just moving it to
// index 0 (see `movePhoto` in experienceCreationStore.ts).

export type PhotoUploadStatus = 'pending' | 'uploading' | 'uploaded' | 'failed';

export interface ExperienceDraftPhoto {
  /** Client-generated (see utils.generateLocalId) — stable across reorders/retries. */
  id: string;
  /** Device-local URI from the image picker. Always present, even after upload. */
  localUri: string;
  /** Public Supabase Storage URL once uploaded — null until `status` is 'uploaded'. */
  remoteUrl: string | null;
  status: PhotoUploadStatus;
  width?: number;
  height?: number;
}

// ─── Canonical Domain Model ────────────────────────────────────────────────────

export interface ExperienceDraft {
  /** Client-generated (see utils.generateLocalId) — not a Supabase row id. */
  id:          string;
  /** Owning user — drafts are always scoped to one account (see storage.ts). */
  userId:      string;
  /** Optional local working label — never published (see module doc). */
  title:       string;
  categoryId:  PlaceCategoryId | null;
  /** The step the user was on when they last left the wizard — drives Resume. */
  currentStep: CreationStep;
  createdAt:   string;
  updatedAt:   string;

  place:          DraftPlaceSummary | null;
  photos:         ExperienceDraftPhoto[];
  /** The published Experience's write-up — labelled "Caption" in the UI. */
  story:          string;
  amountSpent:    AmountSpent | null;
  visitType:      VisitType | null;
  wouldRecommend: boolean | null;
  goodForTags:    GoodForTag[];
  vibeTags:       VibeTag[];
}

/** What a step screen can change — everything except id/userId/createdAt. */
export type ExperienceDraftPatch = Partial<
  Pick<
    ExperienceDraft,
    | 'title'
    | 'categoryId'
    | 'currentStep'
    | 'place'
    | 'photos'
    | 'story'
    | 'amountSpent'
    | 'visitType'
    | 'wouldRecommend'
    | 'goodForTags'
    | 'vibeTags'
  >
>;

export function createEmptyDraft(id: string, userId: string): ExperienceDraft {
  const now = new Date().toISOString();
  return {
    id,
    userId,
    title:       '',
    categoryId:  null,
    currentStep: CREATION_STEPS[0]!,
    createdAt:   now,
    updatedAt:   now,

    place:          null,
    photos:         [],
    story:          '',
    amountSpent:    null,
    visitType:      null,
    wouldRecommend: null,
    goodForTags:    [],
    vibeTags:       [],
  };
}

// ─── Field Validation ──────────────────────────────────────────────────────────
// Reuses VALIDATION.isWithinLength (src/utils) — only the per-step
// composition and friendly messages are new here, same division of
// labor as validateProfileUpdate in types/profile.ts.

export interface DraftValidationErrors {
  photos?: string;
  title?:  string;
  place?:  string;
  story?:  string;
}

/**
 * Validates only the fields the given step requires before the user can
 * advance. Safe to call on every keystroke, not just on "Next" press, so
 * inline errors can update live.
 *
 * 'preview' has no entry — it has no fields of its own to validate;
 * publishing itself is gated by `validateForPublish` below, independent
 * of whichever step is current.
 */
export function validateDraftStep(step: CreationStep, draft: ExperienceDraft): DraftValidationErrors {
  const errors: DraftValidationErrors = {};

  if (step === 'photos') {
    if (draft.photos.length < EXPERIENCE_LIMITS.MIN_PHOTOS) {
      errors.photos =
        EXPERIENCE_LIMITS.MIN_PHOTOS <= 1
          ? 'Add a photo to continue.'
          : `Add at least ${EXPERIENCE_LIMITS.MIN_PHOTOS} photos to continue.`;
    }
  }

  if (step === 'compose') {
    // Title is optional — only flagged if it's actually filled in and too
    // long (maxLength on the input already prevents this in practice;
    // this is the same defensive re-check every other field gets).
    if (draft.title.trim() && !VALIDATION.isWithinLength(draft.title, 0, EXPERIENCE_DRAFT_LIMITS.MAX_TITLE_LENGTH)) {
      errors.title = `Title must be ${EXPERIENCE_DRAFT_LIMITS.MAX_TITLE_LENGTH} characters or fewer.`;
    }

    if (!draft.place) {
      errors.place = 'Search for and select a place to continue.';
    }

    if (!draft.story.trim()) {
      errors.story = 'Add a caption to continue.';
    } else if (
      !VALIDATION.isWithinLength(draft.story, EXPERIENCE_LIMITS.MIN_STORY_LENGTH, EXPERIENCE_LIMITS.MAX_STORY_LENGTH)
    ) {
      errors.story = `Caption must be between ${EXPERIENCE_LIMITS.MIN_STORY_LENGTH} and ${EXPERIENCE_LIMITS.MAX_STORY_LENGTH} characters.`;
    }
  }

  return errors;
}

export function hasValidationErrors(errors: DraftValidationErrors): boolean {
  return Object.values(errors).some((message) => message !== undefined);
}

/**
 * The final gate before Publish — independent of `currentStep` (the user
 * publishes from the 'preview' step, which has no fields of its own).
 * Checks every field that's actually required to publish (at least one
 * Photo, a Place, and a Caption/Story) — everything else stays optional.
 * Re-validates from scratch rather than trusting the 'photos'/'compose'
 * steps were already satisfied at the time — a defensive re-check
 * immediately before the network call, the same way a server would never
 * trust client-side validation alone.
 */
export function validateForPublish(draft: ExperienceDraft): DraftValidationErrors {
  return {
    ...validateDraftStep('photos', draft),
    ...validateDraftStep('compose', draft),
  };
}
