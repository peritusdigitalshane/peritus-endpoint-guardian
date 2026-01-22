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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      defender_policies: {
        Row: {
          archive_scanning: boolean
          asr_advanced_ransomware_protection: Database["public"]["Enums"]["asr_action"]
          asr_block_adobe_child_process: Database["public"]["Enums"]["asr_action"]
          asr_block_credential_stealing: Database["public"]["Enums"]["asr_action"]
          asr_block_email_executable: Database["public"]["Enums"]["asr_action"]
          asr_block_js_vbs_executable: Database["public"]["Enums"]["asr_action"]
          asr_block_obfuscated_scripts: Database["public"]["Enums"]["asr_action"]
          asr_block_office_child_process: Database["public"]["Enums"]["asr_action"]
          asr_block_office_code_injection: Database["public"]["Enums"]["asr_action"]
          asr_block_office_comms_child_process: Database["public"]["Enums"]["asr_action"]
          asr_block_office_executable_content: Database["public"]["Enums"]["asr_action"]
          asr_block_office_macro_win32: Database["public"]["Enums"]["asr_action"]
          asr_block_psexec_wmi: Database["public"]["Enums"]["asr_action"]
          asr_block_untrusted_executables: Database["public"]["Enums"]["asr_action"]
          asr_block_usb_untrusted: Database["public"]["Enums"]["asr_action"]
          asr_block_vulnerable_drivers: Database["public"]["Enums"]["asr_action"]
          asr_block_wmi_persistence: Database["public"]["Enums"]["asr_action"]
          behavior_monitoring: boolean
          block_at_first_seen: boolean
          check_signatures_before_scan: boolean
          cloud_block_level: string
          cloud_delivered_protection: boolean
          cloud_extended_timeout: number
          controlled_folder_access: boolean
          created_at: string
          created_by: string | null
          description: string | null
          email_scanning: boolean
          exploit_protection_enabled: boolean
          id: string
          ioav_protection: boolean
          is_default: boolean
          maps_reporting: string
          name: string
          network_protection: boolean
          organization_id: string
          pua_protection: boolean
          realtime_monitoring: boolean
          removable_drive_scanning: boolean
          sample_submission: string
          script_scanning: boolean
          signature_update_interval: number
          updated_at: string
        }
        Insert: {
          archive_scanning?: boolean
          asr_advanced_ransomware_protection?: Database["public"]["Enums"]["asr_action"]
          asr_block_adobe_child_process?: Database["public"]["Enums"]["asr_action"]
          asr_block_credential_stealing?: Database["public"]["Enums"]["asr_action"]
          asr_block_email_executable?: Database["public"]["Enums"]["asr_action"]
          asr_block_js_vbs_executable?: Database["public"]["Enums"]["asr_action"]
          asr_block_obfuscated_scripts?: Database["public"]["Enums"]["asr_action"]
          asr_block_office_child_process?: Database["public"]["Enums"]["asr_action"]
          asr_block_office_code_injection?: Database["public"]["Enums"]["asr_action"]
          asr_block_office_comms_child_process?: Database["public"]["Enums"]["asr_action"]
          asr_block_office_executable_content?: Database["public"]["Enums"]["asr_action"]
          asr_block_office_macro_win32?: Database["public"]["Enums"]["asr_action"]
          asr_block_psexec_wmi?: Database["public"]["Enums"]["asr_action"]
          asr_block_untrusted_executables?: Database["public"]["Enums"]["asr_action"]
          asr_block_usb_untrusted?: Database["public"]["Enums"]["asr_action"]
          asr_block_vulnerable_drivers?: Database["public"]["Enums"]["asr_action"]
          asr_block_wmi_persistence?: Database["public"]["Enums"]["asr_action"]
          behavior_monitoring?: boolean
          block_at_first_seen?: boolean
          check_signatures_before_scan?: boolean
          cloud_block_level?: string
          cloud_delivered_protection?: boolean
          cloud_extended_timeout?: number
          controlled_folder_access?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          email_scanning?: boolean
          exploit_protection_enabled?: boolean
          id?: string
          ioav_protection?: boolean
          is_default?: boolean
          maps_reporting?: string
          name: string
          network_protection?: boolean
          organization_id: string
          pua_protection?: boolean
          realtime_monitoring?: boolean
          removable_drive_scanning?: boolean
          sample_submission?: string
          script_scanning?: boolean
          signature_update_interval?: number
          updated_at?: string
        }
        Update: {
          archive_scanning?: boolean
          asr_advanced_ransomware_protection?: Database["public"]["Enums"]["asr_action"]
          asr_block_adobe_child_process?: Database["public"]["Enums"]["asr_action"]
          asr_block_credential_stealing?: Database["public"]["Enums"]["asr_action"]
          asr_block_email_executable?: Database["public"]["Enums"]["asr_action"]
          asr_block_js_vbs_executable?: Database["public"]["Enums"]["asr_action"]
          asr_block_obfuscated_scripts?: Database["public"]["Enums"]["asr_action"]
          asr_block_office_child_process?: Database["public"]["Enums"]["asr_action"]
          asr_block_office_code_injection?: Database["public"]["Enums"]["asr_action"]
          asr_block_office_comms_child_process?: Database["public"]["Enums"]["asr_action"]
          asr_block_office_executable_content?: Database["public"]["Enums"]["asr_action"]
          asr_block_office_macro_win32?: Database["public"]["Enums"]["asr_action"]
          asr_block_psexec_wmi?: Database["public"]["Enums"]["asr_action"]
          asr_block_untrusted_executables?: Database["public"]["Enums"]["asr_action"]
          asr_block_usb_untrusted?: Database["public"]["Enums"]["asr_action"]
          asr_block_vulnerable_drivers?: Database["public"]["Enums"]["asr_action"]
          asr_block_wmi_persistence?: Database["public"]["Enums"]["asr_action"]
          behavior_monitoring?: boolean
          block_at_first_seen?: boolean
          check_signatures_before_scan?: boolean
          cloud_block_level?: string
          cloud_delivered_protection?: boolean
          cloud_extended_timeout?: number
          controlled_folder_access?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          email_scanning?: boolean
          exploit_protection_enabled?: boolean
          id?: string
          ioav_protection?: boolean
          is_default?: boolean
          maps_reporting?: string
          name?: string
          network_protection?: boolean
          organization_id?: string
          pua_protection?: boolean
          realtime_monitoring?: boolean
          removable_drive_scanning?: boolean
          sample_submission?: string
          script_scanning?: boolean
          signature_update_interval?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "defender_policies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "defender_policies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_memberships: {
        Row: {
          created_at: string
          id: string
          invited_by: string | null
          organization_id: string
          role: Database["public"]["Enums"]["org_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by?: string | null
          organization_id: string
          role?: Database["public"]["Enums"]["org_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string | null
          organization_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_memberships_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email: string
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      super_admins: {
        Row: {
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_org_ids: { Args: { _user_id: string }; Returns: string[] }
      is_admin_of_org: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_member_of_org: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      asr_action: "disabled" | "enabled" | "audit"
      org_role: "owner" | "admin" | "member"
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
      asr_action: ["disabled", "enabled", "audit"],
      org_role: ["owner", "admin", "member"],
    },
  },
} as const
