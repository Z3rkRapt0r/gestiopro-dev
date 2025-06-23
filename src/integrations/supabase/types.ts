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
          attendance_radius_meters: number | null
          brevo_api_key: string
          checkout_enabled: boolean | null
          company_latitude: number | null
          company_longitude: number | null
          created_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          admin_id: string
          attendance_radius_meters?: number | null
          brevo_api_key: string
          checkout_enabled?: boolean | null
          company_latitude?: number | null
          company_longitude?: number | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          admin_id?: string
          attendance_radius_meters?: number | null
          brevo_api_key?: string
          checkout_enabled?: boolean | null
          company_latitude?: number | null
          company_longitude?: number | null
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
      attendance_settings: {
        Row: {
          attendance_radius_meters: number
          checkout_enabled: boolean
          company_latitude: number | null
          company_longitude: number | null
          created_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          attendance_radius_meters?: number
          checkout_enabled?: boolean
          company_latitude?: number | null
          company_longitude?: number | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          attendance_radius_meters?: number
          checkout_enabled?: boolean
          company_latitude?: number | null
          company_longitude?: number | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      attendances: {
        Row: {
          business_trip_id: string | null
          check_in_latitude: number | null
          check_in_longitude: number | null
          check_in_time: string | null
          check_out_latitude: number | null
          check_out_longitude: number | null
          check_out_time: string | null
          created_at: string
          date: string
          id: string
          is_business_trip: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          business_trip_id?: string | null
          check_in_latitude?: number | null
          check_in_longitude?: number | null
          check_in_time?: string | null
          check_out_latitude?: number | null
          check_out_longitude?: number | null
          check_out_time?: string | null
          created_at?: string
          date?: string
          id?: string
          is_business_trip?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          business_trip_id?: string | null
          check_in_latitude?: number | null
          check_in_longitude?: number | null
          check_in_time?: string | null
          check_out_latitude?: number | null
          check_out_longitude?: number | null
          check_out_time?: string | null
          created_at?: string
          date?: string
          id?: string
          is_business_trip?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendances_business_trip_id_fkey"
            columns: ["business_trip_id"]
            isOneToOne: false
            referencedRelation: "business_trips"
            referencedColumns: ["id"]
          },
        ]
      }
      business_trips: {
        Row: {
          admin_notes: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          destination: string
          end_date: string
          id: string
          reason: string | null
          start_date: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          destination: string
          end_date: string
          id?: string
          reason?: string | null
          start_date: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          destination?: string
          end_date?: string
          id?: string
          reason?: string | null
          start_date?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          admin_notes_bg_color: string | null
          admin_notes_text_color: string | null
          background_color: string | null
          body_alignment: string | null
          border_radius: string | null
          button_color: string | null
          button_text_color: string | null
          content: string
          created_at: string | null
          custom_block_bg_color: string | null
          custom_block_text: string | null
          custom_block_text_color: string | null
          details: string | null
          font_family: string | null
          font_size: string | null
          footer_color: string | null
          footer_text: string | null
          header_alignment: string | null
          id: string
          is_default: boolean
          leave_details_bg_color: string | null
          leave_details_text_color: string | null
          logo_alignment: string | null
          logo_size: string | null
          logo_url: string | null
          name: string
          primary_color: string | null
          secondary_color: string | null
          sender_name: string | null
          show_admin_notes: boolean | null
          show_custom_block: boolean | null
          show_details_button: boolean | null
          show_leave_details: boolean | null
          subject: string
          template_type: string
          text_color: string | null
          updated_at: string | null
        }
        Insert: {
          admin_id: string
          admin_notes_bg_color?: string | null
          admin_notes_text_color?: string | null
          background_color?: string | null
          body_alignment?: string | null
          border_radius?: string | null
          button_color?: string | null
          button_text_color?: string | null
          content: string
          created_at?: string | null
          custom_block_bg_color?: string | null
          custom_block_text?: string | null
          custom_block_text_color?: string | null
          details?: string | null
          font_family?: string | null
          font_size?: string | null
          footer_color?: string | null
          footer_text?: string | null
          header_alignment?: string | null
          id?: string
          is_default?: boolean
          leave_details_bg_color?: string | null
          leave_details_text_color?: string | null
          logo_alignment?: string | null
          logo_size?: string | null
          logo_url?: string | null
          name: string
          primary_color?: string | null
          secondary_color?: string | null
          sender_name?: string | null
          show_admin_notes?: boolean | null
          show_custom_block?: boolean | null
          show_details_button?: boolean | null
          show_leave_details?: boolean | null
          subject: string
          template_type?: string
          text_color?: string | null
          updated_at?: string | null
        }
        Update: {
          admin_id?: string
          admin_notes_bg_color?: string | null
          admin_notes_text_color?: string | null
          background_color?: string | null
          body_alignment?: string | null
          border_radius?: string | null
          button_color?: string | null
          button_text_color?: string | null
          content?: string
          created_at?: string | null
          custom_block_bg_color?: string | null
          custom_block_text?: string | null
          custom_block_text_color?: string | null
          details?: string | null
          font_family?: string | null
          font_size?: string | null
          footer_color?: string | null
          footer_text?: string | null
          header_alignment?: string | null
          id?: string
          is_default?: boolean
          leave_details_bg_color?: string | null
          leave_details_text_color?: string | null
          logo_alignment?: string | null
          logo_size?: string | null
          logo_url?: string | null
          name?: string
          primary_color?: string | null
          secondary_color?: string | null
          sender_name?: string | null
          show_admin_notes?: boolean | null
          show_custom_block?: boolean | null
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
      employee_leave_balance: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          permission_hours_total: number
          permission_hours_used: number
          updated_at: string | null
          user_id: string
          vacation_days_total: number
          vacation_days_used: number
          year: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          permission_hours_total?: number
          permission_hours_used?: number
          updated_at?: string | null
          user_id: string
          vacation_days_total?: number
          vacation_days_used?: number
          year?: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          permission_hours_total?: number
          permission_hours_used?: number
          updated_at?: string | null
          user_id?: string
          vacation_days_total?: number
          vacation_days_used?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "employee_leave_balance_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_leave_balance_user_id_fkey"
            columns: ["user_id"]
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
          leave_balance_id: string | null
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
          leave_balance_id?: string | null
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
          leave_balance_id?: string | null
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
            foreignKeyName: "leave_requests_leave_balance_id_fkey"
            columns: ["leave_balance_id"]
            isOneToOne: false
            referencedRelation: "employee_leave_balance"
            referencedColumns: ["id"]
          },
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
      manual_attendances: {
        Row: {
          check_in_time: string | null
          check_out_time: string | null
          created_at: string
          created_by: string
          date: string
          id: string
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string
          created_by: string
          date: string
          id?: string
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string
          created_by?: string
          date?: string
          id?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
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
          tracking_start_type: string | null
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
          tracking_start_type?: string | null
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
          tracking_start_type?: string | null
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
      unified_attendances: {
        Row: {
          check_in_time: string | null
          check_out_time: string | null
          created_at: string
          created_by: string | null
          date: string
          id: string
          is_business_trip: boolean
          is_manual: boolean
          is_sick_leave: boolean
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string
          created_by?: string | null
          date: string
          id?: string
          is_business_trip?: boolean
          is_manual?: boolean
          is_sick_leave?: boolean
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          is_business_trip?: boolean
          is_manual?: boolean
          is_sick_leave?: boolean
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      work_schedules: {
        Row: {
          created_at: string | null
          end_time: string
          friday: boolean
          id: string
          monday: boolean
          saturday: boolean
          start_time: string
          sunday: boolean
          thursday: boolean
          tolerance_minutes: number
          tuesday: boolean
          updated_at: string | null
          wednesday: boolean
        }
        Insert: {
          created_at?: string | null
          end_time?: string
          friday?: boolean
          id?: string
          monday?: boolean
          saturday?: boolean
          start_time?: string
          sunday?: boolean
          thursday?: boolean
          tolerance_minutes?: number
          tuesday?: boolean
          updated_at?: string | null
          wednesday?: boolean
        }
        Update: {
          created_at?: string | null
          end_time?: string
          friday?: boolean
          id?: string
          monday?: boolean
          saturday?: boolean
          start_time?: string
          sunday?: boolean
          thursday?: boolean
          tolerance_minutes?: number
          tuesday?: boolean
          updated_at?: string | null
          wednesday?: boolean
        }
        Relationships: []
      }
      working_days_tracking: {
        Row: {
          created_at: string
          date: string
          id: string
          should_be_tracked: boolean
          tracking_reason: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          should_be_tracked?: boolean
          tracking_reason?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          should_be_tracked?: boolean
          tracking_reason?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "working_days_tracking_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      upcoming_leaves: {
        Row: {
          admin_note: string | null
          created_at: string | null
          date_from: string | null
          date_to: string | null
          day: string | null
          email: string | null
          end_date: string | null
          first_name: string | null
          id: string | null
          last_name: string | null
          leave_balance_id: string | null
          note: string | null
          notify_employee: boolean | null
          reviewed_at: string | null
          reviewed_by: string | null
          start_date: string | null
          status: string | null
          time_from: string | null
          time_to: string | null
          type: string | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_leave_balance_id_fkey"
            columns: ["leave_balance_id"]
            isOneToOne: false
            referencedRelation: "employee_leave_balance"
            referencedColumns: ["id"]
          },
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
    }
    Functions: {
      clear_user_data: {
        Args: { user_uuid: string }
        Returns: Json
      }
      complete_user_cleanup: {
        Args: { user_uuid: string }
        Returns: Json
      }
      delete_user_completely: {
        Args: { user_uuid: string }
        Returns: Json
      }
      get_all_users_storage_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          user_id: string
          first_name: string
          last_name: string
          email: string
          storage_usage: Json
        }[]
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_upcoming_leaves: {
        Args: { days_ahead?: number }
        Returns: {
          id: string
          user_id: string
          type: string
          start_date: string
          end_date: string
          first_name: string
          last_name: string
          email: string
          note: string
          days_until: number
        }[]
      }
      get_user_storage_usage: {
        Args: { user_uuid: string }
        Returns: Json
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      populate_working_days_for_user: {
        Args: { target_user_id: string; start_date?: string; end_date?: string }
        Returns: number
      }
      recalculate_all_leave_balances: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      should_track_employee_on_date: {
        Args: { target_user_id: string; check_date: string }
        Returns: boolean
      }
      verify_user_data_exists: {
        Args: { user_uuid: string }
        Returns: Json
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
