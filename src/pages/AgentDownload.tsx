import { useEffect, useMemo, useState } from "react";
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
import trayIconPng from "@/assets/peritus-tray-icon.png";

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
};

const createSingleBmpIco = (imageData: ImageData): ArrayBuffer => {
  // ICO container holding a single 32bpp BMP (DIB) image.
  // This format is reliably readable by .NET Framework's System.Drawing.Icon.
  const width = imageData.width;
  const height = imageData.height;

  const headerSize = 6;
  const entrySize = 16;
  const imageOffset = headerSize + entrySize;

  const dibHeaderSize = 40; // BITMAPINFOHEADER
  const pixelDataSize = width * height * 4; // BGRA
  const andRowBytes = Math.ceil(width / 32) * 4; // rows aligned to 32 bits
  const andMaskSize = andRowBytes * height;
  const imageSize = dibHeaderSize + pixelDataSize + andMaskSize;

  const out = new Uint8Array(imageOffset + imageSize);
  const dv = new DataView(out.buffer);

  // ICONDIR
  dv.setUint16(0, 0, true); // reserved
  dv.setUint16(2, 1, true); // type = 1 (icon)
  dv.setUint16(4, 1, true); // count

  // ICONDIRENTRY
  out[6] = width === 256 ? 0 : width;
  out[7] = height === 256 ? 0 : height;
  out[8] = 0; // color count
  out[9] = 0; // reserved
  dv.setUint16(10, 1, true); // planes
  dv.setUint16(12, 32, true); // bit count
  dv.setUint32(14, imageSize, true); // bytes in resource
  dv.setUint32(18, imageOffset, true); // image offset

  // BITMAPINFOHEADER
  const p = imageOffset;
  dv.setUint32(p + 0, dibHeaderSize, true);
  dv.setInt32(p + 4, width, true);
  dv.setInt32(p + 8, height * 2, true); // color + mask
  dv.setUint16(p + 12, 1, true); // planes
  dv.setUint16(p + 14, 32, true); // bpp
  dv.setUint32(p + 16, 0, true); // BI_RGB
  dv.setUint32(p + 20, pixelDataSize + andMaskSize, true);
  dv.setInt32(p + 24, 0, true); // ppm X
  dv.setInt32(p + 28, 0, true); // ppm Y
  dv.setUint32(p + 32, 0, true); // colors used
  dv.setUint32(p + 36, 0, true); // important colors

  // Pixel data (BGRA, bottom-up)
  const src = imageData.data;
  const pixelStart = p + dibHeaderSize;
  for (let y = 0; y < height; y++) {
    const srcY = height - 1 - y;
    for (let x = 0; x < width; x++) {
      const si = (srcY * width + x) * 4;
      const di = pixelStart + (y * width + x) * 4;
      out[di + 0] = src[si + 2]; // B
      out[di + 1] = src[si + 1]; // G
      out[di + 2] = src[si + 0]; // R
      out[di + 3] = src[si + 3]; // A
    }
  }

  // AND mask (all zero = fully opaque)
  // out is already zero-initialized in most JS engines, but ensure it explicitly.
  const maskStart = pixelStart + pixelDataSize;
  out.fill(0, maskStart, maskStart + andMaskSize);

  return out.buffer;
};

const blobToIcoBase64 = async (blob: Blob, size = 32) => {
  // Convert the source image to a BMP-based .ico in-browser.
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Failed to decode icon image"));
      el.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context unavailable");

    ctx.clearRect(0, 0, size, size);
    const scale = Math.min(size / img.width, size / img.height);
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const x = Math.round((size - w) / 2);
    const y = Math.round((size - h) / 2);
    ctx.drawImage(img, x, y, w, h);

    const imageData = ctx.getImageData(0, 0, size, size);
    const icoBuf = createSingleBmpIco(imageData);
    return arrayBufferToBase64(icoBuf);
  } finally {
    URL.revokeObjectURL(url);
  }
};

