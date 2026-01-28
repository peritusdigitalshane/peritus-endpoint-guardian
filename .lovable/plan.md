

# VirusTotal API Integration for IOC Library

## Overview

This plan adds VirusTotal integration to the IOC Library, enabling you to:
1. **Lookup IOCs** - Enrich file hashes with VirusTotal reputation data (detection count, threat names, file info)
2. **Auto-import IOCs** - Import related IOCs from VirusTotal analysis (contacted domains, dropped files, etc.)
3. **Bulk enrichment** - Enrich multiple IOCs from your library with a single action

## How It Works

When you add a file hash (SHA256, SHA1, or MD5) to your IOC Library, you'll be able to click "Lookup on VirusTotal" to retrieve:
- Detection ratio (e.g., "45/72 engines detected this file")
- Threat names from AV vendors
- File metadata (size, type, first/last seen dates)
- Related IOCs (optional import)

The enrichment data will be stored alongside the IOC for future reference.

## Architecture

```text
+------------------+     +--------------------+     +------------------+
|   IOC Library    |     |  virustotal-lookup |     |   VirusTotal     |
|   (Frontend)     |---->|  Edge Function     |---->|   API v3         |
+------------------+     +--------------------+     +------------------+
| Click "Lookup"   |     | - Auth check       |     | GET /files/{id}  |
| on hash IOC      |     | - Rate limiting    |     | Returns:         |
|                  |     | - API call         |     | - detections     |
|                  |<----|   & response parse |<----| - threat names   |
| Display results  |     | - Store enrichment |     | - metadata       |
+------------------+     +--------------------+     +------------------+
```

## Implementation Steps

### Step 1: Store VirusTotal API Key

Since API keys should never be in frontend code, I'll add a new platform setting (similar to the existing OpenAI key) to securely store your VirusTotal API key.

- Add `virustotal_api_key` to platform_settings table
- Add UI in Admin page to configure the key
- Key is only accessible server-side (edge functions)

### Step 2: Create Edge Function

New edge function: `supabase/functions/virustotal-lookup/index.ts`

Endpoints:
| Endpoint | Purpose |
|----------|---------|
| POST /lookup | Look up a single hash and return enrichment data |
| POST /bulk-enrich | Enrich multiple IOCs (with rate limiting) |

The function will:
- Validate user authentication
- Check for configured API key
- Call VirusTotal API v3: `GET https://www.virustotal.com/api/v3/files/{hash}`
- Parse response and return structured data
- Optionally update the IOC record with enrichment data

### Step 3: Update Database Schema

Add enrichment storage to the IOC Library:

```sql
ALTER TABLE ioc_library ADD COLUMN vt_enrichment JSONB DEFAULT NULL;
ALTER TABLE ioc_library ADD COLUMN vt_enriched_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE ioc_library ADD COLUMN vt_detection_ratio TEXT DEFAULT NULL;
```

The `vt_enrichment` column stores the full VirusTotal response for detailed views.

### Step 4: Update Frontend Components

**IocLibraryManager.tsx changes:**
- Add "Lookup" button in the actions dropdown for hash-type IOCs
- Display detection ratio badge in the table (e.g., "45/72" in red/yellow/green)
- Add loading state during lookup

**New IocEnrichmentDialog.tsx:**
- Shows full VirusTotal results when clicking on an enriched IOC
- Displays vendor detections, file info, related IOCs
- Option to import related IOCs to your library

**IocTypeIcon.tsx changes:**
- Add visual indicator for enriched vs non-enriched IOCs

### Step 5: Admin Settings UI

Add to the Platform Settings section:
- VirusTotal API Key input field (password masked)
- Test connection button
- Usage/rate limit indicator

## Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/virustotal-lookup/index.ts` | Edge function for VT API calls |
| `src/components/hunting/IocEnrichmentDialog.tsx` | Display enrichment details |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/hunting/IocLibraryManager.tsx` | Add Lookup button, display VT data |
| `src/components/admin/PlatformSettingsSection.tsx` | Add VT API key configuration |
| `src/hooks/useThreatHunting.ts` | Add enrichment mutation hook |
| `supabase/migrations/` | New migration for enrichment columns |

## Rate Limiting Considerations

VirusTotal API has rate limits based on your plan:
- **Free tier**: 4 requests/minute, 500 requests/day
- **Premium**: Higher limits based on subscription

The edge function will:
1. Track request counts per organization
2. Return appropriate errors when limits are approached
3. Support bulk operations with automatic pacing

## Technical Details

### VirusTotal API Call Example

```typescript
const response = await fetch(
  `https://www.virustotal.com/api/v3/files/${hash}`,
  {
    headers: {
      "x-apikey": vtApiKey,
      "Accept": "application/json"
    }
  }
);

const data = await response.json();
// data.data.attributes contains:
// - last_analysis_stats (malicious, suspicious, harmless, etc.)
// - popular_threat_classification
// - meaningful_name
// - type_description
// - first_submission_date
```

### Detection Ratio Display Logic

```text
0 detections      -> Green badge "Clean"
1-5 detections    -> Yellow badge "Suspicious"  
6+ detections     -> Red badge with count "45/72"
```

## Security Notes

- API key stored in `platform_settings`, never exposed to frontend
- All VT requests go through authenticated edge function
- Rate limiting prevents API abuse
- Only super admins can configure the API key

## Future Enhancements (Not in Scope)

- URL and domain lookups (requires different VT endpoints)
- IP address reputation checks
- Automatic enrichment on IOC import
- VT Intelligence search integration (premium)
- Sandbox submission for unknown files

