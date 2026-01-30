import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-agent-token",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const SUPABASE_URL = "https://njdcyjxgtckgtzgzoctw.supabase.co";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Current agent version - MUST match the version in agent-api
const AGENT_VERSION = "2.10.0";
const API_BASE_URL = "https://njdcyjxgtckgtzgzoctw.supabase.co/functions/v1/agent-api";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const orgId = url.searchParams.get("org");
    const agentToken = req.headers.get("x-agent-token");

    // Validate: either org ID for initial download or agent token for updates
    let organizationId = orgId;

    if (agentToken && !orgId) {
      // Validate token and get org ID
      const { data: endpoint, error } = await supabase
        .from("endpoints")
        .select("organization_id")
        .eq("agent_token", agentToken)
        .maybeSingle();

      if (error || !endpoint) {
        return new Response("Invalid agent token", { status: 401, headers: corsHeaders });
      }
      organizationId = endpoint.organization_id;
    }

    if (!organizationId) {
      return new Response("Missing organization ID or agent token", { status: 400, headers: corsHeaders });
    }

    // Validate organization exists
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id, name")
      .eq("id", organizationId)
      .maybeSingle();

    if (orgError || !org) {
      return new Response("Invalid organization", { status: 404, headers: corsHeaders });
    }

    // Generate the PowerShell script
    const script = generateAgentScript(organizationId, API_BASE_URL, AGENT_VERSION);

    // Return as downloadable PowerShell file with UTF-8 BOM
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const scriptBytes = new TextEncoder().encode(script);
    const fullContent = new Uint8Array(bom.length + scriptBytes.length);
    fullContent.set(bom);
    fullContent.set(scriptBytes, bom.length);

    return new Response(fullContent, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": "attachment; filename=PeritusSecureAgent.ps1",
      },
    });
  } catch (error) {
    console.error("Agent script error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generateAgentScript(orgId: string, apiBaseUrl: string, version: string): string {
  // Minimal embedded icon (a simple blue shield) - the agent has fallback drawing code
  const fallbackIconBase64 = "";
  
  return `#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Peritus Secure Agent - Windows Defender Management
.DESCRIPTION
    This agent collects Windows Defender status and sends it to the Peritus Secure platform.
    It also applies security policies configured in the platform.
.PARAMETER OrganizationToken
    Your organization's unique token for agent registration
.PARAMETER HeartbeatIntervalSeconds
    How often the agent sends status updates (default: 30 seconds)
.PARAMETER Uninstall
    Remove the scheduled task and agent configuration
.PARAMETER TrayMode
    Run in system tray mode with interactive UI
.PARAMETER ForceFullLogSync
    Ignore the last log collection time and collect all events from the past 60 minutes.
.NOTES
    Version: ${version}
    Requires: Windows 10/11, PowerShell 5.1+, Administrator privileges
    Auto-update enabled: Agent checks for updates on each run
#>

param(
    [string]$OrganizationToken = "${orgId}",
    [int]$HeartbeatIntervalSeconds = 60,
    [switch]$Uninstall,
    [switch]$ForcePolicy,
    [switch]$ForceFullLogSync,
    [switch]$TrayMode
)

$ErrorActionPreference = "Stop"
$ApiBaseUrl = "${apiBaseUrl}"
$TaskName = "PeritusSecureAgent"
$TrayTaskName = "PeritusSecureTray"
$ServiceName = "Peritus Secure Agent"
$AgentVersion = "${version}"

$script:ForceFullLogSync = $ForceFullLogSync.IsPresent

$ConfigPath = "$env:ProgramData\\PeritusSecure"
$ConfigFile = "$ConfigPath\\agent.json"
$ScriptPath = "$ConfigPath\\PeritusSecureAgent.ps1"
$LogFile = "$ConfigPath\\agent.log"
$PolicyHashFile = "$ConfigPath\\policy_hash.txt"
$TrayIconFile = "$ConfigPath\\tray_icon.ico"
$UpdateLockFile = "$ConfigPath\\update.lock"

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    Write-Host $logMessage
    if (Test-Path $ConfigPath) {
        Add-Content -Path $LogFile -Value $logMessage -ErrorAction SilentlyContinue
    }
}

function Check-AgentUpdate {
    param([string]$AgentToken)
    if ($TrayMode) { return $false }
    
    if (Test-Path $UpdateLockFile) {
        $lockAge = (Get-Date) - (Get-Item $UpdateLockFile).LastWriteTime
        if ($lockAge.TotalMinutes -lt 5) {
            Write-Log "Update already in progress, skipping check"
            return $false
        }
        Remove-Item $UpdateLockFile -Force -ErrorAction SilentlyContinue
    }
    
    try {
        Write-Log "Checking for agent updates (current version: $AgentVersion)..."
        $headers = @{ "Content-Type" = "application/json"; "x-agent-token" = $AgentToken }
        $response = Invoke-RestMethod -Uri "$ApiBaseUrl/agent-update?version=$AgentVersion" -Method GET -Headers $headers -TimeoutSec 30
        
        if (-not $response.update_available) {
            Write-Log "Agent is up to date"
            return $false
        }
        
        Write-Log "Update available: version $($response.current_version)"
        "updating" | Set-Content -Path $UpdateLockFile -Force
        
        # Download from edge function with token auth
        $scriptUrl = "$ApiBaseUrl".Replace("/agent-api", "/agent-script")
        Write-Log "Downloading updated agent..."
        $newScript = Invoke-RestMethod -Uri $scriptUrl -Method GET -Headers $headers -TimeoutSec 60
        
        if (-not $newScript -or $newScript.Length -lt 1000) {
            Write-Log "Downloaded script appears invalid, skipping update" -Level "WARN"
            Remove-Item $UpdateLockFile -Force -ErrorAction SilentlyContinue
            return $false
        }
        
        $backupPath = "$ConfigPath\\PeritusSecureAgent.backup.ps1"
        if (Test-Path $ScriptPath) {
            Copy-Item $ScriptPath $backupPath -Force
            Write-Log "Backed up current script to: $backupPath"
        }
        
        $newScript | Set-Content -Path $ScriptPath -Force -Encoding UTF8
        Write-Log "Updated agent script installed successfully"
        Remove-Item $UpdateLockFile -Force -ErrorAction SilentlyContinue
        
        Write-Log "Agent updated to version $($response.current_version). Exiting to run new version."
        exit 0
    } catch {
        Write-Log "Update check failed: $_" -Level "WARN"
        Remove-Item $UpdateLockFile -Force -ErrorAction SilentlyContinue
        return $false
    }
}

# Minimal script - full implementation is in the frontend-generated version
# This serves as a bootstrap that will be replaced by the full script on first update

Write-Log "Peritus Secure Agent v$AgentVersion starting..."

if ($Uninstall) {
    Write-Log "Uninstalling agent..."
    $existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if ($existingTask) { Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false }
    if (Test-Path $ConfigPath) { Remove-Item -Path $ConfigPath -Recurse -Force }
    Write-Log "Agent uninstalled"
    exit 0
}

# Load config or register
if (Test-Path $ConfigFile) {
    $config = Get-Content $ConfigFile | ConvertFrom-Json
    $agentToken = $config.agent_token
    Write-Log "Using existing registration"
} else {
    Write-Log "Registering new agent..."
    $body = @{
        organization_token = $OrganizationToken
        hostname = $env:COMPUTERNAME
        os_version = (Get-CimInstance Win32_OperatingSystem).Caption
        os_build = (Get-CimInstance Win32_OperatingSystem).BuildNumber
        defender_version = (Get-MpComputerStatus -ErrorAction SilentlyContinue).AMProductVersion
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$ApiBaseUrl/register" -Method POST -Body $body -ContentType "application/json"
    
    if ($response.success) {
        if (-not (Test-Path $ConfigPath)) { New-Item -ItemType Directory -Path $ConfigPath -Force | Out-Null }
        @{ agent_token = $response.agent_token; endpoint_id = $response.endpoint_id } | ConvertTo-Json | Set-Content $ConfigFile
        $agentToken = $response.agent_token
        Write-Log "Registered successfully: $($response.endpoint_id)"
    } else {
        throw "Registration failed"
    }
}

# Check for updates - will exit and restart if update found
Check-AgentUpdate -AgentToken $agentToken

# Send heartbeat
$status = Get-MpComputerStatus -ErrorAction SilentlyContinue
if ($status) {
    $heartbeat = @{
        realtime_protection_enabled = $status.RealTimeProtectionEnabled
        antivirus_enabled = $status.AntivirusEnabled
        antispyware_enabled = $status.AntispywareEnabled
        antivirus_signature_age = $status.AntivirusSignatureAge
    } | ConvertTo-Json
    
    $headers = @{ "Content-Type" = "application/json"; "x-agent-token" = $agentToken }
    Invoke-RestMethod -Uri "$ApiBaseUrl/heartbeat" -Method POST -Body $heartbeat -Headers $headers | Out-Null
    Write-Log "Heartbeat sent"
}

# Ensure Windows Firewall and audit logging are enabled for telemetry collection
function Ensure-FirewallTelemetry {
    try {
        Write-Log "Checking Windows Firewall and audit logging prerequisites..."
        
        \$changed = \$false
        \$profiles = @("Domain", "Private", "Public")
        
        # Check each firewall profile
        foreach (\$profile in \$profiles) {
            \$fwProfile = Get-NetFirewallProfile -Name \$profile -ErrorAction SilentlyContinue
            
            if (\$fwProfile) {
                # Enable firewall if disabled
                if (-not \$fwProfile.Enabled) {
                    Write-Log "Enabling Windows Firewall for \$profile profile..."
                    Set-NetFirewallProfile -Name \$profile -Enabled True -ErrorAction Stop
                    \$changed = \$true
                }
                
                # Enable logging for allowed and blocked connections
                if (-not \$fwProfile.LogAllowed -or -not \$fwProfile.LogBlocked) {
                    Write-Log "Enabling firewall logging for \$profile profile..."
                    Set-NetFirewallProfile -Name \$profile -LogAllowed True -LogBlocked True -ErrorAction Stop
                    \$changed = \$true
                }
            }
        }
        
        # Enable audit policy for Filtering Platform Connection (generates 5156/5157 events)
        try {
            \$auditResult = auditpol /get /subcategory:"Filtering Platform Connection" 2>\$null
            if (\$auditResult -notmatch "Success" -or \$auditResult -notmatch "Failure") {
                Write-Log "Enabling Filtering Platform Connection audit policy..."
                \$null = auditpol /set /subcategory:"Filtering Platform Connection" /success:enable /failure:enable 2>\$null
                \$changed = \$true
            }
        } catch {
            Write-Log "Could not configure audit policy (may require elevated privileges): \$_" -Level "DEBUG"
        }
        
        if (\$changed) {
            Write-Log "Firewall telemetry prerequisites configured successfully"
        } else {
            Write-Log "Firewall telemetry prerequisites already configured"
        }
        
        return \$true
    } catch {
        Write-Log "Error configuring firewall prerequisites: \$_" -Level "WARN"
        return \$false
    }
}

# Collect and send Firewall audit logs
function Collect-FirewallLogs {
    param([string]$AgentToken)
    
    \$FirewallLogTimeFile = "\$ConfigPath\\firewall_log_time.txt"
    \$headers = @{ "Content-Type" = "application/json"; "x-agent-token" = \$AgentToken }
    
    try {
        # Get last collection time or default to 60 minutes ago
        if (Test-Path \$FirewallLogTimeFile) {
            \$lastTime = [DateTimeOffset]::Parse((Get-Content \$FirewallLogTimeFile -Raw).Trim())
        } else {
            \$lastTime = [DateTimeOffset]::UtcNow.AddMinutes(-60)
        }
        
        Write-Log "Collecting firewall logs since: \$(\$lastTime.ToString('o'))"
        
        # Query Windows Firewall event logs (Security log, Event IDs: 5152=dropped, 5156=allowed, 5157=blocked)
        \$firewallEvents = @()
        
        try {
            # Try Security log first for firewall filtering platform events
            \$events = Get-WinEvent -FilterHashtable @{
                LogName = 'Security'
                Id = 5152, 5156, 5157
                StartTime = \$lastTime.LocalDateTime
            } -MaxEvents 500 -ErrorAction SilentlyContinue
            
            if (\$events) {
                \$firewallEvents += \$events
            }
        } catch {
            Write-Log "Security log query: \$_" -Level "DEBUG"
        }
        
        try {
            # Also check Windows Firewall with Advanced Security log
            \$events = Get-WinEvent -FilterHashtable @{
                LogName = 'Microsoft-Windows-Windows Firewall With Advanced Security/Firewall'
                StartTime = \$lastTime.LocalDateTime
            } -MaxEvents 500 -ErrorAction SilentlyContinue
            
            if (\$events) {
                \$firewallEvents += \$events
            }
        } catch {
            Write-Log "Firewall log query: \$_" -Level "DEBUG"
        }
        
        if (\$firewallEvents.Count -eq 0) {
            Write-Log "No new firewall events found"
            return
        }
        
        Write-Log "Found \$(\$firewallEvents.Count) firewall events"
        
        \$logs = @()
        foreach (\$event in \$firewallEvents) {
            try {
                \$xml = [xml]\$event.ToXml()
                \$eventData = @{}
                
                # Parse event data fields
                foreach (\$data in \$xml.Event.EventData.Data) {
                    \$eventData[\$data.Name] = \$data.'#text'
                }
                
                # Map common service ports to names
                \$port = [int](\$eventData['DestPort'] ?? \$eventData['LocalPort'] ?? 0)
                \$serviceName = switch (\$port) {
                    22 { "SSH" }
                    80 { "HTTP" }
                    443 { "HTTPS" }
                    445 { "SMB" }
                    3389 { "RDP" }
                    5985 { "WinRM" }
                    5986 { "WinRM-HTTPS" }
                    default { "Port-\$port" }
                }
                
                \$direction = if (\$eventData['Direction'] -eq '%%14592') { 'inbound' } else { 'outbound' }
                \$action = switch (\$event.Id) {
                    5152 { "drop" }
                    5156 { "allow" }
                    5157 { "block" }
                    default { "audit" }
                }
                
                \$log = @{
                    event_time = \$event.TimeCreated.ToUniversalTime().ToString('o')
                    service_name = \$serviceName
                    local_port = \$port
                    remote_address = \$eventData['SourceAddress'] ?? \$eventData['RemoteAddress'] ?? "0.0.0.0"
                    remote_port = [int](\$eventData['SourcePort'] ?? \$eventData['RemotePort'] ?? 0)
                    protocol = if (\$eventData['Protocol'] -eq '6') { 'TCP' } elseif (\$eventData['Protocol'] -eq '17') { 'UDP' } else { 'OTHER' }
                    direction = \$direction
                    action = \$action
                }
                
                \$logs += \$log
            } catch {
                Write-Log "Error parsing firewall event: \$_" -Level "DEBUG"
            }
        }
        
        if (\$logs.Count -gt 0) {
            \$body = @{ logs = \$logs } | ConvertTo-Json -Depth 10 -Compress
            \$response = Invoke-RestMethod -Uri "\$ApiBaseUrl/firewall-logs" -Method POST -Body \$body -Headers \$headers -TimeoutSec 30
            Write-Log "Sent \$(\$logs.Count) firewall logs to server (inserted: \$(\$response.count))"
        }
        
        # Update cursor
        [DateTimeOffset]::UtcNow.ToString('o') | Set-Content -Path \$FirewallLogTimeFile -Force
        
    } catch {
        Write-Log "Error collecting firewall logs: \$_" -Level "WARN"
    }
}

# Ensure firewall telemetry prerequisites before collecting logs
Ensure-FirewallTelemetry
Collect-FirewallLogs -AgentToken \$agentToken

Write-Log "Agent run complete"
`;
}
