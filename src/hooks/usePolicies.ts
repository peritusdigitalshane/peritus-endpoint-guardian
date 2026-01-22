import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Policy {
  id: string;
  name: string;
  description: string | null;
  organization_id: string;
  is_default: boolean;
  created_at: string;
}

export function usePolicies() {
  return useQuery({
    queryKey: ["policies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("defender_policies")
        .select("id, name, description, organization_id, is_default, created_at")
        .order("name");

      if (error) throw error;
      return data as Policy[];
    },
  });
}

export function useAssignPolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ endpointId, policyId }: { endpointId: string; policyId: string | null }) => {
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
