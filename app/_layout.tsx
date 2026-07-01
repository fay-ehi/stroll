/**
 * Stroll — Root Layout
 * app/_layout.tsx
 *
 * Sprint 1 update: adds AuthProvider wrapping the Stack.
 * AuthProvider initializes the Supabase session and starts the auth
 * state listener before any screen renders.
 *
 * Provider order (outermost → innermost):
 *   GestureHandlerRootView
 *   ErrorBoundary
 *   QueryClientProvider
 *   SafeAreaProvider
 *   ToastProvider
 *   AuthProvider          ← Sprint 1 addition
 *     StatusBar
 *     View
 *     Stack
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
import { ToastProvider } from '@/components/toast/ToastProvider';
import { AuthProvider } from '@/components/shell/AuthProvider';
import { TIMEOUTS } from '@/constants/app';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:            30_000,
      gcTime:               5 * 60 * 1000,
      retry:                2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(STROLL_FONTS);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      const timer = setTimeout(
        () => SplashScreen.hideAsync(),
        TIMEOUTS.SPLASH_MIN_MS
      );
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
        <QueryClientProvider client={queryClient}>
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
                    <Stack.Screen
                      name="(modals)"
                      options={{ presentation: 'modal' }}
                    />
                  </Stack>
                </View>
              </AuthProvider>
            </ToastProvider>
          </SafeAreaProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
