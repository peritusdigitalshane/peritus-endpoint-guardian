

# Plan: Resolve Supabase Disk IO Budget Depletion

## Overview

Your Supabase project is experiencing high IOPS (Input/Output Operations Per Second) due to a combination of factors:
1. **High-frequency writes** from endpoint agents (heartbeats, logs, status updates every 30-60 seconds)
2. **Missing indexes** on foreign key columns causing table scans
3. **Suboptimal RLS policies** using direct `auth.uid()` calls instead of the optimized `(SELECT auth.uid())` pattern
4. **Write amplification** from maintaining indexes on high-write tables

This plan addresses these issues through database optimizations and agent behavior improvements.

---

## Phase 1: Add Missing Foreign Key Indexes (Immediate Impact)

**Why**: When you insert, update, or delete rows with foreign key references, PostgreSQL needs to verify referential integrity. Without indexes on these FK columns, it performs full table scans.

### Tables Requiring FK Indexes

Based on the analysis, these foreign key columns are missing covering indexes:

| Table | Column | Missing Index |
|-------|--------|---------------|
| `activity_logs` | `user_id` | Yes |
| `activity_logs` | `endpoint_id` | Yes |
| `endpoint_groups` | `created_by` | Yes |
| `endpoint_groups` | `defender_policy_id` | Yes |
| `endpoint_groups` | `wdac_policy_id` | Yes |
| `endpoint_groups` | `uac_policy_id` | Yes |
| `endpoint_groups` | `windows_update_policy_id` | Yes |
| `endpoints` | `policy_id` | Yes |
| `endpoints` | `wdac_policy_id` | Yes |
| `endpoints` | `uac_policy_id` | Yes |
| `endpoints` | `windows_update_policy_id` | Yes |
| `endpoint_rule_set_assignments` | `assigned_by` | Yes |
| `enrollment_codes` | `created_by` | Yes |
| `firewall_audit_logs` | `rule_id` | Yes |
| `firewall_policies` | `created_by` | Yes |
| `group_rule_set_assignments` | `assigned_by` | Yes |
| `hunt_jobs` | `created_by` | Yes |
| `hunt_matches` | `ioc_id` | Yes |
| `hunt_matches` | `reviewed_by` | Yes |
| `ioc_library` | `created_by` | Yes |
| `organization_memberships` | `invited_by` | Yes |
| `security_reports` | `generated_by` | Yes |
| `endpoint_threats` | `manual_resolved_by` | Yes |

### Migration SQL

```sql
-- FK indexes for activity_logs
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_logs_endpoint_id ON public.activity_logs(endpoint_id);

-- FK indexes for endpoint_groups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_endpoint_groups_created_by ON public.endpoint_groups(created_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_endpoint_groups_defender_policy_id ON public.endpoint_groups(defender_policy_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_endpoint_groups_wdac_policy_id ON public.endpoint_groups(wdac_policy_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_endpoint_groups_uac_policy_id ON public.endpoint_groups(uac_policy_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_endpoint_groups_windows_update_policy_id ON public.endpoint_groups(windows_update_policy_id);

-- FK indexes for endpoints
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_endpoints_policy_id ON public.endpoints(policy_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_endpoints_wdac_policy_id ON public.endpoints(wdac_policy_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_endpoints_uac_policy_id ON public.endpoints(uac_policy_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_endpoints_windows_update_policy_id ON public.endpoints(windows_update_policy_id);

-- FK indexes for other tables
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_endpoint_rule_set_assignments_assigned_by ON public.endpoint_rule_set_assignments(assigned_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_enrollment_codes_created_by ON public.enrollment_codes(created_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_firewall_audit_logs_rule_id ON public.firewall_audit_logs(rule_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_firewall_policies_created_by ON public.firewall_policies(created_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_group_rule_set_assignments_assigned_by ON public.group_rule_set_assignments(assigned_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hunt_jobs_created_by ON public.hunt_jobs(created_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hunt_matches_ioc_id ON public.hunt_matches(ioc_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hunt_matches_reviewed_by ON public.hunt_matches(reviewed_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ioc_library_created_by ON public.ioc_library(created_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organization_memberships_invited_by ON public.organization_memberships(invited_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_reports_generated_by ON public.security_reports(generated_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_endpoint_threats_manual_resolved_by ON public.endpoint_threats(manual_resolved_by);
```

---

## Phase 2: Add Composite Indexes for Hot Query Paths

**Why**: The agent API frequently queries these tables with specific patterns. Composite indexes speed up these operations.

### High-Impact Composite Indexes

```sql
-- endpoint_threats: frequently queried by endpoint_id + created_at/status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_endpoint_threats_endpoint_created 
ON public.endpoint_threats(endpoint_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_endpoint_threats_endpoint_threat_id 
ON public.endpoint_threats(endpoint_id, threat_id);

-- endpoint_status: queried by endpoint_id + collected_at
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_endpoint_status_endpoint_collected 
ON public.endpoint_status(endpoint_id, collected_at DESC);

-- endpoint_event_logs: queried by endpoint_id + event_time
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_endpoint_event_logs_endpoint_event_time 
ON public.endpoint_event_logs(endpoint_id, event_time DESC);

-- endpoints: queried by organization_id + last_seen_at
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_endpoints_org_last_seen 
ON public.endpoints(organization_id, last_seen_at DESC);
```

---

## Phase 3: Optimize RLS Policies

