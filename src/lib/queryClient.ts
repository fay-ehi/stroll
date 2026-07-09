import { QueryClient, onlineManager } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';

/**
 * Sprint 2 Prompt 3 addition — "Retry when connection returns"
 * (Offline Experience requirement #4).
 *
 * `refetchOnReconnect: true` below has been set since this file was
 * first created, but on React Native it was a no-op: TanStack Query's
 * `onlineManager` defaults to listening for the browser's `online`/
 * `offline` window events, which don't exist on this platform. Without
 * this wiring, the app never actually learns connectivity was restored,
 * so paused/failed queries just sit there until something else
 * (navigation, a manual pull-to-refresh) happens to refetch them.
 *
 * This is app-wide and one-time (module scope, not inside a component) —
 * every query in the app, not just Discover, now correctly resumes the
 * moment the device reconnects.
 */
onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    setOnline(!!state.isConnected);
  });
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      gcTime: 1000 * 60 * 5,
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30_000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  },
});
