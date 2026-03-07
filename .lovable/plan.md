
# Plan: Fix PowerShell Variable Escaping in Agent Script

## Problem Summary

The Windows Firewall is not being enabled automatically because the PowerShell agent script has incorrect variable escaping. The `Ensure-FirewallTelemetry` function and `Collect-FirewallLogs` function use `\$` instead of `$` for all variable references, which produces invalid PowerShell syntax.

## Root Cause

In the JavaScript template string within `supabase/functions/agent-script/index.ts`, starting at line 264:

```javascript
// Current (BROKEN) - produces literal backslash in output
\$changed = \$false
\$profiles = @("Domain", "Private", "Public")
```

PowerShell receives:
```powershell
\$changed = \$false  # Invalid - PowerShell doesn't understand \$
```

Should be:
```powershell
$changed = $false   # Valid PowerShell variable assignment
```

## Solution

Remove all unnecessary backslash escapes from PowerShell variable references in the `Ensure-FirewallTelemetry` and `Collect-FirewallLogs` functions. In JavaScript template literals, only `${` needs escaping (to prevent interpolation), but plain `$` followed by other characters does not.

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/agent-script/index.ts` | Replace all `\$` with `$` in the PowerShell functions (lines 264-438) |
| `supabase/functions/agent-script/index.ts` | Bump version to 2.11.0 to trigger agent updates |
| `supabase/functions/agent-api/index.ts` | Bump version to match (2.11.0) |

## Detailed Changes

### 1. Fix `Ensure-FirewallTelemetry` Function (Lines 264-315)

Before (broken):
```javascript
\$changed = \$false
\$profiles = @("Domain", "Private", "Public")
foreach (\$profile in \$profiles) {
    \$fwProfile = Get-NetFirewallProfile -Name \$profile
    if (-not \$fwProfile.Enabled) {
```

After (fixed):
```javascript
$changed = $false
$profiles = @("Domain", "Private", "Public")
foreach ($profile in $profiles) {
    $fwProfile = Get-NetFirewallProfile -Name $profile
    if (-not $fwProfile.Enabled) {
```

### 2. Fix `Collect-FirewallLogs` Function (Lines 318-434)

Same pattern - replace all `\$` with `$` for variable references like:
- `$FirewallLogTimeFile`
- `$headers`
- `$lastTime`
- `$firewallEvents`
- `$logs`
- etc.

### 3. Fix Function Calls (Lines 437-438)

Before:
```javascript
Ensure-FirewallTelemetry
Collect-FirewallLogs -AgentToken \$agentToken
```

After:
```javascript
Ensure-FirewallTelemetry
Collect-FirewallLogs -AgentToken $agentToken
```

### 4. Version Bump

Update `AGENT_VERSION` from `"2.10.0"` to `"2.11.0"` in both files to trigger automatic agent updates on all endpoints.

## Expected Outcome

After deployment:

1. Agents will auto-update to v2.11.0 on their next heartbeat
2. The `Ensure-FirewallTelemetry` function will execute correctly
3. Windows Firewall will be enabled for Domain, Private, and Public profiles
4. Firewall logging will be enabled
5. Audit policy for "Filtering Platform Connection" will be configured
6. Firewall telemetry (Event IDs 5156/5157) will start flowing to the dashboard

## Testing

After deployment, you can verify on an endpoint by:
1. Checking `$env:ProgramData\PeritusSecure\agent.log` for messages like "Enabling Windows Firewall for Domain profile..."
2. Running `Get-NetFirewallProfile` to confirm all profiles show `Enabled: True`
3. Running `auditpol /get /subcategory:"Filtering Platform Connection"` to confirm auditing is enabled
