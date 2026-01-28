import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useDashboardStats } from "./useDashboardData";
import { Json } from "@/integrations/supabase/types";

export type ReportType = "monthly_security" | "cyber_insurance";

export interface SecurityReport {
  id: string;
  organization_id: string;
  report_type: ReportType;
  report_title: string;
  report_period_start: string;
  report_period_end: string;
  generated_by: string | null;
  generated_at: string;
  report_data: ReportData;
  section_visibility: SectionVisibility;
  pdf_storage_path: string | null;
  created_at: string;
}

export interface ReportData {
  // Executive Summary
  organizationName?: string;
  reportPeriod?: string;
  securityScore?: number;
  totalEndpoints?: number;
  protectedEndpoints?: number;
  compliancePercentage?: number;
  
  // Threat Summary
  totalThreats?: number;
  criticalThreats?: number;
  highThreats?: number;
  mediumThreats?: number;
  lowThreats?: number;
  resolvedThreats?: number;
  activeThreats?: number;
  
  // Compliance Details
  realtimeProtection?: number;
  antivirusEnabled?: number;
  signatureCompliance?: number;
  behaviorMonitoring?: number;
  ioavProtection?: number;
  policyAssigned?: number;
  
  // Cyber Insurance specific
  securityControls?: SecurityControl[];
  recommendations?: string[];
}

export interface SecurityControl {
  name: string;
  status: "implemented" | "partial" | "not_implemented";
  coverage: number;
  description: string;
}

export interface SectionVisibility {
  executiveSummary?: boolean;
  securityScore?: boolean;
  threatSummary?: boolean;
  threatDetails?: boolean;
  complianceOverview?: boolean;
  complianceDetails?: boolean;
  endpointInventory?: boolean;
  recommendations?: boolean;
  securityControls?: boolean;
  coverageSummary?: boolean;
}

const defaultMonthlyVisibility: SectionVisibility = {
  executiveSummary: true,
  securityScore: true,
  threatSummary: true,
  threatDetails: true,
  complianceOverview: true,
  complianceDetails: true,
  endpointInventory: true,
  recommendations: true,
};

const defaultInsuranceVisibility: SectionVisibility = {
  executiveSummary: true,
  securityScore: true,
  securityControls: true,
  coverageSummary: true,
  complianceOverview: true,
  threatSummary: true,
  recommendations: true,
};

export function useReports() {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  return useQuery({
    queryKey: ["security_reports", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("security_reports")
        .select("*")
        .eq("organization_id", orgId!)
        .order("generated_at", { ascending: false });

      if (error) throw error;
      return data.map(r => ({
        ...r,
        report_data: r.report_data as unknown as ReportData,
        section_visibility: r.section_visibility as unknown as SectionVisibility,
      })) as SecurityReport[];
    },
  });
}

