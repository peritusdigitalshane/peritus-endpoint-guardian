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

export interface Essential8Strategy {
  name: string;
  maturityLevel: 0 | 1 | 2 | 3;
  coverage: number;
  description: string;
  gaps: string[];
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

  // Essential 8
  essential8?: Essential8Strategy[];
  essential8OverallMaturity?: number;
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
  essential8?: boolean;
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
  essential8: true,
};

const defaultInsuranceVisibility: SectionVisibility = {
  executiveSummary: true,
  securityScore: true,
  securityControls: true,
  coverageSummary: true,
  complianceOverview: true,
  threatSummary: true,
  recommendations: true,
  essential8: true,
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

    // Essential 8 Maturity Assessment
    const calcMaturity = (coverage: number): 0 | 1 | 2 | 3 => {
      if (coverage >= 95) return 3;
      if (coverage >= 80) return 2;
      if (coverage >= 50) return 1;
      return 0;
    };

    // E8 Strategy 1: Application Control (WDAC)
    // We approximate from policy assignment (endpoints with WDAC would need wdac_policy_id)
    const wdacCoverage = Math.round((endpoints?.filter(e => (e as any).wdac_policy_id !== null).length || 0) / (totalEndpoints || 1) * 100);
    const appControlGaps: string[] = [];
    if (wdacCoverage < 50) appControlGaps.push("Deploy WDAC policies to endpoints via App Control");
    if (wdacCoverage < 95) appControlGaps.push("Increase application control coverage across all endpoint groups");

    // E8 Strategy 2: Patch Applications (signature currency as proxy)
    const patchAppCoverage = signatureCompliance;
    const patchAppGaps: string[] = [];
    if (patchAppCoverage < 80) patchAppGaps.push("Reduce signature update interval in Defender policies");
    if (patchAppCoverage < 95) patchAppGaps.push("Ensure all endpoints have current virus definitions");

    // E8 Strategy 3: Configure Microsoft Office Macro Settings (ASR macro rules)
    // Use policy assignment as proxy for macro control
    const macroCoverage = policyAssigned;
    const macroGaps: string[] = [];
    if (macroCoverage < 80) macroGaps.push("Enable ASR rules for Office macro blocking in policies");
    if (macroCoverage < 95) macroGaps.push("Assign Defender policies with macro ASR rules to all endpoints");

    // E8 Strategy 4: User Application Hardening (network protection, exploit protection, script scanning)
    const hardeningMetrics = [
      realtimeProtection,
      behaviorMonitoring,
      ioavProtection,
    ];
    const appHardeningCoverage = Math.round(hardeningMetrics.reduce((a, b) => a + b, 0) / hardeningMetrics.length);
    const appHardeningGaps: string[] = [];
    if (appHardeningCoverage < 80) appHardeningGaps.push("Enable network protection and exploit protection in policies");
    if (ioavProtection < 80) appHardeningGaps.push("Enable download protection (IOAV) across all endpoints");

    // E8 Strategy 5: Restrict Administrative Privileges (UAC)
    const uacCoverage = Math.round((endpoints?.filter(e => (e as any).uac_policy_id !== null).length || 0) / (totalEndpoints || 1) * 100);
    const adminGaps: string[] = [];
    if (uacCoverage < 50) adminGaps.push("Deploy UAC policies to restrict elevation prompts");
    if (uacCoverage < 95) adminGaps.push("Assign UAC policies to all endpoint groups");

    // E8 Strategy 6: Patch Operating Systems (Windows Update policies)
    const wuCoverage = Math.round((endpoints?.filter(e => (e as any).windows_update_policy_id !== null).length || 0) / (totalEndpoints || 1) * 100);
    const osPatchGaps: string[] = [];
    if (wuCoverage < 50) osPatchGaps.push("Create and assign Windows Update policies");
    if (wuCoverage < 95) osPatchGaps.push("Ensure all endpoints have a Windows Update policy assigned");

    // E8 Strategy 7: Multi-Factor Authentication
    // Platform-level MFA - approximate as partial if policies are managed
    const mfaCoverage = policyAssigned >= 90 ? 60 : policyAssigned >= 50 ? 30 : 10;
    const mfaGaps: string[] = ["Enable MFA for all user accounts in Settings → MFA"];
    if (mfaCoverage < 60) mfaGaps.push("Enforce MFA across all administrator accounts");

    // E8 Strategy 8: Regular Backups
    // Cannot fully assess - show as needing external verification
    const backupCoverage = 0;
    const backupGaps: string[] = [
      "Implement and verify regular backup procedures externally",
      "Test backup restoration procedures periodically",
    ];

    const essential8: Essential8Strategy[] = [
      { name: "Application Control", maturityLevel: calcMaturity(wdacCoverage), coverage: wdacCoverage, description: "Control which applications can execute on endpoints using WDAC policies", gaps: appControlGaps },
      { name: "Patch Applications", maturityLevel: calcMaturity(patchAppCoverage), coverage: patchAppCoverage, description: "Keep application signatures and definitions up to date", gaps: patchAppGaps },
      { name: "Configure MS Office Macros", maturityLevel: calcMaturity(macroCoverage), coverage: macroCoverage, description: "Restrict Office macro execution via ASR rules in Defender policies", gaps: macroGaps },
      { name: "User Application Hardening", maturityLevel: calcMaturity(appHardeningCoverage), coverage: appHardeningCoverage, description: "Harden applications with network protection, exploit protection, and script scanning", gaps: appHardeningGaps },
      { name: "Restrict Admin Privileges", maturityLevel: calcMaturity(uacCoverage), coverage: uacCoverage, description: "Manage administrative privileges through UAC policy enforcement", gaps: adminGaps },
      { name: "Patch Operating Systems", maturityLevel: calcMaturity(wuCoverage), coverage: wuCoverage, description: "Ensure operating systems receive timely security updates", gaps: osPatchGaps },
      { name: "Multi-Factor Authentication", maturityLevel: calcMaturity(mfaCoverage), coverage: mfaCoverage, description: "Require MFA for user authentication to the platform", gaps: mfaGaps },
      { name: "Regular Backups", maturityLevel: calcMaturity(backupCoverage), coverage: backupCoverage, description: "Regular backups of important data with tested restoration", gaps: backupGaps },
    ];

    const overallMaturity = Math.min(...essential8.map(s => s.maturityLevel));

    baseData.essential8 = essential8;
    baseData.essential8OverallMaturity = overallMaturity;

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
