/**
 * Stroll — Terms of Service
 * app/(app)/legal/terms.tsx
 *
 * Sprint 9 Prompt 2 — Help, About & Legal. "Create a Terms screen using
 * the same reusable document layout" — see LegalDocumentLayout's own doc.
 */

import React from 'react';
import { LegalDocumentLayout } from '@/components/legal';
import { TERMS_OF_SERVICE } from '@/constants/legalContent';

export default function TermsOfServiceScreen() {
  return <LegalDocumentLayout document={TERMS_OF_SERVICE} />;
}
