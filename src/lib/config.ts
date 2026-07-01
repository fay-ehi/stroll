/**
 * Stroll — Environment Configuration
 * src/lib/config.ts
 *
 * Single source of truth for all environment-dependent values.
 * Validated at module load time so misconfigured environments fail
 * loudly at startup rather than silently at the first API call.
 *
 * All values come from EXPO_PUBLIC_* variables (set in .env files).
 * Never hardcode secrets or environment-specific URLs in source code.
 *
 * Expo's build system inlines EXPO_PUBLIC_* variables at bundle time.
 * Non-EXPO_PUBLIC_ variables are server-only and not accessible here.
 *
 * Usage:
 *   import { config } from '@/lib/config';
 *   const client = createClient(config.supabase.url, config.supabase.anonKey);
 */

// ─── Types ─────────────────────────────────────────────────────────────────────

export type AppEnvironment = 'development' | 'staging' | 'production';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export interface GooglePlacesConfig {
  apiKey: string;
}

export interface AppConfig {
  env: AppEnvironment;
  version: string;
  supabase: SupabaseConfig;
  googlePlaces: GooglePlacesConfig;
  isDev: boolean;
  isStaging: boolean;
  isProd: boolean;
}

// ─── Validation ────────────────────────────────────────────────────────────────

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value || value.trim() === '') {
    // In development, throw with a helpful message.
    // In production builds, this would be caught by CI before shipping.
    throw new Error(
      `[Stroll] Missing required environment variable: ${key}\n` +
      `Ensure your .env file contains this variable and you have run ` +
      `"npx expo start --clear" to pick up the change.`
    );
  }
  return value.trim();
}

function getEnv(key: string, fallback: string): string {
  const value = process.env[key];
  return value && value.trim() !== '' ? value.trim() : fallback;
}

function resolveEnvironment(): AppEnvironment {
  const raw = getEnv('EXPO_PUBLIC_APP_ENV', 'development').toLowerCase();
  if (raw === 'production') return 'production';
  if (raw === 'staging') return 'staging';
  return 'development';
}

// ─── Config Object ─────────────────────────────────────────────────────────────
// Constructed once at module load. Any missing required variable throws
// immediately, before any component renders.

function buildConfig(): AppConfig {
  const env = resolveEnvironment();

  return {
    env,
    version: getEnv('EXPO_PUBLIC_APP_VERSION', '0.0.1'),

    supabase: {
      url:     requireEnv('EXPO_PUBLIC_SUPABASE_URL'),
      anonKey: requireEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY'),
    },

    googlePlaces: {
      // Optional in development — searches won't work without it but the
      // app won't crash; required in staging/production.
      apiKey: env === 'development'
        ? getEnv('EXPO_PUBLIC_GOOGLE_PLACES_API_KEY', '')
        : requireEnv('EXPO_PUBLIC_GOOGLE_PLACES_API_KEY'),
    },

    isDev:     env === 'development',
    isStaging: env === 'staging',
    isProd:    env === 'production',
  };
}

export const config: AppConfig = buildConfig();

// ─── Developer Helpers ─────────────────────────────────────────────────────────

/**
 * Safe console.log that is silenced in production builds.
 * Use this instead of bare console.log throughout the codebase.
 *
 * Usage:
 *   import { devLog } from '@/lib/config';
 *   devLog('Auth state changed', session);
 */
export function devLog(...args: unknown[]): void {
  if (config.isDev) {
    console.log('[Stroll dev]', ...args);
  }
}

export function devWarn(...args: unknown[]): void {
  if (!config.isProd) {
    console.warn('[Stroll warn]', ...args);
  }
}
