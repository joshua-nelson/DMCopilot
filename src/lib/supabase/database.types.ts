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
          tone: string;
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
          tone?: string;
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
          tone?: string;
          description?: string | null;
          is_archived?: boolean;
          settings_json?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      characters: {
        Row: {
          id: string;
          campaign_id: string;
          name: string;
          type: string;
          is_npc: boolean;
          player_name: string | null;
          class: string | null;
          race: string | null;
          level: number;
          str: number;
          dex: number;
          con: number;
          int: number;
          wis: number;
          cha: number;
          hp_current: number | null;
          hp_max: number | null;
          ac: number | null;
          initiative_bonus: number;
          speed: number | null;
          saves: Json;
          skills: Json;
          features: Json;
          spell_slots: Json;
          conditions: string[];
          portrait_url: string | null;
          speaker_color: string | null;
          voice_id: string | null;
          aliases: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          name: string;
          type?: string;
          is_npc?: boolean;
          player_name?: string | null;
          class?: string | null;
          race?: string | null;
          level?: number;
          str?: number;
          dex?: number;
          con?: number;
          int?: number;
          wis?: number;
          cha?: number;
          hp_current?: number | null;
          hp_max?: number | null;
          ac?: number | null;
          initiative_bonus?: number;
          speed?: number | null;
          saves?: Json;
          skills?: Json;
          features?: Json;
          spell_slots?: Json;
          conditions?: string[];
          portrait_url?: string | null;
          speaker_color?: string | null;
          voice_id?: string | null;
          aliases?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          name?: string;
          type?: string;
          is_npc?: boolean;
          player_name?: string | null;
          class?: string | null;
          race?: string | null;
          level?: number;
          str?: number;
          dex?: number;
          con?: number;
          int?: number;
          wis?: number;
          cha?: number;
          hp_current?: number | null;
          hp_max?: number | null;
          ac?: number | null;
          initiative_bonus?: number;
          speed?: number | null;
          saves?: Json;
          skills?: Json;
          features?: Json;
          spell_slots?: Json;
          conditions?: string[];
          portrait_url?: string | null;
          speaker_color?: string | null;
          voice_id?: string | null;
          aliases?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      encounters: {
        Row: {
          id: string;
          campaign_id: string;
          session_id: string | null;
          status: string;
          participants: Json;
          round: number;
          active_turn_idx: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          session_id?: string | null;
          status?: string;
          participants?: Json;
          round?: number;
          active_turn_idx?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          session_id?: string | null;
          status?: string;
          participants?: Json;
          round?: number;
          active_turn_idx?: number;
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

      // Phase 1 / Stage 2B+ (Rules Lookup): SRD chunks + FTS
      rules_chunks: {
        Row: {
          id: string;
          campaign_id: string | null;
          system: string;
          source: string;
          content: string;
          // Embeddings are not required in Phase 1; keep type loose.
          embedding: Json | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campaign_id?: string | null;
          system: string;
          source: string;
          content: string;
          embedding?: Json | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string | null;
          system?: string;
          source?: string;
          content?: string;
          embedding?: Json | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      search_rules_chunks: {
        Args: {
          q: string;
          system_filter?: string | null;
          source_filter?: string | null;
          campaign_filter?: string | null;
          match_limit?: number;
          match_offset?: number;
        };
        Returns: {
          id: string;
          content: string;
          metadata: Json;
          rank: number;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
