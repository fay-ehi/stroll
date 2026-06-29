import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@types/database';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (__DEV__) {
  if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
    console.warn('[Stroll] Set EXPO_PUBLIC_SUPABASE_URL in your .env file.');
  }
  if (!supabaseAnonKey || supabaseAnonKey.includes('placeholder')) {
    console.warn('[Stroll] Set EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file.');
  }
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
