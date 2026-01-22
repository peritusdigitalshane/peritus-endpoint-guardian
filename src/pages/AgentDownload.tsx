import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Copy, CheckCircle, Shield, Terminal, Clock, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
.PARAMETER HeartbeatIntervalMinutes
    How often the agent sends status updates (default: 5 minutes)
.PARAMETER Uninstall
    Remove the scheduled task and agent configuration
.NOTES
    Version: 1.1.0
    Requires: Windows 10/11, PowerShell 5.1+, Administrator privileges
#>

param(
    [string]$OrganizationToken = "${orgId}",
    [int]$HeartbeatIntervalMinutes = 5,
    [switch]$Uninstall
)

$ErrorActionPreference = "Stop"
$ApiBaseUrl = "${apiBaseUrl}"
$TaskName = "PeritusSecureAgent"
$ServiceName = "Peritus Secure Agent"

# Agent configuration storage
$ConfigPath = "$env:ProgramData\\PeritusSecure"
$ConfigFile = "$ConfigPath\\agent.json"
$ScriptPath = "$ConfigPath\\PeritusSecureAgent.ps1"
$LogFile = "$ConfigPath\\agent.log"

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    Write-Host $logMessage
    
    # Also write to log file
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
    
    # Remove configuration
    if (Test-Path $ConfigPath) {
        Remove-Item -Path $ConfigPath -Recurse -Force
        Write-Log "Configuration removed"
    }
    
    Write-Log "Agent uninstalled successfully"
    exit 0
}

