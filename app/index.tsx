/**
 * Stroll — Root Index
 * app/index.tsx
 *
 * Route guard entry point. Reads auth state and redirects to the
 * correct group. The AuthProvider in _layout.tsx ensures auth status
 * is never 'loading' by the time this renders (it shows AppLoader until
 * initialization completes).
 *
 * Authenticated  → (app)/(tabs)/discover
 * Unauthenticated → (auth)/welcome
 */

import { Redirect } from 'expo-router';
import { useAuthStore, selectIsAuthenticated } from '@/stores/authStore';
import { ROUTES } from '@/constants/routes';

export default function RootIndex() {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);

  if (isAuthenticated) {
    return <Redirect href={ROUTES.tabs.discover as never} />;
  }

  return <Redirect href={ROUTES.auth.welcome as never} />;
}
