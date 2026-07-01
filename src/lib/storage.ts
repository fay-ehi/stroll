/**
 * Stroll — Storage Abstraction
 * src/lib/storage.ts
 *
 * Typed wrapper around two storage backends:
 *   - AsyncStorage   → non-sensitive persistent data (preferences, cache hints)
 *   - SecureStore    → sensitive data (future: tokens, credentials)
 *
 * All methods return a consistent Result type rather than throwing, so
 * callers never need a try/catch to read from storage. Storage errors
 * are always recoverable — the app must degrade gracefully if storage
 * is unavailable (e.g. first boot, cleared storage, permission revoked).
 *
 * All keys are namespaced with 'stroll:' to avoid collision with any
 * other library that writes to AsyncStorage (e.g. Supabase auth, which
 * manages its own keys internally).
 *
 * Usage:
 *   import { storage, secureStorage } from '@/lib/storage';
 *
 *   // Save user's selected city
 *   await storage.set('selectedCity', 'Lagos');
 *   const city = await storage.get('selectedCity'); // 'Lagos' | null
 *
 *   // Clear on sign-out
 *   await storage.remove('selectedCity');
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { logError } from './errors';

// ─── Key Namespace ─────────────────────────────────────────────────────────────

const NAMESPACE = 'stroll:';

function namespacedKey(key: string): string {
  return `${NAMESPACE}${key}`;
}

// ─── Result Type ───────────────────────────────────────────────────────────────

export type StorageResult<T> =
  | { ok: true; value: T }
  | { ok: false; value: null };

// ─── AsyncStorage Wrapper ──────────────────────────────────────────────────────

export const storage = {
  /**
   * Reads a value. Returns null if the key doesn't exist or on error.
   * Parses JSON automatically.
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await AsyncStorage.getItem(namespacedKey(key));
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    } catch (err) {
      logError(`storage.get(${key})`, err);
      return null;
    }
  },

  /**
   * Writes a value. JSON-serializes automatically.
   * Returns true on success, false on error.
   */
  async set<T>(key: string, value: T): Promise<boolean> {
    try {
      await AsyncStorage.setItem(namespacedKey(key), JSON.stringify(value));
      return true;
    } catch (err) {
      logError(`storage.set(${key})`, err);
      return false;
    }
  },

  /**
   * Removes a key. Safe to call if the key doesn't exist.
   */
  async remove(key: string): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(namespacedKey(key));
      return true;
    } catch (err) {
      logError(`storage.remove(${key})`, err);
      return false;
    }
  },

  /**
   * Removes all Stroll-namespaced keys. Use on sign-out.
   */
  async clearAll(): Promise<boolean> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const strollKeys = allKeys.filter(k => k.startsWith(NAMESPACE));
      if (strollKeys.length > 0) {
        await AsyncStorage.multiRemove(strollKeys);
      }
      return true;
    } catch (err) {
      logError('storage.clearAll', err);
      return false;
    }
  },
};

// ─── SecureStore Wrapper ───────────────────────────────────────────────────────
// expo-secure-store uses the device Keychain (iOS) / Keystore (Android).
// Values must be strings. Not available on web — falls back to AsyncStorage
// with a warning in development (not ideal but prevents web crashes).

export const secureStorage = {
  async get(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        // SecureStore is not available on web.
        return await AsyncStorage.getItem(namespacedKey(`secure:${key}`));
      }
      return await SecureStore.getItemAsync(namespacedKey(key));
    } catch (err) {
      logError(`secureStorage.get(${key})`, err);
      return null;
    }
  },

  async set(key: string, value: string): Promise<boolean> {
    try {
      if (Platform.OS === 'web') {
        await AsyncStorage.setItem(namespacedKey(`secure:${key}`), value);
        return true;
      }
      await SecureStore.setItemAsync(namespacedKey(key), value);
      return true;
    } catch (err) {
      logError(`secureStorage.set(${key})`, err);
      return false;
    }
  },

  async remove(key: string): Promise<boolean> {
    try {
      if (Platform.OS === 'web') {
        await AsyncStorage.removeItem(namespacedKey(`secure:${key}`));
        return true;
      }
      await SecureStore.deleteItemAsync(namespacedKey(key));
      return true;
    } catch (err) {
      logError(`secureStorage.remove(${key})`, err);
      return false;
    }
  },
};

// ─── Well-Known Keys ───────────────────────────────────────────────────────────
// Typed constants for every key the app writes to storage.
// Never write raw string keys at call sites — always use these.

export const STORAGE_KEYS = {
  /** The user's selected city for the Discover feed. */
  selectedCity:         'selectedCity',
  /** Whether the user has completed onboarding. */
  onboardingComplete:   'onboardingComplete',
  /** The user's selected interest tags from onboarding. */
  selectedInterests:    'selectedInterests',
  /** Cached feed scroll position (optional UX restore on return). */
  discoverScrollPos:    'discoverScrollPos',
} as const;

export type StorageKey = keyof typeof STORAGE_KEYS;
