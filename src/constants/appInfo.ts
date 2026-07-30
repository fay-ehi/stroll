/**
 * Stroll — App Info Constants
 * src/constants/appInfo.ts
 *
 * Sprint 9 Prompt 2 — Help, About & Legal. Kept as its own file rather
 * than folded into constants/app.ts (which already owns APP_META's name/
 * description/scheme/supportEmail — reused below, not duplicated) —
 * app.ts is magic-number/limit/timeout territory; this file is
 * long-form display content for the Help/About screens specifically,
 * the same "give a specific concern its own file" reasoning
 * constants/routes.ts already established.
 */

import { APP_META } from './app';

// ─── Mission Statement (About Stroll) ───────────────────────────────────────────

export const MISSION_STATEMENT =
  'Stroll exists so no one has to discover their own city the hard way. ' +
  'Every recommendation comes from someone who actually went — a real ' +
  'person, a real experience — not a star rating from a stranger. Our ' +
  'goal is simple: help young Nigerians find the places worth their time, ' +
  'told by the people who found them first.';

// ─── Help — Frequently Asked Questions ─────────────────────────────────────────
// "Placeholder architecture" per the prompt doc — a real Help Center
// (categories, search, a CMS-backed content source) is future scope; for
// now this is a flat, local array the Help screen renders as a simple
// accordion. Swapping this for a real content service later only means
// changing where FAQ_ITEMS is populated from — HelpScreen itself, and
// FAQAccordionItem's shape, don't need to change (see
// src/components/help/FAQAccordionItem.tsx).

export interface FAQItem {
  id:       string;
  question: string;
  answer:   string;
}

export const FAQ_ITEMS: readonly FAQItem[] = [
  {
    id:       'what-is-an-experience',
    question: 'What is an Experience?',
    answer:
      "An Experience is a real recommendation from a Stroll user — a place they went, " +
      'with their own photos and notes about what made it worth visiting.',
  },
  {
    id:       'how-to-create-experience',
    question: 'How do I share an Experience?',
    answer:
      'Tap the Create button in the middle of the bottom navigation bar, search for the ' +
      'place, add a few photos, and share what made it worth going.',
  },
  {
    id:       'how-to-follow',
    question: 'How do I follow other users?',
    answer:
      "Open someone's profile — from their Experience, a Collection, or search — and tap " +
      'Follow. Following is approval-free, so it takes effect immediately.',
  },
  {
    id:       'what-are-collections',
    question: 'What are Collections?',
    answer:
      'Collections are curated groups of Experiences, like "Best Suya in Lagos" or ' +
      '"Rainy Day Spots." You can create your own and invite others to add to them together.',
  },
  {
    id:       'how-to-save',
    question: 'How do I save something for later?',
    answer:
      'Tap the bookmark icon on any Experience or Collection. Everything you save shows up ' +
      'in the Saved tab.',
  },
  {
    id:       'change-username',
    question: 'How do I change my username or email?',
    answer:
      'Go to Settings from your profile\u2019s gear icon — Username and Email are both ' +
      'editable from the Account section.',
  },
  {
    id:       'delete-account',
    question: 'How do I delete my account?',
    answer:
      'Settings \u2192 Danger Zone \u2192 Delete Account. This permanently removes your profile, ' +
      'Experiences, Collections, and saved items, and cannot be undone.',
  },
] as const;

// ─── Help — Contact Support ─────────────────────────────────────────────────────
// Reuses APP_META.supportEmail (already flagged as a placeholder there)
// rather than defining a second one here.

export const SUPPORT_EMAIL = APP_META.supportEmail;

// ─── About Stroll ───────────────────────────────────────────────────────────────

export const ABOUT_DESCRIPTION = APP_META.description;

/** Computed at read time (not a static literal) so the copyright line never goes stale on its own. */
export function copyrightLine(): string {
  return `\u00A9 ${new Date().getFullYear()} ${APP_META.name}. All rights reserved.`;
}

