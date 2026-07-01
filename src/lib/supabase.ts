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

// ─── Type Helpers ──────────────────────────────────────────────────────────────
// Convenience types derived from the generated Database type.
// As tables are created in Supabase, add their row types here so
// the rest of the app never needs to reach into the Database type directly.

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T];