const generatePowershellScript = (orgId: string, apiBaseUrl: string, trayIconIcoBase64: string) => {
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
    Use this to force a full resync of event logs.
.EXAMPLE
    .\\PeritusSecureAgent.ps1 -TrayMode
    Runs the agent with a system tray icon for status visibility.
.NOTES
    Version: 2.7.0
    Requires: Windows 10/11, PowerShell 5.1+, Administrator privileges
    Changes in 2.7.0: Added Security Event 4688 (process creation) collection for IOC threat hunting
#>

param(
    [string]$OrganizationToken = "${orgId}",
    [int]$HeartbeatIntervalSeconds = 30,
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

# Store ForceFullLogSync in script scope so functions can access it
$script:ForceFullLogSync = $ForceFullLogSync.IsPresent

# Agent configuration storage
$ConfigPath = "$env:ProgramData\\PeritusSecure"
$ConfigFile = "$ConfigPath\\agent.json"
$ScriptPath = "$ConfigPath\\PeritusSecureAgent.ps1"
$LogFile = "$ConfigPath\\agent.log"
$PolicyHashFile = "$ConfigPath\\policy_hash.txt"
$TrayIconFile = "$ConfigPath\\tray_icon.ico"

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
    
    # Remove scheduled task
    $existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if ($existingTask) {
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
        Write-Log "Scheduled task removed"
    }
    
    # Remove tray startup registry entry
    try {
        Remove-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run" -Name "PeritusSecureTray" -ErrorAction SilentlyContinue
        Write-Log "Tray startup entry removed"
    } catch { }
    
    # Kill any running tray process
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
    # RestartInterval must be >= 1 minute on many Windows builds (PT30S can fail task registration).
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
    
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

function Get-UacStatus {
    try {
        $uacPath = "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System"
        if (-not (Test-Path $uacPath)) {
            Write-Log "UAC registry path not found" -Level "WARN"
            return @{}
        }
        
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
        $wuPath = "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\WindowsUpdate\\Auto Update"
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
        
        # Get Auto Update options from AU policy path
        if (Test-Path $wuAU) {
            $au = Get-ItemProperty -Path $wuAU -ErrorAction SilentlyContinue
            if ($null -ne $au.AUOptions) { $status.wu_auto_update_mode = $au.AUOptions }
        }
        
        # Get Active Hours from WindowsUpdate path
        if (Test-Path $wuPolicies) {
            $wu = Get-ItemProperty -Path $wuPolicies -ErrorAction SilentlyContinue
            if ($null -ne $wu.ActiveHoursStart) { $status.wu_active_hours_start = $wu.ActiveHoursStart }
            if ($null -ne $wu.ActiveHoursEnd) { $status.wu_active_hours_end = $wu.ActiveHoursEnd }
            if ($null -ne $wu.DeferFeatureUpdates) { $status.wu_feature_update_deferral = $wu.DeferFeatureUpdatesPeriodInDays }
            if ($null -ne $wu.DeferQualityUpdates) { $status.wu_quality_update_deferral = $wu.DeferQualityUpdatesPeriodInDays }
            if ($null -ne $wu.PauseFeatureUpdatesStartTime) { $status.wu_pause_feature_updates = $true }
            if ($null -ne $wu.PauseQualityUpdatesStartTime) { $status.wu_pause_quality_updates = $true }
        }
        
        # Get pending updates count using COM
        try {
            $updateSession = New-Object -ComObject Microsoft.Update.Session
            $updateSearcher = $updateSession.CreateUpdateSearcher()
            $searchResult = $updateSearcher.Search("IsInstalled=0 and Type='Software'")
            $status.wu_pending_updates_count = $searchResult.Updates.Count
        } catch {
            Write-Log "Could not query pending updates: $_" -Level "WARN"
        }
        
        # Get last install date from event log
        try {
            $lastInstall = Get-WinEvent -FilterHashtable @{LogName='System'; ProviderName='Microsoft-Windows-WindowsUpdateClient'; Id=19} -MaxEvents 1 -ErrorAction SilentlyContinue
            if ($lastInstall) {
                $status.wu_last_install_date = $lastInstall.TimeCreated.ToUniversalTime().ToString("o")
            }
        } catch {
            # May not have events
        }
        
        # Check for pending restart
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
            # Some Defender fields return UINT32 max as "unknown"
            if ($n -eq 4294967295 -or $n -eq -1) { return $null }
            if ($n -gt 2147483647 -or $n -lt -2147483648) { return $null }
            return [int][math]::Truncate($n)
        }

        # Get UAC status and merge with Defender status
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
            raw_status = $status | ConvertTo-Json -Depth 3 | ConvertFrom-Json
        }

        # Merge UAC status into result
        foreach ($key in $uacStatus.Keys) {
            $result[$key] = $uacStatus[$key]
        }

        # Merge Windows Update status into result
        foreach ($key in $wuStatus.Keys) {
            $result[$key] = $wuStatus[$key]
        }

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
        # Include response body (if available) to make troubleshooting API errors easier.
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
    Write-Log "Heartbeat sent successfully"
}

function Send-Threats {
    param([string]$AgentToken)
    $threats = Get-DefenderThreats
    if ($threats.Count -eq 0) { Write-Log "No threats to report"; return }
    Write-Log "Reporting $($threats.Count) threats..."
    # Force JSON array even if PowerShell returns an enumerable/collection type.
    $body = @{ threats = @($threats) }
    $response = Invoke-ApiRequest -Endpoint "/threats" -Body $body -AgentToken $AgentToken
    Write-Log "Threats reported: $($response.message)"
}

# Relevant Windows Event IDs to collect for security monitoring and IOC hunting
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
    # Security Log - Process creation for IOC threat hunting
    # NOTE: Requires audit policy enabled: auditpol /set /subcategory:"Process Creation" /success:enable
    "Security" = @(
        4688,        # Process creation with command line (essential for IOC hunting)
        4689         # Process termination (optional context)
    )
}

