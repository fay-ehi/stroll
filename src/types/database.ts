/**
 * Stroll — Database Types
 * src/types/database.ts
 *
 * This file will be replaced by the Supabase CLI type generator once
 * database tables are created. Until then it provides a minimal stub
 * so TypeScript compiles and the supabase client is fully typed.
 *
 * To regenerate after creating tables:
 *   npx supabase gen types typescript --project-id <your-project-id> \
 *     --schema public > src/types/database.ts
 *
 * Do not manually edit this file once generated — re-run the command above.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      // Tables will be auto-generated here.
      // Example structure once users table exists:
      // users: {
      //   Row: { id: string; email: string; ... };
      //   Insert: { id?: string; email: string; ... };
      //   Update: { id?: string; email?: string; ... };
      // };
      [key: string]: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
    };
    Views: {
      [key: string]: {
        Row: Record<string, unknown>;
      };
    };
    Functions: {
      [key: string]: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
    };
    Enums: {
      // Enums will be auto-generated here.
      [key: string]: string;
    };
  };
}
