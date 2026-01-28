
# One-Click ASR Exclusion from Event Logs

## Overview

This feature allows you to add processes or paths directly to policy exclusions from ASR audit events in the Event Logs page. When you're running in Audit mode to baseline your environment, you can review the events and click a button to exclude legitimate processes.

**Important**: Switching from Audit to Block mode remains a **manual action** in the Policy Editor. This feature only helps you build your exclusion list - you decide when the policy is ready to enforce.

## Workflow

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                        ASR TUNING WORKFLOW                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. AUDIT PHASE                                                         │
│     ┌──────────────┐                                                    │
│     │ Policy set   │  Events flow into Event Logs                       │
│     │ to AUDIT     │  ────────────────────────────►                     │
│     └──────────────┘                                                    │
│                                                                         │
│  2. REVIEW & EXCLUDE (This Feature)                                     │
│     ┌──────────────┐    ┌──────────────┐    ┌──────────────┐           │
│     │ View Event   │───►│ Click "Add   │───►│ Exclusion    │           │
│     │ Log Details  │    │ to Exclusion"│    │ Added        │           │
│     └──────────────┘    └──────────────┘    └──────────────┘           │
│     Repeat for each legitimate process                                  │
│                                                                         │
│  3. BLOCK PHASE (Manual - User Decision)                                │
│     ┌──────────────┐                                                    │
│     │ Open Policy  │  User manually changes ASR rule                    │
│     │ Editor       │  from "Audit" to "Block"                           │
│     └──────────────┘                                                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## User Experience

**In the Event Log Detail Sheet (for ASR events):**

When viewing an ASR/Exploit Guard audit event (Event IDs 1121, 1122), an "Add to Exclusions" button appears. Clicking it opens a dialog showing:

- The ASR rule name (e.g., "Block credential stealing from LSASS")
- The process path being excluded (e.g., `C:\Windows\System32\svchost.exe`)
- The endpoint name and its assigned policy
- Option to exclude as full path or just the process name
- Confirmation before saving

**Edge Cases:**
- If the endpoint has no policy assigned → Prompt to assign a policy first
- If the path is already excluded → Show message "Already in exclusions"
- If message cannot be parsed → Button is hidden

## Implementation Details

### Step 1: Event Message Parser

Create a utility to extract key fields from ASR event messages:

```typescript
// src/lib/event-parser.ts
interface AsrEventData {
  asrRuleId: string;      // GUID like "9E6C4E1F-7D60..."
  asrRuleName: string;    // Human name from ASR_RULES lookup
  path: string;           // Triggering process path
  processName: string;    // Target process (e.g., lsass.exe)
  user: string;           // User context
  detectionTime: string;
}

function parseAsrEventMessage(message: string): AsrEventData | null
```

### Step 2: Extend Event Logs Query

Modify `useEventLogs` to include the endpoint's `policy_id` so we know which policy to update:

```typescript
// Current query joins endpoints for hostname
// Add: policy_id to the select
endpoints!inner(hostname, organization_id, policy_id)
```

### Step 3: Add Exclusion Dialog Component

New component `EventLogAddExclusionDialog.tsx`:

| Element | Description |
|---------|-------------|
| Rule Name | Shows "Block credential stealing from LSASS" etc. |
| Process Path | The path to be excluded |
| Exclusion Type | Radio: "Full Path" or "Process Name Only" |
| Policy Info | Shows which policy will be updated |
| Confirm Button | Adds to exclusions and closes |

### Step 4: Update EventLogDetailSheet

For ASR audit events, add:
- Parse message to extract path/process
- Fetch the endpoint's policy details
- Render "Add to Exclusions" button
- Open dialog on click

### Step 5: Policy Exclusion Hook

New hook `useAddPolicyExclusion` in `usePolicies.ts`:
- Takes policy ID and exclusion value
- Appends to `exclusion_paths` or `exclusion_processes` array
- Uses existing `useUpdatePolicy` mutation
- Logs activity

## Files to Create

| File | Purpose |
|------|---------|
| `src/lib/event-parser.ts` | Parse ASR event messages to extract path, process, rule ID |
| `src/components/EventLogAddExclusionDialog.tsx` | Confirmation dialog for adding exclusions |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/EventLogDetailSheet.tsx` | Add exclusion button for ASR events, integrate dialog |
| `src/hooks/useEventLogs.ts` | Include `policy_id` in endpoints join |
| `src/hooks/usePolicies.ts` | Add `useAddPolicyExclusion` hook |

## Technical Notes

### ASR Event Detection

ASR audit events use Event IDs:
- **1121**: ASR rule audited (would have blocked)
- **1122**: ASR rule blocked

The feature targets 1121 (audit) events since that's the tuning phase.

### Message Parsing

ASR messages follow this format:
```
Microsoft Defender Exploit Guard audited an operation...
  ID: 9E6C4E1F-7D60-472F-BA1A-A39EF669E4B2
  Path: C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe
  Process Name: C:\Windows\System32\lsass.exe
```

The parser uses regex to extract each field reliably.

### Rule ID to Name Mapping

Uses the existing `ASR_RULES` array in `defender-settings.ts` to show human-readable rule names instead of GUIDs.

## What This Feature Does NOT Do

- **Does NOT auto-switch to Block mode** - That remains a manual decision in the Policy Editor
- **Does NOT modify the ASR rule settings** - Only adds exclusions
- **Does NOT affect other endpoints** - Exclusions apply at the policy level (shared by endpoints using that policy)

## Security

- Exclusion updates use existing `useUpdatePolicy` mutation (validates org ownership)
- Activity logging records who added exclusions and when
- Only users with policy edit access can add exclusions
