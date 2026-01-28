

# Firewall Policy Management with Audit Mode

## Overview

Building on the Service-Access Matrix design, this plan adds **Audit Mode** - allowing you to learn normal traffic patterns before blocking. This mirrors your existing ASR workflow: deploy in audit, tune exceptions, then switch to block.

---

## How Audit Mode Works

```text
                     Audit Mode                          Enforce Mode
              ┌────────────────────────┐         ┌────────────────────────┐
              │  Rule: Block RDP       │         │  Rule: Block RDP       │
              │  Mode: AUDIT           │   -->   │  Mode: ENFORCE         │
              │                        │         │                        │
              │  Connection logged     │         │  Connection blocked    │
              │  Traffic allowed       │         │  Traffic denied        │
              └────────────────────────┘         └────────────────────────┘
```

The agent creates Windows Firewall rules differently based on mode:
- **Audit**: Rule set to "Allow" with logging enabled, plus a tracking rule that logs matching traffic
- **Enforce**: Rule set to "Block" - actually blocks the traffic

---

## Service-Access Matrix with Mode Toggle

The matrix view will show both the access policy AND the current mode:

```text
                      RDP (3389)       SMB (445)        WinRM (5985)
              ┌──────────────────┬────────────────┬──────────────────┐
 Workstations │   Block          │   Block        │   Block          │
              │   🔍 Auditing    │   🔍 Auditing  │   🔍 Auditing    │
              ├──────────────────┼────────────────┼──────────────────┤
 Servers      │   Admin PCs      │   Servers      │   Admin PCs      │
              │   ⛔ Enforcing   │   🔍 Auditing  │   ⛔ Enforcing   │
              ├──────────────────┼────────────────┼──────────────────┤
 Admin PCs    │   Allow All      │   Allow All    │   Allow All      │
              │   -              │   -            │   -              │
              └──────────────────┴────────────────┴──────────────────┘
```

Visual indicators:
- `🔍 Auditing` - Yellow/amber badge, traffic logged but not blocked
- `⛔ Enforcing` - Green badge, rules actively blocking traffic
- `-` for "Allow All" rules (nothing to audit)

---

## Audit Logs View

A new "Audit Logs" tab within the Network section shows what would have been blocked:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ Firewall Audit Logs                                      [Learn More]  │
├─────────────────────────────────────────────────────────────────────────┤
│ Time         │ Endpoint    │ Service │ Source IP     │ Status │ Action │
├──────────────┼─────────────┼─────────┼───────────────┼────────┼────────┤
│ 2 min ago    │ DESKTOP-01  │ RDP     │ 10.0.1.50     │ Audit  │ [Add]  │
│ 5 min ago    │ DESKTOP-02  │ SMB     │ 10.0.1.100    │ Audit  │ [Add]  │
│ 12 min ago   │ SERVER-01   │ WinRM   │ 10.0.1.5      │ Audit  │ [Add]  │
└──────────────┴─────────────┴─────────┴───────────────┴────────┴────────┘
```

The "[Add]" button opens a dialog to whitelist that source, similar to your ASR exclusion workflow.

---

## Database Schema

### firewall_policies
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| organization_id | uuid | Foreign key to organizations |
| name | text | Policy name (e.g., "Block Lateral Movement") |
| description | text | Optional description |
| is_default | boolean | Default policy for new groups |
| created_at | timestamp | Creation time |
| updated_at | timestamp | Last update time |

### firewall_service_rules
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| policy_id | uuid | Foreign key to firewall_policies |
| endpoint_group_id | uuid | Which group this rule applies to |
| service_name | text | RDP, SMB, WinRM, Custom |
| port | text | Port number(s), e.g., "3389" or "445,139" |
| protocol | text | tcp, udp, or both |
| action | text | "block", "allow", "allow_from_groups" |
| allowed_source_groups | uuid[] | Groups allowed to connect (if action = allow_from_groups) |
| allowed_source_ips | text[] | Specific IPs/CIDRs allowed |
| mode | text | **"audit" or "enforce"** |
| enabled | boolean | Rule active or disabled |
| order_priority | int | Rule processing order |
| created_at | timestamp | Creation time |

### firewall_audit_logs
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| organization_id | uuid | Foreign key |
| endpoint_id | uuid | Which endpoint logged this |
| rule_id | uuid | Which rule matched (nullable) |
| service_name | text | RDP, SMB, etc. |
| local_port | int | Destination port |
| remote_address | text | Source IP of connection |
| remote_port | int | Source port |
| protocol | text | TCP/UDP |
| direction | text | inbound/outbound |
| event_time | timestamp | When the connection occurred |
| created_at | timestamp | When logged to database |

### firewall_templates
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | text | Template name |
| description | text | What it does |
| category | text | "lateral-movement", "lockdown", "compliance" |
| rules_json | jsonb | Array of rule definitions |
| default_mode | text | "audit" or "enforce" |

---

## UI Components

### 1. Network Page (`src/pages/Network.tsx`)
Main page with tabs:
- **Firewall Matrix** - Service-access grid with mode indicators
- **Audit Logs** - What would be blocked (from agent telemetry)
- **Connections** (future) - Live network telemetry
- **Access Requests** (future) - JIT admin elevation

### 2. ServiceAccessMatrix (`src/components/network/ServiceAccessMatrix.tsx`)
- Rows: Endpoint groups from existing hook
- Columns: Common services (RDP, SMB, WinRM, SSH, HTTP/S, Custom)
- Cells show: Access level + mode badge
- Click cell to edit rules
- Bulk mode toggle: "Switch all to Enforce"

### 3. ServiceRuleEditor (`src/components/network/ServiceRuleEditor.tsx`)
Dialog when clicking a cell:
- Access type: Block All / Allow from Groups / Allow All
- Group selector (if "Allow from Groups")
- IP allowlist (optional)
- **Mode toggle: Audit / Enforce**
- Estimated impact message

### 4. FirewallAuditLogs (`src/components/network/FirewallAuditLogs.tsx`)
Table showing audit hits:
- Time, endpoint, service, source IP
- Filter by group, service, time range
- "Add Exception" button per row
- "Switch to Enforce" button when confident

### 5. TemplateGallery (`src/components/network/TemplateGallery.tsx`)
Pre-built templates with mode selection:
- Each template shows rules preview
- "Deploy in Audit Mode" button (recommended)
- "Deploy in Enforce Mode" button (advanced)

---

## Pre-Built Templates

| Template | Description | Default Mode |
|----------|-------------|--------------|
| Block Lateral Movement | Block SMB/RDP between workstations | Audit |
| Admin Access Only | Only Admin PCs group can RDP/WinRM | Audit |
| Isolate IoT Devices | Block all inbound to IoT group | Enforce |
| Server Lockdown | Servers only accept from Admin PCs | Audit |
| PCI Compliance Baseline | Restrict access per PCI-DSS | Audit |

---

## Agent Enforcement

The agent translates rules to Windows Firewall commands:

**Audit Mode:**
```powershell
# Create logging-only rule (allows but logs)
Set-NetFirewallProfile -LogBlocked True -LogAllowed True -LogFileName "C:\Windows\System32\LogFiles\Firewall\pfirewall.log"

