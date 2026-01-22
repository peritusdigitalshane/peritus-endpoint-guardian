import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export interface ActivityLog {
  id: string;
  organization_id: string;
  user_id: string | null;
  endpoint_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: Json | null;
  ip_address: string | null;
  created_at: string;
  profiles?: { display_name: string | null; email: string } | null;
  endpoints?: { hostname: string } | null;
}

export function useActivityLogs() {
  return useQuery({
    queryKey: ["activity-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_logs")
        .select(`
          *,
          profiles:user_id(display_name, email),
          endpoints:endpoint_id(hostname)
        `)
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      return data as ActivityLog[];
    },
  });
}

export async function logActivity(
  orgId: string,
  action: string,
  resourceType: string,
  resourceId?: string,
  details?: Json,
  endpointId?: string
) {
  const { error } = await supabase.rpc("log_activity", {
    _org_id: orgId,
    _action: action,
    _resource_type: resourceType,
    _resource_id: resourceId || null,
    _details: details || null,
    _endpoint_id: endpointId || null,
  });

  if (error) {
    console.error("Failed to log activity:", error);
  }
}
