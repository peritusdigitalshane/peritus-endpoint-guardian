import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Version for deployment verification - bump to trigger agent updates
const VERSION = "v2.13.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-agent-token",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const SUPABASE_URL = "https://njdcyjxgtckgtzgzoctw.supabase.co";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Rate limiting for chatty endpoints - prevents duplicate submissions within window
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_MS = 10000; // 10 seconds minimum between heartbeats per endpoint

function checkRateLimit(endpointId: string, action: string): boolean {
  const key = `${endpointId}:${action}`;
  const now = Date.now();
  const lastRequest = rateLimitMap.get(key) || 0;
  if (now - lastRequest < RATE_LIMIT_MS) {
    return false; // Rate limited
  }
  rateLimitMap.set(key, now);
  // Clean up old entries periodically (keep map from growing indefinitely)
  if (rateLimitMap.size > 1000) {
    const cutoff = now - RATE_LIMIT_MS * 2;
    for (const [k, v] of rateLimitMap.entries()) {
      if (v < cutoff) rateLimitMap.delete(k);
    }
  }
  return true;
}

type ParsedThreatFromEventLog = {
  threat_id: string;
  threat_name: string;
  severity: string;
  category: string | null;
  status: string;
  initial_detection_time: string | null;
  last_threat_status_change_time: string | null;
  resources: unknown | null;
  raw_data: unknown;
};

// Map Windows Defender severity IDs to human-readable values
// https://learn.microsoft.com/en-us/windows/client-management/mdm/defender-csp
function mapSeverityFromMessage(msg: string, threatName: string): string {
  // Try to extract severity from message first
  const severityMatch = msg.match(/^\s*Severity:\s*(.+)$/mi)?.[1]?.trim();
  if (severityMatch && severityMatch.toLowerCase() !== "unknown") {
    return severityMatch;
  }
  
  // Map severity ID if present (Defender uses 1=Low, 2=Moderate, 4=High, 5=Severe)
  const severityIdMatch = msg.match(/severityid[=:]?\s*(\d+)/i)?.[1];
  if (severityIdMatch) {
    const id = parseInt(severityIdMatch, 10);
    switch (id) {
      case 1: return "Low";
      case 2: return "Moderate";
      case 4: return "High";
      case 5: return "Severe";
      default: return "Unknown";
    }
  }
  
  // Infer severity from well-known threat patterns
  const nameLower = threatName.toLowerCase();
  
  // Test files and PUAs are typically Low severity
  if (nameLower.includes("eicar") || nameLower.includes("test_file")) return "Low";
  if (nameLower.includes("pua:") || nameLower.includes("potentially unwanted")) return "Low";
  
  // Ransomware, exploits, and trojans are typically Severe
  if (nameLower.includes("ransom") || nameLower.includes("exploit") || 
      nameLower.includes("trojan") || nameLower.includes("backdoor")) return "Severe";
  
  // Viruses are typically High
  if (nameLower.includes("virus:")) return "High";
  
  // Worms and password stealers are High
  if (nameLower.includes("worm:") || nameLower.includes("pwstealer")) return "High";
  
  return "Unknown";
}

function parseDefenderThreatFromEventMessage(params: {
  event_id: number;
  event_time: string;
  message: string;
  raw_data: unknown;
}): ParsedThreatFromEventLog | null {
  const { event_id, event_time, message, raw_data } = params;
  const msg = String(message || "");
  if (!msg) return null;

  // These event IDs commonly carry threat detection/action details.
  // (1116/1117 are frequently seen for EICAR.)
  const isThreatLikeEvent = [1005, 1006, 1007, 1008, 1009, 1116, 1117, 1118, 1119].includes(event_id);
  if (!isThreatLikeEvent) return null;

  // Extract fields from the message body (best-effort; Defender formats vary by build).
  const threatName = (msg.match(/^\s*Name:\s*(.+)$/mi)?.[1] ||
    msg.match(/&name=([^&\s]+)/i)?.[1] ||
    "Unknown").trim();

  const threatId = (
    msg.match(/threatid=(\d+)/i)?.[1] ||
    msg.match(/^\s*ID:\s*(\d+)\s*$/mi)?.[1] ||
    null
  );

  if (!threatId) return null;

  const severity = mapSeverityFromMessage(msg, threatName);
  const category = (msg.match(/^\s*Category:\s*(.+)$/mi)?.[1] || "").trim() || null;
  const path = (msg.match(/^\s*Path:\s*(.+)$/mi)?.[1] || "").trim();

  // Derive a normalized status. (Threats UI treats Blocked/Removed/Resolved as healthy.)
  let status = "Active";
  if (event_id === 1009) status = "Quarantined";
  if ([1006, 1117].includes(event_id)) status = "Blocked";
  if ([1007, 1118, 1119].includes(event_id)) status = "Active";
  if (/quarantin/i.test(msg)) status = "Quarantined";
  if (/removed/i.test(msg)) status = "Removed";
  if (/blocked/i.test(msg) || /has taken action/i.test(msg)) status = "Blocked";

  return {
    threat_id: String(threatId),
    threat_name: threatName,
    severity,
    category,
    status,
    initial_detection_time: event_time || null,
    last_threat_status_change_time: event_time || null,
    resources: path ? [path] : null,
    raw_data: {
      source: "defender_event_log",
      event_id,
      event_time,
      message,
      raw_data,
    },
  };
}

// Coerce agent numeric fields to Postgres int4 safely.
// Some Windows APIs use UINT32 max (4294967295) as a sentinel for "unknown".
function toInt32OrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(n)) return null;

  // Common "unknown" sentinel values
  if (n === 4294967295 || n === -1) return null;

  // int4 range
  if (n > 2147483647 || n < -2147483648) return null;

  return Math.trunc(n);
}

function toTimestampOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  // Allow ISO strings; DB will validate.
  return trimmed;
}

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

    // Route: POST /apps - Report discovered applications
    if (path === "/apps" && req.method === "POST") {
      return await handleApps(req);
    }

    // Route: POST /firewall-logs - Report firewall audit logs
    if (path === "/firewall-logs" && req.method === "POST") {
      return await handleFirewallLogs(req);
    }

    // Route: GET /firewall-policy - Get assigned firewall policy and rules
    if (path === "/firewall-policy" && req.method === "GET") {
      return await handleGetFirewallPolicy(req);
    }

    // Route: GET /policy - Get assigned policy
    if (path === "/policy" && req.method === "GET") {
      return await handleGetPolicy(req);
    }

    // Route: GET /wdac-policy - Get assigned WDAC policy with rules
    if (path === "/wdac-policy" && req.method === "GET") {
      return await handleGetWdacPolicy(req);
    }

    // Route: GET /rule-sets - Get all rule sets and rules for this endpoint (new system)
    if (path === "/rule-sets" && req.method === "GET") {
      return await handleGetRuleSets(req);
    }

    // Route: GET /uac-policy - Get assigned UAC policy
    if (path === "/uac-policy" && req.method === "GET") {
      return await handleGetUacPolicy(req);
    }

    // Route: GET /windows-update-policy - Get assigned Windows Update policy
    if (path === "/windows-update-policy" && req.method === "GET") {
      return await handleGetWindowsUpdatePolicy(req);
    }

    // Route: GET /status - Get full endpoint status for tray application
    if (path === "/status" && req.method === "GET") {
      return await handleGetStatus(req);
    }

    // Route: GET /agent-update - Check for agent updates and get new script
    if (path === "/agent-update" && req.method === "GET") {
      return await handleAgentUpdate(req);
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

  // Rate limit heartbeats to reduce write pressure
  if (!checkRateLimit(endpoint.id, "heartbeat")) {
    return new Response(
      JSON.stringify({ success: true, message: "Heartbeat rate limited", rate_limited: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Update endpoint last seen
  await supabase
    .from("endpoints")
    .update({
      last_seen_at: new Date().toISOString(),
      is_online: true,
      defender_version: body.defender_version || endpoint.defender_version,
    })
    .eq("id", endpoint.id);

  // Build status data for upsert
  const statusData = {
    endpoint_id: endpoint.id,
    collected_at: new Date().toISOString(),
    realtime_protection_enabled: body.realtime_protection_enabled,
    antivirus_enabled: body.antivirus_enabled,
    antispyware_enabled: body.antispyware_enabled,
    behavior_monitor_enabled: body.behavior_monitor_enabled,
    ioav_protection_enabled: body.ioav_protection_enabled,
    on_access_protection_enabled: body.on_access_protection_enabled,
    full_scan_age: toInt32OrNull(body.full_scan_age),
    quick_scan_age: toInt32OrNull(body.quick_scan_age),
    full_scan_end_time: toTimestampOrNull(body.full_scan_end_time),
    quick_scan_end_time: toTimestampOrNull(body.quick_scan_end_time),
    antivirus_signature_age: toInt32OrNull(body.antivirus_signature_age),
    antispyware_signature_age: toInt32OrNull(body.antispyware_signature_age),
    antivirus_signature_version: body.antivirus_signature_version,
    nis_signature_version: body.nis_signature_version,
    nis_enabled: body.nis_enabled,
    tamper_protection_source: body.tamper_protection_source,
    computer_state: toInt32OrNull(body.computer_state),
    am_running_mode: body.am_running_mode,
    raw_status: body.raw_status,
    // UAC status fields
    uac_enabled: body.uac_enabled ?? null,
    uac_consent_prompt_admin: toInt32OrNull(body.uac_consent_prompt_admin),
    uac_consent_prompt_user: toInt32OrNull(body.uac_consent_prompt_user),
    uac_prompt_on_secure_desktop: body.uac_prompt_on_secure_desktop ?? null,
    uac_detect_installations: body.uac_detect_installations ?? null,
    uac_validate_admin_signatures: body.uac_validate_admin_signatures ?? null,
    uac_filter_administrator_token: body.uac_filter_administrator_token ?? null,
    // Windows Update status fields
    wu_auto_update_mode: toInt32OrNull(body.wu_auto_update_mode),
    wu_active_hours_start: toInt32OrNull(body.wu_active_hours_start),
    wu_active_hours_end: toInt32OrNull(body.wu_active_hours_end),
    wu_feature_update_deferral: toInt32OrNull(body.wu_feature_update_deferral),
    wu_quality_update_deferral: toInt32OrNull(body.wu_quality_update_deferral),
    wu_pause_feature_updates: body.wu_pause_feature_updates ?? null,
    wu_pause_quality_updates: body.wu_pause_quality_updates ?? null,
    wu_pending_updates_count: toInt32OrNull(body.wu_pending_updates_count),
    wu_last_install_date: toTimestampOrNull(body.wu_last_install_date),
    wu_restart_pending: body.wu_restart_pending ?? null,
  };

  // Insert status record (we still insert new records for historical tracking,
  // but rate limiting above prevents excessive writes)
  const { error: statusError } = await supabase.from("endpoint_status").insert(statusData);

  if (statusError) {
    console.error("Error inserting status:", statusError);
  }

  // Fetch organization settings to inform the agent about enabled modules
  const { data: org } = await supabase
    .from("organizations")
    .select("network_module_enabled")
    .eq("id", endpoint.organization_id)
    .single();

  return new Response(
    JSON.stringify({ 
      success: true, 
      message: "Heartbeat received",
      network_module_enabled: org?.network_module_enabled ?? false,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// POST /threats - Report threats from agent
async function handleThreats(req: Request) {
  const endpoint = await validateAgentToken(req);
  const body = await req.json();
  // Be permissive: some clients may accidentally send a single object (not an array)
  // or send the array as the top-level JSON value.
  const threatsRaw = (body && typeof body === "object" && "threats" in body) ? (body as any).threats : body;
  const threats: any[] = Array.isArray(threatsRaw)
    ? threatsRaw
    : threatsRaw && typeof threatsRaw === "object"
      ? [threatsRaw]
      : [];

  if (threats.length === 0) {
    return new Response(
      JSON.stringify({ success: true, message: "No threats to process" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  for (const threat of threats) {
    if (!threat?.threat_id) continue;
    // Check if threat already exists
    const { data: existing } = await supabase
      .from("endpoint_threats")
      .select("id, manual_resolution_active, manual_resolved_at")
      .eq("endpoint_id", endpoint.id)
      .eq("threat_id", threat.threat_id)
      .maybeSingle();

    const incomingStatus = String(threat.status || "Active");
    const incomingStatusLc = incomingStatus.toLowerCase();
    const incomingIndicatesNewActivity = [
      "active",
      "allowed",
      "executing",
      "quarantined",
      "blocked",
    ].includes(incomingStatusLc);

    if (existing) {
      const incomingTimeStr =
        threat.last_threat_status_change_time || threat.initial_detection_time || null;
      const incomingTime = incomingTimeStr ? new Date(incomingTimeStr) : null;
      const manualResolvedAt = existing.manual_resolved_at ? new Date(existing.manual_resolved_at) : null;

      const shouldClearManualResolution =
        !!existing.manual_resolution_active &&
        incomingIndicatesNewActivity &&
        !!incomingTime &&
        (!manualResolvedAt || incomingTime > manualResolvedAt);

      // If the threat is manually resolved, don't let repeated delivery of the same/older agent state
      // overwrite it. Only un-resolve when we see activity AFTER manual_resolved_at.
      if (existing.manual_resolution_active && !shouldClearManualResolution) {
        await supabase
          .from("endpoint_threats")
          .update({
            // Keep status=Resolved; but allow raw_data to refresh.
            raw_data: threat.raw_data,
          })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("endpoint_threats")
          .update({
            status: threat.status,
            last_threat_status_change_time: threat.last_threat_status_change_time,
            raw_data: threat.raw_data,
            ...(shouldClearManualResolution
              ? {
                  manual_resolution_active: false,
                  manual_resolved_at: null,
                  manual_resolved_by: null,
                }
              : {}),
          })
          .eq("id", existing.id);
      }
    } else {
      // Insert new threat using upsert to handle race conditions with the unique constraint
      const { error: upsertError } = await supabase.from("endpoint_threats").upsert({
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
        manual_resolution_active: false,
        manual_resolved_at: null,
        manual_resolved_by: null,
      }, { onConflict: "endpoint_id,threat_id" });

      if (!upsertError) {
        // Log the new threat
        await supabase.from("endpoint_logs").insert({
          endpoint_id: endpoint.id,
          log_type: "threat",
          message: `Threat detected: ${threat.threat_name}`,
          details: { threat_id: threat.threat_id, severity: threat.severity },
        });
      }
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
  // Be permissive: allow { logs: [...] } or a top-level array.
  const logsRaw = (body && typeof body === "object" && "logs" in body) ? (body as any).logs : body;

  // Server-side filtering: keep only relevant event IDs.
  // Defender Operational events for threats and protection status.
  const relevantDefenderOperationalEventIds = new Set<number>([
    1000, 1001, 1002, 1005, 1006, 1007, 1008, 1009, 1010, 1011, 1013, 1015, 1016,
    1116, 1117, 1118, 1119,
    1121, 1122, 1123, 1124, 1125, 1126, 1127, 1128, 1129,
    2000, 2001, 2002, 2003, 2004, 2005,
    2010, 2011, 2012,
    3002,
    5000, 5001, 5004, 5007, 5008, 5010, 5012,
  ]);

  // Security event IDs for process creation (IOC hunting).
  const relevantSecurityEventIds = new Set<number>([
    4688, // Process creation with command line
    4689, // Process termination (optional context)
  ]);

  const logs: any[] = Array.isArray(logsRaw)
    ? logsRaw.filter((l: any) => {
        const n = typeof l?.event_id === "number" ? l.event_id : Number(l?.event_id);
        if (!Number.isFinite(n)) return false;
        const logSource = String(l?.event_source || "").toLowerCase();
        // Accept Defender Operational events
        if (logSource.includes("defender") && relevantDefenderOperationalEventIds.has(n)) return true;
        // Accept Security audit events for process creation
        if (logSource.includes("security") && relevantSecurityEventIds.has(n)) return true;
        return false;
      })
    : [];

  console.log("/logs", {
    endpoint_id: endpoint.id,
    hostname: endpoint.hostname,
    count: logs.length,
  });

  if (logs.length === 0) {
    return new Response(
      JSON.stringify({ success: true, message: "No logs to process" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Insert logs in batch - map to actual table schema
  const logsToInsert = logs
    .map((log: {
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
    }) => {
      const eventId = toInt32OrNull(log.event_id);
      if (eventId === null) return null;

      return {
        endpoint_id: endpoint.id,
        event_id: eventId,
        log_source: log.event_source,
        level: log.level,
        message: log.message,
        event_time: toTimestampOrNull(log.event_time) ?? new Date().toISOString(),
        provider_name: log.details?.provider || null,
        task_category: log.details?.task || null,
        raw_data: log.details || null,
      };
    })
    .filter(Boolean);

  if (logsToInsert.length === 0) {
    return new Response(
      JSON.stringify({ success: true, message: "No valid logs to process" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

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

  // Best-effort: derive endpoint_threats rows from Defender Operational threat events.
  // This provides reliable Threats UI even when Get-MpThreatDetection returns empty.
  try {
    const candidateThreats: ParsedThreatFromEventLog[] = logsToInsert
      .map((l: any) => {
        const eventId = typeof l?.event_id === "number" ? l.event_id : Number(l?.event_id);
        return parseDefenderThreatFromEventMessage({
          event_id: eventId,
          event_time: l?.event_time,
          message: l?.message,
          raw_data: l?.raw_data,
        });
      })
      .filter(Boolean) as ParsedThreatFromEventLog[];

    for (const threat of candidateThreats) {
      const { data: existing } = await supabase
        .from("endpoint_threats")
        .select("id, manual_resolution_active, manual_resolved_at")
        .eq("endpoint_id", endpoint.id)
        .eq("threat_id", threat.threat_id)
        .maybeSingle();

      if (existing?.id) {
        const incomingTime = threat.last_threat_status_change_time
          ? new Date(threat.last_threat_status_change_time)
          : threat.initial_detection_time
            ? new Date(threat.initial_detection_time)
            : null;
        const manualResolvedAt = existing.manual_resolved_at ? new Date(existing.manual_resolved_at) : null;
        const shouldClearManualResolution =
          !!existing.manual_resolution_active &&
          !!incomingTime &&
          (!manualResolvedAt || incomingTime > manualResolvedAt);

        if (existing.manual_resolution_active && !shouldClearManualResolution) {
          // Keep status=Resolved; just refresh metadata.
          await supabase
            .from("endpoint_threats")
            .update({
              threat_name: threat.threat_name,
              severity: threat.severity,
              category: threat.category,
              resources: threat.resources as any,
              raw_data: threat.raw_data as any,
            })
            .eq("id", existing.id);
          continue;
        }

        await supabase
          .from("endpoint_threats")
          .update({
            threat_name: threat.threat_name,
            severity: threat.severity,
            category: threat.category,
            status: threat.status,
            last_threat_status_change_time: threat.last_threat_status_change_time,
            resources: threat.resources as any,
            raw_data: threat.raw_data as any,
            // Any new Defender threat event AFTER manual_resolved_at clears manual resolution override.
            ...(shouldClearManualResolution
              ? {
                  manual_resolution_active: false,
                  manual_resolved_at: null,
                  manual_resolved_by: null,
                }
              : {}),
          })
          .eq("id", existing.id);
      } else {
        // Insert new threat using upsert to handle race conditions with the unique constraint
        await supabase.from("endpoint_threats").upsert({
          endpoint_id: endpoint.id,
          threat_id: threat.threat_id,
          threat_name: threat.threat_name,
          severity: threat.severity || "Unknown",
          category: threat.category,
          status: threat.status || "Active",
          initial_detection_time: threat.initial_detection_time,
          last_threat_status_change_time: threat.last_threat_status_change_time,
          resources: threat.resources as any,
          raw_data: threat.raw_data as any,
          manual_resolution_active: false,
          manual_resolved_at: null,
          manual_resolved_by: null,
        }, { onConflict: "endpoint_id,threat_id" });
      }
    }
  } catch (e) {
    console.warn("Threat derivation from logs failed (non-fatal):", e);
  }

  return new Response(
    JSON.stringify({ success: true, message: `Processed ${logs.length} logs` }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// POST /apps - Receive discovered applications from agent
async function handleApps(req: Request) {
  const endpoint = await validateAgentToken(req);
  const body = await req.json();
  const { apps, source } = body;

  if (!Array.isArray(apps)) {
    return new Response(JSON.stringify({ error: "Invalid apps format" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let processedCount = 0;

  for (const app of apps) {
    if (!app.file_name || !app.file_path) continue;

    // Check if app already exists for this endpoint
    const { data: existing } = await supabase
      .from("wdac_discovered_apps")
      .select("id, execution_count, discovery_source")
      .eq("endpoint_id", endpoint.id)
      .eq("file_path", app.file_path)
      .eq("file_hash", app.file_hash || "")
      .maybeSingle();

    const discoverySource = source || "agent_inventory";

    if (existing) {
      // Update existing app
      let newSource = existing.discovery_source;
      if (existing.discovery_source !== discoverySource && existing.discovery_source !== "both") {
        newSource = "both";
      }

      await supabase
        .from("wdac_discovered_apps")
        .update({
          last_seen_at: new Date().toISOString(),
          execution_count: existing.execution_count + (app.execution_count || 1),
          discovery_source: newSource,
          publisher: app.publisher || undefined,
          product_name: app.product_name || undefined,
          file_version: app.file_version || undefined,
        })
        .eq("id", existing.id);
    } else {
      // Insert new app
      await supabase.from("wdac_discovered_apps").insert({
        organization_id: endpoint.organization_id,
        endpoint_id: endpoint.id,
        file_name: app.file_name,
        file_path: app.file_path,
        file_hash: app.file_hash || null,
        publisher: app.publisher || null,
        product_name: app.product_name || null,
        file_version: app.file_version || null,
        discovery_source: discoverySource,
        execution_count: app.execution_count || 1,
        raw_data: app.raw_data || null,
      });
    }
    processedCount++;
  }

  return new Response(
    JSON.stringify({ success: true, message: `Processed ${processedCount} applications` }),
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

// GET /wdac-policy - Get assigned WDAC policy with rules (legacy + rule sets)
async function handleGetWdacPolicy(req: Request) {
  const endpoint = await validateAgentToken(req);
  
  // Collect all rules from various sources
  const allRules: Array<{
    id: string;
    rule_type: string;
    action: string;
    value: string;
    publisher_name?: string;
    product_name?: string;
    file_version_min?: string;
    description?: string;
    source: string;
    source_id: string;
  }> = [];

  // 1. Legacy WDAC policy rules (if assigned)
  let legacyPolicy = null;
  if (endpoint.wdac_policy_id) {
    const { data: policy } = await supabase
      .from("wdac_policies")
      .select("*")
      .eq("id", endpoint.wdac_policy_id)
      .single();
    
    legacyPolicy = policy;

    const { data: legacyRules } = await supabase
      .from("wdac_rules")
      .select("*")
      .eq("policy_id", endpoint.wdac_policy_id);

    if (legacyRules) {
      for (const rule of legacyRules) {
        allRules.push({
          id: rule.id,
          rule_type: rule.rule_type,
          action: rule.action,
          value: rule.value,
          publisher_name: rule.publisher_name,
          product_name: rule.product_name,
          file_version_min: rule.file_version_min,
          description: rule.description,
          source: "wdac_policy",
          source_id: endpoint.wdac_policy_id,
        });
      }
    }
  }

  // 2. Rules from directly assigned rule sets
  const { data: directAssignments } = await supabase
    .from("endpoint_rule_set_assignments")
    .select("rule_set_id, priority")
    .eq("endpoint_id", endpoint.id);

  const directRuleSetIds = directAssignments?.map(a => a.rule_set_id) || [];

  // 3. Rules from group-inherited rule sets
  const { data: groupMemberships } = await supabase
    .from("endpoint_group_memberships")
    .select("group_id")
    .eq("endpoint_id", endpoint.id);

  const groupIds = groupMemberships?.map(m => m.group_id) || [];
  
  let groupRuleSetIds: string[] = [];
  if (groupIds.length > 0) {
    const { data: groupAssignments } = await supabase
      .from("group_rule_set_assignments")
      .select("rule_set_id, priority")
      .in("group_id", groupIds);
    
    groupRuleSetIds = groupAssignments?.map(a => a.rule_set_id) || [];
  }

  // Combine all rule set IDs (dedupe)
  const allRuleSetIds = [...new Set([...directRuleSetIds, ...groupRuleSetIds])];

  // Fetch rules from all rule sets
  if (allRuleSetIds.length > 0) {
    const { data: ruleSetRules } = await supabase
      .from("wdac_rule_set_rules")
      .select("*, wdac_rule_sets!inner(name)")
      .in("rule_set_id", allRuleSetIds);

    if (ruleSetRules) {
      for (const rule of ruleSetRules) {
        allRules.push({
          id: rule.id,
          rule_type: rule.rule_type,
          action: rule.action,
          value: rule.value,
          publisher_name: rule.publisher_name,
          product_name: rule.product_name,
          file_version_min: rule.file_version_min,
          description: rule.description,
          source: directRuleSetIds.includes(rule.rule_set_id) ? "endpoint_rule_set" : "group_rule_set",
          source_id: rule.rule_set_id,
        });
      }
    }
  }

  // Generate a hash of all rule IDs for change detection
  const ruleIds = allRules.map(r => r.id).sort().join(",");
  const rulesHash = await generateHash(ruleIds);

  return new Response(
    JSON.stringify({
      success: true,
      wdac_policy: legacyPolicy,
      rules: allRules,
      rules_hash: rulesHash,
      rules_count: allRules.length,
      sources: {
        legacy_policy: legacyPolicy ? 1 : 0,
        direct_rule_sets: directRuleSetIds.length,
        group_rule_sets: groupRuleSetIds.length,
      },
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// GET /rule-sets - Get detailed rule set information for this endpoint
async function handleGetRuleSets(req: Request) {
  const endpoint = await validateAgentToken(req);

  // Get direct assignments
  const { data: directAssignments } = await supabase
    .from("endpoint_rule_set_assignments")
    .select(`
      rule_set_id,
      priority,
      wdac_rule_sets (
        id,
        name,
        description,
        updated_at
      )
    `)
    .eq("endpoint_id", endpoint.id)
    .order("priority", { ascending: false });

  // Get group memberships
  const { data: groupMemberships } = await supabase
    .from("endpoint_group_memberships")
    .select("group_id, endpoint_groups(id, name)")
    .eq("endpoint_id", endpoint.id);

  const groupIds = groupMemberships?.map(m => m.group_id) || [];

  // Get group rule set assignments
  let groupAssignments: Array<{
    group_id: string;
    group_name: string;
    rule_set_id: string;
    rule_set_name: string;
    priority: number;
  }> = [];

  if (groupIds.length > 0) {
    const { data: gAssignments } = await supabase
      .from("group_rule_set_assignments")
      .select(`
        group_id,
        rule_set_id,
        priority,
        endpoint_groups (name),
        wdac_rule_sets (id, name)
      `)
      .in("group_id", groupIds)
      .order("priority", { ascending: false });

    if (gAssignments) {
      groupAssignments = gAssignments.map(a => {
        const endpointGroup = a.endpoint_groups as unknown as { name: string } | null;
        const ruleSet = a.wdac_rule_sets as unknown as { id: string; name: string } | null;
        return {
          group_id: a.group_id,
          group_name: endpointGroup?.name || "",
          rule_set_id: a.rule_set_id,
          rule_set_name: ruleSet?.name || "",
          priority: a.priority,
        };
      });
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      direct_assignments: directAssignments?.map(a => ({
        rule_set_id: a.rule_set_id,
        priority: a.priority,
        rule_set: a.wdac_rule_sets,
      })) || [],
      group_memberships: groupMemberships?.map(m => ({
        group_id: m.group_id,
        group: m.endpoint_groups,
      })) || [],
      inherited_assignments: groupAssignments,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// GET /uac-policy - Get assigned UAC policy for an endpoint
async function handleGetUacPolicy(req: Request) {
  const endpoint = await validateAgentToken(req);

  // Check if endpoint has a direct UAC policy assignment
  if (endpoint.uac_policy_id) {
    const { data: policy, error } = await supabase
      .from("uac_policies")
      .select("*")
      .eq("id", endpoint.uac_policy_id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching UAC policy:", error);
    }

    if (policy) {
      return new Response(
        JSON.stringify({
          has_policy: true,
          policy: {
            id: policy.id,
            name: policy.name,
            enable_lua: policy.enable_lua,
            consent_prompt_admin: policy.consent_prompt_admin,
            consent_prompt_user: policy.consent_prompt_user,
            prompt_on_secure_desktop: policy.prompt_on_secure_desktop,
            detect_installations: policy.detect_installations,
            validate_admin_signatures: policy.validate_admin_signatures,
            filter_administrator_token: policy.filter_administrator_token,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  // Check if endpoint is in a group with a UAC policy
  const { data: groupMemberships } = await supabase
    .from("endpoint_group_memberships")
    .select(`
      group_id,
      endpoint_groups(uac_policy_id)
    `)
    .eq("endpoint_id", endpoint.id);

  for (const membership of groupMemberships || []) {
    const group = membership.endpoint_groups as unknown as { uac_policy_id: string | null } | null;
    if (group?.uac_policy_id) {
      const { data: policy } = await supabase
        .from("uac_policies")
        .select("*")
        .eq("id", group.uac_policy_id)
        .maybeSingle();

      if (policy) {
        return new Response(
          JSON.stringify({
            has_policy: true,
            source: "group",
            policy: {
              id: policy.id,
              name: policy.name,
              enable_lua: policy.enable_lua,
              consent_prompt_admin: policy.consent_prompt_admin,
              consent_prompt_user: policy.consent_prompt_user,
              prompt_on_secure_desktop: policy.prompt_on_secure_desktop,
              detect_installations: policy.detect_installations,
              validate_admin_signatures: policy.validate_admin_signatures,
              filter_administrator_token: policy.filter_administrator_token,
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }
  }

  // No UAC policy assigned
  return new Response(
    JSON.stringify({ has_policy: false }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// GET /windows-update-policy - Get assigned Windows Update policy for an endpoint
async function handleGetWindowsUpdatePolicy(req: Request) {
  const endpoint = await validateAgentToken(req);

  // Check if endpoint has a direct Windows Update policy assignment
  if (endpoint.windows_update_policy_id) {
    const { data: policy, error } = await supabase
      .from("windows_update_policies")
      .select("*")
      .eq("id", endpoint.windows_update_policy_id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching Windows Update policy:", error);
    }

    if (policy) {
      return new Response(
        JSON.stringify({
          has_policy: true,
          policy: {
            id: policy.id,
            name: policy.name,
            auto_update_mode: policy.auto_update_mode,
            active_hours_start: policy.active_hours_start,
            active_hours_end: policy.active_hours_end,
            feature_update_deferral: policy.feature_update_deferral,
            quality_update_deferral: policy.quality_update_deferral,
            pause_feature_updates: policy.pause_feature_updates,
            pause_quality_updates: policy.pause_quality_updates,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  // Check if endpoint is in a group with a Windows Update policy
  const { data: groupMemberships } = await supabase
    .from("endpoint_group_memberships")
    .select(`
      group_id,
      endpoint_groups(windows_update_policy_id)
    `)
    .eq("endpoint_id", endpoint.id);

  for (const membership of groupMemberships || []) {
    const group = membership.endpoint_groups as unknown as { windows_update_policy_id: string | null } | null;
    if (group?.windows_update_policy_id) {
      const { data: policy } = await supabase
        .from("windows_update_policies")
        .select("*")
        .eq("id", group.windows_update_policy_id)
        .maybeSingle();

      if (policy) {
        return new Response(
          JSON.stringify({
            has_policy: true,
            source: "group",
            policy: {
              id: policy.id,
              name: policy.name,
              auto_update_mode: policy.auto_update_mode,
              active_hours_start: policy.active_hours_start,
              active_hours_end: policy.active_hours_end,
              feature_update_deferral: policy.feature_update_deferral,
              quality_update_deferral: policy.quality_update_deferral,
              pause_feature_updates: policy.pause_feature_updates,
              pause_quality_updates: policy.pause_quality_updates,
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }
  }

  // No Windows Update policy assigned
  return new Response(
    JSON.stringify({ has_policy: false }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// Helper to generate a simple hash for change detection
async function generateHash(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.slice(0, 8).map(b => b.toString(16).padStart(2, "0")).join("");
}

// GET /status - Get full endpoint status for tray application (no auth required beyond token)
async function handleGetStatus(req: Request) {
  const endpoint = await validateAgentToken(req);

  // Get latest status record
  const { data: latestStatus } = await supabase
    .from("endpoint_status")
    .select("*")
    .eq("endpoint_id", endpoint.id)
    .order("collected_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Get Defender policy
  let defenderPolicy = null;
  let defenderSource = null;
  if (endpoint.policy_id) {
    const { data: policy } = await supabase
      .from("defender_policies")
      .select("id, name")
      .eq("id", endpoint.policy_id)
      .maybeSingle();
    if (policy) {
      defenderPolicy = policy;
      defenderSource = "direct";
    }
  }
  // Check group inheritance for defender policy
  if (!defenderPolicy) {
    const { data: groupMemberships } = await supabase
      .from("endpoint_group_memberships")
      .select("endpoint_groups(policy_id)")
      .eq("endpoint_id", endpoint.id);
    for (const m of groupMemberships || []) {
      const g = m.endpoint_groups as unknown as { policy_id: string | null } | null;
      if (g?.policy_id) {
        const { data: policy } = await supabase
          .from("defender_policies")
          .select("id, name")
          .eq("id", g.policy_id)
          .maybeSingle();
        if (policy) {
          defenderPolicy = policy;
          defenderSource = "group";
          break;
        }
      }
    }
  }

  // Get UAC policy
  let uacPolicy = null;
  let uacSource = null;
  if (endpoint.uac_policy_id) {
    const { data: policy } = await supabase
      .from("uac_policies")
      .select("id, name")
      .eq("id", endpoint.uac_policy_id)
      .maybeSingle();
    if (policy) {
      uacPolicy = policy;
      uacSource = "direct";
    }
  }
  if (!uacPolicy) {
    const { data: groupMemberships } = await supabase
      .from("endpoint_group_memberships")
      .select("endpoint_groups(uac_policy_id)")
      .eq("endpoint_id", endpoint.id);
    for (const m of groupMemberships || []) {
      const g = m.endpoint_groups as unknown as { uac_policy_id: string | null } | null;
      if (g?.uac_policy_id) {
        const { data: policy } = await supabase
          .from("uac_policies")
          .select("id, name")
          .eq("id", g.uac_policy_id)
          .maybeSingle();
        if (policy) {
          uacPolicy = policy;
          uacSource = "group";
          break;
        }
      }
    }
  }

  // Get Windows Update policy
  let wuPolicy = null;
  let wuSource = null;
  if (endpoint.windows_update_policy_id) {
    const { data: policy } = await supabase
      .from("windows_update_policies")
      .select("id, name")
      .eq("id", endpoint.windows_update_policy_id)
      .maybeSingle();
    if (policy) {
      wuPolicy = policy;
      wuSource = "direct";
    }
  }
  if (!wuPolicy) {
    const { data: groupMemberships } = await supabase
      .from("endpoint_group_memberships")
      .select("endpoint_groups(windows_update_policy_id)")
      .eq("endpoint_id", endpoint.id);
    for (const m of groupMemberships || []) {
      const g = m.endpoint_groups as unknown as { windows_update_policy_id: string | null } | null;
      if (g?.windows_update_policy_id) {
        const { data: policy } = await supabase
          .from("windows_update_policies")
          .select("id, name")
          .eq("id", g.windows_update_policy_id)
          .maybeSingle();
        if (policy) {
          wuPolicy = policy;
          wuSource = "group";
          break;
        }
      }
    }
  }

  // Get WDAC rule sets count
  const { data: directAssignments } = await supabase
    .from("endpoint_rule_set_assignments")
    .select("rule_set_id")
    .eq("endpoint_id", endpoint.id);
  const directRuleSets = directAssignments?.length || 0;

  // Count group-inherited rule sets
  const { data: groupMemberships } = await supabase
    .from("endpoint_group_memberships")
    .select("group_id")
    .eq("endpoint_id", endpoint.id);
  const groupIds = groupMemberships?.map(m => m.group_id) || [];
  let groupRuleSets = 0;
  if (groupIds.length > 0) {
    const { data: groupAssignments } = await supabase
      .from("group_rule_set_assignments")
      .select("rule_set_id")
      .in("group_id", groupIds);
    groupRuleSets = groupAssignments?.length || 0;
  }

  // Get threat count (active threats only)
  const { count: activeThreats } = await supabase
    .from("endpoint_threats")
    .select("*", { count: "exact", head: true })
    .eq("endpoint_id", endpoint.id)
    .not("status", "in", '("Resolved","Removed","Blocked")');

  return new Response(
    JSON.stringify({
      success: true,
      endpoint: {
        id: endpoint.id,
        hostname: endpoint.hostname,
        os_version: endpoint.os_version,
        defender_version: endpoint.defender_version,
        last_seen_at: endpoint.last_seen_at,
        is_online: endpoint.is_online,
      },
      status: latestStatus ? {
        realtime_protection: latestStatus.realtime_protection_enabled,
        antivirus_enabled: latestStatus.antivirus_enabled,
        signature_age: latestStatus.antivirus_signature_age,
        collected_at: latestStatus.collected_at,
      } : null,
      policies: {
        defender: defenderPolicy ? { ...defenderPolicy, source: defenderSource } : null,
        uac: uacPolicy ? { ...uacPolicy, source: uacSource } : null,
        windows_update: wuPolicy ? { ...wuPolicy, source: wuSource } : null,
        wdac_rule_sets: directRuleSets + groupRuleSets,
      },
      threats: {
        active_count: activeThreats || 0,
      },
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// Current agent version - increment when agent script changes
const AGENT_VERSION = "2.12.0";

// GET /agent-update - Check for updates and return new script if needed
async function handleAgentUpdate(req: Request) {
  const endpoint = await validateAgentToken(req);
  const url = new URL(req.url);
  const currentVersion = url.searchParams.get("version");

  // Compare versions - simple semantic version comparison
  const needsUpdate = !currentVersion || compareVersions(AGENT_VERSION, currentVersion) > 0;

  if (!needsUpdate) {
    return new Response(
      JSON.stringify({
        success: true,
        update_available: false,
        current_version: AGENT_VERSION,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Fetch the agent script template from platform_settings or return a placeholder
  // In production, this would fetch from a stored script or generate dynamically
  const { data: orgData } = await supabase
    .from("endpoints")
    .select("organization_id")
    .eq("id", endpoint.id)
    .single();

  if (!orgData) {
    throw new Error("Endpoint organization not found");
  }

  return new Response(
    JSON.stringify({
      success: true,
      update_available: true,
      current_version: AGENT_VERSION,
      organization_id: orgData.organization_id,
      // Agent will download from the agent-script edge function using its token
      script_endpoint: `${SUPABASE_URL}/functions/v1/agent-script`,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// Compare semantic versions: returns 1 if a > b, -1 if a < b, 0 if equal
function compareVersions(a: string, b: string): number {
  const partsA = a.split(".").map(Number);
  const partsB = b.split(".").map(Number);
  
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const numA = partsA[i] || 0;
    const numB = partsB[i] || 0;
    if (numA > numB) return 1;
    if (numA < numB) return -1;
  }
  return 0;
}

// POST /firewall-logs - Report firewall audit logs from agent
async function handleFirewallLogs(req: Request) {
  console.log(`[${VERSION}] handleFirewallLogs called`);
  const endpoint = await validateAgentToken(req);
  
  // Check if network module is enabled for this organization
  const { data: org } = await supabase
    .from("organizations")
    .select("network_module_enabled")
    .eq("id", endpoint.organization_id)
    .single();
  
  if (!org?.network_module_enabled) {
    console.log(`[${VERSION}] Network module disabled for org ${endpoint.organization_id}, rejecting firewall logs`);
    return new Response(
      JSON.stringify({ success: false, message: "Network module not enabled for this organization", count: 0, _version: VERSION }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  
  const body = await req.json();
  
  const logsRaw = (body && typeof body === "object" && "logs" in body) ? (body as any).logs : body;
  const logs: any[] = Array.isArray(logsRaw) ? logsRaw : logsRaw && typeof logsRaw === "object" ? [logsRaw] : [];

  console.log(`[${VERSION}] Firewall logs received: ${logs.length} items for endpoint ${endpoint.hostname}`);

  if (logs.length === 0) {
    return new Response(
      JSON.stringify({ success: true, message: "No firewall logs to process", count: 0, _version: VERSION }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let insertedCount = 0;

  for (const log of logs) {
    if (!log?.service_name || !log?.remote_address) continue;

    // Insert firewall audit log
    const { error } = await supabase.from("firewall_audit_logs").insert({
      organization_id: endpoint.organization_id,
      endpoint_id: endpoint.id,
      rule_id: log.rule_id || null,
      service_name: log.service_name,
      local_port: log.local_port || 0,
      remote_address: log.remote_address,
      remote_port: log.remote_port || null,
      protocol: log.protocol || "tcp",
      direction: log.direction || "inbound",
      event_time: log.event_time || new Date().toISOString(),
    });

    if (!error) insertedCount++;
  }

  console.log(`[${VERSION}] Firewall logs inserted: ${insertedCount} of ${logs.length}`);

  return new Response(
    JSON.stringify({ success: true, message: "Firewall logs received", count: insertedCount, _version: VERSION }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
async function handleGetFirewallPolicy(req: Request) {
  const endpoint = await validateAgentToken(req);

  // Get endpoint's group memberships
  const { data: memberships } = await supabase
    .from("endpoint_group_memberships")
    .select("group_id")
    .eq("endpoint_id", endpoint.id);

  const groupIds = memberships?.map((m) => m.group_id) || [];

  if (groupIds.length === 0) {
    return new Response(
      JSON.stringify({ success: true, rules: [], message: "No groups assigned" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Get the organization's default firewall policy
  const { data: policy } = await supabase
    .from("firewall_policies")
    .select("id")
    .eq("organization_id", endpoint.organization_id)
    .eq("is_default", true)
    .maybeSingle();

  if (!policy) {
    return new Response(
      JSON.stringify({ success: true, rules: [], message: "No firewall policy configured" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Get all rules for this endpoint's groups
  const { data: rules, error } = await supabase
    .from("firewall_service_rules")
    .select(`
      id,
      service_name,
      port,
      protocol,
      action,
      allowed_source_groups,
      allowed_source_ips,
      mode,
      enabled,
      order_priority
    `)
    .eq("policy_id", policy.id)
    .in("endpoint_group_id", groupIds)
    .eq("enabled", true)
    .order("order_priority", { ascending: true });

  if (error) throw error;

  // Resolve source group IPs for allow_from_groups rules
  const resolvedRules = await Promise.all(
    (rules || []).map(async (rule) => {
      let resolvedSourceIps: string[] = [...(rule.allowed_source_ips || [])];

      if (rule.action === "allow_from_groups" && rule.allowed_source_groups?.length) {
        // Get endpoints in source groups
        const { data: sourceEndpoints } = await supabase
          .from("endpoint_group_memberships")
          .select("endpoint_id, endpoints(id)")
          .in("group_id", rule.allowed_source_groups);

        // For now, the agent would need to resolve IPs locally
        // This structure tells the agent which groups are allowed
      }

      return {
        id: rule.id,
        service_name: rule.service_name,
        port: rule.port,
        protocol: rule.protocol,
        action: rule.action,
        allowed_source_groups: rule.allowed_source_groups || [],
        allowed_source_ips: rule.allowed_source_ips || [],
        mode: rule.mode,
        order_priority: rule.order_priority,
      };
    })
  );

  return new Response(
    JSON.stringify({
      success: true,
      policy_id: policy.id,
      rules: resolvedRules,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
