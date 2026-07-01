/**
 * Stroll — Root Layout
 * app/_layout.tsx
 *
 * Sprint 5 update: adds ToastProvider to the provider stack.
 * Everything else from Sprint 4 is preserved exactly.
 *
 * Provider order (outermost → innermost):
 *   GestureHandlerRootView  — gesture recognition must be at the root
 *   ErrorBoundary           — catches render errors anywhere below
 *   QueryClientProvider     — TanStack Query cache
 *   SafeAreaProvider        — safe area insets
 *   ToastProvider           — global toast layer (Sprint 5)
 *     StatusBar
 *     View (background)
 *       Stack (routes)
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
      // Small delay so the splash doesn't flash away too abruptly.
      const timer = setTimeout(
        () => SplashScreen.hideAsync(),
        TIMEOUTS.SPLASH_MIN_MS
      );
      return () => clearTimeout(timer);
    }
    return undefined;  // ← add this line
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
            </ToastProvider>
          </SafeAreaProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
