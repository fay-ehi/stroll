/**
 * Stroll — Experience Creation Constants
 * src/constants/experienceCreation.ts
 *
 * Step definitions for the Experience Creation wizard.
 * Mirrors the pattern already established by `constants/onboarding.ts`
 * (`OnboardingStep` / `ONBOARDING_STEPS` / `ONBOARDING_STEP_COUNT`) so the
 * two multi-step flows in the app stay structurally consistent.
 *
 * ── Redesign: Photos → Compose → Preview ──
 * The original six-step wizard (Basics → Category → Place → Photos →
 * Story → Preview) made every field feel like a separate exam question,
 * one per screen, most of them gated as "required" even though the real
 * `experiences` insert shape only ever needed a place, a story, and
 * (now) at least one photo. This collapses that into three steps:
 *
 *   1. 'photos'  — the entry point into creation, not step #4. Photos are
 *      no longer optional (EXPERIENCE_LIMITS.MIN_PHOTOS is now 1) — you
 *      pick your photos first, the same way Instagram/TikTok's composer
 *      opens on the media picker before anything else.
 *   2. 'compose' — everything else on one scrollable screen, Instagram/
 *      TikTok caption-screen style: the photos just picked previewed at
 *      the top, then Place (search + select, still required — PRD §8.7
 *      is explicit that place names are searched and selected, never
 *      freely typed), an optional Title, a required Caption (the
 *      `story` field — PRD's "Experience Story", just relabelled in the
 *      UI; see ComposeStep.tsx), and category/tags/metadata folded into
 *      a collapsed "Add more details" section underneath since PRD §8.7
 *      Screen 11 marks every one of them optional.
 *   3. 'preview' — unchanged: mirrors the final Experience Details page,
 *      and is where the Publish action lives.
 *
 * Nothing in the wizard shell, store, or repository is hard-coded to a
 * step count — see src/components/wizard for the generic
 * (step-count-agnostic) UI — so this list is the only place that needs
 * to change to reshape the flow.
 */

// ─── Steps ──────────────────────────────────────────────────────────────────────

export type CreationStep = 'photos' | 'compose' | 'preview';

export const CREATION_STEPS: CreationStep[] = [
  'photos',
  'compose',
  'preview',
];

export const CREATION_STEP_COUNT = CREATION_STEPS.length;

export const FIRST_CREATION_STEP: CreationStep = CREATION_STEPS[0]!;

/** True when `step` is the last step currently implemented — the Preview/Publish step. */
export function isLastCreationStep(step: CreationStep): boolean {
  return CREATION_STEPS.indexOf(step) === CREATION_STEPS.length - 1;
}

export function creationStepIndex(step: CreationStep): number {
  return CREATION_STEPS.indexOf(step);
}
