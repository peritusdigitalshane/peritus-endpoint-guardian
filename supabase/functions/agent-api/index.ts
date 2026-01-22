import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-agent-token",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const SUPABASE_URL = "https://njdcyjxgtckgtzgzoctw.supabase.co";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.replace("/agent-api", "");

    // Route: POST /register - Register a new endpoint
    if (path === "/register" && req.method === "POST") {
      return await handleRegister(req);
    }

    // Route: POST /heartbeat - Send status update
    if (path === "/heartbeat" && req.method === "POST") {
      return await handleHeartbeat(req);
    }

    // Route: POST /threats - Report threats
    if (path === "/threats" && req.method === "POST") {
      return await handleThreats(req);
    }

    // Route: POST /logs - Report event logs
    if (path === "/logs" && req.method === "POST") {
      return await handleLogs(req);
    }

    // Route: GET /policy - Get assigned policy
    if (path === "/policy" && req.method === "GET") {
      return await handleGetPolicy(req);
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Agent API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Generate a secure token for the agent
function generateAgentToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

// Validate agent token and return endpoint
async function validateAgentToken(req: Request) {
  const token = req.headers.get("x-agent-token");
  if (!token) {
    throw new Error("Missing agent token");
  }

  const { data: endpoint, error } = await supabase
    .from("endpoints")
    .select("*")
    .eq("agent_token", token)
    .maybeSingle();

  if (error || !endpoint) {
    throw new Error("Invalid agent token");
  }

  return endpoint;
}

// POST /register - Register a new endpoint
async function handleRegister(req: Request) {
  const body = await req.json();
  const { organization_token, hostname, os_version, os_build, defender_version } = body;

  if (!organization_token || !hostname) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Validate organization token (for now, use org ID directly - in production, use a secure token)
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("id")
    .eq("id", organization_token)
    .maybeSingle();

  if (orgError || !org) {
    return new Response(JSON.stringify({ error: "Invalid organization" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Generate unique agent token
  const agentToken = generateAgentToken();

  // Check if endpoint already exists by hostname in this org
  const { data: existing } = await supabase
    .from("endpoints")
    .select("id, agent_token")
    .eq("organization_id", org.id)
    .eq("hostname", hostname)
    .maybeSingle();

  if (existing) {
    // Update existing endpoint
    const { error: updateError } = await supabase
      .from("endpoints")
      .update({
        os_version,
        os_build,
        defender_version,
        last_seen_at: new Date().toISOString(),
        is_online: true,
      })
      .eq("id", existing.id);

    if (updateError) throw updateError;

    // Log the re-registration
    await supabase.from("endpoint_logs").insert({
      endpoint_id: existing.id,
      log_type: "agent",
      message: "Agent re-registered",
      details: { os_version, os_build, defender_version },
    });

    return new Response(
      JSON.stringify({
        success: true,
        endpoint_id: existing.id,
        agent_token: existing.agent_token,
        message: "Endpoint re-registered",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Create new endpoint
  const { data: endpoint, error: insertError } = await supabase
    .from("endpoints")
    .insert({
      organization_id: org.id,
      agent_token: agentToken,
      hostname,
      os_version,
      os_build,
      defender_version,
      last_seen_at: new Date().toISOString(),
      is_online: true,
    })
    .select()
    .single();

  if (insertError) throw insertError;

  // Log the registration
  await supabase.from("endpoint_logs").insert({
    endpoint_id: endpoint.id,
    log_type: "agent",
    message: "Agent registered successfully",
    details: { os_version, os_build, defender_version },
  });

  return new Response(
    JSON.stringify({
      success: true,
      endpoint_id: endpoint.id,
      agent_token: agentToken,
      message: "Endpoint registered successfully",
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// POST /heartbeat - Receive status update from agent
async function handleHeartbeat(req: Request) {
  const endpoint = await validateAgentToken(req);
  const body = await req.json();

  // Update endpoint last seen
  await supabase
    .from("endpoints")
    .update({
      last_seen_at: new Date().toISOString(),
      is_online: true,
      defender_version: body.defender_version || endpoint.defender_version,
    })
    .eq("id", endpoint.id);

  // Insert status record
  const statusData = {
    endpoint_id: endpoint.id,
    realtime_protection_enabled: body.realtime_protection_enabled,
    antivirus_enabled: body.antivirus_enabled,
    antispyware_enabled: body.antispyware_enabled,
    behavior_monitor_enabled: body.behavior_monitor_enabled,
    ioav_protection_enabled: body.ioav_protection_enabled,
    on_access_protection_enabled: body.on_access_protection_enabled,
    full_scan_age: body.full_scan_age,
    quick_scan_age: body.quick_scan_age,
    full_scan_end_time: body.full_scan_end_time,
    quick_scan_end_time: body.quick_scan_end_time,
    antivirus_signature_age: body.antivirus_signature_age,
    antispyware_signature_age: body.antispyware_signature_age,
    antivirus_signature_version: body.antivirus_signature_version,
    nis_signature_version: body.nis_signature_version,
    nis_enabled: body.nis_enabled,
    tamper_protection_source: body.tamper_protection_source,
    computer_state: body.computer_state,
    am_running_mode: body.am_running_mode,
    raw_status: body.raw_status,
  };

  const { error: statusError } = await supabase.from("endpoint_status").insert(statusData);

  if (statusError) {
    console.error("Error inserting status:", statusError);
  }

  return new Response(
    JSON.stringify({ success: true, message: "Heartbeat received" }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// POST /threats - Report threats from agent
async function handleThreats(req: Request) {
  const endpoint = await validateAgentToken(req);
  const body = await req.json();
  const { threats } = body;

  if (!Array.isArray(threats)) {
    return new Response(JSON.stringify({ error: "Invalid threats format" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  for (const threat of threats) {
    // Check if threat already exists
    const { data: existing } = await supabase
      .from("endpoint_threats")
      .select("id")
      .eq("endpoint_id", endpoint.id)
      .eq("threat_id", threat.threat_id)
      .maybeSingle();

    if (existing) {
      // Update existing threat
      await supabase
        .from("endpoint_threats")
        .update({
          status: threat.status,
          last_threat_status_change_time: threat.last_threat_status_change_time,
          raw_data: threat.raw_data,
        })
        .eq("id", existing.id);
    } else {
      // Insert new threat
      await supabase.from("endpoint_threats").insert({
        endpoint_id: endpoint.id,
        threat_id: threat.threat_id,
        threat_name: threat.threat_name,
        severity: threat.severity || "Unknown",
        category: threat.category,
        status: threat.status || "Active",
        initial_detection_time: threat.initial_detection_time,
        last_threat_status_change_time: threat.last_threat_status_change_time,
        resources: threat.resources,
        raw_data: threat.raw_data,
      });

      // Log the new threat
      await supabase.from("endpoint_logs").insert({
        endpoint_id: endpoint.id,
        log_type: "threat",
        message: `Threat detected: ${threat.threat_name}`,
        details: { threat_id: threat.threat_id, severity: threat.severity },
      });
    }
  }

  return new Response(
    JSON.stringify({ success: true, message: `Processed ${threats.length} threats` }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// POST /logs - Receive event logs from agent
async function handleLogs(req: Request) {
  const endpoint = await validateAgentToken(req);
  const body = await req.json();
  const { logs } = body;

  if (!Array.isArray(logs) || logs.length === 0) {
    return new Response(
      JSON.stringify({ success: true, message: "No logs to process" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Insert logs in batch - map to actual table schema
  const logsToInsert = logs.map((log: {
    event_id: number;
    event_source: string;
    level: string;
    message: string;
    event_time: string;
    details?: {
      provider?: string;
      task?: string;
      keywords?: string;
      computer?: string;
      user?: string;
      record_id?: number;
    };
  }) => ({
    endpoint_id: endpoint.id,
    event_id: log.event_id,
    log_source: log.event_source,
    level: log.level,
    message: log.message,
    event_time: log.event_time,
    provider_name: log.details?.provider || null,
    task_category: log.details?.task || null,
    raw_data: log.details || null,
  }));

  const { error: insertError } = await supabase
    .from("endpoint_event_logs")
    .insert(logsToInsert);

  if (insertError) {
    console.error("Error inserting logs:", insertError);
    return new Response(
      JSON.stringify({ success: false, error: "Failed to store logs" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ success: true, message: `Processed ${logs.length} logs` }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// GET /policy - Get assigned policy for endpoint
async function handleGetPolicy(req: Request) {
  const endpoint = await validateAgentToken(req);

  if (!endpoint.policy_id) {
    return new Response(
      JSON.stringify({ success: true, policy: null, message: "No policy assigned" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { data: policy, error } = await supabase
    .from("defender_policies")
    .select("*")
    .eq("id", endpoint.policy_id)
    .single();

  if (error) throw error;

  return new Response(
    JSON.stringify({ success: true, policy }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
