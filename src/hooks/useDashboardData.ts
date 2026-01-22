import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

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
  defender_policies?: {
    id: string;
    name: string;
  } | null;
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
    organization_id: string;
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
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  return useQuery({
    queryKey: ["endpoints", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      let query = supabase
        .from("endpoints")
        .select(`
          *,
          defender_policies(id, name)
        `)
        .order("last_seen_at", { ascending: false });

      if (orgId) {
        query = query.eq("organization_id", orgId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Endpoint[];
    },
    refetchInterval: 30000,
    staleTime: 10000,
  });
}

export function useEndpointThreats() {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  return useQuery({
    queryKey: ["endpoint_threats", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      // First get endpoints for current org
      const { data: endpoints } = await supabase
        .from("endpoints")
        .select("id")
        .eq("organization_id", orgId!);

      const endpointIds = endpoints?.map(e => e.id) || [];
      
      if (endpointIds.length === 0) return [];

      const { data, error } = await supabase
        .from("endpoint_threats")
        .select(`
          *,
          endpoints(hostname, organization_id)
        `)
        .in("endpoint_id", endpointIds)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as EndpointThreat[];
    },
    refetchInterval: 30000,
    staleTime: 10000,
  });
}

export function useLatestEndpointStatuses() {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  return useQuery({
    queryKey: ["endpoint_statuses", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      // First get endpoints for current org
      const { data: endpoints } = await supabase
        .from("endpoints")
        .select("id")
        .eq("organization_id", orgId!);

      const endpointIds = endpoints?.map(e => e.id) || [];
      
      if (endpointIds.length === 0) return [];

      // Get the latest status for each endpoint
      const { data, error } = await supabase
        .from("endpoint_status")
        .select("*")
        .in("endpoint_id", endpointIds)
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
    refetchInterval: 30000,
    staleTime: 10000,
  });
}

export interface SecurityRecommendation {
  id: string;
  title: string;
  description: string;
  impact: number; // Points gained if fixed
  severity: "critical" | "high" | "medium" | "low";
  affectedCount: number;
  action: string;
}

export function useDashboardStats() {
  const { data: endpoints, isLoading: endpointsLoading } = useEndpoints();
  const { data: threats, isLoading: threatsLoading } = useEndpointThreats();
  const { data: statuses, isLoading: statusesLoading } = useLatestEndpointStatuses();

  const isLoading = endpointsLoading || threatsLoading || statusesLoading;

  const totalEndpoints = endpoints?.length || 0;
  
  // Count endpoints with realtime protection enabled
  const protectedCount = statuses?.filter(s => s.realtime_protection_enabled === true).length || 0;
  
  // Count active threats (not resolved/blocked/removed)
  const resolvedStatuses = ["resolved", "removed", "blocked"];
  const activeThreats = threats?.filter(t => 
    !resolvedStatuses.includes(t.status.toLowerCase())
  ).length || 0;
  
  // Calculate compliance (endpoints with up-to-date signatures - less than 1 day old)
  const compliantEndpoints = statuses?.filter(s => 
    s.antivirus_signature_age !== null && s.antivirus_signature_age <= 1
  ).length || 0;
  const compliancePercentage = totalEndpoints > 0 
    ? Math.round((compliantEndpoints / totalEndpoints) * 100) 
    : 0;

  // Detailed status checks for recommendations
  const unprotectedEndpoints = statuses?.filter(s => s.realtime_protection_enabled !== true) || [];
  const outdatedSignatures = statuses?.filter(s => s.antivirus_signature_age !== null && s.antivirus_signature_age > 1) || [];
  const antivirusDisabled = statuses?.filter(s => s.antivirus_enabled !== true) || [];
  const behaviorMonitorDisabled = statuses?.filter(s => s.behavior_monitor_enabled !== true) || [];
  const ioavDisabled = statuses?.filter(s => s.ioav_protection_enabled !== true) || [];
  const endpointsWithoutPolicy = endpoints?.filter(e => !e.policy_id) || [];
  const offlineEndpoints = endpoints?.filter(e => !e.is_online) || [];

  // Generate recommendations
  const generateRecommendations = (): SecurityRecommendation[] => {
    const recommendations: SecurityRecommendation[] = [];

    if (activeThreats > 0) {
      recommendations.push({
        id: "active-threats",
        title: "Resolve Active Threats",
        description: `${activeThreats} active threat${activeThreats > 1 ? "s" : ""} detected across your fleet`,
        impact: Math.min(activeThreats * 10, 30),
        severity: "critical",
        affectedCount: activeThreats,
        action: "Review and remediate threats in the Threats page",
      });
    }

    if (unprotectedEndpoints.length > 0) {
      recommendations.push({
        id: "realtime-protection",
        title: "Enable Real-time Protection",
        description: "Endpoints without real-time protection are vulnerable to malware",
        impact: Math.round((unprotectedEndpoints.length / Math.max(totalEndpoints, 1)) * 30),
        severity: "critical",
        affectedCount: unprotectedEndpoints.length,
        action: "Apply a policy with real-time monitoring enabled",
      });
    }

    if (antivirusDisabled.length > 0) {
      recommendations.push({
        id: "antivirus-disabled",
        title: "Enable Antivirus Protection",
        description: "Endpoints with disabled antivirus are at high risk",
        impact: Math.round((antivirusDisabled.length / Math.max(totalEndpoints, 1)) * 25),
        severity: "critical",
        affectedCount: antivirusDisabled.length,
        action: "Ensure antivirus is enabled in the applied policy",
      });
    }

    if (outdatedSignatures.length > 0) {
      recommendations.push({
        id: "outdated-signatures",
        title: "Update Virus Definitions",
        description: "Outdated signatures miss new threats - should be updated daily",
        impact: Math.round((outdatedSignatures.length / Math.max(totalEndpoints, 1)) * 20),
        severity: "high",
        affectedCount: outdatedSignatures.length,
        action: "Run Update-MpSignature or reduce signature update interval in policy",
      });
    }

    if (endpointsWithoutPolicy.length > 0) {
      recommendations.push({
        id: "no-policy",
        title: "Assign Security Policies",
        description: "Endpoints without policies use default Windows settings",
        impact: Math.round((endpointsWithoutPolicy.length / Math.max(totalEndpoints, 1)) * 15),
        severity: "high",
        affectedCount: endpointsWithoutPolicy.length,
        action: "Assign a policy to unmanaged endpoints in the Endpoints page",
      });
    }

    if (behaviorMonitorDisabled.length > 0) {
      recommendations.push({
        id: "behavior-monitor",
        title: "Enable Behavior Monitoring",
        description: "Behavior monitoring detects suspicious activity patterns",
        impact: Math.round((behaviorMonitorDisabled.length / Math.max(totalEndpoints, 1)) * 10),
        severity: "medium",
        affectedCount: behaviorMonitorDisabled.length,
        action: "Enable behavior monitoring in the applied policy",
      });
    }

    if (ioavDisabled.length > 0) {
      recommendations.push({
        id: "ioav-protection",
        title: "Enable Download Protection",
        description: "IOAV scans files downloaded from the internet",
        impact: Math.round((ioavDisabled.length / Math.max(totalEndpoints, 1)) * 10),
        severity: "medium",
        affectedCount: ioavDisabled.length,
        action: "Enable IOAV protection in the applied policy",
      });
    }

    if (offlineEndpoints.length > 0 && totalEndpoints > 0) {
      recommendations.push({
        id: "offline-endpoints",
        title: "Reconnect Offline Endpoints",
        description: "Offline endpoints may not receive policy updates or report threats",
        impact: 5,
        severity: "low",
        affectedCount: offlineEndpoints.length,
        action: "Verify agent is running on offline endpoints",
      });
    }

    // Sort by impact (highest first)
    return recommendations.sort((a, b) => b.impact - a.impact);
  };

  // Calculate security score based on the same factors as the compliance chart
  const calculateSecurityScore = () => {
    if (totalEndpoints === 0 || !statuses || statuses.length === 0) return 0;
    
    const statusCount = statuses.length;
    
    // Calculate individual compliance percentages (matching ComplianceChart)
    const realtimeCompliance = (statuses.filter(s => s.realtime_protection_enabled === true).length / statusCount) * 100;
    const antivirusCompliance = (statuses.filter(s => s.antivirus_enabled === true).length / statusCount) * 100;
    const signatureCompliance = (statuses.filter(s => s.antivirus_signature_age !== null && s.antivirus_signature_age <= 1).length / statusCount) * 100;
    const behaviorCompliance = (statuses.filter(s => s.behavior_monitor_enabled === true).length / statusCount) * 100;
    const ioavCompliance = (statuses.filter(s => s.ioav_protection_enabled === true).length / statusCount) * 100;
    const policyCompliance = (endpoints?.filter(e => e.policy_id !== null).length || 0) / totalEndpoints * 100;
    
    // Weighted average matching the compliance chart categories
    // Higher weights for critical protections
    const weights = {
      realtime: 25,
      antivirus: 20,
      signature: 20,
      behavior: 15,
      ioav: 10,
      policy: 10,
    };
    
    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
    
    let score = (
      (realtimeCompliance * weights.realtime) +
      (antivirusCompliance * weights.antivirus) +
      (signatureCompliance * weights.signature) +
      (behaviorCompliance * weights.behavior) +
      (ioavCompliance * weights.ioav) +
      (policyCompliance * weights.policy)
    ) / totalWeight;
    
    // Deduct for active threats (up to 20 points)
    score -= Math.min(activeThreats * 5, 20);
    
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
    recommendations: generateRecommendations(),
  };
}
