/**
 * Stroll — Database Types
 * src/types/database.ts
 *
 * This file will be fully replaced by the Supabase CLI type generator once
 * more tables exist. Until then it is hand-maintained: `profiles` and
 * `places` (the only tables that exist today) are typed concretely below,
 * and every other/future table falls back to a generic catch-all so the
 * client still compiles before its real shape is generated.
 *
 * To regenerate once more tables exist:
 *   npx supabase gen types typescript --project-id <your-project-id> \
 *     --schema public > src/types/database.ts
 *
 * Sprint 1 Prompt 3 fix log:
 *   - Added a concrete `profiles` entry (Row/Insert/Update/Relationships).
 *     The previous version only had the generic `[key: string]` index
 *     signature, which is missing the `Relationships` field required by
 *     @supabase/supabase-js's `GenericTable` constraint. Without it, the
 *     library silently falls back to typing every `.from('profiles')`
 *     query as `never`, which is why profileService.ts previously needed
 *     `as any` casts on every query builder call. Those casts have now
 *     been removed — `profiles` reads/writes are fully typed end-to-end.
 *   - The `[key: string]` fallback is kept alongside the concrete entry so
 *     future tables (places, experiences, ...) still compile with `any`-ish
 *     Row/Insert/Update shapes until they're added here or generated.
 *
 * Sprint 1 Prompt 4 fix log:
 *   - Added a concrete `places` entry, and a concrete `nearby_places`
 *     Functions entry for the PostGIS-backed RPC call (see the migration
 *     SQL delivered alongside this file). Same reasoning as profiles above.
 *   - IMPORTANT — a subtler version of the same bug class: every Row/Insert/
 *     Update object below is written as an INLINE object literal, never as
 *     a separately-declared `interface`. If you (or a future generator)
 *     factor one of these out into `interface PlaceRow { ... }` and then
 *     write `Row: PlaceRow`, TypeScript stops treating it as satisfying the
 *     `[key: string]: {...}` fallback sitting next to it in `Tables`, and
 *     silently re-introduces the exact `never`-typed-query bug fixed above
 *     — even though the shape is byte-for-byte identical. This is a genuine
 *     TypeScript quirk (interfaces don't get an implicit index signature
 *     the way type-literals do), confirmed against the project's actual
 *     @supabase/supabase-js version before writing this. `type` aliases are
 *     fine; `interface` is not. `src/types/place.ts` derives `PlaceRow` as
 *     `type PlaceRow = Tables<'places'>` for exactly this reason — never
 *     hand-declare it as an `interface` there either.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string;
          avatar_url: string | null;
          bio: string | null;
          city: string | null;
          interests: string[];
          is_verified: boolean;
          onboarding_complete: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name: string;
          avatar_url?: string | null;
          bio?: string | null;
          city?: string | null;
          interests?: string[];
          is_verified?: boolean;
          onboarding_complete?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          display_name?: string;
          avatar_url?: string | null;
          bio?: string | null;
          city?: string | null;
          interests?: string[];
          is_verified?: boolean;
          onboarding_complete?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      places: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          category: string;
          city: string;
          address: string | null;
          latitude: number;
          longitude: number;
          hero_image: string | null;
          gallery: string[];
          opening_hours: Json | null;
          rating: number | null;
          experience_count: number;
          price_level: number | null;
          verified: boolean;
          featured: boolean;
          source: string;
          provider_place_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug?: string;
          description?: string | null;
          category: string;
          city: string;
          address?: string | null;
          latitude: number;
          longitude: number;
          hero_image?: string | null;
          gallery?: string[];
          opening_hours?: Json | null;
          rating?: number | null;
          experience_count?: number;
          price_level?: number | null;
          verified?: boolean;
          featured?: boolean;
          source?: string;
          provider_place_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          category?: string;
          city?: string;
          address?: string | null;
          latitude?: number;
          longitude?: number;
          hero_image?: string | null;
          gallery?: string[];
          opening_hours?: Json | null;
          rating?: number | null;
          experience_count?: number;
          price_level?: number | null;
          verified?: boolean;
          featured?: boolean;
          source?: string;
          provider_place_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      // Sprint 2 Prompt 1 addition — concrete `experiences` and
      // `experience_photos` entries. Same reasoning as `places` above:
      // written as inline object literals (never `interface`) so they
      // keep satisfying the `[key: string]` fallback below.
      // See supabase/migrations/0002_experiences.sql for the schema this
      // mirrors, and src/types/experience.ts for the camelCase domain
      // model built on top of it.
      experiences: {
        Row: {
          id: string;
          user_id: string;
          place_id: string;
          city: string;
          story: string;
          would_recommend: boolean | null;
          amount_spent: string | null;
          visit_type: string | null;
          good_for_tags: string[];
          vibe_tags: string[];
          like_count: number;
          comment_count: number;
          featured: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          place_id: string;
          city: string;
          story: string;
          would_recommend?: boolean | null;
          amount_spent?: string | null;
          visit_type?: string | null;
          good_for_tags?: string[];
          vibe_tags?: string[];
          like_count?: number;
          comment_count?: number;
          featured?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          place_id?: string;
          city?: string;
          story?: string;
          would_recommend?: boolean | null;
          amount_spent?: string | null;
          visit_type?: string | null;
          good_for_tags?: string[];
          vibe_tags?: string[];
          like_count?: number;
          comment_count?: number;
          featured?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      experience_photos: {
        Row: {
          id: string;
          experience_id: string;
          photo_url: string;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          experience_id: string;
          photo_url: string;
          position?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          experience_id?: string;
          photo_url?: string;
          position?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      // Sprint 5 Prompt 1 addition — concrete `collections` and
      // `collection_items` entries. Same reasoning as `experiences` above:
      // written as inline object literals (never `interface`) so they
      // keep satisfying the `[key: string]` fallback below. See
      // supabase/migrations/sprint5_prompt1_collections.sql for the
      // schema this mirrors, and src/types/collection.ts for the
      // camelCase domain model built on top of it.
      collections: {
        Row: {
          id: string;
          creator_id: string;
          title: string;
          description: string | null;
          cover_image_url: string | null;
          cover_type: string;
          visibility: string;
          city: string | null;
          experience_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          creator_id: string;
          title: string;
          description?: string | null;
          cover_image_url?: string | null;
          cover_type?: string;
          visibility?: string;
          city?: string | null;
          experience_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          creator_id?: string;
          title?: string;
          description?: string | null;
          cover_image_url?: string | null;
          cover_type?: string;
          visibility?: string;
          city?: string | null;
          experience_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      collection_items: {
        Row: {
          id: string;
          collection_id: string;
          experience_id: string;
          added_by: string;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          collection_id: string;
          experience_id: string;
          added_by: string;
          position?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          collection_id?: string;
          experience_id?: string;
          added_by?: string;
          position?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      // Sprint 5 Prompt 4 addition — concrete `saved_items` entry. Same
      // reasoning as `collections`/`collection_items` above: written as
      // an inline object literal (never `interface`), so it keeps
      // satisfying the `[key: string]` fallback below. See
      // supabase/migrations/sprint5_prompt4_saved.sql for the schema
      // this mirrors, and src/services/savedService.ts for the only file
      // that queries this table directly.
      saved_items: {
        Row: {
          id: string;
          user_id: string;
          item_id: string;
          item_type: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          item_id: string;
          item_type: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          item_id?: string;
          item_type?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      // Sprint 6 Prompt 1 addition — concrete `follows` entry. Same
      // reasoning as `saved_items` above: written as an inline object
      // literal (never `interface`), so it keeps satisfying the
      // `[key: string]` fallback below. See
      // supabase/migrations/sprint6_prompt1_follows.sql for the schema
      // this mirrors, and src/services/followsService.ts for the only
      // file that queries this table directly.
      follows: {
        Row: {
          id: string;
          follower_id: string;
          following_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          follower_id: string;
          following_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          follower_id?: string;
          following_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      // Sprint 6 Prompt 2 addition — concrete `likes` entry. Same
      // reasoning as `saved_items`/`follows` above: written as an inline
      // object literal (never `interface`), so it keeps satisfying the
      // `[key: string]` fallback below. See
      // supabase/migrations/sprint6_prompt2_likes.sql for the schema
      // this mirrors (that migration names the table `likes`, not
      // `experience_likes` as the prompt doc's own Schema section says —
      // see this sprint's End-of-Task Report for that discrepancy), and
      // src/services/likesService.ts for the only file that queries this
      // table directly.
      likes: {
        Row: {
          id: string;
          user_id: string;
          experience_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          experience_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          experience_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      // Sprint 8 Prompt 1 addition — concrete `notifications` entry. Same
      // reasoning as `saved_items`/`follows`/`likes` above: written as an
      // inline object literal (never `interface`), so it keeps satisfying
      // the `[key: string]` fallback below. See
      // supabase/migrations/sprint8_prompt1_notifications.sql for the
      // schema this mirrors, and src/services/notificationsService.ts for
      // the only file that queries this table directly. Two FKs into
      // `profiles` (recipient_id, actor_id) — same disambiguated-embed
      // situation `follows` has with follower_id/following_id — see that
      // migration's named constraints (`notifications_recipient_id_fkey`,
      // `notifications_actor_id_fkey`, Postgres's own default
      // `<table>_<column>_fkey` naming) and notificationsService.ts's
      // `profiles!notifications_actor_id_fkey` embed hint.
      notifications: {
        Row: {
          id: string;
          recipient_id: string;
          actor_id: string | null;
          notification_type: string;
          title: string;
          message: string;
          entity_type: string | null;
          entity_id: string | null;
          metadata: Json;
          is_read: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          recipient_id: string;
          actor_id?: string | null;
          notification_type: string;
          title: string;
          message: string;
          entity_type?: string | null;
          entity_id?: string | null;
          metadata?: Json;
          is_read?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          recipient_id?: string;
          actor_id?: string | null;
          notification_type?: string;
          title?: string;
          message?: string;
          entity_type?: string | null;
          entity_id?: string | null;
          metadata?: Json;
          is_read?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      // Every other/future table falls back to this generic shape until
      // it's given a concrete entry (or the whole file is regenerated).
      [key: string]: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
    };
    Views: {
      [key: string]: {
        Row: Record<string, unknown>;
        Relationships: [];
      };
    };
    Functions: {
      /** PostGIS-backed proximity search — see the Sprint 1 Prompt 4 migration SQL. */
      nearby_places: {
        Args: {
          lat: number;
          lng: number;
          radius_km?: number;
          max_results?: number;
          category_filter?: string | null;
        };
        Returns: (Database['public']['Tables']['places']['Row'] & { distance_km: number })[];
      };
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
