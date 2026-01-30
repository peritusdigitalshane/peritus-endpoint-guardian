import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = "https://njdcyjxgtckgtzgzoctw.supabase.co";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Data retention cleanup function
 * 
 * This function cleans up old data from high-volume tables to reduce disk IO:
 * 1. endpoint_status - Keep only records from last 24 hours (plus latest per endpoint)
 * 2. endpoint_event_logs - Honor per-org retention settings
 * 3. endpoint_logs - Keep only last 7 days of agent logs
 * 
 * Can be called via cron job or manually.
 */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const results = {
      endpoint_status_deleted: 0,
      endpoint_event_logs_deleted: 0,
      endpoint_logs_deleted: 0,
      errors: [] as string[],
    };

    // 1. Clean up old endpoint_status records
    // Keep last 24 hours of status records, but always keep at least the latest per endpoint
    try {
      // First, get the IDs of the latest status record per endpoint (to preserve)
      const { data: latestRecords } = await supabase
        .from("endpoint_status")
        .select("id, endpoint_id, collected_at")
        .order("endpoint_id")
        .order("collected_at", { ascending: false });

      // Get unique latest IDs per endpoint
      const latestPerEndpoint = new Map<string, string>();
      for (const record of latestRecords || []) {
        if (!latestPerEndpoint.has(record.endpoint_id)) {
          latestPerEndpoint.set(record.endpoint_id, record.id);
        }
      }
      const preserveIds = Array.from(latestPerEndpoint.values());

      // Delete old records (older than 24 hours) except the latest per endpoint
      const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data: toDelete } = await supabase
        .from("endpoint_status")
        .select("id")
        .lt("collected_at", cutoffTime)
        .not("id", "in", `(${preserveIds.join(",")})`);

      if (toDelete && toDelete.length > 0) {
        const deleteIds = toDelete.map((r) => r.id);
        // Delete in batches of 500 to avoid timeout
        for (let i = 0; i < deleteIds.length; i += 500) {
          const batch = deleteIds.slice(i, i + 500);
          const { error } = await supabase
            .from("endpoint_status")
            .delete()
            .in("id", batch);
          
          if (error) {
            results.errors.push(`endpoint_status batch delete error: ${error.message}`);
          } else {
            results.endpoint_status_deleted += batch.length;
          }
        }
      }
    } catch (e) {
      results.errors.push(`endpoint_status cleanup error: ${e}`);
    }

    // 2. Clean up old endpoint_event_logs based on per-org retention settings
    try {
      // Get all organizations with their retention settings
      const { data: orgs } = await supabase
        .from("organizations")
        .select("id, event_log_retention_days");

      for (const org of orgs || []) {
        const retentionDays = org.event_log_retention_days || 30;
        const cutoffTime = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();

        // Get endpoint IDs for this org
        const { data: endpoints } = await supabase
          .from("endpoints")
          .select("id")
          .eq("organization_id", org.id);

        if (!endpoints || endpoints.length === 0) continue;

        const endpointIds = endpoints.map((e) => e.id);

        // Delete old event logs for these endpoints
        const { data: toDelete } = await supabase
          .from("endpoint_event_logs")
          .select("id")
          .in("endpoint_id", endpointIds)
          .lt("event_time", cutoffTime)
          .limit(1000);

        if (toDelete && toDelete.length > 0) {
          const deleteIds = toDelete.map((r) => r.id);
          const { error } = await supabase
            .from("endpoint_event_logs")
            .delete()
            .in("id", deleteIds);

          if (error) {
            results.errors.push(`endpoint_event_logs delete error for org ${org.id}: ${error.message}`);
          } else {
            results.endpoint_event_logs_deleted += deleteIds.length;
          }
        }
      }
    } catch (e) {
      results.errors.push(`endpoint_event_logs cleanup error: ${e}`);
    }

    // 3. Clean up old endpoint_logs (agent operational logs) - keep 7 days
    try {
      const cutoffTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      
      const { data: toDelete } = await supabase
        .from("endpoint_logs")
        .select("id")
        .lt("created_at", cutoffTime)
        .limit(1000);

      if (toDelete && toDelete.length > 0) {
        const deleteIds = toDelete.map((r) => r.id);
        const { error } = await supabase
          .from("endpoint_logs")
          .delete()
          .in("id", deleteIds);

        if (error) {
          results.errors.push(`endpoint_logs delete error: ${error.message}`);
        } else {
          results.endpoint_logs_deleted += deleteIds.length;
        }
      }
    } catch (e) {
      results.errors.push(`endpoint_logs cleanup error: ${e}`);
    }

    console.log("Cleanup completed:", results);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Data cleanup completed",
        ...results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Cleanup error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

