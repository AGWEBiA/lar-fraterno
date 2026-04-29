export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      chapter_approvals: {
        Row: {
          approved: boolean
          chapter_slug: string
          created_at: string
          id: string
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approved?: boolean
          chapter_slug: string
          created_at?: string
          id?: string
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approved?: boolean
          chapter_slug?: string
          created_at?: string
          id?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chapter_item_overrides: {
        Row: {
          chapter_slug: string
          created_at: string
          heading_text: string | null
          id: string
          item_number: number | null
          node_index: number
          override_type: string | null
          paragraph_text: string | null
          paragraphs: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          chapter_slug: string
          created_at?: string
          heading_text?: string | null
          id?: string
          item_number?: number | null
          node_index: number
          override_type?: string | null
          paragraph_text?: string | null
          paragraphs?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          chapter_slug?: string
          created_at?: string
          heading_text?: string | null
          id?: string
          item_number?: number | null
          node_index?: number
          override_type?: string | null
          paragraph_text?: string | null
          paragraphs?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chapter_node_inserts: {
        Row: {
          after_node_index: number
          chapter_slug: string
          created_at: string
          heading_text: string | null
          id: string
          item_number: number | null
          node_type: string
          paragraph_text: string | null
          paragraphs: string[] | null
          position: number
          updated_at: string
          user_id: string
        }
        Insert: {
          after_node_index: number
          chapter_slug: string
          created_at?: string
          heading_text?: string | null
          id?: string
          item_number?: number | null
          node_type: string
          paragraph_text?: string | null
          paragraphs?: string[] | null
          position?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          after_node_index?: number
          chapter_slug?: string
          created_at?: string
          heading_text?: string | null
          id?: string
          item_number?: number | null
          node_type?: string
          paragraph_text?: string | null
          paragraphs?: string[] | null
          position?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chapter_node_removals: {
        Row: {
          chapter_slug: string
          created_at: string
          id: string
          node_index: number
          user_id: string
        }
        Insert: {
          chapter_slug: string
          created_at?: string
          id?: string
          node_index: number
          user_id: string
        }
        Update: {
          chapter_slug?: string
          created_at?: string
          id?: string
          node_index?: number
          user_id?: string
        }
        Relationships: []
      }
      meeting_history: {
        Row: {
          chapter_slug: string | null
          created_at: string
          held_at: string
          id: string
          notes: string | null
          participants: number | null
          participants_list: string[] | null
          title: string | null
          user_id: string
        }
        Insert: {
          chapter_slug?: string | null
          created_at?: string
          held_at?: string
          id?: string
          notes?: string | null
          participants?: number | null
          participants_list?: string[] | null
          title?: string | null
          user_id: string
        }
        Update: {
          chapter_slug?: string | null
          created_at?: string
          held_at?: string
          id?: string
          notes?: string | null
          participants?: number | null
          participants_list?: string[] | null
          title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string
          email_before: boolean
          email_enabled: boolean
          email_end: boolean
          email_start: boolean
          minutes_before: number
          push_before: boolean
          push_enabled: boolean
          push_end: boolean
          push_start: boolean
          updated_at: string
          user_id: string
          whatsapp_before: boolean
          whatsapp_enabled: boolean
          whatsapp_end: boolean
          whatsapp_start: boolean
        }
        Insert: {
          created_at?: string
          email_before?: boolean
          email_enabled?: boolean
          email_end?: boolean
          email_start?: boolean
          minutes_before?: number
          push_before?: boolean
          push_enabled?: boolean
          push_end?: boolean
          push_start?: boolean
          updated_at?: string
          user_id: string
          whatsapp_before?: boolean
          whatsapp_enabled?: boolean
          whatsapp_end?: boolean
          whatsapp_start?: boolean
        }
        Update: {
          created_at?: string
          email_before?: boolean
          email_enabled?: boolean
          email_end?: boolean
          email_start?: boolean
          minutes_before?: number
          push_before?: boolean
          push_enabled?: boolean
          push_end?: boolean
          push_start?: boolean
          updated_at?: string
          user_id?: string
          whatsapp_before?: boolean
          whatsapp_enabled?: boolean
          whatsapp_end?: boolean
          whatsapp_start?: boolean
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reading_progress: {
        Row: {
          chapter_slug: string
          completed: boolean
          id: string
          last_read_at: string
          user_id: string
        }
        Insert: {
          chapter_slug: string
          completed?: boolean
          id?: string
          last_read_at?: string
          user_id: string
        }
        Update: {
          chapter_slug?: string
          completed?: boolean
          id?: string
          last_read_at?: string
          user_id?: string
        }
        Relationships: []
      }
      schedules: {
        Row: {
          created_at: string
          day_of_week: number
          id: string
          is_active: boolean
          next_run_at: string | null
          time_of_day: string
          timezone: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          id?: string
          is_active?: boolean
          next_run_at?: string | null
          time_of_day: string
          timezone?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          id?: string
          is_active?: boolean
          next_run_at?: string | null
          time_of_day?: string
          timezone?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
