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
      activity_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          endpoint_id: string | null
          id: string
          ip_address: string | null
          organization_id: string
          resource_id: string | null
          resource_type: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          endpoint_id?: string | null
          id?: string
          ip_address?: string | null
          organization_id: string
          resource_id?: string | null
          resource_type: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          endpoint_id?: string | null
          id?: string
          ip_address?: string | null
          organization_id?: string
          resource_id?: string | null
          resource_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "endpoints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
      endpoint_event_logs: {
        Row: {
          created_at: string
          endpoint_id: string
          event_id: number
          event_time: string
          id: string
          level: string
          log_source: string
          message: string
          provider_name: string | null
          raw_data: Json | null
          task_category: string | null
        }
        Insert: {
          created_at?: string
          endpoint_id: string
          event_id: number
          event_time: string
          id?: string
          level: string
          log_source: string
          message: string
          provider_name?: string | null
          raw_data?: Json | null
          task_category?: string | null
        }
        Update: {
          created_at?: string
          endpoint_id?: string
          event_id?: number
          event_time?: string
          id?: string
          level?: string
          log_source?: string
          message?: string
          provider_name?: string | null
          raw_data?: Json | null
          task_category?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "endpoint_event_logs_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "endpoints"
            referencedColumns: ["id"]
          },
        ]
      }
      endpoint_group_memberships: {
        Row: {
          created_at: string
          endpoint_id: string
          group_id: string
          id: string
        }
        Insert: {
          created_at?: string
          endpoint_id: string
          group_id: string
          id?: string
        }
        Update: {
          created_at?: string
          endpoint_id?: string
          group_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "endpoint_group_memberships_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "endpoints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "endpoint_group_memberships_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "endpoint_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      endpoint_groups: {
        Row: {
          created_at: string
          created_by: string | null
          defender_policy_id: string | null
          description: string | null
          id: string
          name: string
          organization_id: string
          updated_at: string
          wdac_policy_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          defender_policy_id?: string | null
          description?: string | null
          id?: string
          name: string
          organization_id: string
          updated_at?: string
          wdac_policy_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          defender_policy_id?: string | null
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string
          wdac_policy_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "endpoint_groups_defender_policy_id_fkey"
            columns: ["defender_policy_id"]
            isOneToOne: false
            referencedRelation: "defender_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "endpoint_groups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "endpoint_groups_wdac_policy_id_fkey"
            columns: ["wdac_policy_id"]
            isOneToOne: false
            referencedRelation: "wdac_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      endpoint_logs: {
        Row: {
          created_at: string
          details: Json | null
          endpoint_id: string
          id: string
          log_type: string
          message: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          endpoint_id: string
          id?: string
          log_type: string
          message: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          endpoint_id?: string
          id?: string
          log_type?: string
          message?: string
        }
        Relationships: [
          {
            foreignKeyName: "endpoint_logs_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "endpoints"
            referencedColumns: ["id"]
          },
        ]
      }
      endpoint_status: {
        Row: {
          am_running_mode: string | null
          antispyware_enabled: boolean | null
          antispyware_signature_age: number | null
          antivirus_enabled: boolean | null
          antivirus_signature_age: number | null
          antivirus_signature_version: string | null
          behavior_monitor_enabled: boolean | null
          collected_at: string
          computer_state: number | null
          endpoint_id: string
          full_scan_age: number | null
          full_scan_end_time: string | null
          id: string
          ioav_protection_enabled: boolean | null
          nis_enabled: boolean | null
          nis_signature_version: string | null
          on_access_protection_enabled: boolean | null
          quick_scan_age: number | null
          quick_scan_end_time: string | null
          raw_status: Json | null
          realtime_protection_enabled: boolean | null
          tamper_protection_source: string | null
        }
        Insert: {
          am_running_mode?: string | null
          antispyware_enabled?: boolean | null
          antispyware_signature_age?: number | null
          antivirus_enabled?: boolean | null
          antivirus_signature_age?: number | null
          antivirus_signature_version?: string | null
          behavior_monitor_enabled?: boolean | null
          collected_at?: string
          computer_state?: number | null
          endpoint_id: string
          full_scan_age?: number | null
          full_scan_end_time?: string | null
          id?: string
          ioav_protection_enabled?: boolean | null
          nis_enabled?: boolean | null
          nis_signature_version?: string | null
          on_access_protection_enabled?: boolean | null
          quick_scan_age?: number | null
          quick_scan_end_time?: string | null
          raw_status?: Json | null
          realtime_protection_enabled?: boolean | null
          tamper_protection_source?: string | null
        }
        Update: {
          am_running_mode?: string | null
          antispyware_enabled?: boolean | null
          antispyware_signature_age?: number | null
          antivirus_enabled?: boolean | null
          antivirus_signature_age?: number | null
          antivirus_signature_version?: string | null
          behavior_monitor_enabled?: boolean | null
          collected_at?: string
          computer_state?: number | null
          endpoint_id?: string
          full_scan_age?: number | null
          full_scan_end_time?: string | null
          id?: string
          ioav_protection_enabled?: boolean | null
          nis_enabled?: boolean | null
          nis_signature_version?: string | null
          on_access_protection_enabled?: boolean | null
          quick_scan_age?: number | null
          quick_scan_end_time?: string | null
          raw_status?: Json | null
          realtime_protection_enabled?: boolean | null
          tamper_protection_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "endpoint_status_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "endpoints"
            referencedColumns: ["id"]
          },
        ]
      }
      endpoint_threats: {
        Row: {
          category: string | null
          created_at: string
          endpoint_id: string
          id: string
          initial_detection_time: string | null
          last_threat_status_change_time: string | null
          raw_data: Json | null
          resources: Json | null
          severity: string
          status: string
          threat_id: string
          threat_name: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          endpoint_id: string
          id?: string
          initial_detection_time?: string | null
          last_threat_status_change_time?: string | null
          raw_data?: Json | null
          resources?: Json | null
          severity: string
          status: string
          threat_id: string
          threat_name: string
        }
        Update: {
          category?: string | null
          created_at?: string
          endpoint_id?: string
          id?: string
          initial_detection_time?: string | null
          last_threat_status_change_time?: string | null
          raw_data?: Json | null
          resources?: Json | null
          severity?: string
          status?: string
          threat_id?: string
          threat_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "endpoint_threats_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "endpoints"
            referencedColumns: ["id"]
          },
        ]
      }
      endpoints: {
        Row: {
          agent_token: string
          created_at: string
          defender_version: string | null
          hostname: string
          id: string
          is_online: boolean
          last_seen_at: string | null
          organization_id: string
          os_build: string | null
          os_version: string | null
          policy_id: string | null
          updated_at: string
          wdac_policy_id: string | null
        }
        Insert: {
          agent_token: string
          created_at?: string
          defender_version?: string | null
          hostname: string
          id?: string
          is_online?: boolean
          last_seen_at?: string | null
          organization_id: string
          os_build?: string | null
          os_version?: string | null
          policy_id?: string | null
          updated_at?: string
          wdac_policy_id?: string | null
        }
        Update: {
          agent_token?: string
          created_at?: string
          defender_version?: string | null
          hostname?: string
          id?: string
          is_online?: boolean
          last_seen_at?: string | null
          organization_id?: string
          os_build?: string | null
          os_version?: string | null
          policy_id?: string | null
          updated_at?: string
          wdac_policy_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "endpoints_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "endpoints_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "defender_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "endpoints_wdac_policy_id_fkey"
            columns: ["wdac_policy_id"]
            isOneToOne: false
            referencedRelation: "wdac_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollment_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          is_single_use: boolean
          max_uses: number | null
          organization_id: string
          role: Database["public"]["Enums"]["org_role"]
          use_count: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          is_single_use?: boolean
          max_uses?: number | null
          organization_id: string
          role?: Database["public"]["Enums"]["org_role"]
          use_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          is_single_use?: boolean
          max_uses?: number | null
          organization_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          use_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "enrollment_codes_organization_id_fkey"
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
      wdac_baselines: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          policy_id: string
          snapshot_data: Json
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          policy_id: string
          snapshot_data?: Json
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          policy_id?: string
          snapshot_data?: Json
        }
        Relationships: [
          {
            foreignKeyName: "wdac_baselines_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "wdac_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      wdac_discovered_apps: {
        Row: {
          discovery_source: string
          endpoint_id: string
          execution_count: number
          file_hash: string | null
          file_name: string
          file_path: string
          file_version: string | null
          first_seen_at: string
          id: string
          last_seen_at: string
          organization_id: string
          product_name: string | null
          publisher: string | null
          raw_data: Json | null
        }
        Insert: {
          discovery_source: string
          endpoint_id: string
          execution_count?: number
          file_hash?: string | null
          file_name: string
          file_path: string
          file_version?: string | null
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          organization_id: string
          product_name?: string | null
          publisher?: string | null
          raw_data?: Json | null
        }
        Update: {
          discovery_source?: string
          endpoint_id?: string
          execution_count?: number
          file_hash?: string | null
          file_name?: string
          file_path?: string
          file_version?: string | null
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          organization_id?: string
          product_name?: string | null
          publisher?: string | null
          raw_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "wdac_discovered_apps_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "endpoints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wdac_discovered_apps_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      wdac_policies: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_default: boolean
          mode: string
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean
          mode?: string
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean
          mode?: string
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wdac_policies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      wdac_rules: {
        Row: {
          action: string
          created_at: string
          created_by: string | null
          description: string | null
          file_version_min: string | null
          id: string
          policy_id: string
          product_name: string | null
          publisher_name: string | null
          rule_type: string
          value: string
        }
        Insert: {
          action: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_version_min?: string | null
          id?: string
          policy_id: string
          product_name?: string | null
          publisher_name?: string | null
          rule_type: string
          value: string
        }
        Update: {
          action?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_version_min?: string | null
          id?: string
          policy_id?: string
          product_name?: string | null
          publisher_name?: string | null
          rule_type?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "wdac_rules_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "wdac_policies"
            referencedColumns: ["id"]
          },
        ]
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
      log_activity: {
        Args: {
          _action: string
          _details?: Json
          _endpoint_id?: string
          _org_id: string
          _resource_id?: string
          _resource_type: string
        }
        Returns: string
      }
      use_enrollment_code: {
        Args: { _code: string; _user_id: string }
        Returns: boolean
      }
      validate_enrollment_code: {
        Args: { _code: string }
        Returns: {
          error_message: string
          is_valid: boolean
          organization_id: string
          organization_name: string
          role: Database["public"]["Enums"]["org_role"]
        }[]
      }
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
