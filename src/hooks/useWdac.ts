import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useToast } from "@/hooks/use-toast";
import { logActivity } from "@/hooks/useActivityLogs";

export interface WdacPolicy {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  mode: "audit" | "enforced";
  is_default: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface WdacDiscoveredApp {
  id: string;
  organization_id: string;
  endpoint_id: string;
  file_name: string;
  file_path: string;
  file_hash: string | null;
  publisher: string | null;
  product_name: string | null;
  file_version: string | null;
  discovery_source: "agent_inventory" | "event_log" | "both";
  first_seen_at: string;
  last_seen_at: string;
  execution_count: number;
  raw_data: Record<string, unknown> | null;
  endpoints?: { hostname: string };
}

export interface WdacRule {
  id: string;
  policy_id: string;
  rule_type: "publisher" | "path" | "hash" | "file_name";
  action: "allow" | "block";
  value: string;
  publisher_name?: string | null;
  product_name?: string | null;
  file_version_min?: string | null;
  description?: string | null;
  created_at: string;
  created_by: string | null;
}

export interface WdacBaseline {
  id: string;
  policy_id: string;
  name: string;
  description: string | null;
  snapshot_data: unknown[];
  created_at: string;
  created_by: string | null;
}

// Fetch WDAC policies
export function useWdacPolicies() {
  const { currentOrganization } = useTenant();

  return useQuery({
    queryKey: ["wdac-policies", currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];
      
      const { data, error } = await supabase
        .from("wdac_policies")
        .select("*")
        .eq("organization_id", currentOrganization.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as WdacPolicy[];
    },
    enabled: !!currentOrganization?.id,
  });
}

// Fetch discovered applications
export function useWdacDiscoveredApps(policyId?: string) {
  const { currentOrganization } = useTenant();

  return useQuery({
    queryKey: ["wdac-discovered-apps", currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];
      
      const { data, error } = await supabase
        .from("wdac_discovered_apps")
        .select(`
          *,
          endpoints!inner(hostname)
        `)
        .eq("organization_id", currentOrganization.id)
        .order("last_seen_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      return data as WdacDiscoveredApp[];
    },
    enabled: !!currentOrganization?.id,
  });
}

// Fetch rules for a policy
export function useWdacRules(policyId: string | null) {
  return useQuery({
    queryKey: ["wdac-rules", policyId],
    queryFn: async () => {
      if (!policyId) return [];
      
      const { data, error } = await supabase
        .from("wdac_rules")
        .select("*")
        .eq("policy_id", policyId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as WdacRule[];
    },
    enabled: !!policyId,
  });
}

// Fetch baselines for a policy
export function useWdacBaselines(policyId: string | null) {
  return useQuery({
    queryKey: ["wdac-baselines", policyId],
    queryFn: async () => {
      if (!policyId) return [];
      
      const { data, error } = await supabase
        .from("wdac_baselines")
        .select("*")
        .eq("policy_id", policyId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as WdacBaseline[];
    },
    enabled: !!policyId,
  });
}

// Mutations
export function useWdacMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { currentOrganization } = useTenant();

  const createPolicy = useMutation({
    mutationFn: async (policy: Partial<WdacPolicy>) => {
      const { data, error } = await supabase
        .from("wdac_policies")
        .insert({
          organization_id: currentOrganization!.id,
          name: policy.name!,
          description: policy.description,
          mode: policy.mode || "audit",
          is_default: policy.is_default || false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["wdac-policies"] });
      logActivity(currentOrganization!.id, "create", "wdac_policy", data.id, {
        policy_name: data.name,
        mode: data.mode,
      });
      toast({ title: "WDAC policy created" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create policy", description: error.message, variant: "destructive" });
    },
  });

  const updatePolicy = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WdacPolicy> & { id: string }) => {
      const { data, error } = await supabase
        .from("wdac_policies")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["wdac-policies"] });
      logActivity(currentOrganization!.id, "update", "wdac_policy", data.id, {
        policy_name: data.name,
        mode: data.mode,
      });
      toast({ title: "WDAC policy updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update policy", description: error.message, variant: "destructive" });
    },
  });

  const deletePolicy = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("wdac_policies").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ["wdac-policies"] });
      logActivity(currentOrganization!.id, "delete", "wdac_policy", id);
      toast({ title: "WDAC policy deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete policy", description: error.message, variant: "destructive" });
    },
  });

  const createRule = useMutation({
    mutationFn: async (rule: Omit<WdacRule, "id" | "created_at" | "created_by">) => {
      const { data, error } = await supabase
        .from("wdac_rules")
        .insert(rule)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["wdac-rules", data.policy_id] });
      logActivity(currentOrganization!.id, "create", "wdac_rule", data.id, {
        rule_type: data.rule_type,
        action: data.action,
        value: data.value,
      });
      toast({ title: "Rule created" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create rule", description: error.message, variant: "destructive" });
    },
  });

  const deleteRule = useMutation({
    mutationFn: async ({ id, policyId }: { id: string; policyId: string }) => {
      const { error } = await supabase.from("wdac_rules").delete().eq("id", id);
      if (error) throw error;
      return { id, policyId };
    },
    onSuccess: ({ id, policyId }) => {
      queryClient.invalidateQueries({ queryKey: ["wdac-rules", policyId] });
      logActivity(currentOrganization!.id, "delete", "wdac_rule", id);
      toast({ title: "Rule deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete rule", description: error.message, variant: "destructive" });
    },
  });

  const createBaseline = useMutation({
    mutationFn: async (baseline: { policy_id: string; name: string; description?: string; snapshot_data: unknown[] }) => {
      const { data, error } = await supabase
        .from("wdac_baselines")
        .insert({ policy_id: baseline.policy_id, name: baseline.name, description: baseline.description, snapshot_data: baseline.snapshot_data as unknown as undefined })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["wdac-baselines", data.policy_id] });
      logActivity(currentOrganization!.id, "create", "wdac_baseline", data.id, {
        baseline_name: data.name,
      });
      toast({ title: "Baseline created", description: "Current application state has been captured" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create baseline", description: error.message, variant: "destructive" });
    },
  });

  return {
    createPolicy,
    updatePolicy,
    deletePolicy,
    createRule,
    deleteRule,
    createBaseline,
  };
}
