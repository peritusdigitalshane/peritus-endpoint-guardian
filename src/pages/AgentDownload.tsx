import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Copy, CheckCircle, Shield, Terminal, Clock, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

  const powershellScript = `#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Peritus Secure Agent - Windows Defender Management
.DESCRIPTION
    This agent collects Windows Defender status and sends it to the Peritus Secure platform.
    It also applies security policies configured in the platform.
.NOTES
    Version: 1.0.0
    Requires: Windows 10/11, PowerShell 5.1+, Administrator privileges
#>

param(
    [string]$OrganizationToken = "${orgId}",
    [int]$HeartbeatIntervalMinutes = 5
)

$ErrorActionPreference = "Stop"
$ApiBaseUrl = "${apiBaseUrl}"

# Agent configuration storage
$ConfigPath = "$env:ProgramData\\PeritusSecure"
$ConfigFile = "$ConfigPath\\agent.json"

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] [$Level] $Message"
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

# Main execution
Write-Log "=========================================="
Write-Log "Peritus Secure Agent Starting"
Write-Log "=========================================="

# Check for existing configuration
$agentToken = $null
if (Test-Path $ConfigFile) {
    $config = Get-Content $ConfigFile | ConvertFrom-Json
    $agentToken = $config.agent_token
    Write-Log "Found existing agent configuration"
}

# Register if needed
if (-not $agentToken) {
    $agentToken = Register-Agent -OrganizationToken $OrganizationToken
}

# Initial heartbeat and threat report
Send-Heartbeat -AgentToken $agentToken
Send-Threats -AgentToken $agentToken

# Check for policy
$policy = Get-AssignedPolicy -AgentToken $agentToken
if ($policy) {
    Write-Log "Policy assigned: $($policy.name)"
} else {
    Write-Log "No policy assigned to this endpoint"
}

Write-Log "Agent setup complete! Heartbeat will run every $HeartbeatIntervalMinutes minutes."
Write-Log "To run as a scheduled task, use the following command:"
Write-Log "  schtasks /create /tn 'Peritus Secure Agent' /tr 'powershell.exe -ExecutionPolicy Bypass -File $PSCommandPath' /sc minute /mo $HeartbeatIntervalMinutes /ru SYSTEM"

# Keep running if in interactive mode
if ($Host.Name -eq "ConsoleHost") {
    Write-Log "Running in continuous mode. Press Ctrl+C to stop."
    while ($true) {
        Start-Sleep -Seconds ($HeartbeatIntervalMinutes * 60)
        Send-Heartbeat -AgentToken $agentToken
        Send-Threats -AgentToken $agentToken
    }
}
`;

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
                  <p className="text-sm font-medium mb-2">Run the script:</p>
                  <code className="text-xs text-muted-foreground">
                    powershell.exe -ExecutionPolicy Bypass -File .\\PeritusSecureAgent.ps1
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
              What Happens Next
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
                  <p className="font-medium">Status Collection</p>
                  <p className="text-sm text-muted-foreground">
                    Windows Defender status, signatures, and settings are collected
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                  3
                </div>
                <div>
                  <p className="font-medium">Threat Reporting</p>
                  <p className="text-sm text-muted-foreground">
                    Any detected threats are reported to the platform
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
                    Heartbeat updates are sent every 5 minutes (configurable)
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Scheduled Task */}
        <Card className="border-border/40 bg-muted/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Run as Scheduled Task (Recommended)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              For persistent monitoring, create a scheduled task to run the agent:
            </p>
            <pre className="rounded-lg bg-secondary p-4 text-xs overflow-x-auto">
              <code>
{`schtasks /create /tn "Peritus Secure Agent" /tr "powershell.exe -ExecutionPolicy Bypass -File C:\\PeritusSecure\\PeritusSecureAgent.ps1" /sc minute /mo 5 /ru SYSTEM`}
              </code>
            </pre>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default AgentDownload;
