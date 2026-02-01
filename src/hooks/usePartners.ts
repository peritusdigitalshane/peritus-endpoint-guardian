import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/hooks/useActivityLogs";
import { useTenant } from "@/contexts/TenantContext";

interface Partner {
  id: string;
  name: string;
  slug: string;
  organization_type: string;
  created_at: string;
  updated_at: string;
}

interface PartnerWithStats extends Partner {
  customer_count: number;
  member_count: number;
}

interface Customer {
  id: string;
  name: string;
  slug: string;
  organization_type: string;
  parent_partner_id: string | null;
  created_at: string;
  endpoint_count?: number;
  network_module_enabled?: boolean;
}

// Fetch all partner organizations (super admin only)
export function usePartners() {
  return useQuery({
    queryKey: ["partners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("organization_type", "partner")
        .order("name");

      if (error) throw error;
      return data as Partner[];
    },
  });
}

// Fetch partners with customer counts (super admin only)
export function usePartnersWithStats() {
  return useQuery({
    queryKey: ["partners-with-stats"],
    queryFn: async () => {
      // Get all partner organizations
      const { data: partners, error: partnersError } = await supabase
        .from("organizations")
        .select("*")
        .eq("organization_type", "partner")
        .order("name");

      if (partnersError) throw partnersError;

      // Get customer counts per partner
      const { data: customers } = await supabase
        .from("organizations")
        .select("parent_partner_id")
        .eq("organization_type", "customer")
        .not("parent_partner_id", "is", null);

      // Get member counts per partner org
      const { data: members } = await supabase
        .from("organization_memberships")
        .select("organization_id");

      // Calculate counts
      const customerCounts = (customers || []).reduce((acc, c) => {
        if (c.parent_partner_id) {
          acc[c.parent_partner_id] = (acc[c.parent_partner_id] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      const memberCounts = (members || []).reduce((acc, m) => {
        acc[m.organization_id] = (acc[m.organization_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return (partners || []).map((p) => ({
        ...p,
        customer_count: customerCounts[p.id] || 0,
        member_count: memberCounts[p.id] || 0,
      })) as PartnerWithStats[];
    },
  });
}

// Create a new partner organization (super admin only)
export function useCreatePartner() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useTenant();

  return useMutation({
    mutationFn: async ({ name, slug }: { name: string; slug: string }) => {
      const { data, error } = await supabase
        .from("organizations")
        .insert({ 
          name, 
          slug, 
          organization_type: "partner" 
        })
        .select()
        .single();

      if (error) throw error;
      
      if (currentOrganization?.id) {
        await logActivity(currentOrganization.id, "create", "partner", data.id, { name, slug });
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partners"] });
      queryClient.invalidateQueries({ queryKey: ["partners-with-stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
}

// Fetch customers for a specific partner
export function usePartnerCustomers(partnerId: string | null) {
  return useQuery({
    queryKey: ["partner-customers", partnerId],
    enabled: !!partnerId,
    queryFn: async () => {
      if (!partnerId) return [];

      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("parent_partner_id", partnerId)
        .eq("organization_type", "customer")
        .order("name");

      if (error) throw error;

      // Get endpoint counts
      const { data: endpoints } = await supabase
        .from("endpoints")
        .select("organization_id");

      const endpointCounts = (endpoints || []).reduce((acc, e) => {
        acc[e.organization_id] = (acc[e.organization_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return (data || []).map((c) => ({
        ...c,
        endpoint_count: endpointCounts[c.id] || 0,
      })) as Customer[];
    },
  });
}

// Create a customer for a partner
export function useCreatePartnerCustomer() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useTenant();

  return useMutation({
    mutationFn: async ({ 
      name, 
      slug, 
      partnerId 
    }: { 
      name: string; 
      slug: string; 
      partnerId: string;
    }) => {
      const { data, error } = await supabase
        .from("organizations")
        .insert({ 
          name, 
          slug, 
          organization_type: "customer",
          parent_partner_id: partnerId
        })
        .select()
        .single();

      if (error) throw error;
      
      if (currentOrganization?.id) {
        await logActivity(currentOrganization.id, "create", "customer", data.id, { 
          name, 
          slug,
          partner_id: partnerId 
        });
      }
      
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["partner-customers", variables.partnerId] });
      queryClient.invalidateQueries({ queryKey: ["partners-with-stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
}

// Fetch all direct customers (no partner) - super admin only
export function useDirectCustomers() {
  return useQuery({
    queryKey: ["direct-customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("organization_type", "customer")
        .is("parent_partner_id", null)
        .order("name");

      if (error) throw error;

      // Get endpoint counts
      const { data: endpoints } = await supabase
        .from("endpoints")
        .select("organization_id");

      const endpointCounts = (endpoints || []).reduce((acc, e) => {
        acc[e.organization_id] = (acc[e.organization_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return (data || []).map((c) => ({
        ...c,
        endpoint_count: endpointCounts[c.id] || 0,
      })) as Customer[];
    },
  });
}

// Assign a direct customer to a partner
export function useAssignCustomerToPartner() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useTenant();

  return useMutation({
    mutationFn: async ({ 
      customerId, 
      partnerId 
    }: { 
      customerId: string; 
      partnerId: string | null;
    }) => {
      const { data, error } = await supabase
        .from("organizations")
        .update({ parent_partner_id: partnerId })
        .eq("id", customerId)
        .select()
        .single();

      if (error) throw error;
      
      if (currentOrganization?.id) {
        await logActivity(currentOrganization.id, "update", "customer_assignment", customerId, { 
          partner_id: partnerId 
        });
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partner-customers"] });
      queryClient.invalidateQueries({ queryKey: ["direct-customers"] });
      queryClient.invalidateQueries({ queryKey: ["partners-with-stats"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
}