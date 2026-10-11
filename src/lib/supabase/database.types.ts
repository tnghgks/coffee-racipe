export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      brew_logs: {
        Row: {
          acidity: number | null;
          bean_name: string | null;
          body: number | null;
          brewed_at: string;
          created_at: string;
          dose_g: number;
          grind_text: string | null;
          iced: boolean;
          id: string;
          next_adjustment: string | null;
          notes: string | null;
          rating: number;
          recipe_id: string | null;
          roast_level: Database["public"]["Enums"]["roast_level"] | null;
          roaster: string | null;
          sweetness: number | null;
          total_time_s: number | null;
          updated_at: string;
          user_id: string;
          water_g: number;
          water_temp_c: number | null;
        };
        ComputedFields: never;
        Insert: {
          acidity?: number | null;
          bean_name?: string | null;
          body?: number | null;
          brewed_at?: string;
          created_at?: string;
          dose_g: number;
          grind_text?: string | null;
          iced?: boolean;
          id?: string;
          next_adjustment?: string | null;
          notes?: string | null;
          rating: number;
          recipe_id?: string | null;
          roast_level?: Database["public"]["Enums"]["roast_level"] | null;
          roaster?: string | null;
          sweetness?: number | null;
          total_time_s?: number | null;
          updated_at?: string;
          user_id?: string;
          water_g: number;
          water_temp_c?: number | null;
        };
        Update: {
          acidity?: number | null;
          bean_name?: string | null;
          body?: number | null;
          brewed_at?: string;
          created_at?: string;
          dose_g?: number;
          grind_text?: string | null;
          iced?: boolean;
          id?: string;
          next_adjustment?: string | null;
          notes?: string | null;
          rating?: number;
          recipe_id?: string | null;
          roast_level?: Database["public"]["Enums"]["roast_level"] | null;
          roaster?: string | null;
          sweetness?: number | null;
          total_time_s?: number | null;
          updated_at?: string;
          user_id?: string;
          water_g?: number;
          water_temp_c?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "brew_logs_recipe_id_fkey";
            columns: ["recipe_id"];
            isOneToOne: false;
            referencedRelation: "recipes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "brew_logs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      drippers: {
        Row: {
          brand: string;
          created_at: string;
          id: string;
          max_dose_g: number | null;
          name: string;
          size_label: string | null;
          slug: string;
        };
        ComputedFields: never;
        Insert: {
          brand: string;
          created_at?: string;
          id?: string;
          max_dose_g?: number | null;
          name: string;
          size_label?: string | null;
          slug: string;
        };
        Update: {
          brand?: string;
          created_at?: string;
          id?: string;
          max_dose_g?: number | null;
          name?: string;
          size_label?: string | null;
          slug?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          bio: string | null;
          created_at: string;
          display_name: string | null;
          id: string;
          updated_at: string;
          username: string | null;
        };
        ComputedFields: never;
        Insert: {
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          display_name?: string | null;
          id: string;
          updated_at?: string;
          username?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          display_name?: string | null;
          id?: string;
          updated_at?: string;
          username?: string | null;
        };
        Relationships: [];
      };
      recipe_likes: {
        Row: {
          created_at: string;
          recipe_id: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          recipe_id: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          recipe_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recipe_likes_recipe_id_fkey";
            columns: ["recipe_id"];
            isOneToOne: false;
            referencedRelation: "recipes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recipe_likes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      recipe_saves: {
        Row: {
          created_at: string;
          recipe_id: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          recipe_id: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          recipe_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recipe_saves_recipe_id_fkey";
            columns: ["recipe_id"];
            isOneToOne: false;
            referencedRelation: "recipes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recipe_saves_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      recipe_steps: {
        Row: {
          id: string;
          label: string;
          note: string | null;
          position: number;
          recipe_id: string;
          start_at_s: number;
          water_ratio: number;
        };
        ComputedFields: never;
        Insert: {
          id?: string;
          label: string;
          note?: string | null;
          position: number;
          recipe_id: string;
          start_at_s: number;
          water_ratio: number;
        };
        Update: {
          id?: string;
          label?: string;
          note?: string | null;
          position?: number;
          recipe_id?: string;
          start_at_s?: number;
          water_ratio?: number;
        };
        Relationships: [
          {
            foreignKeyName: "recipe_steps_recipe_id_fkey";
            columns: ["recipe_id"];
            isOneToOne: false;
            referencedRelation: "recipes";
            referencedColumns: ["id"];
          },
        ];
      };
      recipes: {
        Row: {
          author_id: string | null;
          created_at: string;
          description: string | null;
          dose_g: number;
          dripper_id: string;
          fork_count: number;
          forked_from: string | null;
          grind_text: string | null;
          id: string;
          is_official: boolean;
          like_count: number;
          ratio: number;
          save_count: number;
          search: unknown;
          source_name: string | null;
          source_note: string | null;
          source_url: string | null;
          title: string;
          total_time_s: number;
          updated_at: string;
          visibility: Database["public"]["Enums"]["recipe_visibility"];
          water_temp_c: number | null;
        };
        ComputedFields: never;
        Insert: {
          author_id?: string | null;
          created_at?: string;
          description?: string | null;
          dose_g: number;
          dripper_id: string;
          fork_count?: number;
          forked_from?: string | null;
          grind_text?: string | null;
          id?: string;
          is_official?: boolean;
          like_count?: number;
          ratio: number;
          save_count?: number;
          search?: never;
          source_name?: string | null;
          source_note?: string | null;
          source_url?: string | null;
          title: string;
          total_time_s: number;
          updated_at?: string;
          visibility?: Database["public"]["Enums"]["recipe_visibility"];
          water_temp_c?: number | null;
        };
        Update: {
          author_id?: string | null;
          created_at?: string;
          description?: string | null;
          dose_g?: number;
          dripper_id?: string;
          fork_count?: number;
          forked_from?: string | null;
          grind_text?: string | null;
          id?: string;
          is_official?: boolean;
          like_count?: number;
          ratio?: number;
          save_count?: number;
          search?: never;
          source_name?: string | null;
          source_note?: string | null;
          source_url?: string | null;
          title?: string;
          total_time_s?: number;
          updated_at?: string;
          visibility?: Database["public"]["Enums"]["recipe_visibility"];
          water_temp_c?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "recipes_author_id_profiles_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recipes_dripper_id_fkey";
            columns: ["dripper_id"];
            isOneToOne: false;
            referencedRelation: "drippers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recipes_forked_from_fkey";
            columns: ["forked_from"];
            isOneToOne: false;
            referencedRelation: "recipes";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      explore_recipe_ids: {
        Args: {
          after_id?: string;
          after_key?: number;
          at?: string;
          dripper_slug?: string;
          page_size?: number;
          query?: string;
          ratio_max?: number;
          ratio_min?: number;
          sort?: string;
          time_max?: number;
        };
        Returns: {
          id: string;
          sort_key: number;
        }[];
      };
      recipe_hot_score: {
        Args: { at: string; created_at: string; like_count: number; save_count: number };
        Returns: number;
      };
      save_recipe: { Args: { recipe: Json; recipe_id?: string; steps: Json }; Returns: string };
      set_recipe_reaction: {
        Args: { active: boolean; kind: string; target: string };
        Returns: {
          liked: boolean;
          likes: number;
          saved: boolean;
          saves: number;
        }[];
      };
    };
    Enums: {
      recipe_visibility: "private" | "unlisted" | "public";
      roast_level: "light" | "medium_light" | "medium" | "medium_dark" | "dark";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      recipe_visibility: ["private", "unlisted", "public"],
      roast_level: ["light", "medium_light", "medium", "medium_dark", "dark"],
    },
  },
} as const;
