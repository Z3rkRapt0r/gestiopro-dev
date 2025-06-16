export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      admin_settings: {
        Row: {
          admin_id: string
          brevo_api_key: string
          created_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          admin_id: string
          brevo_api_key: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          admin_id?: string
          brevo_api_key?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_settings_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_settings: {
        Row: {
          admin_id: string
          company_name: string | null
          created_at: string | null
          employee_default_logo_url: string | null
          employee_logo_enabled: boolean | null
          id: string
          login_background_color: string | null
          login_company_name: string | null
          login_logo_url: string | null
          login_primary_color: string | null
          login_secondary_color: string | null
          logo_url: string | null
          primary_color: string | null
          secondary_color: string | null
          updated_at: string | null
        }
        Insert: {
          admin_id: string
          company_name?: string | null
          created_at?: string | null
          employee_default_logo_url?: string | null
          employee_logo_enabled?: boolean | null
          id?: string
          login_background_color?: string | null
          login_company_name?: string | null
          login_logo_url?: string | null
          login_primary_color?: string | null
          login_secondary_color?: string | null
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string | null
        }
        Update: {
          admin_id?: string
          company_name?: string | null
          created_at?: string | null
          employee_default_logo_url?: string | null
          employee_logo_enabled?: boolean | null
          id?: string
          login_background_color?: string | null
          login_company_name?: string | null
          login_logo_url?: string | null
          login_primary_color?: string | null
          login_secondary_color?: string | null
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_settings_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string | null
          description: string | null
          document_type: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          is_personal: boolean | null
          title: string
          updated_at: string | null
          uploaded_by: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          document_type: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_personal?: boolean | null
          title: string
          updated_at?: string | null
          uploaded_by: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          document_type?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_personal?: boolean | null
          title?: string
          updated_at?: string | null
          uploaded_by?: string
          user_id?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          admin_id: string
          background_color: string | null
          body_alignment: string | null
          border_radius: string | null
          button_color: string | null
          button_text_color: string | null
          content: string
          created_at: string | null
          details: string | null
          font_family: string | null
          font_size: string | null
          footer_color: string | null
          footer_text: string | null
          header_alignment: string | null
          id: string
          is_default: boolean
          logo_alignment: string | null
          logo_size: string | null
          logo_url: string | null
          name: string
          primary_color: string | null
          secondary_color: string | null
          sender_name: string | null
          show_admin_notes: boolean | null
          show_details_button: boolean | null
          show_leave_details: boolean | null
          subject: string
          template_type: string
          text_color: string | null
          updated_at: string | null
        }
        Insert: {
          admin_id: string
          background_color?: string | null
          body_alignment?: string | null
          border_radius?: string | null
          button_color?: string | null
          button_text_color?: string | null
          content: string
          created_at?: string | null
          details?: string | null
          font_family?: string | null
          font_size?: string | null
          footer_color?: string | null
          footer_text?: string | null
          header_alignment?: string | null
          id?: string
          is_default?: boolean
          logo_alignment?: string | null
          logo_size?: string | null
          logo_url?: string | null
          name: string
          primary_color?: string | null
          secondary_color?: string | null
          sender_name?: string | null
          show_admin_notes?: boolean | null
          show_details_button?: boolean | null
          show_leave_details?: boolean | null
          subject: string
          template_type?: string
          text_color?: string | null
          updated_at?: string | null
        }
        Update: {
          admin_id?: string
          background_color?: string | null
          body_alignment?: string | null
          border_radius?: string | null
          button_color?: string | null
          button_text_color?: string | null
          content?: string
          created_at?: string | null
          details?: string | null
          font_family?: string | null
          font_size?: string | null
          footer_color?: string | null
          footer_text?: string | null
          header_alignment?: string | null
          id?: string
          is_default?: boolean
          logo_alignment?: string | null
          logo_size?: string | null
          logo_url?: string | null
          name?: string
          primary_color?: string | null
          secondary_color?: string | null
          sender_name?: string | null
          show_admin_notes?: boolean | null
          show_details_button?: boolean | null
          show_leave_details?: boolean | null
          subject?: string
          template_type?: string
          text_color?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_logo_settings: {
        Row: {
          admin_id: string
          created_at: string
          employee_default_logo_url: string | null
          employee_logo_enabled: boolean
          id: string
          updated_at: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          employee_default_logo_url?: string | null
          employee_logo_enabled?: boolean
          id?: string
          updated_at?: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          employee_default_logo_url?: string | null
          employee_logo_enabled?: boolean
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      leave_requests: {
        Row: {
          admin_note: string | null
          created_at: string | null
          date_from: string | null
          date_to: string | null
          day: string | null
          id: string
          note: string | null
          notify_employee: boolean | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          time_from: string | null
          time_to: string | null
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string | null
          date_from?: string | null
          date_to?: string | null
          day?: string | null
          id?: string
          note?: string | null
          notify_employee?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          time_from?: string | null
          time_to?: string | null
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string | null
          date_from?: string | null
          date_to?: string | null
          day?: string | null
          id?: string
          note?: string | null
          notify_employee?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          time_from?: string | null
          time_to?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      login_settings: {
        Row: {
          admin_id: string
          background_color: string
          company_name: string
          created_at: string
          id: string
          logo_url: string | null
          primary_color: string
          secondary_color: string
          updated_at: string
        }
        Insert: {
          admin_id: string
          background_color?: string
          company_name?: string
          created_at?: string
          id?: string
          logo_url?: string | null
          primary_color?: string
          secondary_color?: string
          updated_at?: string
        }
        Update: {
          admin_id?: string
          background_color?: string
          company_name?: string
          created_at?: string
          id?: string
          logo_url?: string | null
          primary_color?: string
          secondary_color?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          created_at: string
          id: string
          is_global: boolean
          is_read: boolean
          recipient_id: string | null
          sender_id: string | null
          subject: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_global?: boolean
          is_read?: boolean
          recipient_id?: string | null
          sender_id?: string | null
          subject: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_global?: boolean
          is_read?: boolean
          recipient_id?: string | null
          sender_id?: string | null
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          attachment_url: string | null
          body: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_read: boolean | null
          message: string
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          attachment_url?: string | null
          body?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          attachment_url?: string | null
          body?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          department: string | null
          email: string | null
          employee_code: string | null
          first_name: string | null
          hire_date: string | null
          id: string
          is_active: boolean | null
          last_name: string | null
          role: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          department?: string | null
          email?: string | null
          employee_code?: string | null
          first_name?: string | null
          hire_date?: string | null
          id: string
          is_active?: boolean | null
          last_name?: string | null
          role?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          department?: string | null
          email?: string | null
          employee_code?: string | null
          first_name?: string | null
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          last_name?: string | null
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      sent_notifications: {
        Row: {
          admin_id: string
          attachment_url: string | null
          body: string | null
          created_at: string
          id: string
          message: string
          recipient_id: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          admin_id: string
          attachment_url?: string | null
          body?: string | null
          created_at?: string
          id?: string
          message: string
          recipient_id?: string | null
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          admin_id?: string
          attachment_url?: string | null
          body?: string | null
          created_at?: string
          id?: string
          message?: string
          recipient_id?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
