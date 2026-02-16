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
          exclusion_extensions: string[] | null
          exclusion_paths: string[] | null
          exclusion_processes: string[] | null
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
          exclusion_extensions?: string[] | null
          exclusion_paths?: string[] | null
          exclusion_processes?: string[] | null
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
          exclusion_extensions?: string[] | null
          exclusion_paths?: string[] | null
          exclusion_processes?: string[] | null
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
          uac_policy_id: string | null
          updated_at: string
          wdac_policy_id: string | null
          windows_update_policy_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          defender_policy_id?: string | null
          description?: string | null
          id?: string
          name: string
          organization_id: string
          uac_policy_id?: string | null
          updated_at?: string
          wdac_policy_id?: string | null
          windows_update_policy_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          defender_policy_id?: string | null
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          uac_policy_id?: string | null
          updated_at?: string
          wdac_policy_id?: string | null
          windows_update_policy_id?: string | null
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
            foreignKeyName: "endpoint_groups_uac_policy_id_fkey"
            columns: ["uac_policy_id"]
            isOneToOne: false
            referencedRelation: "uac_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "endpoint_groups_wdac_policy_id_fkey"
            columns: ["wdac_policy_id"]
            isOneToOne: false
            referencedRelation: "wdac_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "endpoint_groups_windows_update_policy_id_fkey"
            columns: ["windows_update_policy_id"]
            isOneToOne: false
            referencedRelation: "windows_update_policies"
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
      endpoint_rule_set_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          endpoint_id: string
          id: string
          priority: number
          rule_set_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          endpoint_id: string
          id?: string
          priority?: number
          rule_set_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          endpoint_id?: string
          id?: string
          priority?: number
          rule_set_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "endpoint_rule_set_assignments_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "endpoints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "endpoint_rule_set_assignments_rule_set_id_fkey"
            columns: ["rule_set_id"]
            isOneToOne: false
            referencedRelation: "wdac_rule_sets"
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
          uac_consent_prompt_admin: number | null
          uac_consent_prompt_user: number | null
          uac_detect_installations: boolean | null
          uac_enabled: boolean | null
          uac_filter_administrator_token: boolean | null
          uac_prompt_on_secure_desktop: boolean | null
          uac_validate_admin_signatures: boolean | null
          wu_active_hours_end: number | null
          wu_active_hours_start: number | null
          wu_auto_update_mode: number | null
          wu_feature_update_deferral: number | null
          wu_last_install_date: string | null
          wu_pause_feature_updates: boolean | null
          wu_pause_quality_updates: boolean | null
          wu_pending_updates_count: number | null
          wu_quality_update_deferral: number | null
          wu_restart_pending: boolean | null
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
          uac_consent_prompt_admin?: number | null
          uac_consent_prompt_user?: number | null
          uac_detect_installations?: boolean | null
          uac_enabled?: boolean | null
          uac_filter_administrator_token?: boolean | null
          uac_prompt_on_secure_desktop?: boolean | null
          uac_validate_admin_signatures?: boolean | null
          wu_active_hours_end?: number | null
          wu_active_hours_start?: number | null
          wu_auto_update_mode?: number | null
          wu_feature_update_deferral?: number | null
          wu_last_install_date?: string | null
          wu_pause_feature_updates?: boolean | null
          wu_pause_quality_updates?: boolean | null
          wu_pending_updates_count?: number | null
          wu_quality_update_deferral?: number | null
          wu_restart_pending?: boolean | null
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
          uac_consent_prompt_admin?: number | null
          uac_consent_prompt_user?: number | null
          uac_detect_installations?: boolean | null
          uac_enabled?: boolean | null
          uac_filter_administrator_token?: boolean | null
          uac_prompt_on_secure_desktop?: boolean | null
          uac_validate_admin_signatures?: boolean | null
          wu_active_hours_end?: number | null
          wu_active_hours_start?: number | null
          wu_auto_update_mode?: number | null
          wu_feature_update_deferral?: number | null
          wu_last_install_date?: string | null
          wu_pause_feature_updates?: boolean | null
          wu_pause_quality_updates?: boolean | null
          wu_pending_updates_count?: number | null
          wu_quality_update_deferral?: number | null
          wu_restart_pending?: boolean | null
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
          manual_resolution_active: boolean
          manual_resolved_at: string | null
          manual_resolved_by: string | null
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
          manual_resolution_active?: boolean
          manual_resolved_at?: string | null
          manual_resolved_by?: string | null
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
          manual_resolution_active?: boolean
          manual_resolved_at?: string | null
          manual_resolved_by?: string | null
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
          agent_version: string | null
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
          uac_policy_id: string | null
          updated_at: string
          wdac_policy_id: string | null
          windows_update_policy_id: string | null
        }
        Insert: {
          agent_token: string
          agent_version?: string | null
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
          uac_policy_id?: string | null
          updated_at?: string
          wdac_policy_id?: string | null
          windows_update_policy_id?: string | null
        }
        Update: {
          agent_token?: string
          agent_version?: string | null
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
          uac_policy_id?: string | null
          updated_at?: string
          wdac_policy_id?: string | null
          windows_update_policy_id?: string | null
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
            foreignKeyName: "endpoints_uac_policy_id_fkey"
            columns: ["uac_policy_id"]
            isOneToOne: false
            referencedRelation: "uac_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "endpoints_wdac_policy_id_fkey"
            columns: ["wdac_policy_id"]
            isOneToOne: false
            referencedRelation: "wdac_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "endpoints_windows_update_policy_id_fkey"
            columns: ["windows_update_policy_id"]
            isOneToOne: false
            referencedRelation: "windows_update_policies"
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
      firewall_audit_logs: {
        Row: {
          created_at: string
          direction: string
          endpoint_id: string
          event_time: string
          id: string
          local_port: number
          organization_id: string
          protocol: string
          remote_address: string
          remote_port: number | null
          rule_id: string | null
          service_name: string
        }
        Insert: {
          created_at?: string
          direction?: string
          endpoint_id: string
          event_time: string
          id?: string
          local_port: number
          organization_id: string
          protocol?: string
          remote_address: string
          remote_port?: number | null
          rule_id?: string | null
          service_name: string
        }
        Update: {
          created_at?: string
          direction?: string
          endpoint_id?: string
          event_time?: string
          id?: string
          local_port?: number
          organization_id?: string
          protocol?: string
          remote_address?: string
          remote_port?: number | null
          rule_id?: string | null
          service_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "firewall_audit_logs_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "endpoints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "firewall_audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "firewall_audit_logs_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "firewall_service_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      firewall_policies: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_default: boolean
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
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "firewall_policies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "firewall_policies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      firewall_service_rules: {
        Row: {
          action: string
          allowed_source_groups: string[] | null
          allowed_source_ips: string[] | null
          created_at: string
          enabled: boolean
          endpoint_group_id: string
          id: string
          mode: string
          order_priority: number
          policy_id: string
          port: string
          protocol: string
          service_name: string
        }
        Insert: {
          action?: string
          allowed_source_groups?: string[] | null
          allowed_source_ips?: string[] | null
          created_at?: string
          enabled?: boolean
          endpoint_group_id: string
          id?: string
          mode?: string
          order_priority?: number
          policy_id: string
          port: string
          protocol?: string
          service_name: string
        }
        Update: {
          action?: string
          allowed_source_groups?: string[] | null
          allowed_source_ips?: string[] | null
          created_at?: string
          enabled?: boolean
          endpoint_group_id?: string
          id?: string
          mode?: string
          order_priority?: number
          policy_id?: string
          port?: string
          protocol?: string
          service_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "firewall_service_rules_endpoint_group_id_fkey"
            columns: ["endpoint_group_id"]
            isOneToOne: false
            referencedRelation: "endpoint_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "firewall_service_rules_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "firewall_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      firewall_templates: {
        Row: {
          category: string
          created_at: string
          default_mode: string
          description: string | null
          id: string
          name: string
          rules_json: Json
        }
        Insert: {
          category?: string
          created_at?: string
          default_mode?: string
          description?: string | null
          id?: string
          name: string
          rules_json?: Json
        }
        Update: {
          category?: string
          created_at?: string
          default_mode?: string
          description?: string | null
          id?: string
          name?: string
          rules_json?: Json
        }
        Relationships: []
      }
      group_rule_set_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          group_id: string
          id: string
          priority: number
          rule_set_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          group_id: string
          id?: string
          priority?: number
          rule_set_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          group_id?: string
          id?: string
          priority?: number
          rule_set_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_rule_set_assignments_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "endpoint_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_rule_set_assignments_rule_set_id_fkey"
            columns: ["rule_set_id"]
            isOneToOne: false
            referencedRelation: "wdac_rule_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      hunt_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          hunt_type: string
          id: string
          matches_found: number | null
          name: string
          organization_id: string
          parameters: Json
          started_at: string | null
          status: string
          total_endpoints: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          hunt_type: string
          id?: string
          matches_found?: number | null
          name: string
          organization_id: string
          parameters?: Json
          started_at?: string | null
          status?: string
          total_endpoints?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          hunt_type?: string
          id?: string
          matches_found?: number | null
          name?: string
          organization_id?: string
          parameters?: Json
          started_at?: string | null
          status?: string
          total_endpoints?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hunt_jobs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hunt_jobs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      hunt_matches: {
        Row: {
          context: Json | null
          created_at: string
          endpoint_id: string
          hunt_job_id: string
          id: string
          ioc_id: string | null
          match_source: string
          matched_value: string
          reviewed: boolean
          reviewed_at: string | null
          reviewed_by: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string
          endpoint_id: string
          hunt_job_id: string
          id?: string
          ioc_id?: string | null
          match_source: string
          matched_value: string
          reviewed?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string
          endpoint_id?: string
          hunt_job_id?: string
          id?: string
          ioc_id?: string | null
          match_source?: string
          matched_value?: string
          reviewed?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hunt_matches_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "endpoints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hunt_matches_hunt_job_id_fkey"
            columns: ["hunt_job_id"]
            isOneToOne: false
            referencedRelation: "hunt_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hunt_matches_ioc_id_fkey"
            columns: ["ioc_id"]
            isOneToOne: false
            referencedRelation: "ioc_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hunt_matches_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ioc_library: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          hash_type: string | null
          id: string
          ioc_type: string
          is_active: boolean
          organization_id: string
          severity: string
          source: string
          tags: string[] | null
          threat_name: string | null
          value: string
          vt_detection_ratio: string | null
          vt_enriched_at: string | null
          vt_enrichment: Json | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          hash_type?: string | null
          id?: string
          ioc_type: string
          is_active?: boolean
          organization_id: string
          severity?: string
          source?: string
          tags?: string[] | null
          threat_name?: string | null
          value: string
          vt_detection_ratio?: string | null
          vt_enriched_at?: string | null
          vt_enrichment?: Json | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          hash_type?: string | null
          id?: string
          ioc_type?: string
          is_active?: boolean
          organization_id?: string
          severity?: string
          source?: string
          tags?: string[] | null
          threat_name?: string | null
          value?: string
          vt_detection_ratio?: string | null
          vt_enriched_at?: string | null
          vt_enrichment?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ioc_library_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ioc_library_organization_id_fkey"
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
          event_log_retention_days: number
          id: string
          name: string
          network_module_enabled: boolean
          organization_type: string
          parent_partner_id: string | null
          router_module_enabled: boolean
          slug: string
          subscription_plan: Database["public"]["Enums"]["subscription_plan"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_log_retention_days?: number
          id?: string
          name: string
          network_module_enabled?: boolean
          organization_type?: string
          parent_partner_id?: string | null
          router_module_enabled?: boolean
          slug: string
          subscription_plan?: Database["public"]["Enums"]["subscription_plan"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_log_retention_days?: number
          id?: string
          name?: string
          network_module_enabled?: boolean
          organization_type?: string
          parent_partner_id?: string | null
          router_module_enabled?: boolean
          slug?: string
          subscription_plan?: Database["public"]["Enums"]["subscription_plan"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizations_parent_partner_id_fkey"
            columns: ["parent_partner_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_features: {
        Row: {
          advanced_threat_analytics: boolean
          ai_security_advisor: boolean
          api_access: boolean
          compliance_reporting: boolean
          created_at: string
          custom_policies: boolean
          id: string
          max_devices: number | null
          plan: Database["public"]["Enums"]["subscription_plan"]
          priority_support: boolean
          updated_at: string
        }
        Insert: {
          advanced_threat_analytics?: boolean
          ai_security_advisor?: boolean
          api_access?: boolean
          compliance_reporting?: boolean
          created_at?: string
          custom_policies?: boolean
          id?: string
          max_devices?: number | null
          plan: Database["public"]["Enums"]["subscription_plan"]
          priority_support?: boolean
          updated_at?: string
        }
        Update: {
          advanced_threat_analytics?: boolean
          ai_security_advisor?: boolean
          api_access?: boolean
          compliance_reporting?: boolean
          created_at?: string
          custom_policies?: boolean
          id?: string
          max_devices?: number | null
          plan?: Database["public"]["Enums"]["subscription_plan"]
          priority_support?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_secret: boolean
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_secret?: boolean
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_secret?: boolean
          key?: string
          updated_at?: string
          value?: string | null
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
      router_dns_records: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          priority: number | null
          record_name: string
          record_type: string
          record_value: string
          ttl: number
          zone_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          priority?: number | null
          record_name: string
          record_type?: string
          record_value: string
          ttl?: number
          zone_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          priority?: number | null
          record_name?: string
          record_type?: string
          record_value?: string
          ttl?: number
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "router_dns_records_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "router_dns_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      router_dns_zones: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          organization_id: string
          router_id: string
          updated_at: string
          upstream_servers: string[] | null
          zone_name: string
          zone_type: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          organization_id: string
          router_id: string
          updated_at?: string
          upstream_servers?: string[] | null
          zone_name: string
          zone_type?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          organization_id?: string
          router_id?: string
          updated_at?: string
          upstream_servers?: string[] | null
          zone_name?: string
          zone_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "router_dns_zones_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "router_dns_zones_router_id_fkey"
            columns: ["router_id"]
            isOneToOne: false
            referencedRelation: "routers"
            referencedColumns: ["id"]
          },
        ]
      }
      router_enrollment_tokens: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          label: string
          max_uses: number | null
          organization_id: string
          token: string
          use_count: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          label?: string
          max_uses?: number | null
          organization_id: string
          token?: string
          use_count?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          label?: string
          max_uses?: number | null
          organization_id?: string
          token?: string
          use_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "router_enrollment_tokens_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      router_firewall_rules: {
        Row: {
          action: string
          created_at: string
          destination_address: string | null
          destination_port: string | null
          direction: string
          enabled: boolean
          id: string
          interface: string | null
          log_enabled: boolean
          name: string
          order_priority: number
          organization_id: string
          protocol: string | null
          router_id: string
          source_address: string | null
          source_port: string | null
          updated_at: string
        }
        Insert: {
          action?: string
          created_at?: string
          destination_address?: string | null
          destination_port?: string | null
          direction?: string
          enabled?: boolean
          id?: string
          interface?: string | null
          log_enabled?: boolean
          name: string
          order_priority?: number
          organization_id: string
          protocol?: string | null
          router_id: string
          source_address?: string | null
          source_port?: string | null
          updated_at?: string
        }
        Update: {
          action?: string
          created_at?: string
          destination_address?: string | null
          destination_port?: string | null
          direction?: string
          enabled?: boolean
          id?: string
          interface?: string | null
          log_enabled?: boolean
          name?: string
          order_priority?: number
          organization_id?: string
          protocol?: string | null
          router_id?: string
          source_address?: string | null
          source_port?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "router_firewall_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "router_firewall_rules_router_id_fkey"
            columns: ["router_id"]
            isOneToOne: false
            referencedRelation: "routers"
            referencedColumns: ["id"]
          },
        ]
      }
      router_tunnels: {
        Row: {
          config_data: Json | null
          created_at: string
          enabled: boolean
          encryption: string | null
          id: string
          name: string
          organization_id: string
          psk_hint: string | null
          router_a_endpoint: string | null
          router_a_id: string
          router_a_subnet: string | null
          router_b_endpoint: string | null
          router_b_id: string | null
          router_b_subnet: string | null
          status: string
          tunnel_type: string
          updated_at: string
        }
        Insert: {
          config_data?: Json | null
          created_at?: string
          enabled?: boolean
          encryption?: string | null
          id?: string
          name: string
          organization_id: string
          psk_hint?: string | null
          router_a_endpoint?: string | null
          router_a_id: string
          router_a_subnet?: string | null
          router_b_endpoint?: string | null
          router_b_id?: string | null
          router_b_subnet?: string | null
          status?: string
          tunnel_type?: string
          updated_at?: string
        }
        Update: {
          config_data?: Json | null
          created_at?: string
          enabled?: boolean
          encryption?: string | null
          id?: string
          name?: string
          organization_id?: string
          psk_hint?: string | null
          router_a_endpoint?: string | null
          router_a_id?: string
          router_a_subnet?: string | null
          router_b_endpoint?: string | null
          router_b_id?: string | null
          router_b_subnet?: string | null
          status?: string
          tunnel_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "router_tunnels_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "router_tunnels_router_a_id_fkey"
            columns: ["router_a_id"]
            isOneToOne: false
            referencedRelation: "routers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "router_tunnels_router_b_id_fkey"
            columns: ["router_b_id"]
            isOneToOne: false
            referencedRelation: "routers"
            referencedColumns: ["id"]
          },
        ]
      }
      routers: {
        Row: {
          agent_token: string | null
          config_profile: Json | null
          created_at: string
          firmware_version: string | null
          hostname: string
          id: string
          is_online: boolean
          lan_subnets: string[] | null
          last_seen_at: string | null
          location: string | null
          management_ip: string | null
          model: string | null
          notes: string | null
          organization_id: string
          serial_number: string | null
          site_name: string | null
          updated_at: string
          vendor: string
          wan_ip: string | null
        }
        Insert: {
          agent_token?: string | null
          config_profile?: Json | null
          created_at?: string
          firmware_version?: string | null
          hostname: string
          id?: string
          is_online?: boolean
          lan_subnets?: string[] | null
          last_seen_at?: string | null
          location?: string | null
          management_ip?: string | null
          model?: string | null
          notes?: string | null
          organization_id: string
          serial_number?: string | null
          site_name?: string | null
          updated_at?: string
          vendor: string
          wan_ip?: string | null
        }
        Update: {
          agent_token?: string | null
          config_profile?: Json | null
          created_at?: string
          firmware_version?: string | null
          hostname?: string
          id?: string
          is_online?: boolean
          lan_subnets?: string[] | null
          last_seen_at?: string | null
          location?: string | null
          management_ip?: string | null
          model?: string | null
          notes?: string | null
          organization_id?: string
          serial_number?: string | null
          site_name?: string | null
          updated_at?: string
          vendor?: string
          wan_ip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "routers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      security_reports: {
        Row: {
          created_at: string
          generated_at: string
          generated_by: string | null
          id: string
          organization_id: string
          pdf_storage_path: string | null
          report_data: Json
          report_period_end: string
          report_period_start: string
          report_title: string
          report_type: string
          section_visibility: Json
        }
        Insert: {
          created_at?: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          organization_id: string
          pdf_storage_path?: string | null
          report_data?: Json
          report_period_end: string
          report_period_start: string
          report_title: string
          report_type: string
          section_visibility?: Json
        }
        Update: {
          created_at?: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          organization_id?: string
          pdf_storage_path?: string | null
          report_data?: Json
          report_period_end?: string
          report_period_start?: string
          report_title?: string
          report_type?: string
          section_visibility?: Json
        }
        Relationships: [
          {
            foreignKeyName: "security_reports_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
      uac_policies: {
        Row: {
          consent_prompt_admin: number
          consent_prompt_user: number
          created_at: string
          created_by: string | null
          description: string | null
          detect_installations: boolean
          enable_lua: boolean
          filter_administrator_token: boolean
          id: string
          is_default: boolean
          name: string
          organization_id: string
          prompt_on_secure_desktop: boolean
          updated_at: string
          validate_admin_signatures: boolean
        }
        Insert: {
          consent_prompt_admin?: number
          consent_prompt_user?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          detect_installations?: boolean
          enable_lua?: boolean
          filter_administrator_token?: boolean
          id?: string
          is_default?: boolean
          name: string
          organization_id: string
          prompt_on_secure_desktop?: boolean
          updated_at?: string
          validate_admin_signatures?: boolean
        }
        Update: {
          consent_prompt_admin?: number
          consent_prompt_user?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          detect_installations?: boolean
          enable_lua?: boolean
          filter_administrator_token?: boolean
          id?: string
          is_default?: boolean
          name?: string
          organization_id?: string
          prompt_on_secure_desktop?: boolean
          updated_at?: string
          validate_admin_signatures?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "uac_policies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
      wdac_rule_set_rules: {
        Row: {
          action: string
          created_at: string
          created_by: string | null
          description: string | null
          file_version_min: string | null
          id: string
          product_name: string | null
          publisher_name: string | null
          rule_set_id: string
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
          product_name?: string | null
          publisher_name?: string | null
          rule_set_id: string
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
          product_name?: string | null
          publisher_name?: string | null
          rule_set_id?: string
          rule_type?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "wdac_rule_set_rules_rule_set_id_fkey"
            columns: ["rule_set_id"]
            isOneToOne: false
            referencedRelation: "wdac_rule_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      wdac_rule_sets: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
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
          mode?: string
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wdac_rule_sets_organization_id_fkey"
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
      windows_update_policies: {
        Row: {
          active_hours_end: number | null
          active_hours_start: number | null
          auto_update_mode: number | null
          created_at: string
          description: string | null
          feature_update_deferral: number | null
          id: string
          name: string
          organization_id: string
          pause_feature_updates: boolean | null
          pause_quality_updates: boolean | null
          quality_update_deferral: number | null
          updated_at: string
        }
        Insert: {
          active_hours_end?: number | null
          active_hours_start?: number | null
          auto_update_mode?: number | null
          created_at?: string
          description?: string | null
          feature_update_deferral?: number | null
          id?: string
          name: string
          organization_id: string
          pause_feature_updates?: boolean | null
          pause_quality_updates?: boolean | null
          quality_update_deferral?: number | null
          updated_at?: string
        }
        Update: {
          active_hours_end?: number | null
          active_hours_start?: number | null
          auto_update_mode?: number | null
          created_at?: string
          description?: string | null
          feature_update_deferral?: number | null
          id?: string
          name?: string
          organization_id?: string
          pause_feature_updates?: boolean | null
          pause_quality_updates?: boolean | null
          quality_update_deferral?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "windows_update_policies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_add_device: { Args: { _org_id: string }; Returns: boolean }
      get_effective_plan: {
        Args: { _org_id: string }
        Returns: Database["public"]["Enums"]["subscription_plan"]
      }
      get_partner_customer_org_ids: {
        Args: { _user_id: string }
        Returns: string[]
      }
      get_user_org_ids: { Args: { _user_id: string }; Returns: string[] }
      is_admin_of_org: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_member_of_org: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_partner_admin: { Args: { _user_id: string }; Returns: boolean }
      is_partner_admin_of_org: {
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
      subscription_plan: "free" | "pro" | "business"
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
      subscription_plan: ["free", "pro", "business"],
    },
  },
} as const
