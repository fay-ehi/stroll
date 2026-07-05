/**
 * Stroll — Lib Barrel
 * src/lib/index.ts
 *
 * Single import point for all infrastructure library modules.
 *
 * Usage:
 *   import { supabase, config, queryKeys } from '@/lib';
 *   import { normalizeError, logError } from '@/lib';
 *   import { storage, STORAGE_KEYS } from '@/lib';
 *
 * Note: showToast / hideToast live in '@/stores/toastStore' not here,
 * since they depend on Zustand state (stores ≠ library utilities).
 */

export { supabase, type Tables, type Enums } from './supabase';
export { config, devLog, devWarn, type AppConfig, type AppEnvironment } from './config';
export {
  normalizeError,
  makeError,
  logError,
  isStrollError,
  isNetworkError,
  isUnauthorizedError,
  isNotFoundError,
  type StrollError,
  type ErrorCode,
} from './errors';
export { queryKeys } from './queryKeys';
export {
  storage,
  secureStorage,
  STORAGE_KEYS,
  type StorageKey,
  type StorageResult,
} from './storage';
