import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Endpoint {
  id: string;
  hostname: string;
  os_version: string | null;
  os_build: string | null;
  defender_version: string | null;
  is_online: boolean;
  last_seen_at: string | null;
  created_at: string;
  organization_id: string;
  policy_id: string | null;
}

export interface EndpointThreat {
  id: string;
  endpoint_id: string;
  threat_id: string;
  threat_name: string;
  severity: string;
  status: string;
  category: string | null;
  initial_detection_time: string | null;
  last_threat_status_change_time: string | null;
  created_at: string;
  endpoints?: {
    hostname: string;
  };
}

export interface EndpointStatus {
  id: string;
  endpoint_id: string;
  realtime_protection_enabled: boolean | null;
  antivirus_enabled: boolean | null;
  antispyware_enabled: boolean | null;
  behavior_monitor_enabled: boolean | null;
  ioav_protection_enabled: boolean | null;
  antivirus_signature_age: number | null;
  collected_at: string;
}

export function useEndpoints() {
  return useQuery({
    queryKey: ["endpoints"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("endpoints")
        .select("*")
        .order("last_seen_at", { ascending: false });

      if (error) throw error;
      return data as Endpoint[];
    },
  });
}

export function useEndpointThreats() {
  return useQuery({
    queryKey: ["endpoint_threats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("endpoint_threats")
        .select(`
          *,
          endpoints(hostname)
        `)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as EndpointThreat[];
    },
  });
}

export function useLatestEndpointStatuses() {
  return useQuery({
    queryKey: ["endpoint_statuses"],
    queryFn: async () => {
      // Get the latest status for each endpoint
      const { data, error } = await supabase
        .from("endpoint_status")
        .select("*")
        .order("collected_at", { ascending: false });

      if (error) throw error;
      
      // Group by endpoint_id and take the latest
      const latestByEndpoint = new Map<string, EndpointStatus>();
      for (const status of data || []) {
        if (!latestByEndpoint.has(status.endpoint_id)) {
          latestByEndpoint.set(status.endpoint_id, status as EndpointStatus);
        }
      }
      
      return Array.from(latestByEndpoint.values());
    },
  });
}

export function useDashboardStats() {
  const { data: endpoints, isLoading: endpointsLoading } = useEndpoints();
  const { data: threats, isLoading: threatsLoading } = useEndpointThreats();
  const { data: statuses, isLoading: statusesLoading } = useLatestEndpointStatuses();

  const isLoading = endpointsLoading || threatsLoading || statusesLoading;

  const totalEndpoints = endpoints?.length || 0;
  
  // Count endpoints with realtime protection enabled
  const protectedCount = statuses?.filter(s => s.realtime_protection_enabled === true).length || 0;
  
  // Count active threats (not resolved)
  const activeThreats = threats?.filter(t => 
    t.status.toLowerCase() !== "resolved" && 
    t.status.toLowerCase() !== "removed"
  ).length || 0;
  
  // Calculate compliance (endpoints with up-to-date signatures - less than 1 day old)
  const compliantEndpoints = statuses?.filter(s => 
    s.antivirus_signature_age !== null && s.antivirus_signature_age <= 1
  ).length || 0;
  const compliancePercentage = totalEndpoints > 0 
    ? Math.round((compliantEndpoints / totalEndpoints) * 100) 
    : 0;

  // Calculate security score based on multiple factors
  const calculateSecurityScore = () => {
    if (totalEndpoints === 0) return 0;
    
    let score = 100;
    
    // Deduct for unprotected endpoints
    const unprotectedRatio = 1 - (protectedCount / totalEndpoints);
    score -= unprotectedRatio * 30;
    
    // Deduct for active threats
    score -= Math.min(activeThreats * 10, 30);
    
    // Deduct for non-compliance
    const nonCompliantRatio = 1 - (compliantEndpoints / Math.max(statuses?.length || 1, 1));
    score -= nonCompliantRatio * 20;
    
    return Math.max(0, Math.round(score));
  };

  return {
    isLoading,
    totalEndpoints,
    protectedCount,
    activeThreats,
    compliancePercentage,
    securityScore: calculateSecurityScore(),
    endpoints: endpoints || [],
    threats: threats || [],
    statuses: statuses || [],
  };
}
