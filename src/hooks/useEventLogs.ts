import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface EndpointEventLog {
  id: string;
  endpoint_id: string;
  event_id: number;
  log_source: string;
  level: string;
  message: string;
  event_time: string;
  provider_name: string | null;
  task_category: string | null;
  raw_data: Record<string, unknown> | null;
  created_at: string;
  endpoints?: {
    hostname: string;
  };
}

export function useEventLogs(limit = 100) {
  return useQuery({
    queryKey: ["event-logs", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("endpoint_event_logs")
        .select(`
          *,
          endpoints(hostname)
        `)
        .order("event_time", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data ?? []) as EndpointEventLog[];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}
