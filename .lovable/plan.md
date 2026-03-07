

## Add Endpoint Deletion (Remove Domain Controllers / Any Endpoint)

The platform currently has no way to delete/remove endpoints. Users can add endpoints via the agent but cannot decommission them from the UI. This applies to domain controllers, servers, and workstations alike.

### What will be built

1. **`useDeleteEndpoint` hook** in `src/hooks/useDashboardData.ts`
   - Mutation that calls `supabase.from("endpoints").delete().eq("id", id)`
   - Invalidates `endpoints`, `endpoint-status`, `endpoint-threats` queries on success
   - Shows toast confirmation

2. **Delete button on each endpoint row** in `src/components/dashboard/EndpointsTable.tsx`
   - Add a Trash2 icon button (ghost/destructive style) in a new actions column
   - Wrap in an `AlertDialog` confirmation: "Delete {hostname}? This will permanently remove this endpoint and all its associated data (logs, threats, status history)."
   - Only visible to admins (check org role from context or simply let RLS enforce it — the existing `Admins can manage endpoints` ALL policy already covers DELETE)

3. **No database migration needed** — the `endpoints` table already has an RLS policy `Admins can manage endpoints` with command `ALL`, which includes DELETE. Cascading deletes for related tables (endpoint_status, endpoint_logs, endpoint_event_logs, endpoint_threats) depend on foreign key ON DELETE CASCADE — if those aren't set, the delete will fail. We should verify and add a migration if needed.

### Technical detail: Foreign key cascade check

The schema shows `endpoint_status.endpoint_id`, `endpoint_logs.endpoint_id`, `endpoint_event_logs.endpoint_id`, and `endpoint_threats.endpoint_id` reference `endpoints.id`. If these lack `ON DELETE CASCADE`, we'll add a migration to set it. This ensures removing an endpoint also cleans up all child records.

### Files to modify
- **`src/hooks/useDashboardData.ts`** — add `useDeleteEndpoint` mutation
- **`src/components/dashboard/EndpointsTable.tsx`** — add delete button + confirmation dialog per row
- **Possible migration** — add `ON DELETE CASCADE` to foreign keys on endpoint child tables if missing

