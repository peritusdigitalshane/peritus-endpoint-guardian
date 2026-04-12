import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useToast } from "@/hooks/use-toast";

export function useVulnerabilityFindings() {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  return useQuery({
    queryKey: ["vulnerability-findings", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("vulnerability_findings")
        .select("*, endpoints(hostname)")
        .eq("organization_id", orgId)
        .order("cvss_score", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });
}

export function useVulnerabilityStats() {
  const { data: findings, isLoading } = useVulnerabilityFindings();

  const stats = {
    total: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    open: 0,
    resolved: 0,
    affectedEndpoints: 0,
  };

  if (findings) {
    stats.total = findings.length;
    stats.critical = findings.filter((f) => f.severity === "critical").length;
    stats.high = findings.filter((f) => f.severity === "high").length;
    stats.medium = findings.filter((f) => f.severity === "medium").length;
    stats.low = findings.filter((f) => f.severity === "low").length;
    stats.open = findings.filter((f) => f.status === "open").length;
    stats.resolved = findings.filter((f) => f.status !== "open").length;
    const uniqueEndpoints = new Set(findings.filter((f) => f.status === "open").map((f) => f.endpoint_id));
    stats.affectedEndpoints = uniqueEndpoints.size;
  }

  return { stats, isLoading };
}

export function useSoftwareInventory() {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  return useQuery({
    queryKey: ["software-inventory", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("endpoint_software_inventory")
        .select("*, endpoints(hostname)")
        .eq("organization_id", orgId)
        .order("software_name");
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });
}

export function useVulnerabilityScanJobs() {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  return useQuery({
    queryKey: ["vulnerability-scan-jobs", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("vulnerability_scan_jobs")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });
}

export function useUpdateFindingStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("vulnerability_findings")
        .update({
          status,
          resolved_at: status !== "open" ? new Date().toISOString() : null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vulnerability-findings"] });
    },
  });
}
