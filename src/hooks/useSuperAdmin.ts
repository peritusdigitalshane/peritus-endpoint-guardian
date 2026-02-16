import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/hooks/useActivityLogs";
import { useTenant } from "@/contexts/TenantContext";

interface Organization {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
  event_log_retention_days: number;
  network_module_enabled: boolean;
  router_module_enabled: boolean;
}

interface OrganizationWithStats extends Organization {
  endpoint_count: number;
  member_count: number;
}

export function useAllOrganizations() {
  return useQuery({
    queryKey: ["admin-organizations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as Organization[];
    },
  });
}

export function useOrganizationsWithStats() {
  return useQuery({
    queryKey: ["admin-organizations-with-stats"],
    queryFn: async () => {
      // Get all organizations
      const { data: orgs, error: orgsError } = await supabase
        .from("organizations")
        .select("*")
        .order("name");

      if (orgsError) throw orgsError;

      // Get endpoint counts per org
      const { data: endpoints } = await supabase
        .from("endpoints")
        .select("organization_id");

      // Get member counts per org
      const { data: members } = await supabase
        .from("organization_memberships")
        .select("organization_id");

      // Calculate counts
      const endpointCounts = (endpoints || []).reduce((acc, e) => {
        acc[e.organization_id] = (acc[e.organization_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const memberCounts = (members || []).reduce((acc, m) => {
        acc[m.organization_id] = (acc[m.organization_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return (orgs || []).map((org) => ({
        ...org,
        endpoint_count: endpointCounts[org.id] || 0,
        member_count: memberCounts[org.id] || 0,
      })) as OrganizationWithStats[];
    },
  });
}

export function useCreateOrganization() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useTenant();

  return useMutation({
    mutationFn: async ({ name, slug }: { name: string; slug: string }) => {
      const { data, error } = await supabase
        .from("organizations")
        .insert({ name, slug })
        .select()
        .single();

      if (error) throw error;
      
      // Log activity
      if (currentOrganization?.id) {
        await logActivity(currentOrganization.id, "create", "organization", data.id, { name, slug });
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
      queryClient.invalidateQueries({ queryKey: ["admin-organizations-with-stats"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name, slug }: { id: string; name: string; slug: string }) => {
      const { data, error } = await supabase
        .from("organizations")
        .update({ name, slug })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
      queryClient.invalidateQueries({ queryKey: ["admin-organizations-with-stats"] });
    },
  });
}

export function useUpdateOrganizationRetention() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useTenant();

  return useMutation({
    mutationFn: async ({ id, retentionDays }: { id: string; retentionDays: number }) => {
      const { data, error } = await supabase
        .from("organizations")
        .update({ event_log_retention_days: retentionDays })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      
      // Log activity
      if (currentOrganization?.id) {
        await logActivity(currentOrganization.id, "update", "organization_retention", id, { 
          retention_days: retentionDays 
        });
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
      queryClient.invalidateQueries({ queryKey: ["admin-organizations-with-stats"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
}

export function useUpdateOrganizationNetworkModule() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useTenant();

  return useMutation({
    mutationFn: async ({ id, networkModuleEnabled }: { id: string; networkModuleEnabled: boolean }) => {
      const { data, error } = await supabase
        .from("organizations")
        .update({ network_module_enabled: networkModuleEnabled })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      
      // Log activity
      if (currentOrganization?.id) {
        await logActivity(currentOrganization.id, "update", "organization_network_module", id, { 
          network_module_enabled: networkModuleEnabled 
        });
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
      queryClient.invalidateQueries({ queryKey: ["admin-organizations-with-stats"] });
      queryClient.invalidateQueries({ queryKey: ["direct-customers"] });
      queryClient.invalidateQueries({ queryKey: ["partner-customers"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
}

export function useUpdateOrganizationRouterModule() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useTenant();

  return useMutation({
    mutationFn: async ({ id, routerModuleEnabled }: { id: string; routerModuleEnabled: boolean }) => {
      const { data, error } = await supabase
        .from("organizations")
        .update({ router_module_enabled: routerModuleEnabled } as any)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      
      if (currentOrganization?.id) {
        await logActivity(currentOrganization.id, "update", "organization_router_module", id, { 
          router_module_enabled: routerModuleEnabled 
        });
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
      queryClient.invalidateQueries({ queryKey: ["admin-organizations-with-stats"] });
      queryClient.invalidateQueries({ queryKey: ["direct-customers"] });
      queryClient.invalidateQueries({ queryKey: ["partner-customers"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
}

export function useOrganizationMembers(orgId: string | null) {
  return useQuery({
    queryKey: ["admin-org-members", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      if (!orgId) return [];

      const { data, error } = await supabase
        .from("organization_memberships")
        .select(`
          id,
          role,
          created_at,
          user_id,
          profiles!inner(id, email, display_name, avatar_url)
        `)
        .eq("organization_id", orgId);

      if (error) throw error;
      return data;
    },
  });
}

export function useOrganizationEndpoints(orgId: string | null) {
  return useQuery({
    queryKey: ["admin-org-endpoints", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      if (!orgId) return [];

      const { data, error } = await supabase
        .from("endpoints")
        .select("*")
        .eq("organization_id", orgId)
        .order("hostname");

      if (error) throw error;
      return data;
    },
  });
}

export function useOrganizationPolicies(orgId: string | null) {
  return useQuery({
    queryKey: ["admin-org-policies", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      if (!orgId) return [];

      const { data, error } = await supabase
        .from("defender_policies")
        .select("*")
        .eq("organization_id", orgId)
        .order("name");

      if (error) throw error;
      return data;
    },
  });
}
