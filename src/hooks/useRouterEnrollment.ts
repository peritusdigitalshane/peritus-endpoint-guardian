import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";

export interface RouterEnrollmentToken {
  id: string;
  organization_id: string;
  token: string;
  label: string;
  is_active: boolean;
  max_uses: number | null;
  use_count: number;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
}

export function useRouterEnrollmentTokens() {
  const { currentOrganization } = useTenant();
  return useQuery({
    queryKey: ["router-enrollment-tokens", currentOrganization?.id],
    enabled: !!currentOrganization?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("router_enrollment_tokens")
        .select("*")
        .eq("organization_id", currentOrganization!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as RouterEnrollmentToken[];
    },
  });
}

export function useCreateRouterEnrollmentToken() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useTenant();
  return useMutation({
    mutationFn: async (params: { label: string; max_uses?: number; expires_at?: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("router_enrollment_tokens")
        .insert({
          organization_id: currentOrganization!.id,
          label: params.label,
          max_uses: params.max_uses || null,
          expires_at: params.expires_at || null,
          created_by: userData.user?.id || null,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as RouterEnrollmentToken;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["router-enrollment-tokens"] });
      toast.success("Enrollment token created");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteRouterEnrollmentToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("router_enrollment_tokens").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["router-enrollment-tokens"] });
      toast.success("Token deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });
}
