/**
 * Stroll — Privacy Policy
 * app/(app)/legal/privacy.tsx
 *
 * Sprint 9 Prompt 2 — Help, About & Legal. All layout/scroll/section
 * rendering lives in LegalDocumentLayout — see that component's own doc.
 * This file exists only to pick which document.
 */

import React from 'react';
import { LegalDocumentLayout } from '@/components/legal';
import { PRIVACY_POLICY } from '@/constants/legalContent';

export default function PrivacyPolicyScreen() {
  return <LegalDocumentLayout document={PRIVACY_POLICY} />;
}