function Install-AgentTask {
    param([string]$ScriptContent)
    
    # Create config directory
    if (-not (Test-Path $ConfigPath)) {
        New-Item -ItemType Directory -Path $ConfigPath -Force | Out-Null
        Write-Log "Created configuration directory: $ConfigPath"
    }
    
    # Save script to permanent location
    $ScriptContent | Set-Content -Path $ScriptPath -Force
    Write-Log "Agent script saved to: $ScriptPath"
    
    # Check if task already exists
    $existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if ($existingTask) {
        Write-Log "Scheduled task already exists, updating..."
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    }
    
    # Create scheduled task action - run hidden
    $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File \`"$ScriptPath\`""
    
    # Create triggers: at startup and every X minutes
    $triggerStartup = New-ScheduledTaskTrigger -AtStartup
    $triggerRepeat = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes $HeartbeatIntervalMinutes) -RepetitionDuration (New-TimeSpan -Days 9999)
    
    # Create principal (run as SYSTEM with highest privileges)
    $principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
    
    # Create settings
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
    
    # Register the task
    Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $triggerStartup,$triggerRepeat -Principal $principal -Settings $settings -Description "Peritus Secure Agent - Windows Defender Management" | Out-Null
    
    Write-Log "Scheduled task '$TaskName' created successfully"
    Write-Log "  - Runs at system startup"
    Write-Log "  - Repeats every $HeartbeatIntervalMinutes minutes"
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
        $prefs = Get-MpPreference
        
        return @{
            realtime_protection_enabled = $status.RealTimeProtectionEnabled
            antivirus_enabled = $status.AntivirusEnabled
            antispyware_enabled = $status.AntispywareEnabled
            behavior_monitor_enabled = $status.BehaviorMonitorEnabled
            ioav_protection_enabled = $status.IoavProtectionEnabled
            on_access_protection_enabled = $status.OnAccessProtectionEnabled
            full_scan_age = $status.FullScanAge
            quick_scan_age = $status.QuickScanAge
            full_scan_end_time = if ($status.FullScanEndTime) { $status.FullScanEndTime.ToString("o") } else { $null }
            quick_scan_end_time = if ($status.QuickScanEndTime) { $status.QuickScanEndTime.ToString("o") } else { $null }
            antivirus_signature_age = $status.AntivirusSignatureAge
            antispyware_signature_age = $status.AntispywareSignatureAge
            antivirus_signature_version = $status.AntivirusSignatureVersion
            nis_signature_version = $status.NISSignatureVersion
            nis_enabled = $status.NISEnabled
            tamper_protection_source = $status.TamperProtectionSource
            computer_state = $status.ComputerState
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
                severity = switch ($_.SeverityID) {
                    1 { "Low" }
                    2 { "Moderate" }
                    4 { "High" }
                    5 { "Severe" }
                    default { "Unknown" }
                }
                category = if ($threatInfo) { $threatInfo.CategoryID.ToString() } else { $null }
                status = switch ($_.CurrentThreatExecutionStatusID) {
                    0 { "Unknown" }
                    1 { "Blocked" }
                    2 { "Allowed" }
                    3 { "Executing" }
                    4 { "NotExecuting" }
                    default { "Active" }
                }
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
    param(
        [string]$Endpoint,
        [string]$Method = "POST",
        [hashtable]$Body = @{},
        [string]$AgentToken = $null
    )
    
    $headers = @{
        "Content-Type" = "application/json"
    }
    
    if ($AgentToken) {
        $headers["x-agent-token"] = $AgentToken
    }
    
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
        
        # Save configuration
        if (-not (Test-Path $ConfigPath)) {
            New-Item -ItemType Directory -Path $ConfigPath -Force | Out-Null
        }
        
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
    if (-not $status) {
        Write-Log "Could not get Defender status, skipping heartbeat" -Level "WARN"
        return
    }
    
    Write-Log "Sending heartbeat..."
    $response = Invoke-ApiRequest -Endpoint "/heartbeat" -Body $status -AgentToken $AgentToken
    Write-Log "Heartbeat sent successfully"
}

function Send-Threats {
    param([string]$AgentToken)
    
    $threats = Get-DefenderThreats
    if ($threats.Count -eq 0) {
        Write-Log "No threats to report"
        return
    }
    
    Write-Log "Reporting $($threats.Count) threats..."
    $body = @{ threats = $threats }
    $response = Invoke-ApiRequest -Endpoint "/threats" -Body $body -AgentToken $AgentToken
    Write-Log "Threats reported: $($response.message)"
}

function Get-AssignedPolicy {
    param([string]$AgentToken)
    
    try {
        $headers = @{
            "Content-Type" = "application/json"
            "x-agent-token" = $AgentToken
        }
        $response = Invoke-RestMethod -Uri "$ApiBaseUrl/policy" -Method GET -Headers $headers
        return $response.policy
    } catch {
        Write-Log "Could not fetch policy: $_" -Level "WARN"
        return $null
    }
}

# ==================== MAIN EXECUTION ====================

Write-Log "=========================================="
Write-Log "Peritus Secure Agent v1.1.0"
Write-Log "=========================================="

# Handle uninstall
if ($Uninstall) {
    Uninstall-Agent
}

# Check for existing configuration
$agentToken = $null
$isFirstRun = $true

if (Test-Path $ConfigFile) {
    $config = Get-Content $ConfigFile | ConvertFrom-Json
    $agentToken = $config.agent_token
    $isFirstRun = $false
    Write-Log "Found existing agent configuration"
}

# Register if needed
if (-not $agentToken) {
    $agentToken = Register-Agent -OrganizationToken $OrganizationToken
}

# Install scheduled task on first run
if ($isFirstRun) {
    Write-Log ""
    Write-Log "First run detected - installing as scheduled task..."
    
    # Read current script content
    $scriptContent = Get-Content -Path $MyInvocation.MyCommand.Path -Raw
    Install-AgentTask -ScriptContent $scriptContent
    
    Write-Log ""
    Write-Log "=========================================="
    Write-Log "INSTALLATION COMPLETE!"
    Write-Log "=========================================="
    Write-Log ""
    Write-Log "The agent is now installed and will:"
    Write-Log "  - Start automatically when Windows boots"
    Write-Log "  - Send status updates every $HeartbeatIntervalMinutes minutes"
    Write-Log "  - Run silently in the background"
    Write-Log ""
    Write-Log "To uninstall, run:"
    Write-Log "  powershell -File \`"$ScriptPath\`" -Uninstall"
    Write-Log ""
}

# Send heartbeat and threat report
Send-Heartbeat -AgentToken $agentToken
Send-Threats -AgentToken $agentToken

# Check for policy
$policy = Get-AssignedPolicy -AgentToken $agentToken
if ($policy) {
    Write-Log "Policy assigned: $($policy.name)"
} else {
    Write-Log "No policy assigned to this endpoint"
}

Write-Log "Agent run complete."
`;
};

const AgentDownload = () => {
  const [orgId, setOrgId] = useState("your-organization-id");
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  // TODO: Fetch actual org ID from user's organization membership
  useEffect(() => {
    // This would be replaced with actual org fetch
    setOrgId("demo-org-id");
  }, []);

  const apiBaseUrl = "https://njdcyjxgtckgtzgzoctw.supabase.co/functions/v1/agent-api";
  const powershellScript = generatePowershellScript(orgId, apiBaseUrl);

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

  return (
    <MainLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Deploy Agent</h1>
          <p className="text-muted-foreground">
            Download and install the Peritus Secure agent on your Windows endpoints
          </p>
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
