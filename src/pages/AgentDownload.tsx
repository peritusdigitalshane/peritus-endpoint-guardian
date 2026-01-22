import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Copy, CheckCircle, Shield, Terminal, Clock, Zap, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useTenant } from "@/contexts/TenantContext";

const generatePowershellScript = (orgId: string, apiBaseUrl: string) => {
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
.PARAMETER ForceFullLogSync
    Ignore the last log collection time and collect all events from the past 60 minutes.
    Use this to force a full resync of event logs.
.EXAMPLE
    .\\PeritusSecureAgent.ps1 -ForceFullLogSync
    Forces collection of all Defender events from the past hour, ignoring last sync time.
.NOTES
    Version: 2.2.0
    Requires: Windows 10/11, PowerShell 5.1+, Administrator privileges
#>

param(
    [string]$OrganizationToken = "${orgId}",
    [int]$HeartbeatIntervalSeconds = 30,
    [switch]$Uninstall,
    [switch]$ForcePolicy,
    [switch]$ForceFullLogSync
)

$ErrorActionPreference = "Stop"
$ApiBaseUrl = "${apiBaseUrl}"
$TaskName = "PeritusSecureAgent"
$ServiceName = "Peritus Secure Agent"

# Store ForceFullLogSync in script scope so functions can access it
$script:ForceFullLogSync = $ForceFullLogSync.IsPresent

# Agent configuration storage
$ConfigPath = "$env:ProgramData\\PeritusSecure"
$ConfigFile = "$ConfigPath\\agent.json"
$ScriptPath = "$ConfigPath\\PeritusSecureAgent.ps1"
$LogFile = "$ConfigPath\\agent.log"
$PolicyHashFile = "$ConfigPath\\policy_hash.txt"

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    Write-Host $logMessage
    
    if (Test-Path $ConfigPath) {
        Add-Content -Path $LogFile -Value $logMessage -ErrorAction SilentlyContinue
    }
}

