/**
 * Stroll — Community Guidelines
 * app/(app)/legal/community-guidelines.tsx
 *
 * Sprint 9 Prompt 2 — Help, About & Legal. "This establishes
 * expectations for future community moderation" (prompt doc) — same
 * reusable layout as Privacy/Terms; see LegalDocumentLayout's own doc.
 */

import React from 'react';
import { LegalDocumentLayout } from '@/components/legal';
import { COMMUNITY_GUIDELINES } from '@/constants/legalContent';

export default function CommunityGuidelinesScreen() {
  return <LegalDocumentLayout document={COMMUNITY_GUIDELINES} />;
}
