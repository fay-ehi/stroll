/**
 * Stroll — Infrastructure Hooks
 * src/hooks/index.ts
 *
 * Shared hooks that are infrastructure-level concerns — not tied to any
 * product feature or UI component.
 *
 * Rules enforced here:
 * - No business logic (no Supabase calls, no navigation side-effects)
 * - No feature-specific state
 * - Every hook is independently testable
 * - Every hook is documented with its use case
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  AppState,
  Keyboard,
  Platform,
  type AppStateStatus,
  type KeyboardEvent,
} from 'react-native';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';

// ─── useDebounce ───────────────────────────────────────────────────────────────

/**
 * Returns a debounced version of `value` that only updates after `delay`ms
 * of inactivity. Use for search inputs to avoid firing a query on every
 * keystroke.
 *
 * Usage:
 *   const debouncedQuery = useDebounce(searchQuery, TIMEOUTS.SEARCH_DEBOUNCE_MS);
 *   useEffect(() => { if (debouncedQuery) search(debouncedQuery); }, [debouncedQuery]);
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

// ─── usePrevious ───────────────────────────────────────────────────────────────

/**
 * Returns the previous value of a variable from the last render.
 * Useful for comparing old vs new values in effects without creating
 * circular dependencies.
 *
 * Usage:
 *   const prevCount = usePrevious(likeCount);
 *   // prevCount holds the value from before the last render
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

// ─── useAppState ───────────────────────────────────────────────────────────────

/**
 * Tracks the React Native app state (active, background, inactive).
 * Returns the current state and fires `onForeground`/`onBackground`
 * callbacks when the app transitions between states.
 *
 * Usage:
 *   const { appState, isActive } = useAppState({
 *     onForeground: () => queryClient.invalidateQueries(),
 *   });
 */
interface UseAppStateOptions {
  /** Fired when the app comes back to the foreground. */
  onForeground?: () => void;
  /** Fired when the app moves to the background. */
  onBackground?: () => void;
}

export function useAppState(options: UseAppStateOptions = {}): {
  appState: AppStateStatus;
  isActive: boolean;
} {
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const { onForeground, onBackground } = options;

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      const prev = appState;
      setAppState(next);

      if (prev !== 'active' && next === 'active') {
        onForeground?.();
      } else if (prev === 'active' && next !== 'active') {
        onBackground?.();
      }
    });

    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // onForeground/onBackground are intentionally excluded — they're
    // callbacks that callers should memoize with useCallback if they
    // need stability; adding them here would cause the subscription
    // to re-register on every render if the caller passes inline functions.
  }, [appState]);

  return { appState, isActive: appState === 'active' };
}

// ─── useNetworkStatus ──────────────────────────────────────────────────────────

/**
 * Returns the current network connectivity status. Uses
 * @react-native-community/netinfo (a transitive dependency of Expo).
 *
 * Usage:
 *   const { isConnected, isInternetReachable } = useNetworkStatus();
 *   if (!isConnected) return <OfflineBanner />;
 */
interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean;
  connectionType: string | null;
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: true,
    isInternetReachable: true,
    connectionType: null,
  });

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setStatus({
        isConnected: state.isConnected ?? true,
        isInternetReachable: state.isInternetReachable ?? true,
        connectionType: state.type,
      });
    });

    return () => unsubscribe();
  }, []);

  return status;
}

// ─── useKeyboard ───────────────────────────────────────────────────────────────

/**
 * Tracks keyboard visibility and height. Useful for manually adjusting
 * layout when KeyboardAvoidingView isn't precise enough (e.g. bottom
 * action bars that need to sit exactly above the keyboard).
 *
 * Usage:
 *   const { isKeyboardVisible, keyboardHeight } = useKeyboard();
 */
interface KeyboardState {
  isKeyboardVisible: boolean;
  keyboardHeight: number;
}

export function useKeyboard(): KeyboardState {
  const [state, setState] = useState<KeyboardState>({
    isKeyboardVisible: false,
    keyboardHeight: 0,
  });

  useEffect(() => {
    // iOS fires keyboardWillShow/Hide; Android fires keyboardDidShow/Hide.
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e: KeyboardEvent) => {
      setState({
        isKeyboardVisible: true,
        keyboardHeight: e.endCoordinates.height,
      });
    };

    const onHide = () => {
      setState({ isKeyboardVisible: false, keyboardHeight: 0 });
    };

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return state;
}

// ─── useTimeout ────────────────────────────────────────────────────────────────

/**
 * Executes a callback after a delay, cleaning up automatically on unmount.
 * Re-runs whenever `delay` or `callback` changes; pass null to cancel.
 *
 * Usage:
 *   useTimeout(() => setShowBanner(false), 3000);
 */
export function useTimeout(callback: (() => void) | null, delay: number | null): void {
  const savedCallback = useRef<(() => void) | null>(null);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;
    const timer = setTimeout(() => savedCallback.current?.(), delay);
    return () => clearTimeout(timer);
  }, [delay]);
}

// ─── useStableCallback ─────────────────────────────────────────────────────────

/**
 * Returns a stable callback reference that always calls the latest version
 * of the provided function. Avoids adding callbacks to dependency arrays
 * while still always using the most current implementation.
 *
 * Equivalent to React 19's upcoming `useEffectEvent` semantics.
 *
 * Usage:
 *   const onPress = useStableCallback(() => doSomethingWith(latestState));
 */
export function useStableCallback<T extends (...args: never[]) => unknown>(fn: T): T {
  const ref = useRef<T>(fn);

  useEffect(() => {
    ref.current = fn;
  });

  return useCallback((...args: Parameters<T>) => ref.current(...args), []) as T;
}

// ─── useImageLoadFailed ─────────────────────────────────────────────────────────

/**
 * Tracks whether a remote image's most recent load attempt failed, so a
 * component can fall back to a placeholder. Resets automatically when
 * `source` changes to a genuinely new value — otherwise an image that
 * failed once would show its fallback forever, even after being
 * re-rendered with a new, perfectly valid source (e.g. a recycled list
 * item scrolling to a different row, or a freshly uploaded photo
 * replacing a broken one).
 *
 * Extracted from what was previously near-identical inline state in both
 * Avatar.tsx and PlaceImage.tsx (Sprint 1 Prompt 4) — this sprint's
 * ExperienceCard needs the exact same behavior for its cover image, and a
 * third copy-pasted `useState` + `useEffect` pair would be the "duplicated
 * logic" this codebase's architecture rules explicitly call out to avoid.
 *
 * Usage:
 *   const [failed, markFailed] = useImageLoadFailed(uri);
 *   <Image source={{ uri }} onError={markFailed} />
 *   {failed || !uri ? <Fallback /> : null}
 */
export function useImageLoadFailed(source: string | null | undefined): [boolean, () => void] {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [source]);

  return [failed, useCallback(() => setFailed(true), [])];
}