function Get-RelevantDefenderLogs {
    param(
        [int]$MaxAgeMinutes = 60,
        [switch]$IgnoreLastLogTime
    )
    
    $logs = @()
    # Use UTC internally for all time comparisons to avoid timezone issues
    $nowUtc = (Get-Date).ToUniversalTime()
    $startTimeUtc = $nowUtc.AddMinutes(-$MaxAgeMinutes)
    $lastLogTimeFile = "$ConfigPath\\last_log_time.txt"
    $maxSeenEventTimeUtc = $null
    $cursorWasUsed = $false
    
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
                # Parse as DateTimeOffset (preserves any included offset) and convert to UTC
                $parsedTimeUtc = ([DateTimeOffset]::Parse($lastLogTime)).UtcDateTime.AddSeconds(1)

                # Sanity: if the cursor looks "in the future" relative to this machine, ignore it.
                if ($parsedTimeUtc -gt $nowUtc.AddMinutes(5)) {
                    Write-Log "Last log time appears to be in the future ($lastLogTime). Ignoring cursor and using full window." -Level "WARN"
                }
                # Only use last log time if it's within the max age window
                elseif ($parsedTimeUtc -gt $startTimeUtc) {
                    $startTimeUtc = $parsedTimeUtc
                    $cursorWasUsed = $true
                    Write-Log "Using last log collection time: $lastLogTime (UTC: $($startTimeUtc.ToString('o')))"
                } else {
                    Write-Log "Last log time is older than $MaxAgeMinutes minutes, using full window"
                }
            } catch { 
                Write-Log "Could not parse last log time '$lastLogTime', using default window" -Level "WARN"
            }
        }
    }
    
    # Convert UTC back to local time for Get-WinEvent (which expects local time)
    $startTimeLocal = $startTimeUtc.ToLocalTime()
    Write-Log "Collecting security events since: $($startTimeLocal.ToString('o')) (UTC: $($startTimeUtc.ToString('u')))"
    
    foreach ($logName in $RelevantEventIds.Keys) {
        $eventIds = $RelevantEventIds[$logName]
        
        try {
            # IMPORTANT:
            # Some Windows builds return "No events were found" when using a large ID list in the FilterHashtable,
            # even if matching events exist. To make collection reliable, we query by StartTime only and then
            # filter by ID in PowerShell.
            #
            # In forceSync mode we keep a hard cap to avoid huge payloads.
            $maxEvents = if ($forceSync) { 250 } else { 1000 }
            Write-Log "  Querying $logName since $($startTimeLocal.ToString('o')) (maxEvents=$maxEvents; filtering IDs in PowerShell)"

            $eventsAll = @(Get-WinEvent -FilterHashtable @{
                LogName = $logName
                StartTime = $startTimeLocal
            } -MaxEvents $maxEvents -ErrorAction Stop)

            # Filter locally to the relevant Defender event IDs
            $events = @($eventsAll | Where-Object { $eventIds -contains $_.Id })
            
            if ($events) {
                Write-Log "  Found $($events.Count) events in $logName"
                foreach ($event in $events) {
                    $eventTimeUtc = $event.TimeCreated.ToUniversalTime()
                    $eventTimeIsoUtc = $eventTimeUtc.ToString("o")
                    if (-not $maxSeenEventTimeUtc -or ($eventTimeUtc -gt $maxSeenEventTimeUtc)) {
                        $maxSeenEventTimeUtc = $eventTimeUtc
                    }

                    $logs += @{
                        event_id = $event.Id
                        event_source = $logName
                        level = switch ($event.Level) { 1 { "Critical" } 2 { "Error" } 3 { "Warning" } 4 { "Information" } default { "Unknown" } }
                        message = $event.Message
                        # Always transmit UTC timestamps to avoid offset parsing differences across machines.
                        event_time = $eventTimeIsoUtc
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
            # Log the real exception (Stop) so failures don't masquerade as "no events".
            Write-Log "Could not read events from $($logName): $($_.Exception.Message)" -Level "WARN"
        }
    }

    # Recovery: if we used a cursor and got zero events, re-scan the full window once.
    # This heals from previously-bad cursor values that could have jumped past real events.
    if ((-not $forceSync) -and $cursorWasUsed -and ($logs.Count -eq 0)) {
        Write-Log "No events found since cursor; attempting recovery scan using full $MaxAgeMinutes-minute window" -Level "WARN"

        $startTimeUtc = $nowUtc.AddMinutes(-$MaxAgeMinutes)
        $startTimeLocal = $startTimeUtc.ToLocalTime()
        $maxSeenEventTimeUtc = $null
        $logs = @()

        foreach ($logName in $RelevantEventIds.Keys) {
            $eventIds = $RelevantEventIds[$logName]
            try {
                $maxEvents = 1000
                Write-Log "  Recovery query $logName since $($startTimeLocal.ToString('o')) (maxEvents=$maxEvents; filtering IDs in PowerShell)"

                $eventsAll = @(Get-WinEvent -FilterHashtable @{
                    LogName = $logName
                    StartTime = $startTimeLocal
                } -MaxEvents $maxEvents -ErrorAction Stop)

                $events = @($eventsAll | Where-Object { $eventIds -contains $_.Id })

                if ($events) {
                    Write-Log "  Recovery found $($events.Count) events in $logName"
                    foreach ($event in $events) {
                        $eventTimeUtc = $event.TimeCreated.ToUniversalTime()
                        $eventTimeIsoUtc = $eventTimeUtc.ToString("o")
                        if (-not $maxSeenEventTimeUtc -or ($eventTimeUtc -gt $maxSeenEventTimeUtc)) {
                            $maxSeenEventTimeUtc = $eventTimeUtc
                        }

                        $logs += @{
                            event_id = $event.Id
                            event_source = $logName
                            level = switch ($event.Level) { 1 { "Critical" } 2 { "Error" } 3 { "Warning" } 4 { "Information" } default { "Unknown" } }
                            message = $event.Message
                            event_time = $eventTimeIsoUtc
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
                }
            } catch {
                Write-Log "Could not read events from $($logName) during recovery: $($_.Exception.Message)" -Level "WARN"
            }
        }
    }
    
    Write-Log "Total events collected: $($logs.Count)"

    # Return both the logs and the max event time we saw.
    # IMPORTANT: We only advance last_log_time after a successful POST to the API.
    return [pscustomobject]@{
        logs = $logs
        max_event_time = if ($maxSeenEventTimeUtc) { $maxSeenEventTimeUtc.ToString("o") } else { $null }
        fallback_time = (Get-Date).ToUniversalTime().ToString("o")
    }
}

function Send-DefenderLogs {
    param([string]$AgentToken)
    
    $result = Get-RelevantDefenderLogs
    $logs = @($result.logs)
    $lastLogTimeFile = "$ConfigPath\\last_log_time.txt"

    if ($logs.Count -eq 0) {
        # CRITICAL: Do NOT advance cursor when no events found.
        # If we advance, we lose events that may exist but weren't captured due to timing/filter issues.
        # The next run will re-scan the same window, which is safe (dedup happens server-side if needed).
        Write-Log "No new Defender logs to report (cursor not advanced)"
        return
    }
    
    Write-Log "Reporting $($logs.Count) Defender event logs..."
    $body = @{ logs = $logs }
    
    try {
        $response = Invoke-ApiRequest -Endpoint "/logs" -Body $body -AgentToken $AgentToken
        Write-Log "Logs reported: $($response.message)"

        # Only advance last_log_time after the API confirms receipt.
        # PowerShell 5.1 doesn't support the null-coalescing operator (??), so use explicit fallback.
        $cursorTime = $result.max_event_time
        if (-not $cursorTime) { $cursorTime = $result.fallback_time }
        $cursorTime | Set-Content -Path $lastLogTimeFile -Force -ErrorAction SilentlyContinue
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

function Get-UacPolicy {
    param([string]$AgentToken)
    try {
        $headers = @{ "Content-Type" = "application/json"; "x-agent-token" = $AgentToken }
        $response = Invoke-RestMethod -Uri "$ApiBaseUrl/uac-policy" -Method GET -Headers $headers
        return $response
    } catch {
        Write-Log "Could not fetch UAC policy: $_" -Level "WARN"
        return $null
    }
}

function Get-WindowsUpdatePolicy {
    param([string]$AgentToken)
    try {
        $headers = @{ "Content-Type" = "application/json"; "x-agent-token" = $AgentToken }
        $response = Invoke-RestMethod -Uri "$ApiBaseUrl/windows-update-policy" -Method GET -Headers $headers
        return $response
    } catch {
        Write-Log "Could not fetch Windows Update policy: $_" -Level "WARN"
        return $null
    }
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
        if ($lastHash -eq $policyHash) {
            Write-Log "Windows Update policy unchanged, skipping enforcement"
            return $false
        }
    }
    
    Write-Log "Applying Windows Update policy: $($Policy.name)"
    $changesApplied = $false
    
    try {
        # Ensure paths exist
        if (-not (Test-Path $wuPolicyPath)) { New-Item -Path $wuPolicyPath -Force | Out-Null }
        if (-not (Test-Path $wuAUPath)) { New-Item -Path $wuAUPath -Force | Out-Null }
        
        # Auto Update Mode
        if ($null -ne $Policy.auto_update_mode) {
            Set-ItemProperty -Path $wuAUPath -Name "AUOptions" -Value $Policy.auto_update_mode -Type DWord -Force
            Write-Log "  AUOptions = $($Policy.auto_update_mode)"
            $changesApplied = $true
        }
        
        # Active Hours
        if ($null -ne $Policy.active_hours_start) {
            Set-ItemProperty -Path $wuPolicyPath -Name "ActiveHoursStart" -Value $Policy.active_hours_start -Type DWord -Force
            Write-Log "  ActiveHoursStart = $($Policy.active_hours_start)"
            $changesApplied = $true
        }
        if ($null -ne $Policy.active_hours_end) {
            Set-ItemProperty -Path $wuPolicyPath -Name "ActiveHoursEnd" -Value $Policy.active_hours_end -Type DWord -Force
            Write-Log "  ActiveHoursEnd = $($Policy.active_hours_end)"
            $changesApplied = $true
        }
        
        # Feature Update Deferral
        if ($null -ne $Policy.feature_update_deferral -and $Policy.feature_update_deferral -gt 0) {
            Set-ItemProperty -Path $wuPolicyPath -Name "DeferFeatureUpdates" -Value 1 -Type DWord -Force
            Set-ItemProperty -Path $wuPolicyPath -Name "DeferFeatureUpdatesPeriodInDays" -Value $Policy.feature_update_deferral -Type DWord -Force
            Write-Log "  DeferFeatureUpdatesPeriodInDays = $($Policy.feature_update_deferral)"
            $changesApplied = $true
        }
        
        # Quality Update Deferral
        if ($null -ne $Policy.quality_update_deferral -and $Policy.quality_update_deferral -gt 0) {
            Set-ItemProperty -Path $wuPolicyPath -Name "DeferQualityUpdates" -Value 1 -Type DWord -Force
            Set-ItemProperty -Path $wuPolicyPath -Name "DeferQualityUpdatesPeriodInDays" -Value $Policy.quality_update_deferral -Type DWord -Force
            Write-Log "  DeferQualityUpdatesPeriodInDays = $($Policy.quality_update_deferral)"
            $changesApplied = $true
        }
        
        if ($changesApplied) {
            $policyHash | Set-Content -Path $policyHashFile -Force
            Write-Log "Windows Update policy applied successfully"
        }
        
        return $changesApplied
    } catch {
        Write-Log "Error applying Windows Update policy: $_" -Level "ERROR"
        return $false
    }
}

function Apply-UacPolicy {
    param([object]$Policy, [switch]$Force)
    
    if (-not $Policy) { return $false }
    
    $uacPath = "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System"
    $policyHashFile = "$ConfigPath\\uac_policy_hash.txt"
    
    # Generate a simple hash of the policy to detect changes
    $policyJson = $Policy | ConvertTo-Json -Depth 5 -Compress
    $policyHash = [System.BitConverter]::ToString([System.Security.Cryptography.SHA256]::Create().ComputeHash([System.Text.Encoding]::UTF8.GetBytes($policyJson))).Replace("-", "").Substring(0, 16)
    
    # Check if policy has changed
    if (-not $Force -and (Test-Path $policyHashFile)) {
        $lastHash = Get-Content $policyHashFile -ErrorAction SilentlyContinue
        if ($lastHash -eq $policyHash) {
            Write-Log "UAC policy unchanged, skipping enforcement"
            return $false
        }
    }
    
    Write-Log "Applying UAC policy: $($Policy.name)"
    $changesApplied = $false
    
    try {
        # EnableLUA
        if ($null -ne $Policy.enable_lua) {
            $value = if ($Policy.enable_lua) { 1 } else { 0 }
            Set-ItemProperty -Path $uacPath -Name "EnableLUA" -Value $value -Type DWord -Force
            Write-Log "  EnableLUA = $value"
            $changesApplied = $true
        }
        
        # ConsentPromptBehaviorAdmin (0-5)
        if ($null -ne $Policy.consent_prompt_admin) {
            Set-ItemProperty -Path $uacPath -Name "ConsentPromptBehaviorAdmin" -Value $Policy.consent_prompt_admin -Type DWord -Force
            Write-Log "  ConsentPromptBehaviorAdmin = $($Policy.consent_prompt_admin)"
            $changesApplied = $true
        }
        
        # ConsentPromptBehaviorUser (0-3)
        if ($null -ne $Policy.consent_prompt_user) {
            Set-ItemProperty -Path $uacPath -Name "ConsentPromptBehaviorUser" -Value $Policy.consent_prompt_user -Type DWord -Force
            Write-Log "  ConsentPromptBehaviorUser = $($Policy.consent_prompt_user)"
            $changesApplied = $true
        }
        
        # PromptOnSecureDesktop
        if ($null -ne $Policy.prompt_on_secure_desktop) {
            $value = if ($Policy.prompt_on_secure_desktop) { 1 } else { 0 }
            Set-ItemProperty -Path $uacPath -Name "PromptOnSecureDesktop" -Value $value -Type DWord -Force
            Write-Log "  PromptOnSecureDesktop = $value"
            $changesApplied = $true
        }
        
        # EnableInstallerDetection
        if ($null -ne $Policy.detect_installations) {
            $value = if ($Policy.detect_installations) { 1 } else { 0 }
            Set-ItemProperty -Path $uacPath -Name "EnableInstallerDetection" -Value $value -Type DWord -Force
            Write-Log "  EnableInstallerDetection = $value"
            $changesApplied = $true
        }
        
        # ValidateAdminCodeSignatures
        if ($null -ne $Policy.validate_admin_signatures) {
            $value = if ($Policy.validate_admin_signatures) { 1 } else { 0 }
            Set-ItemProperty -Path $uacPath -Name "ValidateAdminCodeSignatures" -Value $value -Type DWord -Force
            Write-Log "  ValidateAdminCodeSignatures = $value"
            $changesApplied = $true
        }
        
        # FilterAdministratorToken
        if ($null -ne $Policy.filter_administrator_token) {
            $value = if ($Policy.filter_administrator_token) { 1 } else { 0 }
            Set-ItemProperty -Path $uacPath -Name "FilterAdministratorToken" -Value $value -Type DWord -Force
            Write-Log "  FilterAdministratorToken = $value"
            $changesApplied = $true
        }
        
        if ($changesApplied) {
            # Save policy hash
            $policyHash | Set-Content -Path $policyHashFile -Force
            Write-Log "UAC policy applied successfully"
            Write-Log "NOTE: Some UAC changes may require a system restart to take full effect" -Level "WARN"
        }
        
        return $changesApplied
    } catch {
        Write-Log "Error applying UAC policy: $_" -Level "ERROR"
        return $false
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

# ==================== TRAY MODE FUNCTIONS ====================

# Embedded tray icon (Base64 ICO). Writing raw bytes avoids PNG decoding issues in System.Drawing.
# Keeping this ASCII-only prevents mojibake in PowerShell 5.1 when the script is saved without a UTF-8 BOM.
$script:TrayIconIcoBase64 = @"
${trayIconIcoBase64}
"@

function Get-EmbeddedTrayIconBytes {
    $b64 = $script:TrayIconIcoBase64
    if ($b64 -is [array]) { $b64 = $b64 -join "" }
    $b64 = ($b64 | Out-String).Trim() -replace '\s+', ''
    if (-not $b64 -or $b64.Length -lt 100) {
        Write-Log "Embedded tray icon is missing or too short (length: $($b64.Length))" -Level "WARN"
        return $null
    }
    try {
        $icoBytes = [Convert]::FromBase64String($b64)
        if ($icoBytes.Length -lt 100) {
            Write-Log "Decoded ICO bytes too small" -Level "WARN"
            return $null
        }
        $hdr = ($icoBytes[0..3] | ForEach-Object { $_.ToString('X2') }) -join ' '
        Write-Log "Embedded ICO header bytes: $hdr"
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
        Write-Log "Tray icon saved to: $TrayIconFile (file exists: $(Test-Path $TrayIconFile))"
        return (Test-Path $TrayIconFile)
    } catch {
        Write-Log "Failed to create tray icon: $($_.Exception.Message)" -Level "WARN"
        Write-Log "Stack: $($_.ScriptStackTrace)" -Level "WARN"
        return $false
    }
}

function Get-TrayIcon {
    Add-Type -AssemblyName System.Drawing

    # 1) Preferred: load icon directly from embedded bytes in memory (no file IO)
    try {
        $icoBytes = Get-EmbeddedTrayIconBytes
        if ($icoBytes) {
            $script:TrayIconStream = New-Object System.IO.MemoryStream(, $icoBytes)
            $icon = New-Object System.Drawing.Icon($script:TrayIconStream)
            if ($icon) {
                Write-Log "Loaded tray icon from embedded bytes"
                return $icon
            }
        }
    } catch {
        Write-Log "Failed to load embedded icon in-memory: $($_.Exception.Message)" -Level "WARN"
    }
    
    # Try to write embedded icon if not exists
    if (-not (Test-Path $TrayIconFile)) {
        Write-EmbeddedTrayIcon | Out-Null
    }
    
    try {
        # Try to load from saved icon file first
        if (Test-Path $TrayIconFile) {
            $icon = New-Object System.Drawing.Icon($TrayIconFile)
            if ($icon) {
                Write-Log "Loaded icon from: $TrayIconFile"
                return $icon
            }
        }
    } catch {
        Write-Log "Failed to load saved icon: $_" -Level "WARN"
        try { Remove-Item -Path $TrayIconFile -Force -ErrorAction SilentlyContinue } catch { }
        try { Write-EmbeddedTrayIcon | Out-Null } catch { }
        try {
            if (Test-Path $TrayIconFile) {
                $icon = New-Object System.Drawing.Icon($TrayIconFile)
                if ($icon) {
                    Write-Log "Loaded icon from: $TrayIconFile"
                    return $icon
                }
            }
        } catch { }
    }

    # Final fallback - create a simple Peritus-styled icon (shield + P)
    try {
        Write-Log "Creating fallback Peritus icon (drawn)"
        $bmp = New-Object System.Drawing.Bitmap(32, 32, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $g.Clear([System.Drawing.Color]::Transparent)

        # Shield polygon
        $points = New-Object 'System.Drawing.Point[]' 6
        $points[0] = New-Object System.Drawing.Point(16, 2)
        $points[1] = New-Object System.Drawing.Point(28, 7)
        $points[2] = New-Object System.Drawing.Point(28, 16)
        $points[3] = New-Object System.Drawing.Point(16, 30)
        $points[4] = New-Object System.Drawing.Point(4, 16)
        $points[5] = New-Object System.Drawing.Point(4, 7)
        $shieldBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(0, 135, 200))
        $g.FillPolygon($shieldBrush, $points)
        $g.DrawPolygon([System.Drawing.Pens]::White, $points)

        # Letter P
        $font = New-Object System.Drawing.Font('Segoe UI', 18, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
        $sf = New-Object System.Drawing.StringFormat
        $sf.Alignment = [System.Drawing.StringAlignment]::Center
        $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
        $rect = New-Object System.Drawing.RectangleF(0, 1, 32, 31)
        $g.DrawString('P', $font, [System.Drawing.Brushes]::White, $rect, $sf)

        $g.Dispose()
        $iconHandle = $bmp.GetHicon()
        return [System.Drawing.Icon]::FromHandle($iconHandle)
    } catch {
        Write-Log "All icon methods failed: $_" -Level "ERROR"
        return $null
    }
}

function Get-EndpointStatus {
    param([string]$AgentToken)
    try {
        $headers = @{ "Content-Type" = "application/json"; "x-agent-token" = $AgentToken }
        $response = Invoke-RestMethod -Uri "$ApiBaseUrl/status" -Method GET -Headers $headers
        return $response
    } catch {
        return $null
    }
}

function Show-StatusForm {
    param([object]$StatusData)
    
    $form = New-Object System.Windows.Forms.Form
    $form.Text = "Peritus Secure - Status"
    # Use ClientSize (not Size) so DPI/border chrome doesn't clip bottom controls.
    $form.AutoScaleMode = [System.Windows.Forms.AutoScaleMode]::Dpi
    $form.ClientSize = New-Object System.Drawing.Size(420, 420)
    $form.StartPosition = "CenterScreen"
    $form.FormBorderStyle = "FixedDialog"
    $form.MaximizeBox = $false
    $form.MinimizeBox = $false
    $form.BackColor = [System.Drawing.Color]::FromArgb(30, 30, 30)
    $form.ForeColor = [System.Drawing.Color]::White
    
    $y = 15
    
    # Header
    $lblTitle = New-Object System.Windows.Forms.Label
    $lblTitle.Text = "Peritus Secure Agent"
    $lblTitle.Font = New-Object System.Drawing.Font("Segoe UI", 14, [System.Drawing.FontStyle]::Bold)
    $lblTitle.Location = New-Object System.Drawing.Point(15, $y)
    $lblTitle.Size = New-Object System.Drawing.Size(380, 30)
    $form.Controls.Add($lblTitle)
    $y += 40
    
    if ($StatusData -and $StatusData.endpoint) {
        # Endpoint info
        $lblHost = New-Object System.Windows.Forms.Label
        $lblHost.Text = "Hostname: $($StatusData.endpoint.hostname)"
        $lblHost.Font = New-Object System.Drawing.Font("Segoe UI", 10)
        $lblHost.Location = New-Object System.Drawing.Point(15, $y)
        $lblHost.Size = New-Object System.Drawing.Size(380, 22)
        $form.Controls.Add($lblHost)
        $y += 25
        
        $lblLastSeen = New-Object System.Windows.Forms.Label
        $lastSeen = if ($StatusData.endpoint.last_seen_at) { 
            try { ([datetime]$StatusData.endpoint.last_seen_at).ToLocalTime().ToString("g") } catch { "Unknown" }
        } else { "Unknown" }
        $lblLastSeen.Text = "Last Sync: $lastSeen"
        $lblLastSeen.Font = New-Object System.Drawing.Font("Segoe UI", 10)
        $lblLastSeen.Location = New-Object System.Drawing.Point(15, $y)
        $lblLastSeen.Size = New-Object System.Drawing.Size(380, 22)
        $form.Controls.Add($lblLastSeen)
        $y += 35
        
        # Protection Status
        $lblProtection = New-Object System.Windows.Forms.Label
        $protectionStatus = if ($StatusData.status.realtime_protection) { "[OK] Protected" } else { "[!] Not Protected" }
        $lblProtection.Text = "Real-time Protection: $protectionStatus"
        $lblProtection.Font = New-Object System.Drawing.Font("Segoe UI", 10)
        $lblProtection.ForeColor = if ($StatusData.status.realtime_protection) { [System.Drawing.Color]::LightGreen } else { [System.Drawing.Color]::Orange }
        $lblProtection.Location = New-Object System.Drawing.Point(15, $y)
        $lblProtection.Size = New-Object System.Drawing.Size(380, 22)
        $form.Controls.Add($lblProtection)
        $y += 35
        
        # Separator
        $sep1 = New-Object System.Windows.Forms.Label
        $sep1.Text = "----------------------------------------"
        $sep1.ForeColor = [System.Drawing.Color]::Gray
        $sep1.Location = New-Object System.Drawing.Point(15, $y)
        $sep1.Size = New-Object System.Drawing.Size(380, 20)
        $form.Controls.Add($sep1)
        $y += 25
        
        # Policies header
        $lblPolicies = New-Object System.Windows.Forms.Label
        $lblPolicies.Text = "Assigned Policies"
        $lblPolicies.Font = New-Object System.Drawing.Font("Segoe UI", 11, [System.Drawing.FontStyle]::Bold)
        $lblPolicies.Location = New-Object System.Drawing.Point(15, $y)
        $lblPolicies.Size = New-Object System.Drawing.Size(380, 25)
        $form.Controls.Add($lblPolicies)
        $y += 30
        
        # Defender Policy
        $defenderName = if ($StatusData.policies.defender) { $StatusData.policies.defender.name } else { "None" }
        $lblDefender = New-Object System.Windows.Forms.Label
        $lblDefender.Text = "- Defender: $defenderName"
        $lblDefender.Font = New-Object System.Drawing.Font("Segoe UI", 10)
        $lblDefender.Location = New-Object System.Drawing.Point(25, $y)
        $lblDefender.Size = New-Object System.Drawing.Size(370, 22)
        $form.Controls.Add($lblDefender)
        $y += 24
        
        # UAC Policy
        $uacName = if ($StatusData.policies.uac) { $StatusData.policies.uac.name } else { "None" }
        $lblUac = New-Object System.Windows.Forms.Label
        $lblUac.Text = "- UAC: $uacName"
        $lblUac.Font = New-Object System.Drawing.Font("Segoe UI", 10)
        $lblUac.Location = New-Object System.Drawing.Point(25, $y)
        $lblUac.Size = New-Object System.Drawing.Size(370, 22)
        $form.Controls.Add($lblUac)
        $y += 24
        
        # Windows Update Policy
        $wuName = if ($StatusData.policies.windows_update) { $StatusData.policies.windows_update.name } else { "None" }
        $lblWu = New-Object System.Windows.Forms.Label
        $lblWu.Text = "- Windows Update: $wuName"
        $lblWu.Font = New-Object System.Drawing.Font("Segoe UI", 10)
        $lblWu.Location = New-Object System.Drawing.Point(25, $y)
        $lblWu.Size = New-Object System.Drawing.Size(370, 22)
        $form.Controls.Add($lblWu)
        $y += 24
        
        # WDAC Rule Sets
        $wdacCount = $StatusData.policies.wdac_rule_sets
        $lblWdac = New-Object System.Windows.Forms.Label
        $lblWdac.Text = "- WDAC Rule Sets: $wdacCount"
        $lblWdac.Font = New-Object System.Drawing.Font("Segoe UI", 10)
        $lblWdac.Location = New-Object System.Drawing.Point(25, $y)
        $lblWdac.Size = New-Object System.Drawing.Size(370, 22)
        $form.Controls.Add($lblWdac)
        $y += 35
        
        # Threats
        $threatCount = $StatusData.threats.active_count
        $lblThreats = New-Object System.Windows.Forms.Label
        $lblThreats.Text = if ($threatCount -gt 0) { "[!] Active Threats: $threatCount" } else { "[OK] No Active Threats" }
        $lblThreats.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
        $lblThreats.ForeColor = if ($threatCount -gt 0) { [System.Drawing.Color]::Orange } else { [System.Drawing.Color]::LightGreen }
        $lblThreats.Location = New-Object System.Drawing.Point(15, $y)
        $lblThreats.Size = New-Object System.Drawing.Size(380, 22)
        $form.Controls.Add($lblThreats)
    } else {
        $lblError = New-Object System.Windows.Forms.Label
        $lblError.Text = "Unable to fetch status. Check connection."
        $lblError.Font = New-Object System.Drawing.Font("Segoe UI", 10)
        $lblError.ForeColor = [System.Drawing.Color]::Orange
        $lblError.Location = New-Object System.Drawing.Point(15, $y)
        $lblError.Size = New-Object System.Drawing.Size(380, 22)
        $form.Controls.Add($lblError)
    }
    
    # Close button (bottom-right, DPI-safe)
    $btnClose = New-Object System.Windows.Forms.Button
    $btnClose.Text = "Close"
    $btnClose.Size = New-Object System.Drawing.Size(110, 34)
    $btnClose.Anchor = [System.Windows.Forms.AnchorStyles]::Bottom -bor [System.Windows.Forms.AnchorStyles]::Right
    $btnClose.Location = New-Object System.Drawing.Point(
        ($form.ClientSize.Width - $btnClose.Width - 20),
        ($form.ClientSize.Height - $btnClose.Height - 20)
    )
    $btnClose.BackColor = [System.Drawing.Color]::FromArgb(70, 130, 180)
    $btnClose.ForeColor = [System.Drawing.Color]::White
    $btnClose.FlatStyle = "Flat"
    $btnClose.FlatAppearance.BorderSize = 0
    $btnClose.Font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Bold)
    $btnClose.Cursor = [System.Windows.Forms.Cursors]::Hand
    $btnClose.Add_Click({ $form.Close() })
    $form.Controls.Add($btnClose)
    
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
    
    # Get icon with error handling
    $icon = Get-TrayIcon
    if ($icon) {
        $script:trayIcon.Icon = $icon
        Write-Log "Tray icon loaded successfully"
    } else {
        Write-Log "Warning: Could not load tray icon" -Level "WARN"
    }
    
    $script:trayIcon.Text = "Peritus Secure - Protected"
    $script:trayIcon.Visible = $true
    
    Write-Log "Tray icon visible: $($script:trayIcon.Visible)"
    
    # Create context menu
    $contextMenu = New-Object System.Windows.Forms.ContextMenuStrip
    
    # Status menu item
    $menuStatus = New-Object System.Windows.Forms.ToolStripMenuItem
    $menuStatus.Text = "View Status..."
    $menuStatus.Add_Click({
        $status = Get-EndpointStatus -AgentToken $AgentToken
        Show-StatusForm -StatusData $status
    })
    $contextMenu.Items.Add($menuStatus) | Out-Null
    
    # Separator
    $contextMenu.Items.Add((New-Object System.Windows.Forms.ToolStripSeparator)) | Out-Null
    
    # View Logs
    $menuLogs = New-Object System.Windows.Forms.ToolStripMenuItem
    $menuLogs.Text = "View Logs"
    $menuLogs.Add_Click({
        if (Test-Path $LogFile) {
            Start-Process notepad.exe -ArgumentList $LogFile
        } else {
            [System.Windows.Forms.MessageBox]::Show("Log file not found.", "Peritus Secure", "OK", "Information")
        }
    })
    $contextMenu.Items.Add($menuLogs) | Out-Null
    
    # Sync Now
    $menuSync = New-Object System.Windows.Forms.ToolStripMenuItem
    $menuSync.Text = "Sync Now"
    $menuSync.Add_Click({
        $script:trayIcon.Text = "Peritus Secure - Syncing..."
        try {
            Send-Heartbeat -AgentToken $AgentToken
            $script:trayIcon.ShowBalloonTip(3000, "Peritus Secure", "Sync completed successfully", [System.Windows.Forms.ToolTipIcon]::Info)
        } catch {
            $script:trayIcon.ShowBalloonTip(3000, "Peritus Secure", "Sync failed: $_", [System.Windows.Forms.ToolTipIcon]::Warning)
        }
        $script:trayIcon.Text = "Peritus Secure - Protected"
    })
    $contextMenu.Items.Add($menuSync) | Out-Null
    
    # Separator
    $contextMenu.Items.Add((New-Object System.Windows.Forms.ToolStripSeparator)) | Out-Null
    
    # Exit
    $menuExit = New-Object System.Windows.Forms.ToolStripMenuItem
    $menuExit.Text = "Exit"
    $menuExit.Add_Click({
        $script:trayIcon.Visible = $false
        $script:trayIcon.Dispose()
        [System.Windows.Forms.Application]::Exit()
    })
    $contextMenu.Items.Add($menuExit) | Out-Null
    
    $script:trayIcon.ContextMenuStrip = $contextMenu
    
    # Double-click to show status
    $script:trayIcon.Add_DoubleClick({
        $status = Get-EndpointStatus -AgentToken $AgentToken
        Show-StatusForm -StatusData $status
    })
    
    # Background sync timer (60 seconds)
    $timer = New-Object System.Windows.Forms.Timer
    $timer.Interval = 60000
    $timer.Add_Tick({
        try {
            Send-Heartbeat -AgentToken $AgentToken
            $status = Get-EndpointStatus -AgentToken $AgentToken
            if ($status -and $status.status) {
                $script:trayIcon.Text = if ($status.status.realtime_protection) { 
                    "Peritus Secure - Protected" 
                } else { 
                    "Peritus Secure - Warning" 
                }
            }
        } catch { }
    })
    $timer.Start()
    
    Write-Log "Tray application started. Running message loop..."
    [System.Windows.Forms.Application]::Run()
}

# ==================== MAIN EXECUTION ====================

function Test-IsSystemAccount {
    try {
        return ([Security.Principal.WindowsIdentity]::GetCurrent().IsSystem -or ([Security.Principal.WindowsIdentity]::GetCurrent().Name -eq "NT AUTHORITY\\SYSTEM"))
    } catch {
        return $false
    }
}

function Ensure-TrayStartupAndLaunch {
    # Ensure tray auto-start + start it now (interactive installs/updates only)
    if (Test-IsSystemAccount) { return }
    try {
        if (-not [Environment]::UserInteractive) { return }
    } catch { }

    # Register tray application to start at user login (best effort)
    try {
        $trayCommand = "powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -File \`"$ScriptPath\`" -TrayMode"
        Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run" -Name "PeritusSecureTray" -Value $trayCommand -Force
    } catch { }

    # Avoid launching duplicates
    try {
        $existingTray = Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" -ErrorAction SilentlyContinue | Where-Object {
            $_.CommandLine -like "*$ScriptPath*" -and $_.CommandLine -like "*-TrayMode*"
        } | Select-Object -First 1
        if ($existingTray) { return }
    } catch { }

    # Start tray application immediately (best effort)
    try {
        Start-Process powershell.exe -ArgumentList "-WindowStyle Hidden -ExecutionPolicy Bypass -File \`"$ScriptPath\`" -TrayMode" -WindowStyle Hidden
    } catch { }
}

Write-Log "=========================================="
Write-Log "Peritus Secure Agent v2.6.0"
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

# TrayMode - run the system tray application
if ($TrayMode) {
    if (-not $agentToken) {
        Write-Log "Agent not registered. Please run the installer first." -Level "ERROR"
        exit 1
    }
    Start-TrayApplication -AgentToken $agentToken
    exit 0
}

# If the user runs a freshly-downloaded script (not the installed one), upgrade the installed agent script + task.
# This fixes "I downloaded a new version but C:\ProgramData still runs the old one".
if (-not $isFirstRun -and $MyInvocation.MyCommand.Path -and ($MyInvocation.MyCommand.Path -ne $ScriptPath)) {
    try {
        Write-Log "Installer script detected at '$($MyInvocation.MyCommand.Path)'. Updating installed agent at '$ScriptPath'..."
        $scriptContent = Get-Content -Path $MyInvocation.MyCommand.Path -Raw
        Install-AgentTask -ScriptContent $scriptContent
        Write-Log "Installed agent updated successfully"

        # Important: update runs were not starting the tray app.
        Ensure-TrayStartupAndLaunch
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
    
    # Pre-create the tray icon ICO file so TrayMode has it ready
    Write-Log "Creating tray icon..."
    try {
        Add-Type -AssemblyName System.Drawing -ErrorAction Stop
        $iconCreated = Write-EmbeddedTrayIcon
        if ($iconCreated) {
            Write-Log "Tray icon created successfully at $TrayIconFile"
        } else {
            Write-Log "Tray icon creation returned false - will use fallback" -Level "WARN"
        }
    } catch {
        Write-Log "Could not create tray icon during install: $_ - will use fallback" -Level "WARN"
    }
    
    # Register tray application to start at user login
    try {
        $trayCommand = "powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -File \`"$ScriptPath\`" -TrayMode"
        Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run" -Name "PeritusSecureTray" -Value $trayCommand -Force
        Write-Log "Tray application registered for user login"
    } catch {
        Write-Log "Could not register tray startup: $_" -Level "WARN"
    }
    
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
    Write-Log "  - Show a system tray icon when you log in"
    Write-Log ""
    Write-Log "To start the tray application now:"
    Write-Log "  powershell -File \`"$ScriptPath\`" -TrayMode"
    Write-Log ""
    Write-Log "To uninstall, run:"
    Write-Log "  powershell -File \`"$ScriptPath\`" -Uninstall"
    Write-Log ""
    
    # Start tray application immediately
    Write-Log "Starting tray application..."
    Start-Process powershell.exe -ArgumentList "-WindowStyle Hidden -ExecutionPolicy Bypass -File \`"$ScriptPath\`" -TrayMode" -WindowStyle Hidden
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

# Fetch and apply UAC policy
$uacResponse = Get-UacPolicy -AgentToken $agentToken
if ($uacResponse -and $uacResponse.has_policy -and $uacResponse.policy) {
    Write-Log "UAC Policy assigned: $($uacResponse.policy.name)"
    $uacApplied = Apply-UacPolicy -Policy $uacResponse.policy -Force:$ForcePolicy
    if ($uacApplied) { Write-Log "UAC policy enforcement complete" }
} else {
    Write-Log "No UAC policy assigned to this endpoint"
}

# Fetch and apply Windows Update policy
$wuResponse = Get-WindowsUpdatePolicy -AgentToken $agentToken
if ($wuResponse -and $wuResponse.has_policy -and $wuResponse.policy) {
    Write-Log "Windows Update Policy assigned: $($wuResponse.policy.name)"
    $wuApplied = Apply-WindowsUpdatePolicy -Policy $wuResponse.policy -Force:$ForcePolicy
    if ($wuApplied) { Write-Log "Windows Update policy enforcement complete" }
} else {
    Write-Log "No Windows Update policy assigned to this endpoint"
}

Write-Log "Agent run complete."
`;
};

const AgentDownload = () => {
  const { currentOrganization, isLoading } = useTenant();
  const [copied, setCopied] = useState(false);
  const [trayIconBase64, setTrayIconBase64] = useState<string>("");
  const [trayIconLoading, setTrayIconLoading] = useState<boolean>(true);
  const [trayIconError, setTrayIconError] = useState<string | null>(null);
  const { toast } = useToast();

  const orgId = currentOrganization?.id || null;
  const orgName = currentOrganization?.name || null;
  const error = !isLoading && !currentOrganization ? "No organization found. Please contact support." : null;

  const apiBaseUrl = "https://njdcyjxgtckgtzgzoctw.supabase.co/functions/v1/agent-api";
  const powershellScript = useMemo(
    () => (orgId ? generatePowershellScript(orgId, apiBaseUrl, trayIconBase64) : ""),
    [orgId, apiBaseUrl, trayIconBase64]
  );

  useEffect(() => {
    let cancelled = false;
    const loadIcon = async () => {
      if (!cancelled) {
        setTrayIconLoading(true);
        setTrayIconError(null);
      }
      try {
        // Fetch from bundled asset and embed as Base64 ICO.
        const res = await fetch(trayIconPng, { cache: "force-cache" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        const b64 = await blobToIcoBase64(blob, 32);
        if (!cancelled) {
          setTrayIconBase64(b64);
          setTrayIconLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setTrayIconError(e instanceof Error ? e.message : String(e));
          setTrayIconLoading(false);
        }
      }
    };
    loadIcon();
    return () => {
      cancelled = true;
    };
  }, []);

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
    // Prefix UTF-8 BOM to make PowerShell 5.1 consistently parse script files as UTF-8.
    const blob = new Blob(["\ufeff", powershellScript], { type: "text/plain;charset=utf-8" });
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
                {trayIconError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Tray icon embed failed</AlertTitle>
                    <AlertDescription>
                      Could not load tray icon for embedding ({trayIconError}). The agent will fall back to a generic icon.
                    </AlertDescription>
                  </Alert>
                )}

                {trayIconLoading && (
                  <Alert>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <AlertTitle>Preparing tray icon…</AlertTitle>
                    <AlertDescription>
                      Please wait a moment—this ensures the downloaded script contains the Peritus tray icon (and won’t fall back to the PowerShell icon).
                    </AlertDescription>
                  </Alert>
                )}
                <div className="flex gap-3">
                  <Button
                    onClick={handleDownload}
                    className="gap-2"
                    disabled={!powershellScript || trayIconLoading || (!trayIconBase64 && !trayIconError)}
                  >
                    <Download className="h-4 w-4" />
                    Download PeritusSecureAgent.ps1
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCopy}
                    className="gap-2"
                    disabled={!powershellScript || trayIconLoading || (!trayIconBase64 && !trayIconError)}
                  >
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
