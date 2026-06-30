/**
 * Stroll — Root Layout
 * app/_layout.tsx
 *
 * Sprint 2 established: font loading, SafeAreaProvider, QueryClientProvider,
 * StatusBar, base Stack. This sprint EXTENDS that file rather than
 * replacing its concerns — per the prompt's instruction to reuse existing
 * work and not recreate it unless necessary. What's added here:
 *
 *   1. GestureHandlerRootView — required at the true root by
 *      react-native-gesture-handler (a transitive dependency of
 *      expo-router's native stack / bottom-sheet-style modals). Must wrap
 *      everything else, including SafeAreaProvider.
 *   2. ErrorBoundary — catches render errors anywhere below it and shows
 *      an on-brand fallback instead of a native crash screen.
 *   3. Three declared Stack.Screen route groups — (auth), (app), (modals)
 *      — replacing the previous bare <Stack /> with no screen declarations.
 *      Declaring them explicitly (rather than relying purely on
 *      file-system inference) makes the top-level navigation structure
 *      self-documenting and lets us set group-specific options (e.g. the
 *      (modals) group could later get a shared modal animation here, or
 *      headerShown overrides) in exactly one place.
 *
 * Auth-state-aware redirecting between (auth) and (app) is explicitly
 * deferred — "Configure redirects only. Do not implement authentication
 * yet." app/index.tsx currently always redirects to (auth)/welcome; that
 * redirect becomes session-aware once real auth exists, without this file
 * needing to change.
 */

import { useEffect } from 'react';
import { View, StatusBar, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';

import { STROLL_FONTS } from '@/theme/fonts';
import { theme } from '@/theme';
import { ErrorBoundary } from '@/components/shell/ErrorBoundary';

// ─── Keep splash screen visible until fonts are loaded ────────────────────────
SplashScreen.preventAutoHideAsync();

// ─── TanStack Query client ────────────────────────────────────────────────────
// Unchanged from Sprint 2 — singleton, created once at module level.

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:            30_000, // 30 seconds
      gcTime:               5 * 60 * 1000, // 5 minutes
      retry:                2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

// ─── Root Layout Component ────────────────────────────────────────────────────

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(STROLL_FONTS);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    // GestureHandlerRootView must be the outermost wrapper — gesture
    // handling (swipe-to-dismiss modals, future bottom sheets) breaks
    // silently if anything is nested above it.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <SafeAreaProvider>
            <StatusBar
              barStyle="dark-content"
              backgroundColor={theme.colors.neutral.background}
              translucent={Platform.OS === 'android'}
            />

            <View style={{ flex: 1, backgroundColor: theme.colors.neutral.background }}>
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: {
                    backgroundColor: theme.colors.neutral.background,
                  },
                  animation: Platform.OS === 'android' ? 'fade' : 'default',
                }}
              >
                <Stack.Screen name="index" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(app)" />
                <Stack.Screen
                  name="(modals)"
                  options={{ presentation: 'modal' }}
                />
              </Stack>
            </View>
          </SafeAreaProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
