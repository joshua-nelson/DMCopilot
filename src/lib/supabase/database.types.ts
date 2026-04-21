// Minimal Supabase types for server-side usage in Phase 0.
// (You can replace this with a generated type file later.)

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      ai_calls: {
        Row: {
          id: string;
          clerk_user_id: string;
          feature: string;
          provider: string;
          model: string;
          input_tokens: number;
          output_tokens: number;
          cache_hit: boolean;
          cost_usd: number;
          latency_ms: number | null;
          created_at: string;
          metadata: Json;
        };
        Insert: {
          id?: string;
          clerk_user_id: string;
          feature: string;
          provider: string;
          model: string;
          input_tokens?: number;
          output_tokens?: number;
          cache_hit?: boolean;
          cost_usd?: number;
          latency_ms?: number | null;
          created_at?: string;
          metadata?: Json;
        };
        Update: {
          id?: string;
          clerk_user_id?: string;
          feature?: string;
          provider?: string;
          model?: string;
          input_tokens?: number;
          output_tokens?: number;
          cache_hit?: boolean;
          cost_usd?: number;
          latency_ms?: number | null;
          created_at?: string;
          metadata?: Json;
        };
        Relationships: [];
      };
      campaigns: {
        Row: {
          id: string;
          dm_user_id: string;
          name: string;
          system: string;
          description: string | null;
          is_archived: boolean;
          settings_json: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          dm_user_id: string;
          name: string;
          system?: string;
          description?: string | null;
          is_archived?: boolean;
          settings_json?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          dm_user_id?: string;
          name?: string;
          system?: string;
          description?: string | null;
          is_archived?: boolean;
          settings_json?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      sessions: {
        Row: {
          id: string;
          campaign_id: string;
          name: string;
          status: string;
          phase: string;
          started_at: string | null;
          ended_at: string | null;
          token_budget_used: number;
          summary_json: Json | null;
          notes_md: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          name?: string;
          status?: string;
          phase?: string;
          started_at?: string | null;
          ended_at?: string | null;
          token_budget_used?: number;
          summary_json?: Json | null;
          notes_md?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          name?: string;
          status?: string;
          phase?: string;
          started_at?: string | null;
          ended_at?: string | null;
          token_budget_used?: number;
          summary_json?: Json | null;
          notes_md?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_profiles: {
        Row: {
          clerk_user_id: string;
          display_name: string;
          role: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          clerk_user_id: string;
          display_name: string;
          role?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          clerk_user_id?: string;
          display_name?: string;
          role?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
