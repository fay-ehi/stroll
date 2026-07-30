/**
 * Stroll — Legal Document Content
 * src/constants/legalContent.ts
 *
 * Sprint 9 Prompt 2 — Help, About & Legal.
 *
 * ⚠️  NOT REVIEWED LEGAL COPY — READ BEFORE PUBLISHING
 * ────────────────────────────────────────────────────────────────────────
 * The prompt doc is explicit that this sprint only needs to build a
 * screen "capable of displaying the application's Privacy Policy" —
 * "the actual policy text can be loaded from your chosen source later."
 * The content below is a structurally complete DRAFT covering the
 * standard sections an app like Stroll would need (data collected,
 * location use, account deletion, user content, etc.), written so the
 * screens have real, readable content to render and test against — it
 * is NOT legal advice and has NOT been reviewed by a lawyer. Please have
 * actual counsel review and replace this before it's presented to real
 * users as your binding Privacy Policy / Terms of Service. Each
 * document's `status` field below is deliberately set to `'draft'` so
 * this is visible in the UI too (see LegalDocumentLayout.tsx's banner)
 * until someone flips it to `'published'` on purpose.
 *
 * ── Structure, for whoever edits this next ──
 * Every document is a flat array of { heading, body } sections rendered
 * top to bottom by src/components/legal/LegalDocumentLayout.tsx — plain
 * text, not markdown (no new dependency for a markdown renderer; see
 * that component's own doc). `body` may contain `\n\n` for paragraph
 * breaks within one section; the layout splits on that.
 */

export type LegalDocumentStatus = 'draft' | 'published';

export interface LegalSection {
  heading: string;
  body:    string;
}

export interface LegalDocument {
  title:       string;
  status:      LegalDocumentStatus;
  lastUpdated: string;
  intro:       string;
  sections:    readonly LegalSection[];
  /** Optional link to a fuller version hosted outside the app — the prompt doc's "External links if necessary." Left undefined until a real marketing site page exists. */
  externalUrl?: string;
}

// ─── Privacy Policy ───────────────────────────────────────────────────────────

export const PRIVACY_POLICY: LegalDocument = {
  title:       'Privacy Policy',
  status:      'draft',
  lastUpdated: 'Draft — not yet published',
  intro:
    'This Privacy Policy explains what information Stroll collects, how it\u2019s used, and the ' +
    'choices you have. It applies to your use of the Stroll app.',
  sections: [
    {
      heading: 'Information We Collect',
      body:
        'Account information you provide, like your email, username, display name, and profile ' +
        'photo.\n\nContent you create, like Experiences, Collections, photos, and feedback you send us.\n\n' +
        'Usage information, like which screens you visit and which features you use, so we can ' +
        'improve the app.',
    },
    {
      heading: 'Location Data',
      body:
        'With your permission, Stroll uses your device\u2019s location to show you Experiences and ' +
        'places nearby and how far away they are. You can turn this off at any time in your ' +
        'device settings — the app will continue to work without it, with reduced personalization.',
    },
    {
      heading: 'How We Use Your Information',
      body:
        'To operate and improve Stroll, personalize what you see, keep the app secure, ' +
        'communicate with you about your account, and respond to feedback and support requests.',
    },
    {
      heading: 'Sharing Your Information',
      body:
        'Your public profile, Experiences, and Collections are visible to other users by design ' +
        '— that\u2019s how Stroll works. We do not sell your personal information to third parties.',
    },
    {
      heading: 'Data Retention & Account Deletion',
      body:
        'You can delete your account at any time from Settings \u2192 Danger Zone. Deleting your ' +
        'account permanently removes your profile, Experiences, Collections, saved items, and ' +
        'other account data, and cannot be undone.',
    },
    {
      heading: 'Your Rights & Choices',
      body:
        'You can review and update most of your information directly in the app — Settings ' +
        'covers your username, email, and password, and your Profile covers your display name, ' +
        'bio, and photo.',
    },
    {
      heading: 'Children\u2019s Privacy',
      body: 'Stroll is not directed at children, and we do not knowingly collect information from children.',
    },
    {
      heading: 'Changes to This Policy',
      body:
        'We may update this policy from time to time. If we make material changes, we\u2019ll let ' +
        'you know in the app before they take effect.',
    },
    {
      heading: 'Contact Us',
      body: 'Questions about this policy? Reach us at the support email listed in Help & Support.',
    },
  ],
};

