import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { DefenderPolicy } from "@/lib/defender-settings";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

export interface PolicyOption {
  id: string;
  name: string;
  organization_id: string;
  is_default: boolean;
}

export function usePolicyOptions() {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  return useQuery({
    queryKey: ["policy-options", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      let query = supabase
        .from("defender_policies")
        .select("id, name, organization_id, is_default")
        .order("name");

      if (orgId) {
        query = query.eq("organization_id", orgId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as PolicyOption[];
    },
  });
}

export function usePolicies() {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  return useQuery({
    queryKey: ["policies", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      let query = supabase
        .from("defender_policies")
        .select("*")
        .order("created_at", { ascending: false });

      if (orgId) {
        query = query.eq("organization_id", orgId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as DefenderPolicy[];
    },
  });
}

export function useCreatePolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orgId,
      userId,
      policy,
    }: {
      orgId: string;
      userId: string;
      policy: Partial<DefenderPolicy>;
    }) => {
      const insertData = {
        ...policy,
        organization_id: orgId,
        created_by: userId,
      };

      const { data, error } = await supabase
        .from("defender_policies")
        // supabase types in this project are strict; cast to allow partials + rely on DB defaults
        .insert(insertData as any)
        .select("*")
        .single();

      if (error) throw error;
      return data as DefenderPolicy;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policies"] });
      queryClient.invalidateQueries({ queryKey: ["policy-options"] });
    },
  });
}

export function useUpdatePolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<DefenderPolicy>;
    }) => {
      const { data, error } = await supabase
        .from("defender_policies")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw error;
      return data as DefenderPolicy;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policies"] });
      queryClient.invalidateQueries({ queryKey: ["policy-options"] });
    },
  });
}

export function useDeletePolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await supabase.from("defender_policies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policies"] });
      queryClient.invalidateQueries({ queryKey: ["policy-options"] });
    },
  });
}

export function useAssignPolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      endpointId,
      policyId,
    }: {
      endpointId: string;
      policyId: string | null;
    }) => {
      const { error } = await supabase
        .from("endpoints")
        .update({ policy_id: policyId })
        .eq("id", endpointId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["endpoints"] });
    },
  });
}