# Or use Windows Filtering Platform audit (Event ID 5156/5157)
auditpol /set /subcategory:"Filtering Platform Connection" /success:enable /failure:enable
```

**Enforce Mode:**
```powershell
New-NetFirewallRule -DisplayName "Peritus: Block SMB Inbound" `
  -Direction Inbound -Protocol TCP -LocalPort 445 `
  -Action Block -Enabled True
```

The agent collects firewall logs (Event IDs 5156, 5157, 5152, 5153) and reports them to the `firewall_audit_logs` table.

---

## User Workflow

### Deploying a New Policy

1. Navigate to **Network > Firewall Matrix**
2. Click **Apply Template** 
3. Select "Block Lateral Movement"
4. Template defaults to **Audit Mode**
5. Click Apply - cells update with amber "Auditing" badges
6. Agent deploys logging rules to all affected endpoints

### Learning Phase

1. Wait for normal business activity (1-2 weeks recommended)
2. Check **Network > Audit Logs** tab
3. See connections that WOULD have been blocked
4. For legitimate traffic, click **[Add Exception]**
   - Adds source group or IP to allowlist
5. Repeat until audit logs show only suspicious activity

### Switching to Enforce

1. Return to **Firewall Matrix**
2. Click a cell in Audit mode
3. Toggle mode from "Audit" to "Enforce"
4. Confirmation dialog: "This will block traffic. 3 audit events in last 7 days. Continue?"
5. Click Confirm - badge changes to green "Enforcing"
6. Agent updates rules to actually block

---

## Sidebar Navigation Update

Add "Network" between "Policies" and "AI Advisor":

```text
├── Policies
├── Network          (new)
│   └── Firewall Matrix (default tab)
│   └── Audit Logs
├── AI Advisor
```

---

## Implementation Phases

### Phase 1: Database and Types
- Create migration for `firewall_policies`, `firewall_service_rules`, `firewall_audit_logs`, `firewall_templates`
- Add RLS policies matching existing pattern
- Create TypeScript interfaces in `src/hooks/useFirewall.ts`
- Implement React Query hooks for CRUD

### Phase 2: UI Shell
- Add "Network" to sidebar navigation (`Sidebar.tsx`)
- Create `Network.tsx` page with tabs structure
- Add route in `App.tsx`

### Phase 3: Service Matrix
- Build `ServiceAccessMatrix.tsx` component
- Use endpoint groups as rows
- Define common services as columns
- Color-coded cells with mode badges
- Click-to-edit interaction

### Phase 4: Rule Editor
- Build `ServiceRuleEditor.tsx` dialog
- Access type selector
- Group/IP allowlist
- Mode toggle (Audit/Enforce)
- Template application

### Phase 5: Audit Logs
- Build `FirewallAuditLogs.tsx` component
- Table with filtering
- "Add Exception" flow
- "Ready to Enforce" recommendations

### Phase 6: Templates
- Seed template data in migration
- Build `TemplateGallery.tsx`
- One-click apply with mode selection

### Phase 7: Agent Integration (spec only)
- Document agent API for receiving firewall policies
- Document expected log collection (Event IDs 5156, 5157)
- Define `firewall_audit_logs` ingestion endpoint

---

## Summary

This design gives you Zero Networks-style microsegmentation with:

1. **Visual matrix** - Easy to understand at a glance
2. **Template-based** - One-click security hardening
3. **Audit mode** - Learn before you block
4. **Audit logs** - See what would be blocked
5. **One-click exceptions** - Whitelist legitimate traffic
6. **Safe transition** - Switch to enforce when ready

The audit-first approach ensures you never accidentally block legitimate business traffic.

