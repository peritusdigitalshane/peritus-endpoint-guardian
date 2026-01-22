import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-agent-token",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const SUPABASE_URL = "https://njdcyjxgtckgtzgzoctw.supabase.co";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

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

// Helper to generate a simple hash for change detection
async function generateHash(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.slice(0, 8).map(b => b.toString(16).padStart(2, "0")).join("");
}