export function useGenerateReportData() {
  const { 
    securityScore, 
    totalEndpoints, 
    protectedCount, 
    compliancePercentage,
    activeThreats,
    threats,
    statuses,
    endpoints,
  } = useDashboardStats();
  const { currentOrganization } = useTenant();

  const generateReportData = (reportType: ReportType): ReportData => {
    const statusCount = statuses?.length || 1;
    
    // Calculate compliance metrics
    const realtimeProtection = Math.round((statuses?.filter(s => s.realtime_protection_enabled).length || 0) / statusCount * 100);
    const antivirusEnabled = Math.round((statuses?.filter(s => s.antivirus_enabled).length || 0) / statusCount * 100);
    const signatureCompliance = Math.round((statuses?.filter(s => s.antivirus_signature_age !== null && s.antivirus_signature_age <= 1).length || 0) / statusCount * 100);
    const behaviorMonitoring = Math.round((statuses?.filter(s => s.behavior_monitor_enabled).length || 0) / statusCount * 100);
    const ioavProtection = Math.round((statuses?.filter(s => s.ioav_protection_enabled).length || 0) / statusCount * 100);
    const policyAssigned = Math.round((endpoints?.filter(e => e.policy_id !== null).length || 0) / (totalEndpoints || 1) * 100);

    // Threat breakdown
    const resolvedStatuses = ["resolved", "removed", "blocked"];
    const resolvedThreats = threats?.filter(t => resolvedStatuses.includes(t.status.toLowerCase())).length || 0;
    const criticalThreats = threats?.filter(t => t.severity.toLowerCase() === "critical" || t.severity.toLowerCase() === "severe").length || 0;
    const highThreats = threats?.filter(t => t.severity.toLowerCase() === "high").length || 0;
    const mediumThreats = threats?.filter(t => t.severity.toLowerCase() === "medium" || t.severity.toLowerCase() === "moderate").length || 0;
    const lowThreats = threats?.filter(t => t.severity.toLowerCase() === "low").length || 0;

    const baseData: ReportData = {
      organizationName: currentOrganization?.name || "Organization",
      securityScore,
      totalEndpoints,
      protectedEndpoints: protectedCount,
      compliancePercentage,
      totalThreats: threats?.length || 0,
      criticalThreats,
      highThreats,
      mediumThreats,
      lowThreats,
      resolvedThreats,
      activeThreats,
      realtimeProtection,
      antivirusEnabled,
      signatureCompliance,
      behaviorMonitoring,
      ioavProtection,
      policyAssigned,
    };

    if (reportType === "cyber_insurance") {
      baseData.securityControls = [
        {
          name: "Endpoint Detection & Response (EDR)",
          status: realtimeProtection >= 90 ? "implemented" : realtimeProtection >= 50 ? "partial" : "not_implemented",
          coverage: realtimeProtection,
          description: "Microsoft Defender real-time protection enabled across fleet",
        },
        {
          name: "Antivirus Protection",
          status: antivirusEnabled >= 90 ? "implemented" : antivirusEnabled >= 50 ? "partial" : "not_implemented",
          coverage: antivirusEnabled,
          description: "Active antivirus scanning on all endpoints",
        },
        {
          name: "Signature Updates",
          status: signatureCompliance >= 90 ? "implemented" : signatureCompliance >= 50 ? "partial" : "not_implemented",
          coverage: signatureCompliance,
          description: "Virus definitions updated within 24 hours",
        },
        {
          name: "Behavior Monitoring",
          status: behaviorMonitoring >= 90 ? "implemented" : behaviorMonitoring >= 50 ? "partial" : "not_implemented",
          coverage: behaviorMonitoring,
          description: "Suspicious activity pattern detection enabled",
        },
        {
          name: "Download Protection (IOAV)",
          status: ioavProtection >= 90 ? "implemented" : ioavProtection >= 50 ? "partial" : "not_implemented",
          coverage: ioavProtection,
          description: "Scanning of files downloaded from the internet",
        },
        {
          name: "Centralized Policy Management",
          status: policyAssigned >= 90 ? "implemented" : policyAssigned >= 50 ? "partial" : "not_implemented",
          coverage: policyAssigned,
          description: "Security policies centrally managed and enforced",
        },
      ];
    }

    return baseData;
  };

  const getDefaultVisibility = (reportType: ReportType): SectionVisibility => {
    return reportType === "monthly_security" ? defaultMonthlyVisibility : defaultInsuranceVisibility;
  };

  return { generateReportData, getDefaultVisibility };
}

export function useSaveReport() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useTenant();

  return useMutation({
    mutationFn: async (report: {
      report_type: ReportType;
      report_title: string;
      report_period_start: string;
      report_period_end: string;
      report_data: ReportData;
      section_visibility: SectionVisibility;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("security_reports")
        .insert({
          organization_id: currentOrganization!.id,
          report_type: report.report_type,
          report_title: report.report_title,
          report_period_start: report.report_period_start,
          report_period_end: report.report_period_end,
          report_data: report.report_data as unknown as Json,
          section_visibility: report.section_visibility as unknown as Json,
          generated_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["security_reports"] });
    },
  });
}

export function useDeleteReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reportId: string) => {
      const { error } = await supabase
        .from("security_reports")
        .delete()
        .eq("id", reportId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["security_reports"] });
    },
  });
}