function Uninstall-Agent {
    Write-Log "Uninstalling Peritus Secure Agent..."
    $existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if ($existingTask) {
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
        Write-Log "Scheduled task removed"
    }
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
    
    # Clear last log time file on fresh install to ensure full log sync
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
    
    # Task Scheduler repetition intervals under 1 minute are not supported on many Windows builds.
    # If the user requests < 60s, clamp to 60s so installation doesn't fail.
    $scheduleIntervalSeconds = $HeartbeatIntervalSeconds
    if ($scheduleIntervalSeconds -lt 60) {
        Write-Log "Task Scheduler does not support repetition intervals under 60 seconds. Using 60 seconds for the scheduled task." -Level "WARN"
        $scheduleIntervalSeconds = 60
    }

    # NOTE: We include -NoProfile/-NonInteractive to reduce variability and prevent prompts.
    $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File \`"$ScriptPath\`""
    $triggerStartup = New-ScheduledTaskTrigger -AtStartup

    # Some Windows builds won't start a repeating trigger if the StartBoundary is already in the past.
    # Create a repeating trigger slightly in the future with a long repetition duration.
    $startAt = (Get-Date).AddSeconds(15)
    $triggerRepeat = New-ScheduledTaskTrigger -Once -At $startAt -RepetitionInterval (New-TimeSpan -Seconds $scheduleIntervalSeconds) -RepetitionDuration (New-TimeSpan -Days (365 * 20))
    $principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Seconds 30)
    
    Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $triggerStartup,$triggerRepeat -Principal $principal -Settings $settings -Description "Peritus Secure Agent - Windows Defender Management" | Out-Null

    try {
        Start-ScheduledTask -TaskName $TaskName -ErrorAction Stop
        Write-Log "Scheduled task started"
    } catch {
        Write-Log "Scheduled task created but could not be started immediately: $_" -Level "WARN"
    }
    
    Write-Log "Scheduled task '$TaskName' created successfully"
    Write-Log "  - Runs at system startup"
    Write-Log "  - Repeats every $scheduleIntervalSeconds seconds"
    Write-Log "  - Runs as SYSTEM account"
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
    }
}

function Get-DefenderStatus {
    try {
        $status = Get-MpComputerStatus

        function Convert-Int32Safe {
            param($Value)
            if ($null -eq $Value) { return $null }
            try { $n = [double]$Value } catch { return $null }
            # Some Defender fields return UINT32 max as "unknown"
            if ($n -eq 4294967295 -or $n -eq -1) { return $null }
            if ($n -gt 2147483647 -or $n -lt -2147483648) { return $null }
            return [int][math]::Truncate($n)
        }

        return @{
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
            raw_status = $status | ConvertTo-Json -Depth 3 | ConvertFrom-Json
        }
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
        Write-Log "API request failed: $_" -Level "ERROR"
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
    Write-Log "Heartbeat sent successfully"
}

function Send-Threats {
    param([string]$AgentToken)
    $threats = Get-DefenderThreats
    if ($threats.Count -eq 0) { Write-Log "No threats to report"; return }
    Write-Log "Reporting $($threats.Count) threats..."
    $body = @{ threats = $threats }
    $response = Invoke-ApiRequest -Endpoint "/threats" -Body $body -AgentToken $AgentToken
    Write-Log "Threats reported: $($response.message)"
}

# Relevant Windows Defender Event IDs to collect
$RelevantEventIds = @{
    # Windows Defender Operational Log (includes ASR/CFA/Network Protection events)
    "Microsoft-Windows-Windows Defender/Operational" = @(
        1000, 1001,  # Scan started/completed
        1002,        # Scan cancelled
        1005, 1006,  # Malware detected/action taken
        1007,        # Failed to take action
        1008,        # Failed to remove malware
        1009,        # Malware quarantined
        1010,        # Removed from quarantine
        1011,        # Quarantine delete failed
        1013,        # History deleted
        1015, 1016,  # Behavior suspicious/blocked
        1116,        # Malware detected (commonly triggered by EICAR)
        1117,        # Threat action successful
        1118,        # Threat action failed
        1119,        # Critical threat action error
        1121, 1122,  # ASR rule triggered (block/audit)
        1123, 1124,  # Controlled folder access (block/audit)
        1125, 1126,  # Controlled folder access additional events
        1127, 1128,  # Network protection events
        1129,        # ASR warn mode event
        2000, 2001,  # Signature update started/completed
        2002,        # Signature update failed
        2003,        # Engine update started
        2004, 2005,  # Engine update completed/failed
        2010, 2011,  # Platform update started/completed
        2012,        # Platform update failed
        3002,        # Real-time protection failure
        5000, 5001,  # Real-time protection enabled/disabled
        5004, 5007,  # Configuration changed
        5008,        # Engine state changed
        5010, 5012   # Signature/platform outdated
    )
}

function Get-RelevantDefenderLogs {
    param(
        [int]$MaxAgeMinutes = 60,
        [switch]$IgnoreLastLogTime
    )
    
    $logs = @()
    $startTime = (Get-Date).AddMinutes(-$MaxAgeMinutes)
    $lastLogTimeFile = "$ConfigPath\\last_log_time.txt"
    
    $forceSync = ($IgnoreLastLogTime -or $script:ForceFullLogSync)

    # If ForceFullLogSync is set, delete the last log time file
    if ($forceSync) {
        Write-Log "Force full log sync - ignoring last log time and collecting all events from past $MaxAgeMinutes minutes"
        if (Test-Path $lastLogTimeFile) {
            Remove-Item $lastLogTimeFile -Force -ErrorAction SilentlyContinue
        }
    } elseif (Test-Path $lastLogTimeFile) {
        # Use last collection time if available (but cap at MaxAgeMinutes)
        $lastLogTime = Get-Content $lastLogTimeFile -ErrorAction SilentlyContinue
        if ($lastLogTime) {
            try {
                $parsedTime = [DateTime]::Parse($lastLogTime).AddSeconds(1)
                # Only use last log time if it's within the max age window
                if ($parsedTime -gt $startTime) {
                    $startTime = $parsedTime
                    Write-Log "Using last log collection time: $lastLogTime"
                } else {
                    Write-Log "Last log time is older than $MaxAgeMinutes minutes, using full window"
                }
            } catch { 
                Write-Log "Could not parse last log time '$lastLogTime', using default window" -Level "WARN"
            }
        }
    }
    
    Write-Log "Collecting Defender events since: $($startTime.ToString('o'))"
    
    foreach ($logName in $RelevantEventIds.Keys) {
        $eventIds = $RelevantEventIds[$logName]
        
        try {
            if ($forceSync) {
                Write-Log "  Querying $logName (force mode: no Event ID filter, max 250 events)"
                $events = @(Get-WinEvent -FilterHashtable @{
                    LogName = $logName
                    StartTime = $startTime
                } -ErrorAction SilentlyContinue | Select-Object -First 250)
            } else {
                Write-Log "  Querying $logName for events: $($eventIds -join ', ')"
                $events = @(Get-WinEvent -FilterHashtable @{
                    LogName = $logName
                    ID = $eventIds
                    StartTime = $startTime
                } -ErrorAction SilentlyContinue)
            }
            
            if ($events) {
                Write-Log "  Found $($events.Count) events in $logName"
                foreach ($event in $events) {
                    $logs += @{
                        event_id = $event.Id
                        event_source = $logName
                        level = switch ($event.Level) { 1 { "Critical" } 2 { "Error" } 3 { "Warning" } 4 { "Information" } default { "Unknown" } }
                        message = $event.Message
                        event_time = $event.TimeCreated.ToString("o")
                        details = @{
                            provider = $event.ProviderName
                            task = $event.TaskDisplayName
                            keywords = $event.KeywordsDisplayNames -join ", "
                            computer = $event.MachineName
                            user = $event.UserId
                            record_id = $event.RecordId
                        }
                    }
                }
            } else {
                Write-Log "  No matching events in $logName"
            }
        } catch {
            Write-Log "Could not read events from $($logName): $_" -Level "WARN"
        }
    }
    
    # Save collection time
    (Get-Date).ToString("o") | Set-Content -Path $lastLogTimeFile -Force -ErrorAction SilentlyContinue
    
    Write-Log "Total events collected: $($logs.Count)"
    return $logs
}

function Send-DefenderLogs {
    param([string]$AgentToken)
    
    $logs = Get-RelevantDefenderLogs
    if ($logs.Count -eq 0) { 
        Write-Log "No new Defender logs to report"
        return 
    }
    
    Write-Log "Reporting $($logs.Count) Defender event logs..."
    $body = @{ logs = $logs }
    
    try {
        $response = Invoke-ApiRequest -Endpoint "/logs" -Body $body -AgentToken $AgentToken
        Write-Log "Logs reported: $($response.message)"
    } catch {
        Write-Log "Failed to send logs: $_" -Level "ERROR"
    }
}

function Get-AssignedPolicy {
    param([string]$AgentToken)
    try {
        $headers = @{ "Content-Type" = "application/json"; "x-agent-token" = $AgentToken }
        $response = Invoke-RestMethod -Uri "$ApiBaseUrl/policy" -Method GET -Headers $headers
        return $response.policy
    } catch {
        Write-Log "Could not fetch policy: $_" -Level "WARN"
        return $null
    }
}

function Get-WdacPolicy {
    param([string]$AgentToken)
    try {
        $headers = @{ "Content-Type" = "application/json"; "x-agent-token" = $AgentToken }
        $response = Invoke-RestMethod -Uri "$ApiBaseUrl/wdac-policy" -Method GET -Headers $headers
        return $response
    } catch {
        Write-Log "Could not fetch WDAC policy: $_" -Level "WARN"
        return $null
    }
}

# ==================== APP DISCOVERY ====================

function Get-InstalledApplications {
    Write-Log "Collecting installed applications..."
    $apps = @()
    
    # Get from Uninstall registry keys (both 32-bit and 64-bit)
    $registryPaths = @(
        "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*",
        "HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*",
        "HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*"
    )
    
    foreach ($path in $registryPaths) {
        try {
            $regApps = Get-ItemProperty $path -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName }
            foreach ($app in $regApps) {
                $installLocation = $app.InstallLocation
                if (-not $installLocation) { continue }
                
                # Find main executable
                $exeFiles = Get-ChildItem -Path $installLocation -Filter "*.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
                if ($exeFiles) {
                    $fileInfo = $exeFiles | Get-AuthenticodeSignature -ErrorAction SilentlyContinue
                    $versionInfo = [System.Diagnostics.FileVersionInfo]::GetVersionInfo($exeFiles.FullName)
                    
                    $apps += @{
                        file_name = $exeFiles.Name
                        file_path = $exeFiles.FullName
                        file_hash = (Get-FileHash -Path $exeFiles.FullName -Algorithm SHA256 -ErrorAction SilentlyContinue).Hash
                        publisher = if ($fileInfo -and $fileInfo.SignerCertificate) { $fileInfo.SignerCertificate.Subject } else { $app.Publisher }
                        product_name = $app.DisplayName
                        file_version = $versionInfo.FileVersion
                    }
                }
            }
        } catch {
            Write-Log "Error reading registry path $path : $_" -Level "WARN"
        }
    }
    
    Write-Log "Found $($apps.Count) installed applications"
    return $apps
}

function Get-RunningProcesses {
    Write-Log "Collecting running processes..."
    $apps = @()
    $seenPaths = @{}
    
    $processes = Get-Process | Where-Object { $_.Path } | Select-Object -Property Name, Path -Unique
    
    foreach ($proc in $processes) {
        if ($seenPaths.ContainsKey($proc.Path)) { continue }
        $seenPaths[$proc.Path] = $true
        
        try {
            $fileInfo = Get-AuthenticodeSignature -FilePath $proc.Path -ErrorAction SilentlyContinue
            $versionInfo = [System.Diagnostics.FileVersionInfo]::GetVersionInfo($proc.Path)
            
            $apps += @{
                file_name = Split-Path $proc.Path -Leaf
                file_path = $proc.Path
                file_hash = (Get-FileHash -Path $proc.Path -Algorithm SHA256 -ErrorAction SilentlyContinue).Hash
                publisher = if ($fileInfo -and $fileInfo.SignerCertificate) { $fileInfo.SignerCertificate.Subject } else { $versionInfo.CompanyName }
                product_name = $versionInfo.ProductName
                file_version = $versionInfo.FileVersion
            }
        } catch {
            # Skip files we can't access
        }
    }
    
    Write-Log "Found $($apps.Count) running processes"
    return $apps
}

function Send-DiscoveredApps {
    param([string]$AgentToken)
    
    # Combine installed apps and running processes
    $installedApps = Get-InstalledApplications
    $runningApps = Get-RunningProcesses
    
    # Merge and dedupe by path
    $allApps = @{}
    foreach ($app in $installedApps) {
        $key = $app.file_path.ToLower()
        $allApps[$key] = $app
    }
    foreach ($app in $runningApps) {
        $key = $app.file_path.ToLower()
        if (-not $allApps.ContainsKey($key)) {
            $allApps[$key] = $app
        }
    }
    
    $apps = @($allApps.Values)
    
    if ($apps.Count -eq 0) {
        Write-Log "No applications to report"
        return
    }
    
    Write-Log "Reporting $($apps.Count) discovered applications..."
    $body = @{ apps = $apps; source = "agent_inventory" }
    
    try {
        $response = Invoke-ApiRequest -Endpoint "/apps" -Body $body -AgentToken $AgentToken
        Write-Log "Apps reported: $($response.message)"
    } catch {
        Write-Log "Failed to send apps: $_" -Level "ERROR"
    }
}

# ASR Rule GUIDs
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
    
    # Check if policy has changed (compare using updated_at timestamp from policy)
    $policyVersion = $Policy.updated_at
    $oldVersion = ""
    if (Test-Path $PolicyHashFile) { $oldVersion = Get-Content $PolicyHashFile -ErrorAction SilentlyContinue }
    
    if (-not $Force -and $policyVersion -eq $oldVersion) { 
        Write-Log "Policy unchanged (version: $policyVersion), skipping application"
        return $false 
    }
    
    if ($Force) { Write-Log "Force flag set - applying policy regardless of version" }
    
    Write-Log "=========================================="
    Write-Log "Applying Policy: $($Policy.name)"
    Write-Log "=========================================="
    
    try {
        # Core protection settings
        Write-Log "Configuring core protection settings..."
        $mpParams = @{}
        
        if ($null -ne $Policy.realtime_monitoring) {
            $mpParams["DisableRealtimeMonitoring"] = -not $Policy.realtime_monitoring
            Write-Log "  Real-time Monitoring: $($Policy.realtime_monitoring)"
        }
        if ($null -ne $Policy.behavior_monitoring) {
            $mpParams["DisableBehaviorMonitoring"] = -not $Policy.behavior_monitoring
            Write-Log "  Behavior Monitoring: $($Policy.behavior_monitoring)"
        }
        if ($null -ne $Policy.ioav_protection) {
            $mpParams["DisableIOAVProtection"] = -not $Policy.ioav_protection
            Write-Log "  IOAV Protection: $($Policy.ioav_protection)"
        }
        if ($null -ne $Policy.script_scanning) {
            $mpParams["DisableScriptScanning"] = -not $Policy.script_scanning
            Write-Log "  Script Scanning: $($Policy.script_scanning)"
        }
        if ($null -ne $Policy.removable_drive_scanning) {
            $mpParams["DisableRemovableDriveScanning"] = -not $Policy.removable_drive_scanning
            Write-Log "  Removable Drive Scanning: $($Policy.removable_drive_scanning)"
        }
        if ($null -ne $Policy.archive_scanning) {
            $mpParams["DisableArchiveScanning"] = -not $Policy.archive_scanning
            Write-Log "  Archive Scanning: $($Policy.archive_scanning)"
        }
        if ($null -ne $Policy.email_scanning) {
            $mpParams["DisableEmailScanning"] = -not $Policy.email_scanning
            Write-Log "  Email Scanning: $($Policy.email_scanning)"
        }
        if ($null -ne $Policy.check_signatures_before_scan) {
            $mpParams["CheckForSignaturesBeforeRunningScan"] = $Policy.check_signatures_before_scan
            Write-Log "  Check Signatures Before Scan: $($Policy.check_signatures_before_scan)"
        }
        
        # Cloud protection
        Write-Log "Configuring cloud protection..."
        if ($null -ne $Policy.cloud_delivered_protection) {
            $mpParams["MAPSReporting"] = if ($Policy.cloud_delivered_protection) { 2 } else { 0 }
            Write-Log "  Cloud-Delivered Protection: $($Policy.cloud_delivered_protection)"
        }
        if ($null -ne $Policy.block_at_first_seen) {
            $mpParams["DisableBlockAtFirstSeen"] = -not $Policy.block_at_first_seen
            Write-Log "  Block at First Seen: $($Policy.block_at_first_seen)"
        }
        if ($Policy.cloud_block_level) {
            $cloudLevel = switch ($Policy.cloud_block_level) { "Default" { 0 } "Moderate" { 1 } "High" { 2 } "HighPlus" { 4 } "ZeroTolerance" { 6 } default { 2 } }
            $mpParams["CloudBlockLevel"] = $cloudLevel
            Write-Log "  Cloud Block Level: $($Policy.cloud_block_level)"
        }
        if ($null -ne $Policy.cloud_extended_timeout) {
            $mpParams["CloudExtendedTimeout"] = $Policy.cloud_extended_timeout
            Write-Log "  Cloud Extended Timeout: $($Policy.cloud_extended_timeout)s"
        }
        if ($Policy.sample_submission) {
            $sampleLevel = switch ($Policy.sample_submission) { "None" { 0 } "SendSafeSamples" { 1 } "SendAllSamples" { 3 } "AlwaysPrompt" { 2 } default { 3 } }
            $mpParams["SubmitSamplesConsent"] = $sampleLevel
            Write-Log "  Sample Submission: $($Policy.sample_submission)"
        }
        
        # PUA & Signatures
        if ($null -ne $Policy.pua_protection) {
            $mpParams["PUAProtection"] = if ($Policy.pua_protection) { 1 } else { 0 }
            Write-Log "  PUA Protection: $($Policy.pua_protection)"
        }
        if ($null -ne $Policy.signature_update_interval) {
            $mpParams["SignatureUpdateInterval"] = $Policy.signature_update_interval
            Write-Log "  Signature Update Interval: $($Policy.signature_update_interval) hours"
        }
        
        # Apply core settings
        if ($mpParams.Count -gt 0) {
            Set-MpPreference @mpParams
            Write-Log "Core Defender settings applied successfully"
        }
        
        # Network Protection
        if ($null -ne $Policy.network_protection) {
            $npMode = if ($Policy.network_protection) { 1 } else { 0 }
            Set-MpPreference -EnableNetworkProtection $npMode
            Write-Log "  Network Protection: $($Policy.network_protection)"
        }
        
        # Controlled Folder Access
        if ($null -ne $Policy.controlled_folder_access) {
            $cfaMode = if ($Policy.controlled_folder_access) { 1 } else { 0 }
            Set-MpPreference -EnableControlledFolderAccess $cfaMode
            Write-Log "  Controlled Folder Access: $($Policy.controlled_folder_access)"
        }
        
        # ASR Rules
        Write-Log "Configuring Attack Surface Reduction rules..."
        $asrIds = @()
        $asrActions = @()
        
        $asrMappings = @{
            "asr_block_vulnerable_drivers" = "block_vulnerable_drivers"
            "asr_block_email_executable" = "block_email_executable"
            "asr_block_office_child_process" = "block_office_child_process"
            "asr_block_office_executable_content" = "block_office_executable_content"
            "asr_block_wmi_persistence" = "block_wmi_persistence"
            "asr_block_adobe_child_process" = "block_adobe_child_process"
            "asr_block_office_comms_child_process" = "block_office_comms_child_process"
            "asr_block_usb_untrusted" = "block_usb_untrusted"
            "asr_block_psexec_wmi" = "block_psexec_wmi"
            "asr_block_credential_stealing" = "block_credential_stealing"
            "asr_advanced_ransomware_protection" = "advanced_ransomware_protection"
            "asr_block_untrusted_executables" = "block_untrusted_executables"
            "asr_block_office_macro_win32" = "block_office_macro_win32"
            "asr_block_obfuscated_scripts" = "block_obfuscated_scripts"
            "asr_block_js_vbs_executable" = "block_js_vbs_executable"
            "asr_block_office_code_injection" = "block_office_code_injection"
        }
        
        foreach ($policyKey in $asrMappings.Keys) {
            $ruleKey = $asrMappings[$policyKey]
            $policyValue = $Policy.$policyKey
            if ($policyValue -and $AsrRuleGuids.ContainsKey($ruleKey)) {
                $asrIds += $AsrRuleGuids[$ruleKey]
                $asrActions += Convert-AsrAction -Action $policyValue
                Write-Log "  ASR $($ruleKey): $policyValue"
            }
        }
        
        if ($asrIds.Count -gt 0) {
            Set-MpPreference -AttackSurfaceReductionRules_Ids $asrIds -AttackSurfaceReductionRules_Actions $asrActions
            Write-Log "ASR rules configured: $($asrIds.Count) rules"
        }
        
        # Save policy version (updated_at timestamp)
        $policyVersion | Set-Content -Path $PolicyHashFile -Force
        
        Write-Log "=========================================="
        Write-Log "Policy applied successfully!"
        Write-Log "=========================================="
        return $true
    } catch {
        Write-Log "Error applying policy: $_" -Level "ERROR"
        return $false
    }
}

# ==================== MAIN EXECUTION ====================

Write-Log "=========================================="
Write-Log "Peritus Secure Agent v2.2.0"
Write-Log "=========================================="

if ($Uninstall) { Uninstall-Agent }

$agentToken = $null
$isFirstRun = $true

if (Test-Path $ConfigFile) {
    $config = Get-Content $ConfigFile | ConvertFrom-Json
    $agentToken = $config.agent_token
    $isFirstRun = $false
    Write-Log "Found existing agent configuration"
}

# If the user runs a freshly-downloaded script (not the installed one), upgrade the installed agent script + task.
# This fixes "I downloaded a new version but C:\ProgramData still runs the old one".
if (-not $isFirstRun -and $MyInvocation.MyCommand.Path -and ($MyInvocation.MyCommand.Path -ne $ScriptPath)) {
    try {
        Write-Log "Installer script detected at '$($MyInvocation.MyCommand.Path)'. Updating installed agent at '$ScriptPath'..."
        $scriptContent = Get-Content -Path $MyInvocation.MyCommand.Path -Raw
        Install-AgentTask -ScriptContent $scriptContent
        Write-Log "Installed agent updated successfully"
    } catch {
        Write-Log "Failed to update installed agent: $_" -Level "WARN"
    }
}

if (-not $agentToken) { $agentToken = Register-Agent -OrganizationToken $OrganizationToken }

if ($isFirstRun) {
    Write-Log ""
    Write-Log "First run detected - installing as scheduled task..."
    $scriptContent = Get-Content -Path $MyInvocation.MyCommand.Path -Raw
    Install-AgentTask -ScriptContent $scriptContent
    Write-Log ""
    Write-Log "=========================================="
    Write-Log "INSTALLATION COMPLETE!"
    Write-Log "=========================================="
    Write-Log ""
    Write-Log "The agent is now installed and will:"
    Write-Log "  - Start automatically when Windows boots"
    Write-Log "  - Send status updates every $HeartbeatIntervalSeconds seconds"
    Write-Log "  - Apply security policies from the platform"
    Write-Log "  - Run silently in the background"
    Write-Log ""
    Write-Log "To uninstall, run:"
    Write-Log "  powershell -File \`"$ScriptPath\`" -Uninstall"
    Write-Log ""
}

Send-Heartbeat -AgentToken $agentToken
Send-Threats -AgentToken $agentToken
Send-DefenderLogs -AgentToken $agentToken
Send-DiscoveredApps -AgentToken $agentToken

# Fetch and apply Defender policy
$policy = Get-AssignedPolicy -AgentToken $agentToken
if ($policy) {
    Write-Log "Defender Policy assigned: $($policy.name) (updated: $($policy.updated_at))"
    $applied = Apply-Policy -Policy $policy -Force:$ForcePolicy
    if ($applied) { Write-Log "Defender policy enforcement complete" }
} else {
    Write-Log "No Defender policy assigned to this endpoint"
}

# Fetch WDAC policy (informational - actual enforcement requires WDAC tooling)
$wdacResponse = Get-WdacPolicy -AgentToken $agentToken
if ($wdacResponse -and $wdacResponse.wdac_policy) {
    Write-Log "WDAC Policy assigned: $($wdacResponse.wdac_policy.name) (mode: $($wdacResponse.wdac_policy.mode))"
    Write-Log "  Rules count: $($wdacResponse.rules.Count)"
} else {
    Write-Log "No WDAC policy assigned to this endpoint"
}

Write-Log "Agent run complete."
`;
};

