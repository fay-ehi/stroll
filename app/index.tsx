/**
 * Stroll — Root Index Redirect
 * app/index.tsx
 *
 * Sprint 4 scope: "Configure redirects only. Do not implement
 * authentication yet." There is no real session check here — that's
 * explicit future work once Supabase auth exists. For now this always
 * redirects to the (auth) Welcome screen, which is the correct default
 * for an app with no signed-in user.
 *
 * When real auth lands, this file is exactly where the session check
 * belongs: read auth state, redirect to (app)/(tabs)/discover if a
 * session exists, otherwise (auth)/welcome — same shape, real condition.
 */

import { Redirect } from 'expo-router';
import { AUTH_ROUTES } from '@/constants/routes';

export default function RootIndex() {
  return <Redirect href={AUTH_ROUTES.welcome} />;
}