// ─── Terms of Service ───────────────────────────────────────────────────────────

export const TERMS_OF_SERVICE: LegalDocument = {
  title:       'Terms of Service',
  status:      'draft',
  lastUpdated: 'Draft — not yet published',
  intro:
    'These Terms govern your use of Stroll. By creating an account, you agree to them.',
  sections: [
    {
      heading: 'Your Account',
      body:
        'You\u2019re responsible for the activity on your account and for keeping your login ' +
        'credentials secure. Usernames must follow our naming rules — no impersonation, and no ' +
        'reserved or offensive names.',
    },
    {
      heading: 'User Content & Conduct',
      body:
        'You keep ownership of the Experiences, photos, and Collections you post, and you grant ' +
        'Stroll the right to display them within the app. You\u2019re responsible for what you ' +
        'post — see Community Guidelines for what\u2019s expected of everyone.',
    },
    {
      heading: 'Experiences & Recommendations Disclaimer',
      body:
        'Experiences shared on Stroll are personal recommendations from other users, not ' +
        'endorsements from Stroll itself. Places, hours, and prices can change — always confirm ' +
        'details before you go.',
    },
    {
      heading: 'Intellectual Property',
      body:
        'The Stroll app, its design, and its branding belong to Stroll. Third-party software used ' +
        'to build the app is listed under Settings \u2192 Open Source Licenses.',
    },
    {
      heading: 'Termination',
      body:
        'You can delete your account at any time. We may suspend or terminate accounts that ' +
        'violate these Terms or our Community Guidelines.',
    },
    {
      heading: 'Disclaimers & Limitation of Liability',
      body:
        'Stroll is provided "as is." To the extent permitted by law, Stroll isn\u2019t liable for ' +
        'decisions you make based on content in the app, including visiting places recommended by ' +
        'other users.',
    },
    {
      heading: 'Changes to These Terms',
      body: 'We may update these Terms from time to time. Continued use of Stroll after a change means you accept the updated Terms.',
    },
    {
      heading: 'Contact Us',
      body: 'Questions about these Terms? Reach us at the support email listed in Help & Support.',
    },
  ],
};

// ─── Community Guidelines ───────────────────────────────────────────────────────

export const COMMUNITY_GUIDELINES: LegalDocument = {
  title:       'Community Guidelines',
  status:      'draft',
  lastUpdated: 'Draft — not yet published',
  intro:
    'Stroll works because people share real, honest recommendations. These guidelines keep it ' +
    'that way.',
  sections: [
    {
      heading: 'Be Honest',
      body:
        'Only share Experiences you actually had. Don\u2019t post on behalf of a business, and ' +
        'don\u2019t accept payment to post a recommendation without saying so.',
    },
    {
      heading: 'Be Respectful',
      body:
        'Disagree about a place if you want — just do it respectfully. Harassment, hate speech, ' +
        'and targeted abuse of other users are never allowed.',
    },
    {
      heading: 'Content Standards',
      body:
        'No graphic violence, no sexual content, no content promoting illegal activity. Photos ' +
        'should be your own and relevant to the place you\u2019re sharing.',
    },
    {
      heading: 'Safety',
      body:
        'Don\u2019t share other people\u2019s private information without their consent, and be ' +
        'thoughtful about what location details you post.',
    },
    {
      heading: 'Reporting',
      body:
        'A dedicated in-app reporting flow is coming in a future release. Until then, contact us ' +
        'through Help & Support if you see something that violates these guidelines.',
    },
    {
      heading: 'Consequences',
      body:
        'Content or accounts that violate these guidelines may be removed or suspended, at ' +
        'Stroll\u2019s discretion.',
    },
  ],
};