const AgentDownload = () => {
  const { currentOrganization, isLoading } = useTenant();
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const orgId = currentOrganization?.id || null;
  const orgName = currentOrganization?.name || null;
  const error = !isLoading && !currentOrganization ? "No organization found. Please contact support." : null;

  const apiBaseUrl = "https://njdcyjxgtckgtzgzoctw.supabase.co/functions/v1/agent-api";
  const powershellScript = orgId ? generatePowershellScript(orgId, apiBaseUrl) : "";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(powershellScript);
      setCopied(true);
      toast({
        title: "Copied to clipboard",
        description: "PowerShell script has been copied.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Please select and copy the script manually.",
        variant: "destructive",
      });
    }
  };

  const handleDownload = () => {
    const blob = new Blob([powershellScript], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "PeritusSecureAgent.ps1";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({
      title: "Download started",
      description: "PeritusSecureAgent.ps1 is downloading.",
    });
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (error || !orgId) {
    return (
      <MainLayout>
        <div className="space-y-6 max-w-4xl">
          <div>
            <h1 className="text-2xl font-bold">Deploy Agent</h1>
            <p className="text-muted-foreground">
              Download and install the Peritus Secure agent on your Windows endpoints
            </p>
          </div>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Unable to Generate Deployment Script</AlertTitle>
            <AlertDescription>
              {error || "No organization found. Please ensure you're part of an organization."}
            </AlertDescription>
          </Alert>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Deploy Agent</h1>
          <p className="text-muted-foreground">
            Download and install the Peritus Secure agent on your Windows endpoints
          </p>
          {orgName && (
            <p className="text-sm text-muted-foreground mt-1">
              Organization: <span className="font-medium text-foreground">{orgName}</span>
            </p>
          )}
        </div>

        {/* Requirements */}
        <Card className="border-border/40">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Requirements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-status-healthy mt-0.5" />
                <div>
                  <p className="font-medium">Windows 10/11</p>
                  <p className="text-sm text-muted-foreground">Build 1709 or later</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-status-healthy mt-0.5" />
                <div>
                  <p className="font-medium">PowerShell 5.1+</p>
                  <p className="text-sm text-muted-foreground">Included in Windows</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-status-healthy mt-0.5" />
                <div>
                  <p className="font-medium">Administrator</p>
                  <p className="text-sm text-muted-foreground">Run as admin required</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Installation Tabs */}
        <Card className="border-border/40">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Terminal className="h-5 w-5 text-primary" />
              Installation
            </CardTitle>
            <CardDescription>
              Choose your preferred installation method
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="download" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="download">Download Script</TabsTrigger>
                <TabsTrigger value="oneliner">One-Liner</TabsTrigger>
              </TabsList>

              <TabsContent value="download" className="space-y-4 mt-4">
                <div className="flex gap-3">
                  <Button onClick={handleDownload} className="gap-2">
                    <Download className="h-4 w-4" />
                    Download PeritusSecureAgent.ps1
                  </Button>
                  <Button variant="outline" onClick={handleCopy} className="gap-2">
                    {copied ? (
                      <CheckCircle className="h-4 w-4 text-status-healthy" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    {copied ? "Copied!" : "Copy Script"}
                  </Button>
                </div>
                <div className="rounded-lg bg-secondary/50 p-4">
                  <p className="text-sm font-medium mb-2">Run the script as Administrator:</p>
                  <code className="text-xs text-muted-foreground">
                    powershell.exe -ExecutionPolicy Bypass -File .\PeritusSecureAgent.ps1
                  </code>
                </div>
              </TabsContent>

              <TabsContent value="oneliner" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Run this command in an elevated PowerShell:</Label>
                  <div className="relative">
                    <pre className="rounded-lg bg-secondary/50 p-4 text-xs overflow-x-auto">
                      <code>
                        irm https://peritus.app/install.ps1 | iex
                      </code>
                    </pre>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  This will download and run the latest agent installer with your organization token.
                </p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* What happens next */}
        <Card className="border-border/40">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              What Happens When You Run It
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                  1
                </div>
                <div>
                  <p className="font-medium">Agent Registers</p>
                  <p className="text-sm text-muted-foreground">
                    The agent registers this endpoint with your organization
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                  2
                </div>
                <div>
                  <p className="font-medium">Scheduled Task Created</p>
                  <p className="text-sm text-muted-foreground">
                    A Windows scheduled task is automatically created to run every 5 minutes
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                  3
                </div>
                <div>
                  <p className="font-medium">Runs Silently in Background</p>
                  <p className="text-sm text-muted-foreground">
                    No window stays open - the agent runs as a background service
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                  4
                </div>
                <div>
                  <p className="font-medium">Continuous Monitoring</p>
                  <p className="text-sm text-muted-foreground">
                    Defender status and threats are reported automatically, even after reboots
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Uninstall Instructions */}
        <Card className="border-border/40">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Agent Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">View agent logs:</p>
              <code className="text-xs bg-secondary/50 p-2 rounded block">
                Get-Content "$env:ProgramData\PeritusSecure\agent.log" -Tail 50
              </code>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Uninstall agent:</p>
              <code className="text-xs bg-secondary/50 p-2 rounded block">
                powershell -File "$env:ProgramData\PeritusSecure\PeritusSecureAgent.ps1" -Uninstall
              </code>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Check scheduled task status:</p>
              <code className="text-xs bg-secondary/50 p-2 rounded block">
                Get-ScheduledTask -TaskName "PeritusSecureAgent"
              </code>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default AgentDownload;
