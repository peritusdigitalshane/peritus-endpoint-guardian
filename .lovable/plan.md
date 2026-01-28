
# IOC-Based Threat Hunting Implementation Plan

## Overview
Add proactive threat hunting capabilities to Peritus Secure, enabling security teams to search across their telemetry for known Indicators of Compromise (IOCs). This Tier 2 implementation focuses on leveraging existing data from `wdac_discovered_apps`, `endpoint_threats`, and `endpoint_event_logs`.

## Architecture

```text
+------------------+     +-------------------+     +------------------+
|   IOC Library    |     |    Hunt Jobs      |     |   Hunt Matches   |
+------------------+     +-------------------+     +------------------+
| - file_hash      |---->| - ioc_sweep       |---->| - endpoint_id    |
| - file_path      |     | - quick_search    |     | - matched_value  |
| - file_name      |     | - pattern_search  |     | - match_source   |
| - process_name   |     +-------------------+     | - context (JSON) |
+------------------+            |                  +------------------+
                                v
              +----------------------------------+
              |    Existing Data Sources         |
              +----------------------------------+
              | - wdac_discovered_apps           |
              | - endpoint_threats               |
              | - endpoint_event_logs            |
              +----------------------------------+
```

## Phase 1: Database Schema

### New Tables

**ioc_library** - Store IOC definitions
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| organization_id | UUID | FK to organizations |
| ioc_type | TEXT | file_hash, file_path, file_name, process_name |
| value | TEXT | The actual IOC value |
| hash_type | TEXT | md5, sha1, sha256 (for hashes) |
| threat_name | TEXT | e.g., "Emotet", "Cobalt Strike" |
| severity | TEXT | low, medium, high, critical |
| source | TEXT | manual, virustotal, alienvault, misp |
| description | TEXT | Additional context |
| is_active | BOOLEAN | Enable/disable IOC |
| tags | TEXT[] | Categorization tags |
| created_at | TIMESTAMPTZ | Auto-generated |
| created_by | UUID | FK to profiles |

**hunt_jobs** - Track hunting operations
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| organization_id | UUID | FK to organizations |
| name | TEXT | Hunt job name |
| description | TEXT | Optional description |
| status | TEXT | pending, running, completed, failed |
| hunt_type | TEXT | ioc_sweep, quick_search, pattern_search |
| parameters | JSONB | IOC IDs, search values, date range |
| started_at | TIMESTAMPTZ | When hunt began |
| completed_at | TIMESTAMPTZ | When hunt finished |
| total_endpoints | INTEGER | Endpoints scanned |
| matches_found | INTEGER | Total matches |
| created_by | UUID | FK to profiles |
| created_at | TIMESTAMPTZ | Auto-generated |

**hunt_matches** - Individual match results
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| hunt_job_id | UUID | FK to hunt_jobs |
| ioc_id | UUID | FK to ioc_library (nullable for ad-hoc) |
| endpoint_id | UUID | FK to endpoints |
| match_source | TEXT | discovered_apps, threats, event_logs |
| matched_value | TEXT | The actual matched value |
| context | JSONB | File path, timestamp, raw data |
| reviewed | BOOLEAN | Has been triaged |
| reviewed_by | UUID | FK to profiles |
| reviewed_at | TIMESTAMPTZ | When reviewed |
| created_at | TIMESTAMPTZ | Auto-generated |

### RLS Policies
All three tables will follow the existing pattern using `is_member_of_org()`, `is_super_admin()`, and `is_partner_admin_of_org()` functions for organization-scoped access.

## Phase 2: Frontend Components

### New Files

**Page: `src/pages/ThreatHunting.tsx`**
- Main threat hunting page with tabbed interface
- Tabs: Quick Search | IOC Library | Hunt History

**Hook: `src/hooks/useThreatHunting.ts`**
- `useIocLibrary()` - CRUD for IOCs
- `useHuntJobs()` - Hunt job management  
- `useHuntMatches(jobId)` - Match results
- `useQuickSearch()` - Instant IOC lookup mutation

**Components: `src/components/hunting/`**
| Component | Purpose |
|-----------|---------|
| QuickIocSearch.tsx | Hero search bar with auto-detect IOC type |
| IocLibraryManager.tsx | IOC list with CRUD, bulk import |
| IocImportDialog.tsx | CSV/JSON bulk import modal |
| HuntJobsList.tsx | Hunt history with status badges |
| CreateHuntDialog.tsx | New hunt wizard - select IOCs, date range |
| HuntResultsView.tsx | Match results with endpoint context |
| IocTypeIcon.tsx | Visual icons per IOC type |