// ─── Open Source Licenses ───────────────────────────────────────────────────────
// Generated from package.json's `dependencies` + each package's `license`
// field as published on the npm registry at the time this sprint was
// written (verified against the registry, not guessed) — this is a
// static snapshot, not a build-time-generated file, so it will drift as
// dependencies are added/updated/removed. "Prepare the architecture for
// future additions" (prompt doc) means: this is the ONE array
// LicensesScreen reads from — regenerating it is a data update to this
// file, never a UI change.
//
// Excluded on purpose: devDependencies-shape packages that are never
// bundled into the shipped app (eslint-config-expo, tailwindcss — the
// latter is a build-time CSS tool; NativeWind, which IS bundled into the
// app at runtime, is listed below in its place).

export interface OSSLicense {
  name:    string;
  version: string;
  license: string;
}

export const OSS_LICENSES: readonly OSSLicense[] = [
  { name: '@hookform/resolvers', version: '3.10.0', license: 'MIT' },
  { name: '@react-native-async-storage/async-storage', version: '2.2.0', license: 'MIT' },
  { name: '@react-native-community/netinfo', version: '11.4.1', license: 'MIT' },
  { name: '@supabase/supabase-js', version: '2.108.2', license: 'MIT' },
  { name: '@tanstack/query-async-storage-persister', version: '5.101.2', license: 'MIT' },
  { name: '@tanstack/react-query', version: '5.101.2', license: 'MIT' },
  { name: '@tanstack/react-query-persist-client', version: '5.101.2', license: 'MIT' },
  { name: 'base64-arraybuffer', version: '1.0.2', license: 'MIT' },
  { name: 'expo', version: '54.0.34', license: 'MIT' },
  { name: 'expo-constants', version: '18.0.13', license: 'MIT' },
  { name: 'expo-font', version: '14.0.12', license: 'MIT' },
  { name: 'expo-image', version: '3.0.11', license: 'MIT' },
  { name: 'expo-image-picker', version: '17.0.11', license: 'MIT' },
  { name: 'expo-linking', version: '8.0.12', license: 'MIT' },
  { name: 'expo-location', version: '19.0.8', license: 'MIT' },
  { name: 'expo-media-library', version: '18.2.1', license: 'MIT' },
  { name: 'expo-notifications', version: '0.32.17', license: 'MIT' },
  { name: 'expo-router', version: '6.0.24', license: 'MIT' },
  { name: 'expo-secure-store', version: '15.0.8', license: 'MIT' },
  { name: 'expo-splash-screen', version: '31.0.13', license: 'MIT' },
  { name: 'expo-status-bar', version: '3.0.9', license: 'MIT' },
  { name: 'lucide-react-native', version: '0.454.0', license: 'ISC' },
  { name: 'nativewind', version: '4.2.6', license: 'MIT' },
  { name: 'react', version: '19.1.0', license: 'MIT' },
  { name: 'react-dom', version: '19.1.0', license: 'MIT' },
  { name: 'react-hook-form', version: '7.80.0', license: 'MIT' },
  { name: 'react-native', version: '0.81.5', license: 'MIT' },
  { name: 'react-native-gesture-handler', version: '2.28.0', license: 'MIT' },
  { name: 'react-native-maps', version: '1.20.1', license: 'MIT' },
  { name: 'react-native-reanimated', version: '4.1.1', license: 'MIT' },
  { name: 'react-native-safe-area-context', version: '5.6.0', license: 'MIT' },
  { name: 'react-native-screens', version: '4.16.0', license: 'MIT' },
  { name: 'react-native-svg', version: '15.12.1', license: 'MIT' },
  { name: 'react-native-url-polyfill', version: '3.0.0', license: 'MIT' },
  { name: 'react-native-web', version: '0.21.0', license: 'MIT' },
  { name: 'react-native-worklets', version: '0.5.1', license: 'MIT' },
  { name: 'zod', version: '3.25.76', license: 'MIT' },
  { name: 'zustand', version: '5.0.14', license: 'MIT' },
] as const;
