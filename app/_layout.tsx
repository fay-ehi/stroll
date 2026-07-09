/**
 * Stroll — Root Layout
 * app/_layout.tsx
 *
 * Sprint 1 Prompt 2 update: adds (onboarding) as a declared Stack.Screen
 * so expo-router knows about the group. No other changes.
 */

import { useEffect } from 'react';
import { View, StatusBar, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import * as SplashScreen from 'expo-splash-screen';

import { STROLL_FONTS } from '@/theme/fonts';
import { theme } from '@/theme';
import { ErrorBoundary } from '@/components/shell/ErrorBoundary';
import { ToastProvider } from '@/components/toast/ToastProvider';
import { AuthProvider } from '@/components/shell/AuthProvider';
import { TIMEOUTS } from '@/constants/app';
// Sprint 1 Prompt 3 fix: this file previously constructed its own local
// QueryClient, separate from the shared singleton in `@/lib/queryClient`.
// Any code calling `queryClient.invalidateQueries(...)` or `.setQueryData(...)`
// from outside a component (e.g. profileService, onboardingStore) needs the
// SAME instance that <PersistQueryClientProvider> uses, or its writes silently do
// nothing. Importing the shared singleton here fixes that and removes the
// duplicate configuration.
import { queryClient } from '@/lib/queryClient';
// Sprint 2 Prompt 3 addition — offline persistence (Offline Experience
// requirement #4). See queryPersister.ts for what gets persisted and why.
import {
  asyncStoragePersister,
  shouldPersistQuery,
  PERSIST_MAX_AGE_MS,
} from '@/lib/queryPersister';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(STROLL_FONTS);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      const timer = setTimeout(() => SplashScreen.hideAsync(), TIMEOUTS.SPLASH_MIN_MS);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{
            persister: asyncStoragePersister,
            maxAge: PERSIST_MAX_AGE_MS,
            dehydrateOptions: { shouldDehydrateQuery: shouldPersistQuery },
          }}
        >
          <SafeAreaProvider>
            <ToastProvider>
              <AuthProvider>
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
                    <Stack.Screen name="(onboarding)" />
                    <Stack.Screen name="(modals)" options={{ presentation: 'modal' }} />
                  </Stack>
                </View>
              </AuthProvider>
            </ToastProvider>
          </SafeAreaProvider>
        </PersistQueryClientProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
