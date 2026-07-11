/**
 * Stroll — Supabase Client
 * src/lib/supabase.ts
 *
 * Single Supabase client instance for the entire application.
 * Import `supabase` from here — never call createClient() elsewhere.
 *
 * Auth session persistence uses AsyncStorage so sessions survive
 * app restarts on device. SecureStorage is used for tokens in the
 * storage abstraction layer (src/lib/storage.ts) but Supabase's own
 * auth session is handled here via its built-in AsyncStorage adapter.
 *
 * Usage:
 *   import { supabase } from '@/lib/supabase';
 *   const { data, error } = await supabase.from('experiences').select('*');
 */

import 'react-native-url-polyfill/auto';
import { AppState } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { config } from './config';
import type { Database } from '@/types/database';

export const supabase = createClient<Database>(
  config.supabase.url,
  config.supabase.anonKey,
  {
    auth: {
      // Persist sessions across app restarts using AsyncStorage.
      storage:          AsyncStorage,
      autoRefreshToken: true,
      persistSession:   true,
      detectSessionInUrl: false, // Not applicable for React Native
    },
  }
);

// `autoRefreshToken: true` alone schedules a refresh via a JS timer — on
// React Native that timer doesn't reliably survive the app being
// backgrounded (the OS can suspend JS execution entirely), and in dev,
// Expo's Fast Refresh can reset it on every single edit-triggered
// reload. Either way, the practical failure mode is the same: the app
// still *believes* it has a valid session (nothing tells it otherwise),
// but the access token has quietly expired — for most PostgREST calls
// this still mostly works because a fresh token gets pulled on the next
// natural refresh cycle, but Storage requests (like photo uploads) made
// with the stale token get treated as unauthenticated by RLS, surfacing
// as a confusing "new row violates row-level security policy" error
// that looks like a policy misconfiguration rather than an expired
// token. This is Supabase's own documented fix for React Native:
// https://supabase.com/docs/reference/javascript/initializing#reactnative-example
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});

// ─── Type Helpers ──────────────────────────────────────────────────────────────
// Convenience types derived from the generated Database type.
// As tables are created in Supabase, add their row types here so
// the rest of the app never needs to reach into the Database type directly.

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T];