### UI Layout

```text
+---------------------------------------------------------------+
|  Threat Hunting                                    [New Hunt]  |
+---------------------------------------------------------------+
|  +----------------------------------------------------------+ |
|  |  Quick Search                                             | |
|  |  [SHA256, MD5, file path, process name...]  [Hunt]       | |
|  +----------------------------------------------------------+ |
|                                                                |
|  [Quick Search] [IOC Library] [Hunt History]                  |
|  +----------------------------------------------------------+ |
|  | Results / Library / History content based on active tab   | |
|  +----------------------------------------------------------+ |
+---------------------------------------------------------------+
```

## Phase 3: Hunt Execution Logic

### Search Strategy by IOC Type

| IOC Type | Table | Match Column | Match Logic |
|----------|-------|--------------|-------------|
| file_hash | wdac_discovered_apps | file_hash | Exact (case-insensitive) |
| file_hash | endpoint_threats | resources->path | Extract from JSON, compare |
| file_path | wdac_discovered_apps | file_path | ILIKE with wildcards |
| file_path | endpoint_event_logs | message | Text search |
| file_name | wdac_discovered_apps | file_name | Exact or ILIKE |
| file_name | endpoint_event_logs | message | Text search |
| process_name | endpoint_event_logs | message | Text search |

### Quick Search Flow
1. User enters IOC value in search bar
2. Auto-detect type (SHA256 = 64 hex, path = contains `\`, etc.)
3. Query all relevant tables in parallel
4. Display matches grouped by source with endpoint details

### Batch Hunt Flow
1. User selects IOCs from library or enters custom values
2. Create `hunt_jobs` record with status `pending`
3. Execute queries across all data sources
4. Insert matches into `hunt_matches`
5. Update job status to `completed` with statistics

## Phase 4: Navigation Integration

### Sidebar Update
Add "Threat Hunting" to sidebar navigation with Crosshair icon, positioned after "Event Logs":

```text
- Dashboard
- Endpoints
- Groups
- Threats
- Event Logs
- Threat Hunting  <-- NEW
- Policies
- ...
```

### Quick Actions Integration
Add "Hunt for this hash" to context menus in:
- DiscoveredApps table rows (file_hash column)
- ThreatsList threat cards (from resources)
- EventLogs detail sheet

## Files to Create

| File | Purpose |
|------|---------|
| `supabase/migrations/xxx_threat_hunting_tables.sql` | Database schema |
| `src/pages/ThreatHunting.tsx` | Main page |
| `src/hooks/useThreatHunting.ts` | Data hooks |
| `src/components/hunting/QuickIocSearch.tsx` | Search component |
| `src/components/hunting/IocLibraryManager.tsx` | IOC management |
| `src/components/hunting/IocImportDialog.tsx` | Bulk import |
| `src/components/hunting/HuntJobsList.tsx` | Hunt history |
| `src/components/hunting/CreateHuntDialog.tsx` | New hunt form |
| `src/components/hunting/HuntResultsView.tsx` | Match results |
| `src/components/hunting/IocTypeIcon.tsx` | Type icons |

## Files to Modify

| File | Changes |
|------|---------|
| `src/App.tsx` | Add `/threat-hunting` route |
| `src/components/layout/Sidebar.tsx` | Add navigation item |
| `src/integrations/supabase/types.ts` | Will auto-update with new tables |
| `src/components/security/DiscoveredApps.tsx` | Add "Hunt" action to rows |
| `src/components/dashboard/ThreatsList.tsx` | Add "Hunt" action |

## Technical Considerations

1. **Performance**: Index `ioc_library.value` and use batch queries to avoid N+1 issues
2. **Hash Normalization**: Store all hashes lowercase, normalize on input
3. **Wildcards**: Support `*` and `?` patterns for file paths using SQL `LIKE`
4. **Rate Limiting**: Limit hunt job execution to prevent database overload
5. **Activity Logging**: Log all hunt operations for audit trail

## Future Enhancements (Not in Scope)

- Threat intelligence feed integration (VirusTotal, AlienVault OTX)
- Real-time IOC matching on incoming telemetry
- Scheduled/automated hunts
- Network IOCs (IP addresses, domains) - requires agent telemetry expansion
- YARA rule support
