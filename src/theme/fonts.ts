/**
 * Stroll Design System — Font Assets
 * Version 1.0
 *
 * This file defines the font asset map for expo-font's useFonts() hook.
 * It must be used in the root layout (_layout.tsx) to preload all fonts
 * before any screen renders.
 *
 * Font families defined in the Design System (§6):
 *   Headings → Plus Jakarta Sans  (weights: 600, 700)
 *   Body     → Inter              (weights: 400, 500, 600)
 *
 * Installation:
 *   The font files must live in assets/fonts/ in the project root.
 *   Download them from Google Fonts:
 *     - Inter: https://fonts.google.com/specimen/Inter
 *     - Plus Jakarta Sans: https://fonts.google.com/specimen/Plus+Jakarta+Sans
 *
 *   Required files:
 *     assets/fonts/Inter-Regular.ttf
 *     assets/fonts/Inter-Medium.ttf
 *     assets/fonts/Inter-SemiBold.ttf
 *     assets/fonts/PlusJakartaSans-SemiBold.ttf
 *     assets/fonts/PlusJakartaSans-Bold.ttf
 *
 * Usage in root _layout.tsx:
 *   import { useFonts } from 'expo-font';
 *   import { STROLL_FONTS } from '@/theme/fonts';
 *
 *   export default function RootLayout() {
 *     const [fontsLoaded, fontError] = useFonts(STROLL_FONTS);
 *     if (!fontsLoaded && !fontError) return null;
 *     return <Stack />;
 *   }
 *
 * The font keys here MUST exactly match FONT_FAMILY values in typography.ts.
 */

export const STROLL_FONTS = {
  // ── Inter ──────────────────────────────────────────────────────────────────
  'Inter-Regular':   require('../../assets/fonts/Inter-Regular.ttf'),
  'Inter-Medium':    require('../../assets/fonts/Inter-Medium.ttf'),
  'Inter-SemiBold':  require('../../assets/fonts/Inter-SemiBold.ttf'),

  // ── Plus Jakarta Sans ──────────────────────────────────────────────────────
  'PlusJakartaSans-SemiBold': require('../../assets/fonts/PlusJakartaSans-SemiBold.ttf'),
  'PlusJakartaSans-Bold':     require('../../assets/fonts/PlusJakartaSans-Bold.ttf'),
} as const;

export type StrollFontKey = keyof typeof STROLL_FONTS;
