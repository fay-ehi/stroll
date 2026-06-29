export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          username: string;
          display_name: string;
          email: string;
          avatar_url: string | null;
          bio: string | null;
          city: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };
      places: {
        Row: {
          id: string;
          external_place_id: string;
          name: string;
          address: string;
          latitude: number;
          longitude: number;
          category: string;
          city: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['places']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['places']['Insert']>;
      };
      experiences: {
        Row: {
          id: string;
          user_id: string;
          place_id: string;
          caption: string;
          would_recommend: boolean | null;
          amount_spent: string | null;
          visit_type: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['experiences']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['experiences']['Insert']>;
      };
      collections: {
        Row: {
          id: string;
          creator_id: string;
          title: string;
          description: string | null;
          cover_image: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['collections']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['collections']['Insert']>;
      };
      saved_places: {
        Row: { id: string; user_id: string; place_id: string; saved_at: string };
        Insert: Omit<Database['public']['Tables']['saved_places']['Row'], 'saved_at'>;
        Update: Partial<Database['public']['Tables']['saved_places']['Insert']>;
      };
      likes: {
        Row: { user_id: string; experience_id: string; created_at: string };
        Insert: Omit<Database['public']['Tables']['likes']['Row'], 'created_at'>;
        Update: never;
      };
      follows: {
        Row: { follower_id: string; following_id: string; created_at: string };
        Insert: Omit<Database['public']['Tables']['follows']['Row'], 'created_at'>;
        Update: never;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      visit_type: 'Solo' | 'Date' | 'Friends' | 'Family' | 'Work' | 'Group Event';
      amount_spent: 'Under ₦5,000' | '₦5,000 – ₦10,000' | '₦10,000 – ₦20,000' | '₦20,000 – ₦50,000' | '₦50,000+';
    };
  };
}
