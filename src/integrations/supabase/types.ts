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
      app_notifications: {
        Row: {
          body: string | null
          created_at: string
          data: Json | null
          id: string
          kind: string
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          kind: string
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          kind?: string
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      audio_cache: {
        Row: {
          chapter_slug: string
          characters: number
          created_at: string
          id: string
          public_url: string
          storage_path: string
          voice_id: string
        }
        Insert: {
          chapter_slug: string
          characters?: number
          created_at?: string
          id?: string
          public_url: string
          storage_path: string
          voice_id: string
        }
        Update: {
          chapter_slug?: string
          characters?: number
          created_at?: string
          id?: string
          public_url?: string
          storage_path?: string
          voice_id?: string
        }
        Relationships: []
      }
      audio_generation_jobs: {
        Row: {
          batch_id: string | null
          chapter_slug: string
          characters: number
          created_at: string
          duration_ms: number | null
          error_message: string | null
          finished_at: string | null
          forced: boolean
          id: string
          status: string
          user_id: string
          voice_id: string
          voice_label: string | null
        }
        Insert: {
          batch_id?: string | null
          chapter_slug: string
          characters?: number
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          finished_at?: string | null
          forced?: boolean
          id?: string
          status?: string
          user_id: string
          voice_id: string
          voice_label?: string | null
        }
        Update: {
          batch_id?: string | null
          chapter_slug?: string
          characters?: number
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          finished_at?: string | null
          forced?: boolean
          id?: string
          status?: string
          user_id?: string
          voice_id?: string
          voice_label?: string | null
        }
        Relationships: []
      }
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
      item_progress: {
        Row: {
          bookmarked: boolean
          chapter_slug: string
          created_at: string
          id: string
          item_number: number
          note: string | null
          read: boolean
          read_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bookmarked?: boolean
          chapter_slug: string
          created_at?: string
          id?: string
          item_number: number
          note?: string | null
          read?: boolean
          read_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bookmarked?: boolean
          chapter_slug?: string
          created_at?: string
          id?: string
          item_number?: number
          note?: string | null
          read?: boolean
          read_at?: string | null
          updated_at?: string
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
          reading_method: string
          schedule_mode: string
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
          reading_method?: string
          schedule_mode?: string
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
          reading_method?: string
          schedule_mode?: string
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
      session_plan: {
        Row: {
          chapter_slug: string
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          item_numbers: number[]
          reading_method: string
          scheduled_for: string | null
          session_index: number
          updated_at: string
          user_id: string
        }
        Insert: {
          chapter_slug: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          item_numbers?: number[]
          reading_method?: string
          scheduled_for?: string | null
          session_index: number
          updated_at?: string
          user_id: string
        }
        Update: {
          chapter_slug?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          item_numbers?: number[]
          reading_method?: string
          scheduled_for?: string | null
          session_index?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tenant_active_voice: {
        Row: {
          selected_at: string
          selected_by: string
          tenant_id: string
          voice_id: string
        }
        Insert: {
          selected_at?: string
          selected_by: string
          tenant_id: string
          voice_id: string
        }
        Update: {
          selected_at?: string
          selected_by?: string
          tenant_id?: string
          voice_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_active_voice_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_invites: {
        Row: {
          code: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          uses: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          uses?: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string
          uses?: number
        }
        Relationships: [
          {
            foreignKeyName: "tenant_invites_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_members: {
        Row: {
          id: string
          joined_at: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_schedules: {
        Row: {
          created_at: string
          created_by: string
          day_of_week: number
          id: string
          is_active: boolean
          tenant_id: string
          time_of_day: string
          timezone: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          day_of_week: number
          id?: string
          is_active?: boolean
          tenant_id: string
          time_of_day: string
          timezone?: string
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          day_of_week?: number
          id?: string
          is_active?: boolean
          tenant_id?: string
          time_of_day?: string
          timezone?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_voice_selections: {
        Row: {
          id: string
          selected_at: string
          selected_by: string
          tenant_id: string
          voice_id: string
          voice_label: string | null
        }
        Insert: {
          id?: string
          selected_at?: string
          selected_by: string
          tenant_id: string
          voice_id: string
          voice_label?: string | null
        }
        Update: {
          id?: string
          selected_at?: string
          selected_by?: string
          tenant_id?: string
          voice_id?: string
          voice_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_voice_selections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          owner_id: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_id: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_status: {
        Row: {
          blocked: boolean
          blocked_at: string | null
          blocked_reason: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          blocked?: boolean
          blocked_at?: string | null
          blocked_reason?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          blocked?: boolean
          blocked_at?: string | null
          blocked_reason?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      voice_library: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          label: string
          language: string | null
          updated_at: string
          voice_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          label: string
          language?: string | null
          updated_at?: string
          voice_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          label?: string
          language?: string | null
          updated_at?: string
          voice_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_tenant_invite: { Args: { _code: string }; Returns: string }
      generate_invite_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_master: { Args: { _user_id: string }; Returns: boolean }
      is_tenant_admin: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      is_tenant_member: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin_master" | "tenant_admin" | "moderator" | "user"
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
    Enums: {
      app_role: ["admin_master", "tenant_admin", "moderator", "user"],
    },
  },
} as const