**Why**: Direct calls to `auth.uid()` in RLS policies cause per-row evaluation. Using `(SELECT auth.uid())` caches the result.

### Current Issue

Many RLS policies use patterns like:
```sql
-- Slow: evaluated per row
is_admin_of_org(auth.uid(), organization_id)
```

### Optimized Pattern

The helper functions like `is_admin_of_org()`, `is_member_of_org()`, etc. already call `auth.uid()` internally. Since these are `SECURITY DEFINER` functions with `STABLE` volatility, PostgreSQL should optimize them. However, some policies also have direct `auth.uid()` calls in subqueries.

### Recommended Changes

Update policies that have inline `auth.uid()` calls:

```sql
-- Example: Update profiles policy
DROP POLICY IF EXISTS "Users can view profiles in their organizations" ON public.profiles;
CREATE POLICY "Users can view profiles in their organizations" ON public.profiles
FOR SELECT USING (
    (id = (SELECT auth.uid())) 
    OR is_super_admin((SELECT auth.uid())) 
    OR (EXISTS (
        SELECT 1
        FROM organization_memberships om1
        JOIN organization_memberships om2 ON om1.organization_id = om2.organization_id
        WHERE om1.user_id = (SELECT auth.uid()) AND om2.user_id = profiles.id
    ))
    OR (EXISTS (
        SELECT 1
        FROM organization_memberships om
        WHERE om.user_id = profiles.id 
          AND is_partner_admin_of_org((SELECT auth.uid()), om.organization_id)
    ))
);
```

---

## Phase 4: Agent Behavior Optimization

**Why**: The agent currently sends heartbeats every 30 seconds with frequent log/status uploads. This creates constant write pressure.

### Recommended Changes to `agent-script`

1. **Increase heartbeat interval** from 30s to 60s or 120s
2. **Batch logs** client-side before sending (collect 5-10 minutes worth)
3. **Use UPSERT** for status updates instead of INSERT
4. **Deduplicate threats** before sending

### Agent Script Changes

In `supabase/functions/agent-script/index.ts`, update the interval:
```powershell
param(
    [int]$HeartbeatIntervalSeconds = 60,  # Changed from 30
    ...
)
```

### Agent API Changes

In `supabase/functions/agent-api/index.ts`:

1. **Use UPSERT for endpoint_status** instead of INSERT:
```typescript
// In handleHeartbeat function, change:
const { error: statusError } = await supabase
  .from("endpoint_status")
  .upsert(statusData, { 
    onConflict: 'endpoint_id',  // Requires unique constraint
    ignoreDuplicates: false 
  });
```

2. **Add rate limiting** to prevent duplicate submissions:
```typescript
// Add a simple in-memory rate limiter for chatty endpoints
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_MS = 10000; // 10 seconds minimum between requests

function checkRateLimit(endpointId: string): boolean {
  const now = Date.now();
  const lastRequest = rateLimitMap.get(endpointId) || 0;
  if (now - lastRequest < RATE_LIMIT_MS) {
    return false; // Rate limited
  }
  rateLimitMap.set(endpointId, now);
  return true;
}
```

---

## Phase 5: Data Retention and Cleanup

**Why**: Tables like `endpoint_status`, `endpoint_event_logs`, and `endpoint_logs` grow indefinitely, increasing IO.

### Implement Automatic Cleanup

Add a scheduled cleanup function (can be a Supabase cron job or edge function):

```sql
-- Delete old endpoint_status records (keep last 24 hours per endpoint)
DELETE FROM public.endpoint_status 
WHERE collected_at < NOW() - INTERVAL '24 hours'
  AND id NOT IN (
    SELECT DISTINCT ON (endpoint_id) id 
    FROM endpoint_status 
    ORDER BY endpoint_id, collected_at DESC
  );

-- Delete old endpoint_event_logs based on organization retention setting
DELETE FROM public.endpoint_event_logs eel
USING endpoints e, organizations o
WHERE eel.endpoint_id = e.id 
  AND e.organization_id = o.id
  AND eel.event_time < NOW() - (o.event_log_retention_days || ' days')::INTERVAL;
```

---

## Implementation Order

1. **Phase 1 (FK Indexes)** - Run first via SQL Editor - immediate impact
2. **Phase 2 (Composite Indexes)** - Run second via SQL Editor
3. **Phase 3 (RLS Optimization)** - Can be done in parallel with code changes
4. **Phase 4 (Agent Changes)** - Update agent-script and agent-api
5. **Phase 5 (Data Retention)** - Add cleanup job

---

## Technical Details

### Files to Modify

| File | Changes |
|------|---------|
| New migration | All index CREATE statements |
| `supabase/functions/agent-api/index.ts` | Add UPSERT for status, add rate limiting |
| `supabase/functions/agent-script/index.ts` | Increase heartbeat interval, batch logs |

### Estimated Impact

- **FK Indexes**: 40-50% reduction in write IO for FK-heavy operations
- **Composite Indexes**: 30-40% faster queries on hot paths
- **RLS Optimization**: 10-20% reduction in per-query overhead
- **Agent Changes**: 50% reduction in write frequency
- **Data Retention**: Prevents unbounded table growth

---

## Quick Actions You Can Take Now

1. **Run FK index creation** in Supabase SQL Editor (Phase 1)
2. **Scale up compute temporarily** if project is crashing
3. **Reduce agent interval** to 120 seconds as a quick fix

