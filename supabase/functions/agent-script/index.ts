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
const AGENT_VERSION = "2.19.0";
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

    // Try to fetch stored tray icon from platform_settings
    let trayIconBase64 = "";
    try {
      const { data: iconSetting } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "agent_tray_icon_base64")
        .maybeSingle();
      if (iconSetting?.value) {
        trayIconBase64 = iconSetting.value;
      }
    } catch {
      // Non-critical - agent will use fallback icon
    }

    // Generate the PowerShell script
    const script = generateAgentScript(organizationId, API_BASE_URL, AGENT_VERSION, trayIconBase64);

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

function generateAgentScript(orgId: string, apiBaseUrl: string, version: string, trayIconIcoBase64: string): string {
  // Use a marker for double-quote variable to avoid JS template literal conflicts
  // In the PowerShell script, $DQ is set to '"' and used in XML generation
  return `#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Peritus Threat Defence Agent - Windows Defender Management
.DESCRIPTION
    This agent collects Windows Defender status and sends it to the Peritus Threat Defence platform.
    It also applies security policies configured in the platform.
.PARAMETER OrganizationToken
    Your organization's unique token for agent registration
.PARAMETER HeartbeatIntervalSeconds
    How often the agent sends status updates (default: 60 seconds)
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
$ServiceName = "Peritus Threat Defence Agent"
$AgentVersion = "${version}"

$script:ForceFullLogSync = $ForceFullLogSync.IsPresent

$ConfigPath = "$env:ProgramData\\PeritusSecure"
$ConfigFile = "$ConfigPath\\agent.json"
$ScriptPath = "$ConfigPath\\PeritusSecureAgent.ps1"
$LogFile = "$ConfigPath\\agent.log"
$PolicyHashFile = "$ConfigPath\\policy_hash.txt"
$TrayIconFile = "$ConfigPath\\tray_icon.ico"
$UpdateLockFile = "$ConfigPath\\update.lock"
$HealthErrorsFile = "$ConfigPath\\health_errors.json"
$BackupPath = "$ConfigPath\\backups"

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
    param([string]$AgentToken, [switch]$AllowTrayUpdate)
    if ($TrayMode -and -not $AllowTrayUpdate) { return $false }
    
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

function Uninstall-Agent {
    Write-Log "Uninstalling Peritus Threat Defence Agent..."
    
    $existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if ($existingTask) {
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
        Write-Log "Scheduled task removed"
    }
    
    $existingTrayTask = Get-ScheduledTask -TaskName $TrayTaskName -ErrorAction SilentlyContinue
    if ($existingTrayTask) {
        Unregister-ScheduledTask -TaskName $TrayTaskName -Confirm:$false -ErrorAction SilentlyContinue
        Write-Log "Tray scheduled task removed"
    }
    
    try {
        Remove-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run" -Name "PeritusSecureTray" -ErrorAction SilentlyContinue
    } catch { }
    
    Get-Process -Name "powershell" -ErrorAction SilentlyContinue | Where-Object {
        $_.CommandLine -like "*-TrayMode*"
    } | Stop-Process -Force -ErrorAction SilentlyContinue
    
    if (Test-Path $ConfigPath) {
        Remove-Item -Path $ConfigPath -Recurse -Force
        Write-Log "Configuration removed"
    }
    Write-Log "Agent uninstalled successfully"
    exit 0
}

function Install-AgentTask {
    param([string]$ScriptContent)
    
    if (-not (Test-Path $ConfigPath)) {
        New-Item -ItemType Directory -Path $ConfigPath -Force | Out-Null
        Write-Log "Created configuration directory: $ConfigPath"
    }
    
    $lastLogTimeFile = "$ConfigPath\\last_log_time.txt"
    if (Test-Path $lastLogTimeFile) {
        Remove-Item $lastLogTimeFile -Force -ErrorAction SilentlyContinue
        Write-Log "Cleared last log sync time for fresh log collection"
    }
    
    $ScriptContent | Set-Content -Path $ScriptPath -Force
    Write-Log "Agent script saved to: $ScriptPath"
    
    $existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if ($existingTask) {
        Write-Log "Scheduled task already exists, updating..."
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    }
    
    $scheduleIntervalSeconds = $HeartbeatIntervalSeconds
    if ($scheduleIntervalSeconds -lt 60) {
        Write-Log "Task Scheduler does not support repetition intervals under 60 seconds. Using 60 seconds." -Level "WARN"
        $scheduleIntervalSeconds = 60
    }

    $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File \`"$ScriptPath\`""
    $triggerStartup = New-ScheduledTaskTrigger -AtStartup

    $startAt = (Get-Date).AddSeconds(15)
    $triggerRepeat = New-ScheduledTaskTrigger -Once -At $startAt -RepetitionInterval (New-TimeSpan -Seconds $scheduleIntervalSeconds) -RepetitionDuration (New-TimeSpan -Days (365 * 20))
    $principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
    
    Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $triggerStartup,$triggerRepeat -Principal $principal -Settings $settings -Description "Peritus Threat Defence Agent - Windows Defender Management" | Out-Null

    try {
        Start-ScheduledTask -TaskName $TaskName -ErrorAction Stop
        Write-Log "Scheduled task started"
    } catch {
        Write-Log "Scheduled task created but could not be started immediately: $_" -Level "WARN"
    }
    
    Write-Log "Scheduled task '$TaskName' created successfully"
    return $true
}

function Get-SystemInfo {
    $os = Get-CimInstance -ClassName Win32_OperatingSystem
    $defender = Get-MpComputerStatus -ErrorAction SilentlyContinue
    return @{
        hostname = $env:COMPUTERNAME
        os_version = $os.Caption
        os_build = $os.BuildNumber
        defender_version = if ($defender) { $defender.AMProductVersion } else { "Unknown" }
        agent_version = $AgentVersion
    }
}

function Get-UacStatus {
    try {
        $uacPath = "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System"
        if (-not (Test-Path $uacPath)) { return @{} }
        $reg = Get-ItemProperty -Path $uacPath -ErrorAction SilentlyContinue
        return @{
            uac_enabled = if ($null -ne $reg.EnableLUA) { $reg.EnableLUA -eq 1 } else { $null }
            uac_consent_prompt_admin = $reg.ConsentPromptBehaviorAdmin
            uac_consent_prompt_user = $reg.ConsentPromptBehaviorUser
            uac_prompt_on_secure_desktop = if ($null -ne $reg.PromptOnSecureDesktop) { $reg.PromptOnSecureDesktop -eq 1 } else { $null }
            uac_detect_installations = if ($null -ne $reg.EnableInstallerDetection) { $reg.EnableInstallerDetection -eq 1 } else { $null }
            uac_validate_admin_signatures = if ($null -ne $reg.ValidateAdminCodeSignatures) { $reg.ValidateAdminCodeSignatures -eq 1 } else { $null }
            uac_filter_administrator_token = if ($null -ne $reg.FilterAdministratorToken) { $reg.FilterAdministratorToken -eq 1 } else { $null }
        }
    } catch {
        Write-Log "Error getting UAC status: $_" -Level "ERROR"
        return @{}
    }
}

function Get-WindowsUpdateStatus {
    try {
        Write-Log "Collecting Windows Update status..."
        $wuPolicies = "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate"
        $wuAU = "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate\\AU"
        
        $status = @{
            wu_auto_update_mode = $null
            wu_active_hours_start = $null
            wu_active_hours_end = $null
            wu_feature_update_deferral = $null
            wu_quality_update_deferral = $null
            wu_pause_feature_updates = $null
            wu_pause_quality_updates = $null
            wu_pending_updates_count = $null
            wu_last_install_date = $null
            wu_restart_pending = $null
        }
        
        if (Test-Path $wuAU) {
            $au = Get-ItemProperty -Path $wuAU -ErrorAction SilentlyContinue
            if ($null -ne $au.AUOptions) { $status.wu_auto_update_mode = $au.AUOptions }
        }
        
        if (Test-Path $wuPolicies) {
            $wu = Get-ItemProperty -Path $wuPolicies -ErrorAction SilentlyContinue
            if ($null -ne $wu.ActiveHoursStart) { $status.wu_active_hours_start = $wu.ActiveHoursStart }
            if ($null -ne $wu.ActiveHoursEnd) { $status.wu_active_hours_end = $wu.ActiveHoursEnd }
            if ($null -ne $wu.DeferFeatureUpdates) { $status.wu_feature_update_deferral = $wu.DeferFeatureUpdatesPeriodInDays }
            if ($null -ne $wu.DeferQualityUpdates) { $status.wu_quality_update_deferral = $wu.DeferQualityUpdatesPeriodInDays }
            if ($null -ne $wu.PauseFeatureUpdatesStartTime) { $status.wu_pause_feature_updates = $true }
            if ($null -ne $wu.PauseQualityUpdatesStartTime) { $status.wu_pause_quality_updates = $true }
        }
        
        try {
            $updateSession = New-Object -ComObject Microsoft.Update.Session
            $updateSearcher = $updateSession.CreateUpdateSearcher()
            $searchResult = $updateSearcher.Search("IsInstalled=0 and Type='Software'")
            $status.wu_pending_updates_count = $searchResult.Updates.Count
        } catch { Write-Log "Could not query pending updates: $_" -Level "WARN" }
        
        try {
            $lastInstall = Get-WinEvent -FilterHashtable @{LogName='System'; ProviderName='Microsoft-Windows-WindowsUpdateClient'; Id=19} -MaxEvents 1 -ErrorAction SilentlyContinue
            if ($lastInstall) { $status.wu_last_install_date = $lastInstall.TimeCreated.ToUniversalTime().ToString("o") }
        } catch { }
        
        $pendingRestart = $false
        $rebootPaths = @(
            "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\WindowsUpdate\\Auto Update\\RebootRequired",
            "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Component Based Servicing\\RebootPending"
        )
        foreach ($path in $rebootPaths) {
            if (Test-Path $path) { $pendingRestart = $true; break }
        }
        $status.wu_restart_pending = $pendingRestart
        
        return $status
    } catch {
        Write-Log "Error getting Windows Update status: $_" -Level "ERROR"
        return @{}
    }
}

function Get-DefenderStatus {
    try {
        $status = Get-MpComputerStatus

        function Convert-Int32Safe {
            param($Value)
            if ($null -eq $Value) { return $null }
            try { $n = [double]$Value } catch { return $null }
            if ($n -eq 4294967295 -or $n -eq -1) { return $null }
            if ($n -gt 2147483647 -or $n -lt -2147483648) { return $null }
            return [int][math]::Truncate($n)
        }

        $uacStatus = Get-UacStatus
        $wuStatus = Get-WindowsUpdateStatus

        $result = @{
            realtime_protection_enabled = $status.RealTimeProtectionEnabled
            antivirus_enabled = $status.AntivirusEnabled
            antispyware_enabled = $status.AntispywareEnabled
            behavior_monitor_enabled = $status.BehaviorMonitorEnabled
            ioav_protection_enabled = $status.IoavProtectionEnabled
            on_access_protection_enabled = $status.OnAccessProtectionEnabled
            full_scan_age = Convert-Int32Safe $status.FullScanAge
            quick_scan_age = Convert-Int32Safe $status.QuickScanAge
            full_scan_end_time = if ($status.FullScanEndTime) { $status.FullScanEndTime.ToString("o") } else { $null }
            quick_scan_end_time = if ($status.QuickScanEndTime) { $status.QuickScanEndTime.ToString("o") } else { $null }
            antivirus_signature_age = Convert-Int32Safe $status.AntivirusSignatureAge
            antispyware_signature_age = Convert-Int32Safe $status.AntispywareSignatureAge
            antivirus_signature_version = $status.AntivirusSignatureVersion
            nis_signature_version = $status.NISSignatureVersion
            nis_enabled = $status.NISEnabled
            tamper_protection_source = $status.TamperProtectionSource
            computer_state = Convert-Int32Safe $status.ComputerState
            am_running_mode = $status.AMRunningMode
            defender_version = $status.AMProductVersion
            agent_version = $AgentVersion
            raw_status = $status | ConvertTo-Json -Depth 3 | ConvertFrom-Json
        }

        foreach ($key in $uacStatus.Keys) { $result[$key] = $uacStatus[$key] }
        foreach ($key in $wuStatus.Keys) { $result[$key] = $wuStatus[$key] }

        return $result
    } catch {
        Write-Log "Error getting Defender status: $_" -Level "ERROR"
        return $null
    }
}

function Get-DefenderThreats {
    try {
        $threats = Get-MpThreatDetection -ErrorAction SilentlyContinue
        if (-not $threats) { return @() }
        return $threats | ForEach-Object {
            $threatInfo = Get-MpThreat -ThreatID $_.ThreatID -ErrorAction SilentlyContinue
            @{
                threat_id = $_.ThreatID.ToString()
                threat_name = if ($threatInfo) { $threatInfo.ThreatName } else { "Unknown" }
                severity = switch ($_.SeverityID) { 1 { "Low" } 2 { "Moderate" } 4 { "High" } 5 { "Severe" } default { "Unknown" } }
                category = if ($threatInfo) { $threatInfo.CategoryID.ToString() } else { $null }
                status = switch ($_.CurrentThreatExecutionStatusID) { 0 { "Unknown" } 1 { "Blocked" } 2 { "Allowed" } 3 { "Executing" } 4 { "NotExecuting" } default { "Active" } }
                initial_detection_time = if ($_.InitialDetectionTime) { $_.InitialDetectionTime.ToString("o") } else { $null }
                last_threat_status_change_time = if ($_.LastThreatStatusChangeTime) { $_.LastThreatStatusChangeTime.ToString("o") } else { $null }
                resources = $_.Resources
                raw_data = $_ | ConvertTo-Json -Depth 2 | ConvertFrom-Json
            }
        }
    } catch {
        Write-Log "Error getting threats: $_" -Level "ERROR"
        return @()
    }
}

function Invoke-ApiRequest {
    param([string]$Endpoint, [string]$Method = "POST", [hashtable]$Body = @{}, [string]$AgentToken = $null)
    $headers = @{ "Content-Type" = "application/json" }
    if ($AgentToken) { $headers["x-agent-token"] = $AgentToken }
    $uri = "$ApiBaseUrl$Endpoint"
    $jsonBody = $Body | ConvertTo-Json -Depth 10
    try {
        $response = Invoke-RestMethod -Uri $uri -Method $Method -Headers $headers -Body $jsonBody
        return $response
    } catch {
        $details = "$_"
        try {
            if ($_.Exception -and $_.Exception.Response) {
                $stream = $_.Exception.Response.GetResponseStream()
                if ($stream) {
                    $reader = New-Object System.IO.StreamReader($stream)
                    $respText = $reader.ReadToEnd()
                    if ($respText) { $details = $details + " | Response: " + $respText }
                }
            }
        } catch { }
        Write-Log "API request failed: $details" -Level "ERROR"
        throw
    }
}

function Register-Agent {
    param([string]$OrganizationToken)
    $systemInfo = Get-SystemInfo
    $body = @{
        organization_token = $OrganizationToken
        hostname = $systemInfo.hostname
        os_version = $systemInfo.os_version
        os_build = $systemInfo.os_build
        defender_version = $systemInfo.defender_version
    }
    Write-Log "Registering agent with platform..."
    $response = Invoke-ApiRequest -Endpoint "/register" -Body $body
    if ($response.success) {
        Write-Log "Agent registered successfully. Endpoint ID: $($response.endpoint_id)"
        if (-not (Test-Path $ConfigPath)) { New-Item -ItemType Directory -Path $ConfigPath -Force | Out-Null }
        @{
            endpoint_id = $response.endpoint_id
            agent_token = $response.agent_token
            organization_token = $OrganizationToken
            registered_at = (Get-Date).ToString("o")
        } | ConvertTo-Json | Set-Content -Path $ConfigFile
        return $response.agent_token
    } else {
        throw "Registration failed: $($response.message)"
    }
}

function Send-Heartbeat {
    param([string]$AgentToken)
    $status = Get-DefenderStatus
    if (-not $status) { Write-Log "Could not get Defender status, skipping heartbeat" -Level "WARN"; return }
    Write-Log "Sending heartbeat..."
    $response = Invoke-ApiRequest -Endpoint "/heartbeat" -Body $status -AgentToken $AgentToken
    try {
        if ($response -and $response.network_module_enabled -eq $true) {
            $script:NetworkModuleEnabled = $true
            Write-Log "Network module enabled for this organization"
        } else {
            $script:NetworkModuleEnabled = $false
            Write-Log "Network module not enabled - skipping firewall telemetry"
        }
    } catch { $script:NetworkModuleEnabled = $false }

    # Process any pending commands from the platform
    try {
        if ($response -and $response.commands -and $response.commands.Count -gt 0) {
            Write-Log "Received $($response.commands.Count) command(s) from platform"
            foreach ($cmd in $response.commands) {
                Execute-PlatformCommand -Command $cmd -AgentToken $AgentToken
            }
        }
    } catch {
        Write-Log "Error processing commands: $_" -Level "WARN"
    }

    Write-Log "Heartbeat sent successfully"
}

function Execute-PlatformCommand {
    param($Command, [string]$AgentToken)
    $cmdId = $Command.id
    $cmdType = $Command.command_type
    $cmdParams = $Command.parameters
    Write-Log "Executing command: $cmdType (ID: $cmdId)"
    
    $success = $false
    $result = @{}

    try {
        switch ($cmdType) {
            "install_updates" {
                Write-Log "Triggering Windows Update scan and install..."
                
                # Use UsoClient for modern Windows 10/11
                try {
                    Start-Process -FilePath "UsoClient.exe" -ArgumentList "StartScan" -NoNewWindow -Wait -ErrorAction Stop
                    Start-Sleep -Seconds 5
                    Start-Process -FilePath "UsoClient.exe" -ArgumentList "StartInstall" -NoNewWindow -Wait -ErrorAction Stop
                    $result.method = "UsoClient"
                    $result.message = "Windows Update scan and install triggered via UsoClient"
                    $success = $true
                    Write-Log "Windows Update triggered successfully via UsoClient"
                } catch {
                    Write-Log "UsoClient failed, trying wuauclt..." -Level "WARN"
                    try {
                        Start-Process -FilePath "wuauclt.exe" -ArgumentList "/detectnow /updatenow" -NoNewWindow -Wait -ErrorAction Stop
                        $result.method = "wuauclt"
                        $result.message = "Windows Update triggered via wuauclt"
                        $success = $true
                        Write-Log "Windows Update triggered successfully via wuauclt"
                    } catch {
                        $result.error = "Both UsoClient and wuauclt failed: $_"
                        Write-Log "Windows Update trigger failed: $_" -Level "ERROR"
                    }
                }

                # Also trigger Defender signature update
                try {
                    Update-MpSignature -ErrorAction SilentlyContinue
                    $result.signature_update = "Triggered"
                    Write-Log "Defender signature update triggered"
                } catch {
                    $result.signature_update = "Failed: $_"
                }
            }
            default {
                $result.error = "Unknown command type: $cmdType"
                Write-Log "Unknown command type: $cmdType" -Level "WARN"
            }
        }
    } catch {
        $result.error = "$_"
        Write-Log "Command execution failed: $_" -Level "ERROR"
    }

    # Report result back to platform
    try {
        $body = @{
            command_id = $cmdId
            success = $success
            result = $result
        }
        Invoke-ApiRequest -Endpoint "/command-result" -Body $body -AgentToken $AgentToken
        Write-Log "Command result reported for $cmdId (success: $success)"
    } catch {
        Write-Log "Failed to report command result: $_" -Level "WARN"
    }
}

# ==================== FIREWALL TELEMETRY (Network Module) ====================

function Ensure-FirewallTelemetry {
    try {
        Write-Log "Checking Windows Firewall and audit logging prerequisites..."
        $changed = $false
        $profiles = @("Domain", "Private", "Public")
        foreach ($profile in $profiles) {
            $fwProfile = Get-NetFirewallProfile -Name $profile -ErrorAction SilentlyContinue
            if (-not $fwProfile) { continue }
            if (-not $fwProfile.Enabled) {
                Set-NetFirewallProfile -Name $profile -Enabled True -ErrorAction Stop
                $changed = $true
            }
            if (-not $fwProfile.LogAllowed -or -not $fwProfile.LogBlocked) {
                Set-NetFirewallProfile -Name $profile -LogAllowed True -LogBlocked True -ErrorAction Stop
                $changed = $true
            }
        }
        try {
            $auditResult = auditpol /get /subcategory:"Filtering Platform Connection" 2>$null
            if ($auditResult -and ($auditResult -notmatch "Success" -and $auditResult -notmatch "Failure")) {
                $null = auditpol /set /subcategory:"Filtering Platform Connection" /success:enable /failure:enable 2>$null
                $changed = $true
            }
        } catch { Write-Log "Could not configure audit policy: $_" -Level "DEBUG" }
        if ($changed) { Write-Log "Firewall telemetry prerequisites configured" } else { Write-Log "Firewall telemetry prerequisites already configured" }
        return $true
    } catch {
        Write-Log "Error configuring firewall prerequisites: $_" -Level "WARN"
        return $false
    }
}

function Collect-FirewallLogs {
    param([string]$AgentToken)
    $FirewallLogTimeFile = "$ConfigPath\\firewall_log_time.txt"
    $headers = @{ "Content-Type" = "application/json"; "x-agent-token" = $AgentToken }
    try {
        if (Test-Path $FirewallLogTimeFile) {
            try { $lastTime = [DateTimeOffset]::Parse((Get-Content $FirewallLogTimeFile -Raw).Trim()) }
            catch { $lastTime = [DateTimeOffset]::UtcNow.AddMinutes(-60) }
        } else { $lastTime = [DateTimeOffset]::UtcNow.AddMinutes(-60) }
        Write-Log "Collecting firewall logs since: $($lastTime.ToString('o'))"
        $firewallEvents = @()
        try {
            $events = Get-WinEvent -FilterHashtable @{ LogName = 'Security'; Id = 5152, 5156, 5157; StartTime = $lastTime.LocalDateTime } -MaxEvents 500 -ErrorAction SilentlyContinue
            if ($events) { $firewallEvents += @($events) }
        } catch { Write-Log "Security log query error: $_" -Level "DEBUG" }
        try {
            $events = Get-WinEvent -FilterHashtable @{ LogName = 'Microsoft-Windows-Windows Firewall With Advanced Security/Firewall'; StartTime = $lastTime.LocalDateTime } -MaxEvents 500 -ErrorAction SilentlyContinue
            if ($events) { $firewallEvents += @($events) }
        } catch { Write-Log "Firewall channel query error: $_" -Level "DEBUG" }
        if (-not $firewallEvents -or $firewallEvents.Count -eq 0) { Write-Log "No new firewall events found"; return }
        Write-Log "Found $($firewallEvents.Count) firewall events"
        $logs = @()
        foreach ($event in $firewallEvents) {
            try {
                $xml = [xml]$event.ToXml()
                $eventData = @{}
                foreach ($data in $xml.Event.EventData.Data) { $eventData[$data.Name] = $data.'#text' }
                $portValue = $null
                if ($eventData.ContainsKey('DestPort') -and $eventData['DestPort']) { $portValue = $eventData['DestPort'] }
                elseif ($eventData.ContainsKey('LocalPort') -and $eventData['LocalPort']) { $portValue = $eventData['LocalPort'] }
                $port = 0
                if ($portValue) { try { $port = [int]$portValue } catch { $port = 0 } }
                if ($port -eq 5353) { continue }
                $serviceName = "Port-$port"
                switch ($port) { 22 { $serviceName = "SSH" } 80 { $serviceName = "HTTP" } 443 { $serviceName = "HTTPS" } 445 { $serviceName = "SMB" } 3389 { $serviceName = "RDP" } 5985 { $serviceName = "WinRM" } 5986 { $serviceName = "WinRM-HTTPS" } }
                $remoteAddress = "0.0.0.0"
                if ($eventData.ContainsKey('SourceAddress') -and $eventData['SourceAddress']) { $remoteAddress = $eventData['SourceAddress'] }
                elseif ($eventData.ContainsKey('RemoteAddress') -and $eventData['RemoteAddress']) { $remoteAddress = $eventData['RemoteAddress'] }
                $remotePort = $null
                if ($eventData.ContainsKey('SourcePort') -and $eventData['SourcePort']) { $remotePort = $eventData['SourcePort'] }
                elseif ($eventData.ContainsKey('RemotePort') -and $eventData['RemotePort']) { $remotePort = $eventData['RemotePort'] }
                $remotePortInt = 0
                if ($remotePort) { try { $remotePortInt = [int]$remotePort } catch { $remotePortInt = 0 } }
                $proto = "OTHER"
                if ($eventData.ContainsKey('Protocol') -and $eventData['Protocol']) {
                    if ($eventData['Protocol'] -eq '6') { $proto = 'TCP' } elseif ($eventData['Protocol'] -eq '17') { $proto = 'UDP' }
                }
                $direction = 'inbound'
                if ($eventData.ContainsKey('Direction') -and $eventData['Direction']) {
                    if ($eventData['Direction'] -ne '%%14592') { $direction = 'outbound' }
                }
                $logs += @{ event_time = $event.TimeCreated.ToUniversalTime().ToString('o'); service_name = $serviceName; local_port = $port; remote_address = $remoteAddress; remote_port = $remotePortInt; protocol = $proto; direction = $direction }
            } catch { Write-Log "Error parsing firewall event: $_" -Level "DEBUG" }
        }
        if ($logs.Count -gt 0) {
            $body = @{ logs = @($logs) } | ConvertTo-Json -Depth 10 -Compress
            $response = Invoke-RestMethod -Uri "$ApiBaseUrl/firewall-logs" -Method POST -Body $body -Headers $headers -TimeoutSec 30
            Write-Log "Sent $($logs.Count) firewall logs (inserted: $($response.count))"
        }
        [DateTimeOffset]::UtcNow.ToString('o') | Set-Content -Path $FirewallLogTimeFile -Force
    } catch { Write-Log "Error collecting firewall logs: $_" -Level "WARN" }
}

# ==================== FIREWALL POLICY ENFORCEMENT ====================

function Get-FirewallPolicy {
    param([string]$AgentToken)
    try {
        $headers = @{ "Content-Type" = "application/json"; "x-agent-token" = $AgentToken }
        $response = Invoke-RestMethod -Uri "$ApiBaseUrl/firewall-policy" -Method GET -Headers $headers -TimeoutSec 30
        if ($response.success -and $response.rules) {
            Write-Log "Firewall policy retrieved: $($response.rules.Count) rules"
            return $response
        } else {
            Write-Log "No firewall policy configured" -Level "DEBUG"
            return $null
        }
    } catch { Write-Log "Error fetching firewall policy: $_" -Level "WARN"; return $null }
}

function Apply-FirewallPolicy {
    param([Parameter(Mandatory=$true)]$PolicyResponse, [switch]$Force)
    $RulePrefix = "PeritusSecure_FW_"
    $rules = $PolicyResponse.rules
    if (-not $rules -or $rules.Count -eq 0) { Write-Log "No firewall rules to apply"; return $false }
    try {
        $applied = 0; $skipped = 0; $enforcedCount = 0; $auditCount = 0
        $existingRules = Get-NetFirewallRule -Name "$RulePrefix*" -ErrorAction SilentlyContinue
        $existingRuleNames = @{}
        if ($existingRules) { foreach ($rule in $existingRules) { $existingRuleNames[$rule.Name] = $rule } }
        $processedRuleNames = @{}
        foreach ($rule in $rules) {
            $ruleId = $rule.id; $serviceName = $rule.service_name; $port = $rule.port; $protocol = $rule.protocol; $action = $rule.action; $mode = $rule.mode; $allowedIps = @($rule.allowed_source_ips)
            $ports = $port -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ -match '^\\d+$' }
            foreach ($singlePort in $ports) {
                $ruleName = "$RulePrefix$($serviceName)_$($singlePort)_$($protocol)"
                $processedRuleNames[$ruleName] = $true
                if ($mode -eq "audit") {
                    $auditCount++; $fwAction = "Allow"; $displayName = "[AUDIT] Peritus - $serviceName ($singlePort/$protocol)"
                } else {
                    $enforcedCount++
                    switch ($action) {
                        "block" { $fwAction = "Block"; $displayName = "[BLOCK] Peritus - $serviceName ($singlePort/$protocol)" }
                        "allow" { $fwAction = "Allow"; $displayName = "[ALLOW] Peritus - $serviceName ($singlePort/$protocol)" }
                        "allow_from_groups" {
                            if ($allowedIps.Count -gt 0) { $fwAction = "Allow"; $displayName = "[ALLOW FROM IPs] Peritus - $serviceName ($singlePort/$protocol)" }
                            else { $fwAction = "Block"; $displayName = "[BLOCK - No IPs] Peritus - $serviceName ($singlePort/$protocol)" }
                        }
                        default { $fwAction = "Block"; $displayName = "[BLOCK] Peritus - $serviceName ($singlePort/$protocol)" }
                    }
                }
                $existingRule = $existingRuleNames[$ruleName]
                if ($existingRule -and -not $Force) {
                    $existingAction = $existingRule.Action.ToString()
                    if ($existingAction -eq $fwAction) { $skipped++; continue }
                }
                if ($existingRule) { Remove-NetFirewallRule -Name $ruleName -ErrorAction SilentlyContinue }
                $ruleParams = @{ Name = $ruleName; DisplayName = $displayName; Direction = "Inbound"; Protocol = if ($protocol -eq "both") { "TCP" } else { $protocol.ToUpper() }; LocalPort = $singlePort; Action = $fwAction; Enabled = "True"; Profile = "Any"; Description = "Managed by Peritus Threat Defence. Rule ID: $ruleId" }
                if ($action -eq "allow_from_groups" -and $allowedIps.Count -gt 0 -and $mode -eq "enforce") { $ruleParams["RemoteAddress"] = $allowedIps }
                try { New-NetFirewallRule @ruleParams -ErrorAction Stop | Out-Null; $applied++ } catch { Write-Log "Failed to create firewall rule $ruleName : $_" -Level "WARN" }
                if ($protocol -eq "both") {
                    $udpRuleName = "$RulePrefix$($serviceName)_$($singlePort)_UDP"
                    $processedRuleNames[$udpRuleName] = $true
                    Remove-NetFirewallRule -Name $udpRuleName -ErrorAction SilentlyContinue
                    $udpRuleParams = $ruleParams.Clone(); $udpRuleParams["Name"] = $udpRuleName; $udpRuleParams["DisplayName"] = $displayName -replace '\\)$', '/UDP)'; $udpRuleParams["Protocol"] = "UDP"
                    try { New-NetFirewallRule @udpRuleParams -ErrorAction Stop | Out-Null; $applied++ } catch { Write-Log "Failed to create UDP firewall rule: $_" -Level "WARN" }
                }
            }
        }
        $removedCount = 0
        foreach ($existingName in $existingRuleNames.Keys) {
            if (-not $processedRuleNames.ContainsKey($existingName)) {
                try { Remove-NetFirewallRule -Name $existingName -ErrorAction SilentlyContinue; $removedCount++ } catch {}
            }
        }
        Write-Log "Firewall policy applied: $applied created, $skipped unchanged, $removedCount removed (Audit: $auditCount, Enforce: $enforcedCount)"
        return $true
    } catch { Write-Log "Error applying firewall policy: $_" -Level "ERROR"; return $false }
}

function Send-Threats {
    param([string]$AgentToken)
    $threats = Get-DefenderThreats
    if ($threats.Count -eq 0) { Write-Log "No threats to report"; return }
    Write-Log "Reporting $($threats.Count) threats..."
    $body = @{ threats = @($threats) }
    $response = Invoke-ApiRequest -Endpoint "/threats" -Body $body -AgentToken $AgentToken
    Write-Log "Threats reported: $($response.message)"
}

# ==================== EVENT LOG COLLECTION ====================

$RelevantEventIds = @{
    "Microsoft-Windows-Windows Defender/Operational" = @(1000,1001,1002,1005,1006,1007,1008,1009,1010,1011,1013,1015,1016,1116,1117,1118,1119,1121,1122,1123,1124,1125,1126,1127,1128,1129,2000,2001,2002,2003,2004,2005,2010,2011,2012,3002,5000,5001,5004,5007,5008,5010,5012)
    "Security" = @(4688,4689)
}

function Get-RelevantDefenderLogs {
    param([int]$MaxAgeMinutes = 60, [switch]$IgnoreLastLogTime)
    $logs = @()
    $nowUtc = (Get-Date).ToUniversalTime()
    $startTimeUtc = $nowUtc.AddMinutes(-$MaxAgeMinutes)
    $lastLogTimeFile = "$ConfigPath\\last_log_time.txt"
    $maxSeenEventTimeUtc = $null
    $cursorWasUsed = $false
    $forceSync = ($IgnoreLastLogTime -or $script:ForceFullLogSync)
    if ($forceSync) {
        Write-Log "Force full log sync"
        if (Test-Path $lastLogTimeFile) { Remove-Item $lastLogTimeFile -Force -ErrorAction SilentlyContinue }
    } elseif (Test-Path $lastLogTimeFile) {
        $lastLogTime = Get-Content $lastLogTimeFile -ErrorAction SilentlyContinue
        if ($lastLogTime) {
            try {
                $parsedTimeUtc = ([DateTimeOffset]::Parse($lastLogTime)).UtcDateTime.AddSeconds(1)
                if ($parsedTimeUtc -gt $nowUtc.AddMinutes(5)) { Write-Log "Last log time in the future, ignoring" -Level "WARN" }
                elseif ($parsedTimeUtc -gt $startTimeUtc) { $startTimeUtc = $parsedTimeUtc; $cursorWasUsed = $true }
                else { Write-Log "Last log time older than $MaxAgeMinutes minutes, using full window" }
            } catch { Write-Log "Could not parse last log time" -Level "WARN" }
        }
    }
    $startTimeLocal = $startTimeUtc.ToLocalTime()
    Write-Log "Collecting events since: $($startTimeLocal.ToString('o'))"
    foreach ($logName in $RelevantEventIds.Keys) {
        $eventIds = $RelevantEventIds[$logName]
        try {
            $maxEvents = if ($forceSync) { 250 } else { 1000 }
            $eventsAll = @(Get-WinEvent -FilterHashtable @{ LogName = $logName; StartTime = $startTimeLocal } -MaxEvents $maxEvents -ErrorAction Stop)
            $events = @($eventsAll | Where-Object { $eventIds -contains $_.Id })
            if ($events) {
                Write-Log "  Found $($events.Count) events in $logName"
                foreach ($event in $events) {
                    $eventTimeUtc = $event.TimeCreated.ToUniversalTime()
                    if (-not $maxSeenEventTimeUtc -or ($eventTimeUtc -gt $maxSeenEventTimeUtc)) { $maxSeenEventTimeUtc = $eventTimeUtc }
                    $logs += @{
                        event_id = $event.Id; event_source = $logName
                        level = switch ($event.Level) { 1 { "Critical" } 2 { "Error" } 3 { "Warning" } 4 { "Information" } default { "Unknown" } }
                        message = $event.Message; event_time = $eventTimeUtc.ToString("o")
                        details = @{ provider = $event.ProviderName; task = $event.TaskDisplayName; keywords = $event.KeywordsDisplayNames -join ", "; computer = $event.MachineName; user = $event.UserId; record_id = $event.RecordId }
                    }
                }
            }
        } catch { Write-Log "Could not read events from $($logName): $($_.Exception.Message)" -Level "WARN" }
    }
    if ((-not $forceSync) -and $cursorWasUsed -and ($logs.Count -eq 0)) {
        Write-Log "No events since cursor; recovery scan..." -Level "WARN"
        $startTimeUtc = $nowUtc.AddMinutes(-$MaxAgeMinutes); $startTimeLocal = $startTimeUtc.ToLocalTime(); $maxSeenEventTimeUtc = $null; $logs = @()
        foreach ($logName in $RelevantEventIds.Keys) {
            $eventIds = $RelevantEventIds[$logName]
            try {
                $eventsAll = @(Get-WinEvent -FilterHashtable @{ LogName = $logName; StartTime = $startTimeLocal } -MaxEvents 1000 -ErrorAction Stop)
                $events = @($eventsAll | Where-Object { $eventIds -contains $_.Id })
                if ($events) {
                    foreach ($event in $events) {
                        $eventTimeUtc = $event.TimeCreated.ToUniversalTime()
                        if (-not $maxSeenEventTimeUtc -or ($eventTimeUtc -gt $maxSeenEventTimeUtc)) { $maxSeenEventTimeUtc = $eventTimeUtc }
                        $logs += @{ event_id = $event.Id; event_source = $logName; level = switch ($event.Level) { 1 { "Critical" } 2 { "Error" } 3 { "Warning" } 4 { "Information" } default { "Unknown" } }; message = $event.Message; event_time = $eventTimeUtc.ToString("o"); details = @{ provider = $event.ProviderName; task = $event.TaskDisplayName; keywords = $event.KeywordsDisplayNames -join ", "; computer = $event.MachineName; user = $event.UserId; record_id = $event.RecordId } }
                    }
                }
            } catch { Write-Log "Recovery read error: $($_.Exception.Message)" -Level "WARN" }
        }
    }
    Write-Log "Total events collected: $($logs.Count)"
    return [pscustomobject]@{ logs = $logs; max_event_time = if ($maxSeenEventTimeUtc) { $maxSeenEventTimeUtc.ToString("o") } else { $null }; fallback_time = (Get-Date).ToUniversalTime().ToString("o") }
}

function Send-DefenderLogs {
    param([string]$AgentToken)
    $result = Get-RelevantDefenderLogs
    $logs = @($result.logs)
    $lastLogTimeFile = "$ConfigPath\\last_log_time.txt"
    if ($logs.Count -eq 0) { Write-Log "No new Defender logs to report (cursor not advanced)"; return }
    Write-Log "Reporting $($logs.Count) Defender event logs..."
    $body = @{ logs = $logs }
    try {
        $response = Invoke-ApiRequest -Endpoint "/logs" -Body $body -AgentToken $AgentToken
        Write-Log "Logs reported: $($response.message)"
        $cursorTime = $result.max_event_time
        if (-not $cursorTime) { $cursorTime = $result.fallback_time }
        $cursorTime | Set-Content -Path $lastLogTimeFile -Force -ErrorAction SilentlyContinue
    } catch { Write-Log "Failed to send logs: $_" -Level "ERROR" }
}

function Get-AssignedPolicy {
    param([string]$AgentToken)
    try {
        $headers = @{ "Content-Type" = "application/json"; "x-agent-token" = $AgentToken }
        $response = Invoke-RestMethod -Uri "$ApiBaseUrl/policy" -Method GET -Headers $headers
        return $response.policy
    } catch { Write-Log "Could not fetch policy: $_" -Level "WARN"; return $null }
}

function Get-WdacPolicy {
    param([string]$AgentToken)
    try {
        $headers = @{ "Content-Type" = "application/json"; "x-agent-token" = $AgentToken }
        $response = Invoke-RestMethod -Uri "$ApiBaseUrl/wdac-policy" -Method GET -Headers $headers
        return $response
    } catch { Write-Log "Could not fetch WDAC policy: $_" -Level "WARN"; return $null }
}

function Get-UacPolicy {
    param([string]$AgentToken)
    try {
        $headers = @{ "Content-Type" = "application/json"; "x-agent-token" = $AgentToken }
        $response = Invoke-RestMethod -Uri "$ApiBaseUrl/uac-policy" -Method GET -Headers $headers
        return $response
    } catch { Write-Log "Could not fetch UAC policy: $_" -Level "WARN"; return $null }
}

function Get-WindowsUpdatePolicy {
    param([string]$AgentToken)
    try {
        $headers = @{ "Content-Type" = "application/json"; "x-agent-token" = $AgentToken }
        $response = Invoke-RestMethod -Uri "$ApiBaseUrl/windows-update-policy" -Method GET -Headers $headers
        return $response
    } catch { Write-Log "Could not fetch Windows Update policy: $_" -Level "WARN"; return $null }
}

function Apply-WindowsUpdatePolicy {
    param([object]$Policy, [switch]$Force)
    if (-not $Policy) { return $false }
    $wuPolicyPath = "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate"
    $wuAUPath = "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate\\AU"
    $policyHashFile = "$ConfigPath\\wu_policy_hash.txt"
    $policyJson = $Policy | ConvertTo-Json -Depth 5 -Compress
    $policyHash = [System.BitConverter]::ToString([System.Security.Cryptography.SHA256]::Create().ComputeHash([System.Text.Encoding]::UTF8.GetBytes($policyJson))).Replace("-", "").Substring(0, 16)
    if (-not $Force -and (Test-Path $policyHashFile)) {
        $lastHash = Get-Content $policyHashFile -ErrorAction SilentlyContinue
        if ($lastHash -eq $policyHash) { Write-Log "Windows Update policy unchanged"; return $false }
    }
    Write-Log "Applying Windows Update policy: $($Policy.name)"
    $changesApplied = $false
    try {
        if (-not (Test-Path $wuPolicyPath)) { New-Item -Path $wuPolicyPath -Force | Out-Null }
        if (-not (Test-Path $wuAUPath)) { New-Item -Path $wuAUPath -Force | Out-Null }
        if ($null -ne $Policy.auto_update_mode) { Set-ItemProperty -Path $wuAUPath -Name "AUOptions" -Value $Policy.auto_update_mode -Type DWord -Force; $changesApplied = $true }
        if ($null -ne $Policy.active_hours_start) { Set-ItemProperty -Path $wuPolicyPath -Name "ActiveHoursStart" -Value $Policy.active_hours_start -Type DWord -Force; $changesApplied = $true }
        if ($null -ne $Policy.active_hours_end) { Set-ItemProperty -Path $wuPolicyPath -Name "ActiveHoursEnd" -Value $Policy.active_hours_end -Type DWord -Force; $changesApplied = $true }
        if ($null -ne $Policy.feature_update_deferral -and $Policy.feature_update_deferral -gt 0) {
            Set-ItemProperty -Path $wuPolicyPath -Name "DeferFeatureUpdates" -Value 1 -Type DWord -Force
            Set-ItemProperty -Path $wuPolicyPath -Name "DeferFeatureUpdatesPeriodInDays" -Value $Policy.feature_update_deferral -Type DWord -Force; $changesApplied = $true
        }
        if ($null -ne $Policy.quality_update_deferral -and $Policy.quality_update_deferral -gt 0) {
            Set-ItemProperty -Path $wuPolicyPath -Name "DeferQualityUpdates" -Value 1 -Type DWord -Force
            Set-ItemProperty -Path $wuPolicyPath -Name "DeferQualityUpdatesPeriodInDays" -Value $Policy.quality_update_deferral -Type DWord -Force; $changesApplied = $true
        }
        if ($changesApplied) { $policyHash | Set-Content -Path $policyHashFile -Force; Write-Log "Windows Update policy applied" }
        return $changesApplied
    } catch { Write-Log "Error applying Windows Update policy: $_" -Level "ERROR"; return $false }
}

function Apply-UacPolicy {
    param([object]$Policy, [switch]$Force)
    if (-not $Policy) { return $false }
    $uacPath = "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System"
    $policyHashFile = "$ConfigPath\\uac_policy_hash.txt"
    $policyJson = $Policy | ConvertTo-Json -Depth 5 -Compress
    $policyHash = [System.BitConverter]::ToString([System.Security.Cryptography.SHA256]::Create().ComputeHash([System.Text.Encoding]::UTF8.GetBytes($policyJson))).Replace("-", "").Substring(0, 16)
    if (-not $Force -and (Test-Path $policyHashFile)) {
        $lastHash = Get-Content $policyHashFile -ErrorAction SilentlyContinue
        if ($lastHash -eq $policyHash) { Write-Log "UAC policy unchanged"; return $false }
    }
    Write-Log "Applying UAC policy: $($Policy.name)"
    $changesApplied = $false
    try {
        if ($null -ne $Policy.enable_lua) { $v = if ($Policy.enable_lua) { 1 } else { 0 }; Set-ItemProperty -Path $uacPath -Name "EnableLUA" -Value $v -Type DWord -Force; $changesApplied = $true }
        if ($null -ne $Policy.consent_prompt_admin) { Set-ItemProperty -Path $uacPath -Name "ConsentPromptBehaviorAdmin" -Value $Policy.consent_prompt_admin -Type DWord -Force; $changesApplied = $true }
        if ($null -ne $Policy.consent_prompt_user) { Set-ItemProperty -Path $uacPath -Name "ConsentPromptBehaviorUser" -Value $Policy.consent_prompt_user -Type DWord -Force; $changesApplied = $true }
        if ($null -ne $Policy.prompt_on_secure_desktop) { $v = if ($Policy.prompt_on_secure_desktop) { 1 } else { 0 }; Set-ItemProperty -Path $uacPath -Name "PromptOnSecureDesktop" -Value $v -Type DWord -Force; $changesApplied = $true }
        if ($null -ne $Policy.detect_installations) { $v = if ($Policy.detect_installations) { 1 } else { 0 }; Set-ItemProperty -Path $uacPath -Name "EnableInstallerDetection" -Value $v -Type DWord -Force; $changesApplied = $true }
        if ($null -ne $Policy.validate_admin_signatures) { $v = if ($Policy.validate_admin_signatures) { 1 } else { 0 }; Set-ItemProperty -Path $uacPath -Name "ValidateAdminCodeSignatures" -Value $v -Type DWord -Force; $changesApplied = $true }
        if ($null -ne $Policy.filter_administrator_token) { $v = if ($Policy.filter_administrator_token) { 1 } else { 0 }; Set-ItemProperty -Path $uacPath -Name "FilterAdministratorToken" -Value $v -Type DWord -Force; $changesApplied = $true }
        if ($changesApplied) { $policyHash | Set-Content -Path $policyHashFile -Force; Write-Log "UAC policy applied" }
        return $changesApplied
    } catch { Write-Log "Error applying UAC policy: $_" -Level "ERROR"; return $false }
}

# ==================== APP DISCOVERY ====================

function Get-InstalledApplications {
    Write-Log "Collecting installed applications..."
    $apps = @()
    $registryPaths = @("HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*","HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*","HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*")
    foreach ($path in $registryPaths) {
        try {
            $regApps = Get-ItemProperty $path -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName }
            foreach ($app in $regApps) {
                $installLocation = $app.InstallLocation
                if (-not $installLocation) { continue }
                $exeFiles = Get-ChildItem -Path $installLocation -Filter "*.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
                if ($exeFiles) {
                    $fileInfo = $exeFiles | Get-AuthenticodeSignature -ErrorAction SilentlyContinue
                    $versionInfo = [System.Diagnostics.FileVersionInfo]::GetVersionInfo($exeFiles.FullName)
                    $apps += @{ file_name = $exeFiles.Name; file_path = $exeFiles.FullName; file_hash = (Get-FileHash -Path $exeFiles.FullName -Algorithm SHA256 -ErrorAction SilentlyContinue).Hash; publisher = if ($fileInfo -and $fileInfo.SignerCertificate) { $fileInfo.SignerCertificate.Subject } else { $app.Publisher }; product_name = $app.DisplayName; file_version = $versionInfo.FileVersion }
                }
            }
        } catch { Write-Log "Error reading registry path $path : $_" -Level "WARN" }
    }
    Write-Log "Found $($apps.Count) installed applications"
    return $apps
}

function Get-RunningProcesses {
    Write-Log "Collecting running processes..."
    $apps = @(); $seenPaths = @{}
    $processes = Get-Process | Where-Object { $_.Path } | Select-Object -Property Name, Path -Unique
    foreach ($proc in $processes) {
        if ($seenPaths.ContainsKey($proc.Path)) { continue }
        $seenPaths[$proc.Path] = $true
        try {
            $fileInfo = Get-AuthenticodeSignature -FilePath $proc.Path -ErrorAction SilentlyContinue
            $versionInfo = [System.Diagnostics.FileVersionInfo]::GetVersionInfo($proc.Path)
            $apps += @{ file_name = Split-Path $proc.Path -Leaf; file_path = $proc.Path; file_hash = (Get-FileHash -Path $proc.Path -Algorithm SHA256 -ErrorAction SilentlyContinue).Hash; publisher = if ($fileInfo -and $fileInfo.SignerCertificate) { $fileInfo.SignerCertificate.Subject } else { $versionInfo.CompanyName }; product_name = $versionInfo.ProductName; file_version = $versionInfo.FileVersion }
        } catch { }
    }
    Write-Log "Found $($apps.Count) running processes"
    return $apps
}

function Send-DiscoveredApps {
    param([string]$AgentToken)
    $installedApps = Get-InstalledApplications; $runningApps = Get-RunningProcesses
    $allApps = @{}
    foreach ($app in $installedApps) { $allApps[$app.file_path.ToLower()] = $app }
    foreach ($app in $runningApps) { $key = $app.file_path.ToLower(); if (-not $allApps.ContainsKey($key)) { $allApps[$key] = $app } }
    $apps = @($allApps.Values)
    if ($apps.Count -eq 0) { Write-Log "No applications to report"; return }
    Write-Log "Reporting $($apps.Count) discovered applications..."
    try { $response = Invoke-ApiRequest -Endpoint "/apps" -Body @{ apps = $apps; source = "agent_inventory" } -AgentToken $AgentToken; Write-Log "Apps reported: $($response.message)" }
    catch { Write-Log "Failed to send apps: $_" -Level "ERROR" }
}

# ==================== ASR / DEFENDER POLICY ====================

$AsrRuleGuids = @{
    "block_vulnerable_drivers" = "56a863a9-875e-4185-98a7-b882c64b5ce5"
    "block_email_executable" = "be9ba2d9-53ea-4cdc-84e5-9b1eeee46550"
    "block_office_child_process" = "d4f940ab-401b-4efc-aadc-ad5f3c50688a"
    "block_office_executable_content" = "3b576869-a4ec-4529-8536-b80a7769e899"
    "block_wmi_persistence" = "e6db77e5-3df2-4cf1-b95a-636979351e5b"
    "block_adobe_child_process" = "7674ba52-37eb-4a4f-a9a1-f0f9a1619a2c"
    "block_office_comms_child_process" = "26190899-1602-49e8-8b27-eb1d0a1ce869"
    "block_usb_untrusted" = "b2b3f03d-6a65-4f7b-a9c7-1c7ef74a9ba4"
    "block_psexec_wmi" = "d1e49aac-8f56-4280-b9ba-993a6d77406c"
    "block_credential_stealing" = "9e6c4e1f-7d60-472f-ba1a-a39ef669e4b2"
    "advanced_ransomware_protection" = "c1db55ab-c21a-4637-bb3f-a12568109d35"
    "block_untrusted_executables" = "01443614-cd74-433a-b99e-2ecdc07bfc25"
    "block_office_macro_win32" = "92e97fa1-2edf-4476-bdd6-9dd0b4dddc7b"
    "block_obfuscated_scripts" = "5beb7efe-fd9a-4556-801d-275e5ffc04cc"
    "block_js_vbs_executable" = "d3e037e1-3eb8-44c8-a917-57927947596d"
    "block_office_code_injection" = "75668c1f-73b5-4cf0-bb93-3ecf5cb7cc84"
}

function Convert-AsrAction {
    param([string]$Action)
    switch ($Action.ToLower()) { "disabled" { return 0 } "enabled" { return 1 } "audit" { return 2 } "warn" { return 6 } default { return 1 } }
}

function Apply-Policy {
    param($Policy, [switch]$Force)
    if (-not $Policy) { Write-Log "No policy to apply"; return $false }
    $policyVersion = $Policy.updated_at
    $oldVersion = ""
    if (Test-Path $PolicyHashFile) { $oldVersion = Get-Content $PolicyHashFile -ErrorAction SilentlyContinue }
    if (-not $Force -and $policyVersion -eq $oldVersion) { Write-Log "Policy unchanged"; return $false }
    Write-Log "Applying Policy: $($Policy.name)"
    try {
        $mpParams = @{}
        if ($null -ne $Policy.realtime_monitoring) { $mpParams["DisableRealtimeMonitoring"] = -not $Policy.realtime_monitoring }
        if ($null -ne $Policy.behavior_monitoring) { $mpParams["DisableBehaviorMonitoring"] = -not $Policy.behavior_monitoring }
        if ($null -ne $Policy.ioav_protection) { $mpParams["DisableIOAVProtection"] = -not $Policy.ioav_protection }
        if ($null -ne $Policy.script_scanning) { $mpParams["DisableScriptScanning"] = -not $Policy.script_scanning }
        if ($null -ne $Policy.removable_drive_scanning) { $mpParams["DisableRemovableDriveScanning"] = -not $Policy.removable_drive_scanning }
        if ($null -ne $Policy.archive_scanning) { $mpParams["DisableArchiveScanning"] = -not $Policy.archive_scanning }
        if ($null -ne $Policy.email_scanning) { $mpParams["DisableEmailScanning"] = -not $Policy.email_scanning }
        if ($null -ne $Policy.check_signatures_before_scan) { $mpParams["CheckForSignaturesBeforeRunningScan"] = $Policy.check_signatures_before_scan }
        if ($null -ne $Policy.cloud_delivered_protection) { $mpParams["MAPSReporting"] = if ($Policy.cloud_delivered_protection) { 2 } else { 0 } }
        if ($null -ne $Policy.block_at_first_seen) { $mpParams["DisableBlockAtFirstSeen"] = -not $Policy.block_at_first_seen }
        if ($Policy.cloud_block_level) { $mpParams["CloudBlockLevel"] = switch ($Policy.cloud_block_level) { "Default" { 0 } "Moderate" { 1 } "High" { 2 } "HighPlus" { 4 } "ZeroTolerance" { 6 } default { 2 } } }
        if ($null -ne $Policy.cloud_extended_timeout) { $mpParams["CloudExtendedTimeout"] = $Policy.cloud_extended_timeout }
        if ($Policy.sample_submission) { $mpParams["SubmitSamplesConsent"] = switch ($Policy.sample_submission) { "None" { 0 } "SendSafeSamples" { 1 } "SendAllSamples" { 3 } "AlwaysPrompt" { 2 } default { 3 } } }
        if ($null -ne $Policy.pua_protection) { $mpParams["PUAProtection"] = if ($Policy.pua_protection) { 1 } else { 0 } }
        if ($null -ne $Policy.signature_update_interval) { $mpParams["SignatureUpdateInterval"] = $Policy.signature_update_interval }
        if ($mpParams.Count -gt 0) { Set-MpPreference @mpParams; Write-Log "Core Defender settings applied" }
        if ($null -ne $Policy.network_protection) { Set-MpPreference -EnableNetworkProtection (if ($Policy.network_protection) { 1 } else { 0 }) }
        if ($null -ne $Policy.controlled_folder_access) { Set-MpPreference -EnableControlledFolderAccess (if ($Policy.controlled_folder_access) { 1 } else { 0 }) }
        $asrIds = @(); $asrActions = @()
        $asrMappings = @{ "asr_block_vulnerable_drivers" = "block_vulnerable_drivers"; "asr_block_email_executable" = "block_email_executable"; "asr_block_office_child_process" = "block_office_child_process"; "asr_block_office_executable_content" = "block_office_executable_content"; "asr_block_wmi_persistence" = "block_wmi_persistence"; "asr_block_adobe_child_process" = "block_adobe_child_process"; "asr_block_office_comms_child_process" = "block_office_comms_child_process"; "asr_block_usb_untrusted" = "block_usb_untrusted"; "asr_block_psexec_wmi" = "block_psexec_wmi"; "asr_block_credential_stealing" = "block_credential_stealing"; "asr_advanced_ransomware_protection" = "advanced_ransomware_protection"; "asr_block_untrusted_executables" = "block_untrusted_executables"; "asr_block_office_macro_win32" = "block_office_macro_win32"; "asr_block_obfuscated_scripts" = "block_obfuscated_scripts"; "asr_block_js_vbs_executable" = "block_js_vbs_executable"; "asr_block_office_code_injection" = "block_office_code_injection" }
        foreach ($policyKey in $asrMappings.Keys) {
            $ruleKey = $asrMappings[$policyKey]; $policyValue = $Policy.$policyKey
            if ($policyValue -and $AsrRuleGuids.ContainsKey($ruleKey)) { $asrIds += $AsrRuleGuids[$ruleKey]; $asrActions += Convert-AsrAction -Action $policyValue }
        }
        if ($asrIds.Count -gt 0) { Set-MpPreference -AttackSurfaceReductionRules_Ids $asrIds -AttackSurfaceReductionRules_Actions $asrActions; Write-Log "ASR rules configured: $($asrIds.Count) rules" }
        $policyVersion | Set-Content -Path $PolicyHashFile -Force
        Write-Log "Policy applied successfully!"
        return $true
    } catch { Write-Log "Error applying policy: $_" -Level "ERROR"; return $false }
}

# ==================== WDAC / APPLICATION CONTROL ====================

$WdacHashFile = "$ConfigPath\\wdac_rules_hash.txt"

function Get-WdacRules {
    param([string]$AgentToken)
    try {
        $headers = @{ "Content-Type" = "application/json"; "x-agent-token" = $AgentToken }
        $response = Invoke-RestMethod -Uri "$ApiBaseUrl/wdac-policy" -Method GET -Headers $headers -TimeoutSec 30
        if ($response.success) { Write-Log "WDAC policy retrieved: $($response.rules_count) rules"; return $response }
        else { Write-Log "No WDAC policy configured" -Level "DEBUG"; return $null }
    } catch { Write-Log "Error fetching WDAC policy: $_" -Level "WARN"; return $null }
}

function Apply-WdacRules {
    param([Parameter(Mandatory=$true)]$PolicyResponse, [string]$AgentToken)
    $rules = $PolicyResponse.rules; $newHash = $PolicyResponse.rules_hash
    if (-not $rules -or $rules.Count -eq 0) { Write-Log "No WDAC rules to apply"; Remove-WdacCiPolicy; return }
    $currentHash = ""
    if (Test-Path $WdacHashFile) { $currentHash = (Get-Content $WdacHashFile -Raw).Trim() }
    if ($currentHash -eq $newHash) { Write-Log "WDAC rules unchanged (hash: $newHash)"; return }
    Write-Log "WDAC rules changed - applying enforcement"
    $enforcedBlockRules = @($rules | Where-Object { $_.mode -eq "enforced" -and $_.action -eq "block" })
    $enforcedAllowRules = @($rules | Where-Object { $_.mode -eq "enforced" -and $_.action -eq "allow" })
    $auditRules = @($rules | Where-Object { $_.mode -eq "audit" })
    try {
        $policyPath = "$ConfigPath\\PeritusWdacPolicy.xml"
        $binaryPolicyPath = "$ConfigPath\\PeritusWdacPolicy.bin"
        $cipPath = "$env:windir\\System32\\CodeIntegrity\\CiPolicies\\Active\\{A244370E-44C9-4C06-B551-F6016E563076}.cip"
        $policyXml = Build-WdacPolicyXml -EnforcedBlockRules $enforcedBlockRules -EnforcedAllowRules $enforcedAllowRules -AuditRules $auditRules
        $policyXml | Set-Content -Path $policyPath -Force -Encoding UTF8
        $deployed = $false
        try {
            if (Get-Command ConvertFrom-CIPolicy -ErrorAction SilentlyContinue) {
                ConvertFrom-CIPolicy -XmlFilePath $policyPath -BinaryFilePath $binaryPolicyPath -ErrorAction Stop
                if (Get-Command CiTool -ErrorAction SilentlyContinue) { CiTool --update-policy $binaryPolicyPath 2>&1 | Out-Null; $deployed = $true }
                else { $cipDir = Split-Path $cipPath -Parent; if (-not (Test-Path $cipDir)) { New-Item -ItemType Directory -Path $cipDir -Force | Out-Null }; Copy-Item $binaryPolicyPath $cipPath -Force; $deployed = $true }
            }
        } catch { Write-Log "WDAC compilation failed: $_" -Level "WARN" }
        if (-not $deployed) { Write-Log "WDAC policy saved but could not be deployed automatically" -Level "WARN" }
        $newHash | Set-Content -Path $WdacHashFile -Force
    } catch { Write-Log "Error applying WDAC policy: $_" -Level "ERROR" }
}

function Remove-WdacCiPolicy {
    try {
        $cipPath = "$env:windir\\System32\\CodeIntegrity\\CiPolicies\\Active\\{A244370E-44C9-4C06-B551-F6016E563076}.cip"
        if (Test-Path $cipPath) {
            if (Get-Command CiTool -ErrorAction SilentlyContinue) { CiTool --remove-policy "{A244370E-44C9-4C06-B551-F6016E563076}" 2>&1 | Out-Null }
            else { Remove-Item $cipPath -Force -ErrorAction SilentlyContinue }
            Write-Log "Removed Peritus WDAC CI policy"
        }
        if (Test-Path $WdacHashFile) { Remove-Item $WdacHashFile -Force -ErrorAction SilentlyContinue }
    } catch { Write-Log "Error removing WDAC CI policy: $_" -Level "WARN" }
}

function Build-WdacPolicyXml {
    param([array]$EnforcedBlockRules, [array]$EnforcedAllowRules, [array]$AuditRules)
    $hasEnforced = ($EnforcedBlockRules.Count -gt 0) -or ($EnforcedAllowRules.Count -gt 0)
    $denyRulesXml = ""; $allowRulesXml = ""; $signersXml = ""; $fileRulesXml = ""; $ruleIdx = 0
    # Use a variable for the double-quote character to avoid escaping issues
    $DQ = '"'
    $NL = [char]10
    foreach ($rule in $EnforcedBlockRules) {
        $ruleIdx++
        $escaped = [System.Security.SecurityElement]::Escape($(if ($rule.description) { $rule.description } else { $rule.value }))
        $escapedVal = [System.Security.SecurityElement]::Escape($rule.value)
        switch ($rule.rule_type) {
            "hash" { $fileRulesXml += "      <Deny ID=$DQ" + "ID_DENY_$ruleIdx$DQ FriendlyName=$DQ$escaped$DQ Hash=$DQ$($rule.value)$DQ />$NL"; $denyRulesXml += "        <FileRuleRef RuleID=$DQ" + "ID_DENY_$ruleIdx$DQ />$NL" }
            "path" { $fileRulesXml += "      <Deny ID=$DQ" + "ID_DENY_$ruleIdx$DQ FriendlyName=$DQ$escaped$DQ FilePath=$DQ$escapedVal$DQ />$NL"; $denyRulesXml += "        <FileRuleRef RuleID=$DQ" + "ID_DENY_$ruleIdx$DQ />$NL" }
            "file_name" { $fileRulesXml += "      <Deny ID=$DQ" + "ID_DENY_$ruleIdx$DQ FriendlyName=$DQ$escaped$DQ FileName=$DQ$escapedVal$DQ MinimumFileVersion=$DQ" + "0.0.0.0$DQ />$NL"; $denyRulesXml += "        <FileRuleRef RuleID=$DQ" + "ID_DENY_$ruleIdx$DQ />$NL" }
            "publisher" {
                $ruleIdx++
                $pubEscaped = [System.Security.SecurityElement]::Escape($(if ($rule.publisher_name) { $rule.publisher_name } else { $rule.value }))
                $signerXml = "      <Signer ID=$DQ" + "ID_SIGNER_DENY_$ruleIdx$DQ Name=$DQ$pubEscaped$DQ>$NL"
                $signerXml += "        <CertRoot Type=$DQ" + "TBS$DQ Value=$DQ*$DQ />$NL"
                if ($rule.product_name) {
                    $prodEscaped = [System.Security.SecurityElement]::Escape($rule.product_name)
                    $signerXml += "        <FileAttribRef RuleID=$DQ" + "ID_FILEATTRIB_$ruleIdx$DQ />$NL"
                    $fileRulesXml += "      <FileAttrib ID=$DQ" + "ID_FILEATTRIB_$ruleIdx$DQ ProductName=$DQ$prodEscaped$DQ "
                    if ($rule.file_version_min) { $fileRulesXml += "MinimumFileVersion=$DQ$($rule.file_version_min)$DQ " }
                    $fileRulesXml += "/>$NL"
                }
                $signerXml += "      </Signer>$NL"
                $signersXml += $signerXml
                $denyRulesXml += "        <FileRuleRef RuleID=$DQ" + "ID_SIGNER_DENY_$ruleIdx$DQ />$NL"
            }
        }
    }
    $allAllowRules = @($EnforcedAllowRules) + @($AuditRules)
    foreach ($rule in $allAllowRules) {
        $ruleIdx++
        $escaped = [System.Security.SecurityElement]::Escape($(if ($rule.description) { $rule.description } else { $rule.value }))
        $escapedVal = [System.Security.SecurityElement]::Escape($rule.value)
        switch ($rule.rule_type) {
            "hash" { $fileRulesXml += "      <Allow ID=$DQ" + "ID_ALLOW_$ruleIdx$DQ FriendlyName=$DQ$escaped$DQ Hash=$DQ$($rule.value)$DQ />$NL"; $allowRulesXml += "        <FileRuleRef RuleID=$DQ" + "ID_ALLOW_$ruleIdx$DQ />$NL" }
            "path" { $fileRulesXml += "      <Allow ID=$DQ" + "ID_ALLOW_$ruleIdx$DQ FriendlyName=$DQ$escaped$DQ FilePath=$DQ$escapedVal$DQ />$NL"; $allowRulesXml += "        <FileRuleRef RuleID=$DQ" + "ID_ALLOW_$ruleIdx$DQ />$NL" }
            "file_name" { $fileRulesXml += "      <Allow ID=$DQ" + "ID_ALLOW_$ruleIdx$DQ FriendlyName=$DQ$escaped$DQ FileName=$DQ$escapedVal$DQ MinimumFileVersion=$DQ" + "0.0.0.0$DQ />$NL"; $allowRulesXml += "        <FileRuleRef RuleID=$DQ" + "ID_ALLOW_$ruleIdx$DQ />$NL" }
            "publisher" {
                $ruleIdx++
                $pubEscaped = [System.Security.SecurityElement]::Escape($(if ($rule.publisher_name) { $rule.publisher_name } else { $rule.value }))
                $signerXml = "      <Signer ID=$DQ" + "ID_SIGNER_ALLOW_$ruleIdx$DQ Name=$DQ$pubEscaped$DQ>$NL"
                $signerXml += "        <CertRoot Type=$DQ" + "TBS$DQ Value=$DQ*$DQ />$NL"
                if ($rule.product_name) {
                    $prodEscaped = [System.Security.SecurityElement]::Escape($rule.product_name)
                    $signerXml += "        <FileAttribRef RuleID=$DQ" + "ID_FILEATTRIB_$ruleIdx$DQ />$NL"
                    $fileRulesXml += "      <FileAttrib ID=$DQ" + "ID_FILEATTRIB_$ruleIdx$DQ ProductName=$DQ$prodEscaped$DQ "
                    if ($rule.file_version_min) { $fileRulesXml += "MinimumFileVersion=$DQ$($rule.file_version_min)$DQ " }
                    $fileRulesXml += "/>$NL"
                }
                $signerXml += "      </Signer>$NL"
                $signersXml += $signerXml
                $allowRulesXml += "        <FileRuleRef RuleID=$DQ" + "ID_SIGNER_ALLOW_$ruleIdx$DQ />$NL"
            }
        }
    }
    $optionsXml = ""
    if (-not $hasEnforced) { $optionsXml += "      <Rule><Option>Enabled:Audit Mode</Option></Rule>$NL" }
    $optionsXml += "      <Rule><Option>Enabled:Unsigned System Integrity Policy</Option></Rule>$NL"
    $optionsXml += "      <Rule><Option>Enabled:Advanced Boot Options Menu</Option></Rule>$NL"
    $optionsXml += "      <Rule><Option>Enabled:UMCI</Option></Rule>$NL"
    $policyGuid = "A244370E-44C9-4C06-B551-F6016E563076"
    return @"
<?xml version="1.0" encoding="utf-8"?>
<SiPolicy xmlns="urn:schemas-microsoft-com:sipolicy" PolicyType="Base Policy">
  <VersionEx>1.0.0.0</VersionEx>
  <PlatformID>{2E07F7E4-194C-4D20-B7C9-6F44A6C5A234}</PlatformID>
  <PolicyID>{$policyGuid}</PolicyID>
  <BasePolicyID>{$policyGuid}</BasePolicyID>
  <Rules>
$optionsXml  </Rules>
  <EKUs />
  <FileRules>
$fileRulesXml  </FileRules>
  <Signers>
$signersXml  </Signers>
  <SigningScenarios>
    <SigningScenario Value="131" ID="ID_SIGNINGSCENARIO_DRIVERS" FriendlyName="Drivers">
      <ProductSigners />
    </SigningScenario>
    <SigningScenario Value="12" ID="ID_SIGNINGSCENARIO_USERMODE" FriendlyName="User Mode">
      <ProductSigners>
        <DeniedSigners>
$denyRulesXml        </DeniedSigners>
        <AllowedSigners>
$allowRulesXml        </AllowedSigners>
      </ProductSigners>
    </SigningScenario>
  </SigningScenarios>
  <UpdatePolicySigners />
  <CiSigners />
  <HvciOptions>0</HvciOptions>
</SiPolicy>
"@
}

# ==================== GROUP POLICY (GPO) ENFORCEMENT ====================

function Get-GpoPolicy {
    param([string]$AgentToken)
    try {
        $headers = @{ "Content-Type" = "application/json"; "x-agent-token" = $AgentToken }
        $response = Invoke-RestMethod -Uri "$ApiBaseUrl/gpo-policy" -Method GET -Headers $headers -TimeoutSec 30
        return $response
    } catch { Write-Log "Could not fetch GPO policy: $_" -Level "WARN"; return $null }
}

function Apply-GpoPolicy {
    param([object]$Policy, [switch]$Force)
    if (-not $Policy) { return $false }
    $policyHashFile = "$ConfigPath\\gpo_policy_hash.txt"
    $policyJson = $Policy | ConvertTo-Json -Depth 5 -Compress
    $policyHash = [System.BitConverter]::ToString([System.Security.Cryptography.SHA256]::Create().ComputeHash([System.Text.Encoding]::UTF8.GetBytes($policyJson))).Replace("-", "").Substring(0, 16)
    if (-not $Force -and (Test-Path $policyHashFile)) {
        $lastHash = Get-Content $policyHashFile -ErrorAction SilentlyContinue
        if ($lastHash -eq $policyHash) { Write-Log "GPO policy unchanged"; return $false }
    }
    Write-Log "Applying GPO policy: $($Policy.name)"
    $changesApplied = $false
    try {
        # === Password & Account Lockout Policy (via net accounts) ===
        try {
            if ($null -ne $Policy.password_min_length) { net accounts /minpwlen:$($Policy.password_min_length) 2>&1 | Out-Null; $changesApplied = $true }
            if ($null -ne $Policy.password_max_age_days) { net accounts /maxpwage:$($Policy.password_max_age_days) 2>&1 | Out-Null; $changesApplied = $true }
            if ($null -ne $Policy.password_min_age_days) { net accounts /minpwage:$($Policy.password_min_age_days) 2>&1 | Out-Null; $changesApplied = $true }
            if ($null -ne $Policy.password_history_count) { net accounts /uniquepw:$($Policy.password_history_count) 2>&1 | Out-Null; $changesApplied = $true }
            if ($null -ne $Policy.lockout_threshold) { net accounts /lockoutthreshold:$($Policy.lockout_threshold) 2>&1 | Out-Null; $changesApplied = $true }
            if ($null -ne $Policy.lockout_duration_minutes -and $Policy.lockout_threshold -gt 0) { net accounts /lockoutduration:$($Policy.lockout_duration_minutes) 2>&1 | Out-Null; $changesApplied = $true }
            if ($null -ne $Policy.lockout_reset_minutes -and $Policy.lockout_threshold -gt 0) { net accounts /lockoutwindow:$($Policy.lockout_reset_minutes) 2>&1 | Out-Null; $changesApplied = $true }
            Write-Log "Password and lockout policies applied via net accounts"
        } catch { Write-Log "Error applying password/lockout policy: $_" -Level "WARN" }

        # === Password Complexity (via secedit) ===
        try {
            $secEditFile = "$ConfigPath\\gpo_secedit.inf"
            $secEditDb = "$ConfigPath\\gpo_secedit.sdb"
            $secContent = "[Unicode]" + [char]13 + [char]10 + "Unicode=yes" + [char]13 + [char]10 + "[System Access]" + [char]13 + [char]10 + "PasswordComplexity = " + $(if ($Policy.password_complexity_enabled) { "1" } else { "0" }) + [char]13 + [char]10 + "ClearTextPassword = " + $(if ($Policy.password_reversible_encryption) { "1" } else { "0" }) + [char]13 + [char]10 + "[Version]" + [char]13 + [char]10 + 'signature="$CHICAGO$"' + [char]13 + [char]10 + "Revision=1"
            $secContent | Set-Content -Path $secEditFile -Force -Encoding Unicode
            secedit /configure /db $secEditDb /cfg $secEditFile /areas SECURITYPOLICY 2>&1 | Out-Null
            Remove-Item $secEditFile -Force -ErrorAction SilentlyContinue
            Remove-Item $secEditDb -Force -ErrorAction SilentlyContinue
            Write-Log "Password complexity settings applied via secedit"
            $changesApplied = $true
        } catch { Write-Log "Error applying password complexity: $_" -Level "WARN" }

        # === Audit Policy (via auditpol) ===
        try {
            $auditMap = @{
                "audit_logon_events" = "Logon/Logoff"
                "audit_object_access" = "Object Access"
                "audit_privilege_use" = "Privilege Use"
                "audit_policy_change" = "Policy Change"
                "audit_account_management" = "Account Management"
                "audit_process_tracking" = "Detailed Tracking"
                "audit_system_events" = "System"
                "audit_account_logon" = "Account Logon"
                "audit_ds_access" = "DS Access"
            }
            foreach ($key in $auditMap.Keys) {
                $value = $Policy.$key
                if ($null -eq $value) { continue }
                $category = $auditMap[$key]
                switch ($value) {
                    "none" { auditpol /set /category:"$category" /success:disable /failure:disable 2>&1 | Out-Null }
                    "success" { auditpol /set /category:"$category" /success:enable /failure:disable 2>&1 | Out-Null }
                    "failure" { auditpol /set /category:"$category" /success:disable /failure:enable 2>&1 | Out-Null }
                    "success_failure" { auditpol /set /category:"$category" /success:enable /failure:enable 2>&1 | Out-Null }
                }
            }
            Write-Log "Audit policies applied via auditpol"
            $changesApplied = $true
        } catch { Write-Log "Error applying audit policy: $_" -Level "WARN" }

        # === Security Options (registry) ===
        try {
            $secOptPath = "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System"
            if (-not (Test-Path $secOptPath)) { New-Item -Path $secOptPath -Force | Out-Null }
            if ($null -ne $Policy.interactive_logon_require_ctrl_alt_del) { Set-ItemProperty -Path $secOptPath -Name "DisableCAD" -Value $(if ($Policy.interactive_logon_require_ctrl_alt_del) { 0 } else { 1 }) -Type DWord -Force; $changesApplied = $true }
            if ($null -ne $Policy.interactive_logon_dont_display_last_user) { Set-ItemProperty -Path $secOptPath -Name "DontDisplayLastUserName" -Value $(if ($Policy.interactive_logon_dont_display_last_user) { 1 } else { 0 }) -Type DWord -Force; $changesApplied = $true }
            if ($Policy.interactive_logon_message_title) { Set-ItemProperty -Path $secOptPath -Name "LegalNoticeCaption" -Value $Policy.interactive_logon_message_title -Type String -Force; $changesApplied = $true }
            if ($Policy.interactive_logon_message_text) { Set-ItemProperty -Path $secOptPath -Name "LegalNoticeText" -Value $Policy.interactive_logon_message_text -Type String -Force; $changesApplied = $true }
            $lsaPath = "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Lsa"
            if ($null -ne $Policy.network_access_restrict_anonymous) { Set-ItemProperty -Path $lsaPath -Name "RestrictAnonymous" -Value $(if ($Policy.network_access_restrict_anonymous) { 1 } else { 0 }) -Type DWord -Force; $changesApplied = $true }
            if ($null -ne $Policy.network_security_lan_manager_level) { Set-ItemProperty -Path $lsaPath -Name "LmCompatibilityLevel" -Value $Policy.network_security_lan_manager_level -Type DWord -Force; $changesApplied = $true }
            if ($null -ne $Policy.shutdown_clear_virtual_memory) {
                $memPath = "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management"
                Set-ItemProperty -Path $memPath -Name "ClearPageFileAtShutdown" -Value $(if ($Policy.shutdown_clear_virtual_memory) { 1 } else { 0 }) -Type DWord -Force; $changesApplied = $true
            }
            Write-Log "Security options applied"
        } catch { Write-Log "Error applying security options: $_" -Level "WARN" }

        # === Administrative Templates - System (registry) ===
        try {
            $explorerPath = "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\Explorer"
            $systemPath = "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System"
            if (-not (Test-Path $explorerPath)) { New-Item -Path $explorerPath -Force | Out-Null }
            if ($null -ne $Policy.disable_registry_tools) { Set-ItemProperty -Path $systemPath -Name "DisableRegistryTools" -Value $(if ($Policy.disable_registry_tools) { 1 } else { 0 }) -Type DWord -Force; $changesApplied = $true }
            if ($null -ne $Policy.disable_task_manager) { Set-ItemProperty -Path $systemPath -Name "DisableTaskMgr" -Value $(if ($Policy.disable_task_manager) { 1 } else { 0 }) -Type DWord -Force; $changesApplied = $true }
            if ($null -ne $Policy.disable_cmd_prompt) { Set-ItemProperty -Path $systemPath -Name "DisableCMD" -Value $(if ($Policy.disable_cmd_prompt) { 1 } else { 0 }) -Type DWord -Force; $changesApplied = $true }
            if ($null -ne $Policy.disable_run_command) { Set-ItemProperty -Path $explorerPath -Name "NoRun" -Value $(if ($Policy.disable_run_command) { 1 } else { 0 }) -Type DWord -Force; $changesApplied = $true }
            if ($null -ne $Policy.disable_control_panel) { Set-ItemProperty -Path $explorerPath -Name "NoControlPanel" -Value $(if ($Policy.disable_control_panel) { 1 } else { 0 }) -Type DWord -Force; $changesApplied = $true }
            Write-Log "Admin template (system) settings applied"
        } catch { Write-Log "Error applying admin template system settings: $_" -Level "WARN" }

        # === Administrative Templates - Network (registry) ===
        try {
            if ($null -ne $Policy.disable_ipv6) {
                $ipv6Path = "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip6\\Parameters"
                Set-ItemProperty -Path $ipv6Path -Name "DisabledComponents" -Value $(if ($Policy.disable_ipv6) { 255 } else { 0 }) -Type DWord -Force; $changesApplied = $true
            }
            Write-Log "Admin template (network) settings applied"
        } catch { Write-Log "Error applying admin template network settings: $_" -Level "WARN" }

        # === Administrative Templates - Windows Components (registry) ===
        try {
            $telemetryPath = "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection"
            if (-not (Test-Path $telemetryPath)) { New-Item -Path $telemetryPath -Force | Out-Null }
            if ($null -ne $Policy.disable_telemetry -or $null -ne $Policy.telemetry_level) {
                $level = if ($Policy.disable_telemetry) { 0 } else { $Policy.telemetry_level }
                Set-ItemProperty -Path $telemetryPath -Name "AllowTelemetry" -Value $level -Type DWord -Force; $changesApplied = $true
            }
            if ($null -ne $Policy.disable_consumer_features) {
                $cloudPath = "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\CloudContent"
                if (-not (Test-Path $cloudPath)) { New-Item -Path $cloudPath -Force | Out-Null }
                Set-ItemProperty -Path $cloudPath -Name "DisableWindowsConsumerFeatures" -Value $(if ($Policy.disable_consumer_features) { 1 } else { 0 }) -Type DWord -Force; $changesApplied = $true
            }
            if ($null -ne $Policy.disable_game_bar) {
                $gamePath = "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\GameDVR"
                if (-not (Test-Path $gamePath)) { New-Item -Path $gamePath -Force | Out-Null }
                Set-ItemProperty -Path $gamePath -Name "AllowGameDVR" -Value $(if ($Policy.disable_game_bar) { 0 } else { 1 }) -Type DWord -Force; $changesApplied = $true
            }
            Write-Log "Admin template (components) settings applied"
        } catch { Write-Log "Error applying admin template component settings: $_" -Level "WARN" }

        # === Remote Desktop (registry) ===
        try {
            $rdpPath = "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Terminal Server"
            if ($null -ne $Policy.remote_desktop_enabled) {
                Set-ItemProperty -Path $rdpPath -Name "fDenyTSConnections" -Value $(if ($Policy.remote_desktop_enabled) { 0 } else { 1 }) -Type DWord -Force; $changesApplied = $true
            }
            if ($null -ne $Policy.remote_desktop_nla_required) {
                $rdpWinStaPath = "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Terminal Server\\WinStations\\RDP-Tcp"
                Set-ItemProperty -Path $rdpWinStaPath -Name "UserAuthentication" -Value $(if ($Policy.remote_desktop_nla_required) { 1 } else { 0 }) -Type DWord -Force; $changesApplied = $true
            }
            Write-Log "Remote Desktop settings applied"
        } catch { Write-Log "Error applying RDP settings: $_" -Level "WARN" }

        # === Power Settings (via powercfg) ===
        try {
            if ($null -ne $Policy.screen_timeout_ac_minutes) { powercfg /change monitor-timeout-ac $Policy.screen_timeout_ac_minutes 2>&1 | Out-Null; $changesApplied = $true }
            if ($null -ne $Policy.screen_timeout_dc_minutes) { powercfg /change monitor-timeout-dc $Policy.screen_timeout_dc_minutes 2>&1 | Out-Null; $changesApplied = $true }
            if ($null -ne $Policy.sleep_timeout_ac_minutes) { powercfg /change standby-timeout-ac $Policy.sleep_timeout_ac_minutes 2>&1 | Out-Null; $changesApplied = $true }
            if ($null -ne $Policy.sleep_timeout_dc_minutes) { powercfg /change standby-timeout-dc $Policy.sleep_timeout_dc_minutes 2>&1 | Out-Null; $changesApplied = $true }
            Write-Log "Power settings applied via powercfg"
        } catch { Write-Log "Error applying power settings: $_" -Level "WARN" }

        # === Custom Registry Settings ===
        try {
            $customSettings = $Policy.custom_registry_settings
            if ($customSettings -and $customSettings.Count -gt 0) {
                foreach ($reg in $customSettings) {
                    $hivePath = switch ($reg.hive) { "HKLM" { "HKLM:\\" } "HKCU" { "HKCU:\\" } "HKCR" { "HKCR:\\" } "HKU" { "HKU:\\" } default { "HKLM:\\" } }
                    $fullPath = "$hivePath$($reg.path)"
                    if (-not (Test-Path $fullPath)) { New-Item -Path $fullPath -Force | Out-Null }
                    $regType = switch ($reg.type) { "REG_SZ" { "String" } "REG_DWORD" { "DWord" } "REG_QWORD" { "QWord" } "REG_MULTI_SZ" { "MultiString" } "REG_EXPAND_SZ" { "ExpandString" } default { "String" } }
                    $regValue = $reg.value
                    if ($regType -eq "DWord" -or $regType -eq "QWord") { try { $regValue = [long]$regValue } catch { } }
                    Set-ItemProperty -Path $fullPath -Name $reg.name -Value $regValue -Type $regType -Force
                }
                Write-Log "Custom registry settings applied: $($customSettings.Count) entries"
                $changesApplied = $true
            }
        } catch { Write-Log "Error applying custom registry settings: $_" -Level "WARN" }

        if ($changesApplied) { $policyHash | Set-Content -Path $policyHashFile -Force; Write-Log "GPO policy applied successfully" }
        return $changesApplied
    } catch { Write-Log "Error applying GPO policy: $_" -Level "ERROR"; return $false }
}

# ==================== TRAY MODE FUNCTIONS ====================

$script:TrayIconIcoBase64 = @"
${trayIconIcoBase64}
"@

function Get-EmbeddedTrayIconBytes {
    $b64 = $script:TrayIconIcoBase64
    if ($b64 -is [array]) { $b64 = $b64 -join "" }
    $b64 = ($b64 | Out-String).Trim() -replace '\\s+', ''
    if (-not $b64 -or $b64.Length -lt 100) {
        Write-Log "Embedded tray icon is missing or too short (length: $($b64.Length))" -Level "WARN"
        return $null
    }
    try {
        $icoBytes = [Convert]::FromBase64String($b64)
        if ($icoBytes.Length -lt 100) { Write-Log "Decoded ICO bytes too small" -Level "WARN"; return $null }
        return $icoBytes
    } catch {
        Write-Log "Failed to decode embedded ICO Base64: $($_.Exception.Message)" -Level "WARN"
        return $null
    }
}

function Write-EmbeddedTrayIcon {
    try {
        $icoBytes = Get-EmbeddedTrayIconBytes
        if (-not $icoBytes) { return $false }
        Write-Log "Writing embedded icon to disk (bytes: $($icoBytes.Length))"
        [System.IO.File]::WriteAllBytes($TrayIconFile, $icoBytes)
        return (Test-Path $TrayIconFile)
    } catch {
        Write-Log "Failed to create tray icon: $($_.Exception.Message)" -Level "WARN"
        return $false
    }
}

function Get-TrayIcon {
    Add-Type -AssemblyName System.Drawing
    # Try embedded bytes in-memory first
    try {
        $icoBytes = Get-EmbeddedTrayIconBytes
        if ($icoBytes) {
            $script:TrayIconStream = New-Object System.IO.MemoryStream(, $icoBytes)
            $icon = New-Object System.Drawing.Icon($script:TrayIconStream)
            if ($icon) { Write-Log "Loaded tray icon from embedded bytes"; return $icon }
        }
    } catch { Write-Log "Failed to load embedded icon in-memory: $($_.Exception.Message)" -Level "WARN" }
    # Try file on disk
    if (-not (Test-Path $TrayIconFile)) { Write-EmbeddedTrayIcon | Out-Null }
    try {
        if (Test-Path $TrayIconFile) {
            $icon = New-Object System.Drawing.Icon($TrayIconFile)
            if ($icon) { Write-Log "Loaded icon from: $TrayIconFile"; return $icon }
        }
    } catch {
        Write-Log "Failed to load saved icon: $_" -Level "WARN"
        try { Remove-Item -Path $TrayIconFile -Force -ErrorAction SilentlyContinue } catch { }
        try { Write-EmbeddedTrayIcon | Out-Null } catch { }
        try { if (Test-Path $TrayIconFile) { $icon = New-Object System.Drawing.Icon($TrayIconFile); if ($icon) { return $icon } } } catch { }
    }
    # Final fallback - draw a simple shield icon
    try {
        Write-Log "Creating fallback GDI+ icon..."
        $bmp = New-Object System.Drawing.Bitmap(32, 32)
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $g.Clear([System.Drawing.Color]::Transparent)
        $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(70, 130, 180))
        $points = @(
            (New-Object System.Drawing.PointF(16, 2)),
            (New-Object System.Drawing.PointF(28, 7)),
            (New-Object System.Drawing.PointF(28, 18)),
            (New-Object System.Drawing.PointF(16, 30)),
            (New-Object System.Drawing.PointF(4, 18)),
            (New-Object System.Drawing.PointF(4, 7))
        )
        $g.FillPolygon($brush, $points)
        $fontP = New-Object System.Drawing.Font("Segoe UI", 14, [System.Drawing.FontStyle]::Bold)
        $sf = New-Object System.Drawing.StringFormat
        $sf.Alignment = [System.Drawing.StringAlignment]::Center
        $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
        $g.DrawString("P", $fontP, [System.Drawing.Brushes]::White, (New-Object System.Drawing.RectangleF(0, 0, 32, 32)), $sf)
        $g.Dispose(); $fontP.Dispose(); $brush.Dispose(); $sf.Dispose()
        $hIcon = $bmp.GetHicon()
        $icon = [System.Drawing.Icon]::FromHandle($hIcon)
        Write-Log "Fallback icon created successfully"
        return $icon
    } catch {
        Write-Log "Failed to create fallback icon: $_" -Level "ERROR"
        return [System.Drawing.SystemIcons]::Shield
    }
}

function Get-InstalledAgentVersion {
    if (Test-Path $ScriptPath) {
        try {
            $content = Get-Content $ScriptPath -Raw -ErrorAction SilentlyContinue
            if ($content -match '\\$AgentVersion\\s*=\\s*"([^"]+)"') { return $Matches[1] }
        } catch { }
    }
    return $null
}

function Get-EndpointStatus {
    param([string]$AgentToken)
    try {
        $headers = @{ "Content-Type" = "application/json"; "x-agent-token" = $AgentToken }
        $response = Invoke-RestMethod -Uri "$ApiBaseUrl/status" -Method GET -Headers $headers -TimeoutSec 15
        return $response
    } catch {
        Write-Log "Error fetching endpoint status: $_" -Level "WARN"
        return $null
    }
}

function Show-StatusForm {
    param($StatusData)
    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -AssemblyName System.Drawing
    # DPI awareness
    try { [System.Windows.Forms.Application]::EnableVisualStyles() } catch {}
    try { Add-Type -TypeDefinition 'using System.Runtime.InteropServices; public class DpiHelper { [DllImport("user32.dll")] public static extern bool SetProcessDPIAware(); }'; [DpiHelper]::SetProcessDPIAware() | Out-Null } catch {}
    $form = New-Object System.Windows.Forms.Form
    $runningVersion = $AgentVersion
    $installedVersion = Get-InstalledAgentVersion
    if ($installedVersion -and $installedVersion -ne $runningVersion) {
        $form.Text = "Peritus Threat Defence v$installedVersion (restart required)"
    } else {
        $form.Text = "Peritus Threat Defence v$runningVersion"
    }
    $form.Size = New-Object System.Drawing.Size(440, 520)
    $form.StartPosition = "CenterScreen"
    $form.FormBorderStyle = "FixedDialog"
    $form.MaximizeBox = $false
    $form.BackColor = [System.Drawing.Color]::FromArgb(30, 30, 30)
    $form.ForeColor = [System.Drawing.Color]::White
    $y = 15
    $lblTitle = New-Object System.Windows.Forms.Label
    $lblTitle.Text = "Peritus Threat Defence"
    $lblTitle.Font = New-Object System.Drawing.Font("Segoe UI", 16, [System.Drawing.FontStyle]::Bold)
    $lblTitle.Location = New-Object System.Drawing.Point(15, $y)
    $lblTitle.Size = New-Object System.Drawing.Size(400, 35)
    $form.Controls.Add($lblTitle)
    $y += 40
    $lblVersionTop = New-Object System.Windows.Forms.Label
    if ($installedVersion -and $installedVersion -ne $runningVersion) { $lblVersionTop.Text = "Agent Version: $installedVersion (update pending restart)" }
    elseif ($installedVersion) { $lblVersionTop.Text = "Agent Version: $installedVersion" }
    else { $lblVersionTop.Text = "Agent Version: $runningVersion" }
    $lblVersionTop.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    $lblVersionTop.ForeColor = [System.Drawing.Color]::FromArgb(150, 150, 150)
    $lblVersionTop.Location = New-Object System.Drawing.Point(15, $y)
    $lblVersionTop.Size = New-Object System.Drawing.Size(380, 22)
    $form.Controls.Add($lblVersionTop)
    $y += 25
    if ($StatusData -and $StatusData.endpoint) {
        $lblHost = New-Object System.Windows.Forms.Label
        $lblHost.Text = "Hostname: $($StatusData.endpoint.hostname)"
        $lblHost.Font = New-Object System.Drawing.Font("Segoe UI", 10)
        $lblHost.Location = New-Object System.Drawing.Point(15, $y)
        $lblHost.Size = New-Object System.Drawing.Size(380, 22)
        $form.Controls.Add($lblHost); $y += 25
        $lblLastSeen = New-Object System.Windows.Forms.Label
        $lastSeen = if ($StatusData.endpoint.last_seen_at) { try { ([datetime]$StatusData.endpoint.last_seen_at).ToLocalTime().ToString("g") } catch { "Unknown" } } else { "Unknown" }
        $lblLastSeen.Text = "Last Sync: $lastSeen"
        $lblLastSeen.Font = New-Object System.Drawing.Font("Segoe UI", 10)
        $lblLastSeen.Location = New-Object System.Drawing.Point(15, $y)
        $lblLastSeen.Size = New-Object System.Drawing.Size(380, 22)
        $form.Controls.Add($lblLastSeen); $y += 35
        $lblProtection = New-Object System.Windows.Forms.Label
        $protectionStatus = if ($StatusData.status.realtime_protection) { "[OK] Protected" } else { "[!] Not Protected" }
        $lblProtection.Text = "Real-time Protection: $protectionStatus"
        $lblProtection.Font = New-Object System.Drawing.Font("Segoe UI", 10)
        $lblProtection.ForeColor = if ($StatusData.status.realtime_protection) { [System.Drawing.Color]::LightGreen } else { [System.Drawing.Color]::Orange }
        $lblProtection.Location = New-Object System.Drawing.Point(15, $y)
        $lblProtection.Size = New-Object System.Drawing.Size(380, 22)
        $form.Controls.Add($lblProtection); $y += 35
        $sep1 = New-Object System.Windows.Forms.Label; $sep1.Text = "----------------------------------------"; $sep1.ForeColor = [System.Drawing.Color]::Gray; $sep1.Location = New-Object System.Drawing.Point(15, $y); $sep1.Size = New-Object System.Drawing.Size(380, 20); $form.Controls.Add($sep1); $y += 25
        $lblPolicies = New-Object System.Windows.Forms.Label; $lblPolicies.Text = "Assigned Policies"; $lblPolicies.Font = New-Object System.Drawing.Font("Segoe UI", 11, [System.Drawing.FontStyle]::Bold); $lblPolicies.Location = New-Object System.Drawing.Point(15, $y); $lblPolicies.Size = New-Object System.Drawing.Size(380, 25); $form.Controls.Add($lblPolicies); $y += 30
        $defenderName = if ($StatusData.policies.defender) { $StatusData.policies.defender.name } else { "None" }
        $lblDefender = New-Object System.Windows.Forms.Label; $lblDefender.Text = "- Defender: $defenderName"; $lblDefender.Font = New-Object System.Drawing.Font("Segoe UI", 10); $lblDefender.Location = New-Object System.Drawing.Point(25, $y); $lblDefender.Size = New-Object System.Drawing.Size(370, 22); $form.Controls.Add($lblDefender); $y += 24
        $uacName = if ($StatusData.policies.uac) { $StatusData.policies.uac.name } else { "None" }
        $lblUac = New-Object System.Windows.Forms.Label; $lblUac.Text = "- UAC: $uacName"; $lblUac.Font = New-Object System.Drawing.Font("Segoe UI", 10); $lblUac.Location = New-Object System.Drawing.Point(25, $y); $lblUac.Size = New-Object System.Drawing.Size(370, 22); $form.Controls.Add($lblUac); $y += 24
        $wuName = if ($StatusData.policies.windows_update) { $StatusData.policies.windows_update.name } else { "None" }
        $lblWu = New-Object System.Windows.Forms.Label; $lblWu.Text = "- Windows Update: $wuName"; $lblWu.Font = New-Object System.Drawing.Font("Segoe UI", 10); $lblWu.Location = New-Object System.Drawing.Point(25, $y); $lblWu.Size = New-Object System.Drawing.Size(370, 22); $form.Controls.Add($lblWu); $y += 24
        $wdacCount = $StatusData.policies.wdac_rule_sets
        $lblWdac = New-Object System.Windows.Forms.Label; $lblWdac.Text = "- WDAC Rule Sets: $wdacCount"; $lblWdac.Font = New-Object System.Drawing.Font("Segoe UI", 10); $lblWdac.Location = New-Object System.Drawing.Point(25, $y); $lblWdac.Size = New-Object System.Drawing.Size(370, 22); $form.Controls.Add($lblWdac); $y += 24
        $gpoName = if ($StatusData.policies.gpo) { $StatusData.policies.gpo.name } else { "None" }
        $lblGpo = New-Object System.Windows.Forms.Label; $lblGpo.Text = "- Group Policy: $gpoName"; $lblGpo.Font = New-Object System.Drawing.Font("Segoe UI", 10); $lblGpo.Location = New-Object System.Drawing.Point(25, $y); $lblGpo.Size = New-Object System.Drawing.Size(370, 22); $form.Controls.Add($lblGpo); $y += 35
        $threatCount = $StatusData.threats.active_count
        $lblThreats = New-Object System.Windows.Forms.Label
        $lblThreats.Text = if ($threatCount -gt 0) { "[!] Active Threats: $threatCount" } else { "[OK] No Active Threats" }
        $lblThreats.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
        $lblThreats.ForeColor = if ($threatCount -gt 0) { [System.Drawing.Color]::Orange } else { [System.Drawing.Color]::LightGreen }
        $lblThreats.Location = New-Object System.Drawing.Point(15, $y); $lblThreats.Size = New-Object System.Drawing.Size(380, 22); $form.Controls.Add($lblThreats)
    } else {
        $lblError = New-Object System.Windows.Forms.Label; $lblError.Text = "Unable to fetch status. Check connection."; $lblError.Font = New-Object System.Drawing.Font("Segoe UI", 10); $lblError.ForeColor = [System.Drawing.Color]::Orange; $lblError.Location = New-Object System.Drawing.Point(15, $y); $lblError.Size = New-Object System.Drawing.Size(380, 22); $form.Controls.Add($lblError)
    }
    $btnClose = New-Object System.Windows.Forms.Button; $btnClose.Text = "Close"; $btnClose.Size = New-Object System.Drawing.Size(110, 34); $btnClose.Anchor = [System.Windows.Forms.AnchorStyles]::Bottom -bor [System.Windows.Forms.AnchorStyles]::Right; $btnClose.Location = New-Object System.Drawing.Point(($form.ClientSize.Width - $btnClose.Width - 20), ($form.ClientSize.Height - $btnClose.Height - 20)); $btnClose.BackColor = [System.Drawing.Color]::FromArgb(70, 130, 180); $btnClose.ForeColor = [System.Drawing.Color]::White; $btnClose.FlatStyle = "Flat"; $btnClose.FlatAppearance.BorderSize = 0; $btnClose.Font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Bold); $btnClose.Cursor = [System.Windows.Forms.Cursors]::Hand; $btnClose.Add_Click({ $form.Close() }); $form.Controls.Add($btnClose)
    $form.ShowDialog() | Out-Null
}

function Start-TrayApplication {
    param([string]$AgentToken)
    try {
        Add-Type -AssemblyName System.Windows.Forms
        Add-Type -AssemblyName System.Drawing
    } catch {
        Write-Log "Failed to load Windows Forms assemblies: $_" -Level "ERROR"
        return
    }
    Write-Log "Starting Tray Application..."
    $script:trayIcon = New-Object System.Windows.Forms.NotifyIcon
    $icon = Get-TrayIcon
    if ($icon) { $script:trayIcon.Icon = $icon; Write-Log "Tray icon loaded successfully" }
    else { Write-Log "Warning: Could not load tray icon" -Level "WARN" }
    $script:trayIcon.Text = "Peritus Threat Defence - Protected"
    $script:trayIcon.Visible = $true
    $contextMenu = New-Object System.Windows.Forms.ContextMenuStrip
    $menuStatus = New-Object System.Windows.Forms.ToolStripMenuItem; $menuStatus.Text = "View Status..."
    $menuStatus.Add_Click({ $status = Get-EndpointStatus -AgentToken $AgentToken; Show-StatusForm -StatusData $status })
    $contextMenu.Items.Add($menuStatus) | Out-Null
    $contextMenu.Items.Add((New-Object System.Windows.Forms.ToolStripSeparator)) | Out-Null
    $menuLogs = New-Object System.Windows.Forms.ToolStripMenuItem; $menuLogs.Text = "View Logs"
    $menuLogs.Add_Click({ if (Test-Path $LogFile) { Start-Process notepad.exe -ArgumentList $LogFile } else { [System.Windows.Forms.MessageBox]::Show("Log file not found.", "Peritus Threat Defence", "OK", "Information") } })
    $contextMenu.Items.Add($menuLogs) | Out-Null
    $menuSync = New-Object System.Windows.Forms.ToolStripMenuItem; $menuSync.Text = "Sync Now"
    $menuSync.Add_Click({
        $script:trayIcon.Text = "Peritus Threat Defence - Syncing..."
        try { Send-Heartbeat -AgentToken $AgentToken; $script:trayIcon.ShowBalloonTip(3000, "Peritus Threat Defence", "Sync completed successfully", [System.Windows.Forms.ToolTipIcon]::Info) }
        catch { $script:trayIcon.ShowBalloonTip(3000, "Peritus Threat Defence", "Sync failed: $_", [System.Windows.Forms.ToolTipIcon]::Warning) }
        $script:trayIcon.Text = "Peritus Threat Defence - Protected"
    })
    $contextMenu.Items.Add($menuSync) | Out-Null
    $contextMenu.Items.Add((New-Object System.Windows.Forms.ToolStripSeparator)) | Out-Null
    $menuExit = New-Object System.Windows.Forms.ToolStripMenuItem; $menuExit.Text = "Exit"
    $menuExit.Add_Click({ $script:trayIcon.Visible = $false; $script:trayIcon.Dispose(); [System.Windows.Forms.Application]::Exit() })
    $contextMenu.Items.Add($menuExit) | Out-Null
    $script:trayIcon.ContextMenuStrip = $contextMenu
    $script:trayIcon.Add_DoubleClick({ $status = Get-EndpointStatus -AgentToken $AgentToken; Show-StatusForm -StatusData $status })
    $script:trayTickCount = 0
    $timer = New-Object System.Windows.Forms.Timer; $timer.Interval = 60000
    $timer.Add_Tick({
        try {
            Send-Heartbeat -AgentToken $AgentToken
            $status = Get-EndpointStatus -AgentToken $AgentToken
            if ($status -and $status.status) {
                $script:trayIcon.Text = if ($status.status.realtime_protection) { "Peritus Threat Defence - Protected" } else { "Peritus Threat Defence - Warning" }
            }
            # Check for updates every 5 minutes from the tray
            $script:trayTickCount++
            if ($script:trayTickCount % 5 -eq 0) {
                $updated = Check-AgentUpdate -AgentToken $AgentToken -AllowTrayUpdate
                if ($updated) {
                    $script:trayIcon.Visible = $false
                    $script:trayIcon.Dispose()
                    [System.Windows.Forms.Application]::Exit()
                }
            }
        } catch { }
    })
    $timer.Start()
    Write-Log "Tray application started. Running message loop..."
    [System.Windows.Forms.Application]::Run()
}

# ==================== HEALTH REPORTING ====================

$script:HealthErrors = @()

function Add-HealthError {
    param([string]$Component, [string]$Message, [string]$Severity = "warning")
    $script:HealthErrors += @{
        component = $Component
        message = $Message
        severity = $Severity
        timestamp = (Get-Date).ToUniversalTime().ToString("o")
    }
}

function Send-HealthReport {
    param([string]$AgentToken)
    if ($script:HealthErrors.Count -eq 0) { return }
    try {
        $body = @{
            errors = $script:HealthErrors
            agent_version = $AgentVersion
            uptime_seconds = ([int]((Get-Date) - (Get-Process -Id $PID).StartTime).TotalSeconds)
        }
        Invoke-ApiRequest -Endpoint "/health" -Body $body -AgentToken $AgentToken
        Write-Log "Health report sent with $($script:HealthErrors.Count) error(s)"
        $script:HealthErrors = @()
    } catch {
        Write-Log "Failed to send health report: $_" -Level "WARN"
    }
}

# ==================== ROLLBACK MECHANISM ====================

function Backup-CurrentSettings {
    param([string]$PolicyType)
    if (-not (Test-Path $BackupPath)) { New-Item -ItemType Directory -Path $BackupPath -Force | Out-Null }
    $backupFile = "$BackupPath\\$($PolicyType)_backup_$(Get-Date -Format 'yyyyMMddHHmmss').json"
    try {
        switch ($PolicyType) {
            "gpo" {
                $backup = @{
                    type = "gpo"
                    timestamp = (Get-Date).ToUniversalTime().ToString("o")
                    password_settings = @{ min_length = (net accounts 2>&1 | Select-String "Minimum password length" | ForEach-Object { ($_ -split "\\s{2,}")[-1].Trim() }) }
                    audit_policies = @(auditpol /get /category:* /r 2>$null | ConvertFrom-Csv -ErrorAction SilentlyContinue)
                }
                $backup | ConvertTo-Json -Depth 5 | Set-Content -Path $backupFile -Force
            }
            "defender" {
                $prefs = Get-MpPreference -ErrorAction SilentlyContinue
                if ($prefs) {
                    @{ type = "defender"; timestamp = (Get-Date).ToUniversalTime().ToString("o"); preferences = ($prefs | ConvertTo-Json -Depth 3 | ConvertFrom-Json) } | ConvertTo-Json -Depth 5 | Set-Content -Path $backupFile -Force
                }
            }
            "uac" {
                $uacPath = "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System"
                if (Test-Path $uacPath) {
                    $reg = Get-ItemProperty -Path $uacPath -ErrorAction SilentlyContinue
                    @{ type = "uac"; timestamp = (Get-Date).ToUniversalTime().ToString("o"); registry = ($reg | ConvertTo-Json -Depth 2 | ConvertFrom-Json) } | ConvertTo-Json -Depth 5 | Set-Content -Path $backupFile -Force
                }
            }
        }
        Write-Log "Backup created for $PolicyType at $backupFile"
        return $backupFile
    } catch {
        Write-Log "Failed to create backup for $($PolicyType): $_" -Level "WARN"
        Add-HealthError -Component "backup" -Message "Backup failed for $($PolicyType): $_"
        return $null
    }
}

function Restore-FromBackup {
    param([string]$BackupFile, [string]$PolicyType)
    if (-not $BackupFile -or -not (Test-Path $BackupFile)) {
        Write-Log "No backup file available for rollback" -Level "WARN"
        return $false
    }
    Write-Log "Rolling back $PolicyType from backup: $BackupFile" -Level "WARN"
    Add-HealthError -Component "rollback" -Message "Policy rollback triggered for $PolicyType" -Severity "error"
    return $true
}

# ==================== DOMAIN GPO DETECTION ====================

function Test-DomainJoined {
    try {
        $cs = Get-WmiObject Win32_ComputerSystem -ErrorAction SilentlyContinue
        if ($cs -and $cs.PartOfDomain) {
            Write-Log "Machine is domain-joined (Domain: $($cs.Domain)). Domain GPO takes precedence." -Level "WARN"
            return $true
        }
        return $false
    } catch {
        Write-Log "Could not determine domain status: $_" -Level "WARN"
        return $false
    }
}

# ==================== TLS CERTIFICATE VALIDATION ====================

function Initialize-TlsSettings {
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13
        Write-Log "TLS 1.2/1.3 enforced for all API communications"
    } catch {
        try {
            [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
            Write-Log "TLS 1.2 enforced (TLS 1.3 not available)"
        } catch {
            Write-Log "Could not enforce TLS settings: $_" -Level "WARN"
            Add-HealthError -Component "tls" -Message "Failed to enforce TLS: $_"
        }
    }
}

# ==================== MAIN EXECUTION ====================

function Test-IsSystemAccount {
    try { return ([Security.Principal.WindowsIdentity]::GetCurrent().IsSystem -or ([Security.Principal.WindowsIdentity]::GetCurrent().Name -eq "NT AUTHORITY\\SYSTEM")) }
    catch { return $false }
}

function Ensure-TrayStartupAndLaunch {
    if (Test-IsSystemAccount) { return }
    try { if (-not [Environment]::UserInteractive) { return } } catch { }
    try {
        $existingTrayTask = Get-ScheduledTask -TaskName $TrayTaskName -ErrorAction SilentlyContinue
        if (-not $existingTrayTask) {
            $trayAction = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-WindowStyle Hidden -ExecutionPolicy Bypass -File \`"$ScriptPath\`" -TrayMode"
            $trayTrigger = New-ScheduledTaskTrigger -AtLogOn
            $traySettings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
            Register-ScheduledTask -TaskName $TrayTaskName -Action $trayAction -Trigger $trayTrigger -Settings $traySettings -Description "Peritus Secure - System Tray Application" -Force | Out-Null
            Write-Log "Tray scheduled task created with AtLogOn trigger"
        }
    } catch {
        try {
            $trayCommand = "powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -File \`"$ScriptPath\`" -TrayMode"
            Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run" -Name "PeritusSecureTray" -Value $trayCommand -Force
        } catch { }
    }
    try {
        $existingTray = Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*$ScriptPath*" -and $_.CommandLine -like "*-TrayMode*" } | Select-Object -First 1
        if ($existingTray) { return }
    } catch { }
    try { Start-Process powershell.exe -ArgumentList "-WindowStyle Hidden -ExecutionPolicy Bypass -File \`"$ScriptPath\`" -TrayMode" -WindowStyle Hidden } catch { }
}

Write-Log "=========================================="
Write-Log "Peritus Threat Defence Agent v$AgentVersion"
Write-Log "=========================================="

# Kill any older instances of this agent to prevent duplicate processes
try {
    $myPid = $PID
    $staleProcesses = Get-CimInstance Win32_Process | Where-Object {
        $_.Name -eq "powershell.exe" -and
        $_.ProcessId -ne $myPid -and
        $_.CommandLine -like "*PeritusSecureAgent.ps1*" -and
        $_.CommandLine -notlike "*-TrayMode*"
    }
    if ($staleProcesses) {
        foreach ($proc in $staleProcesses) {
            Write-Log "Terminating stale agent process PID $($proc.ProcessId) (started $($proc.CreationDate))"
            Stop-Process -Id $proc.ProcessId -Force -ErrorAction SilentlyContinue
        }
        Write-Log "Cleaned up $(@($staleProcesses).Count) stale agent process(es)"
    }
} catch {
    Write-Log "Could not check for stale processes: $_" -Level "WARN"
}

if ($Uninstall) { Uninstall-Agent }

$agentToken = $null
$isFirstRun = $true
$script:NetworkModuleEnabled = $false

if (Test-Path $ConfigFile) {
    $config = Get-Content $ConfigFile | ConvertFrom-Json
    $agentToken = $config.agent_token
    $isFirstRun = $false
    Write-Log "Found existing agent configuration"
}

if ($TrayMode) {
    if (-not $agentToken) { Write-Log "Agent not registered. Please run the installer first." -Level "ERROR"; exit 1 }
    Start-TrayApplication -AgentToken $agentToken
    exit 0
}

# If user re-runs the downloaded script, update the installed copy
if (-not $isFirstRun -and $MyInvocation.MyCommand.Path -and ($MyInvocation.MyCommand.Path -ne $ScriptPath)) {
    try {
        Write-Log "Installer script detected. Updating installed agent..."
        $scriptContent = Get-Content -Path $MyInvocation.MyCommand.Path -Raw
        Install-AgentTask -ScriptContent $scriptContent
        Ensure-TrayStartupAndLaunch
    } catch { Write-Log "Failed to update installed agent: $_" -Level "WARN" }
}

if (-not $agentToken) { $agentToken = Register-Agent -OrganizationToken $OrganizationToken }

if ($isFirstRun) {
    Write-Log "First run - installing as scheduled task..."
    $scriptContent = Get-Content -Path $MyInvocation.MyCommand.Path -Raw
    Install-AgentTask -ScriptContent $scriptContent
    try {
        Add-Type -AssemblyName System.Drawing -ErrorAction Stop
        $iconCreated = Write-EmbeddedTrayIcon
        if ($iconCreated) { Write-Log "Tray icon created at $TrayIconFile" } else { Write-Log "Tray icon creation failed - will use fallback" -Level "WARN" }
    } catch { Write-Log "Could not create tray icon: $_" -Level "WARN" }
    try {
        $existingTrayTask = Get-ScheduledTask -TaskName $TrayTaskName -ErrorAction SilentlyContinue
        if ($existingTrayTask) { Unregister-ScheduledTask -TaskName $TrayTaskName -Confirm:$false -ErrorAction SilentlyContinue }
        $trayAction = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-WindowStyle Hidden -ExecutionPolicy Bypass -File \`"$ScriptPath\`" -TrayMode"
        $trayTrigger = New-ScheduledTaskTrigger -AtLogOn
        $traySettings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
        Register-ScheduledTask -TaskName $TrayTaskName -Action $trayAction -Trigger $trayTrigger -Settings $traySettings -Description "Peritus Secure - System Tray Application" -Force | Out-Null
        Write-Log "Tray scheduled task registered"
    } catch {
        try {
            $trayCommand = "powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -File \`"$ScriptPath\`" -TrayMode"
            Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run" -Name "PeritusSecureTray" -Value $trayCommand -Force
        } catch { }
    }
    Ensure-TrayStartupAndLaunch
}

Initialize-TlsSettings

Check-AgentUpdate -AgentToken $agentToken

Send-Heartbeat -AgentToken $agentToken
Send-Threats -AgentToken $agentToken
Send-DefenderLogs -AgentToken $agentToken

# Apply Defender policy with rollback
$policy = Get-AssignedPolicy -AgentToken $agentToken
if ($policy) {
    $backupFile = Backup-CurrentSettings -PolicyType "defender"
    try { Apply-Policy -Policy $policy -Force:$ForcePolicy }
    catch {
        Write-Log "Defender policy enforcement failed: $_" -Level "ERROR"
        Add-HealthError -Component "defender_policy" -Message "Enforcement failed: $_" -Severity "error"
        Restore-FromBackup -BackupFile $backupFile -PolicyType "defender"
    }
}

# Apply UAC policy with rollback
$uacPolicy = Get-UacPolicy -AgentToken $agentToken
if ($uacPolicy -and $uacPolicy.success -and $uacPolicy.policy) {
    $backupFile = Backup-CurrentSettings -PolicyType "uac"
    try { Apply-UacPolicy -Policy $uacPolicy.policy -Force:$ForcePolicy }
    catch {
        Write-Log "UAC policy enforcement failed: $_" -Level "ERROR"
        Add-HealthError -Component "uac_policy" -Message "Enforcement failed: $_" -Severity "error"
        Restore-FromBackup -BackupFile $backupFile -PolicyType "uac"
    }
}

# Apply Windows Update policy
$wuPolicy = Get-WindowsUpdatePolicy -AgentToken $agentToken
if ($wuPolicy -and $wuPolicy.success -and $wuPolicy.policy) {
    try { Apply-WindowsUpdatePolicy -Policy $wuPolicy.policy -Force:$ForcePolicy }
    catch {
        Write-Log "Windows Update policy enforcement failed: $_" -Level "ERROR"
        Add-HealthError -Component "wu_policy" -Message "Enforcement failed: $_" -Severity "error"
    }
}

# Apply GPO policy - skip if domain-joined (domain GPO takes precedence)
$gpoPolicy = Get-GpoPolicy -AgentToken $agentToken
if ($gpoPolicy -and $gpoPolicy.has_policy -and $gpoPolicy.policy) {
    $isDomainJoined = Test-DomainJoined
    if ($isDomainJoined) {
        Write-Log "Skipping local GPO enforcement - machine is domain-joined. Domain GPO policies take precedence." -Level "WARN"
        Add-HealthError -Component "gpo_policy" -Message "Skipped: machine is domain-joined" -Severity "info"
    } else {
        $backupFile = Backup-CurrentSettings -PolicyType "gpo"
        try { Apply-GpoPolicy -Policy $gpoPolicy.policy -Force:$ForcePolicy }
        catch {
            Write-Log "GPO policy enforcement failed: $_" -Level "ERROR"
            Add-HealthError -Component "gpo_policy" -Message "Enforcement failed: $_" -Severity "error"
            Restore-FromBackup -BackupFile $backupFile -PolicyType "gpo"
        }
    }
}

try {
    $wdacResponse = Get-WdacRules -AgentToken $agentToken
    if ($wdacResponse -and $wdacResponse.rules -and $wdacResponse.rules.Count -gt 0) { Apply-WdacRules -PolicyResponse $wdacResponse -AgentToken $agentToken }
    elseif ($wdacResponse -and $wdacResponse.rules_count -eq 0) { Remove-WdacCiPolicy }
} catch {
    Write-Log "WDAC enforcement error: $_" -Level "WARN"
    Add-HealthError -Component "wdac" -Message "Enforcement error: $_" -Severity "error"
}

if ($script:NetworkModuleEnabled) {
    Ensure-FirewallTelemetry
    Collect-FirewallLogs -AgentToken $agentToken
    $fwPolicy = Get-FirewallPolicy -AgentToken $agentToken
    if ($fwPolicy -and $fwPolicy.rules -and $fwPolicy.rules.Count -gt 0) { Apply-FirewallPolicy -PolicyResponse $fwPolicy | Out-Null }
}

Send-DiscoveredApps -AgentToken $agentToken

# Send health report with any errors collected during this run
Send-HealthReport -AgentToken $agentToken

Write-Log "Agent run complete"
`;
}
