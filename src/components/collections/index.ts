/**
 * Stroll — Collections Components
 * src/components/collections/index.ts
 *
 * Sprint 5 Prompt 1. Mirrors the barrel-per-domain convention already
 * used by src/components/profile, discover, places, etc. Note: the
 * *reusable Collection Card* components (CollectionCard.tsx,
 * CollectionCarousel.tsx) live in src/components/discover instead — they
 * were scaffolded there ahead of this sprint, and requirement #9
 * ("Discover Integration Preparation") keeps them there since that's
 * where Discover will eventually mount them. This barrel is for the
 * Collection Detail / Create / Add-to-Collection screens' own
 * components.
 */

export { CollectionDetailHeader } from './CollectionDetailHeader';
export type { CollectionDetailHeaderProps, CollectionEditDraft } from './CollectionDetailHeader';

export { CollectionCoverField } from './CollectionCoverField';
export type { CollectionCoverFieldProps } from './CollectionCoverField';

export { CollectionSelectRow } from './CollectionSelectRow';
export type { CollectionSelectRowProps } from './CollectionSelectRow';

// ─── Sprint 5 Prompt 2 — Collaborative Collections ─────────────────────────────

export { ContributorsLine } from './ContributorsLine';
export type { ContributorsLineProps } from './ContributorsLine';

export { CollaboratorRow } from './CollaboratorRow';
export type { CollaboratorRowProps } from './CollaboratorRow';

export { InviteUserRow } from './InviteUserRow';
export type { InviteUserRowProps } from './InviteUserRow';

export { ExperiencePickRow } from './ExperiencePickRow';
export type { ExperiencePickRowProps } from './ExperiencePickRow';
