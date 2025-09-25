# Implementation Plan — Leagues CSV Uploader (FF_POTATO_LEAGUES_CSV)

## Overview
We want to replace hardcoded placeholder leagues with a **dynamic CSV-driven system**.  
This will allow us to upload/update a `leagues.csv` file and have the app automatically display those leagues on the **Leagues tab**.

- The CSV will be **stored inside the repo** (under `data/leagues.csv`) and committed to git.  
- The backend will expose a new API endpoint `/api/leagues` that parses the CSV and returns JSON.  
- The frontend will query this API when `FF_POTATO_LEAGUES_CSV` is enabled.  
- This ensures that we can test and iterate quickly without adding database infrastructure yet.  

## Wireframe Reference
The existing **Leagues placeholder wireframe** still applies. This work changes **data ingestion**, not UI.

---

## Spike Context & Findings
From the spike analysis:
- **Current State**
  - Hardcoded data lives inside `LeaguesPage.tsx` (lines ~130–179).
  - Leagues rendering works via placeholder LeagueCard components.
- **Backend Architecture**
  - Routes are defined in `server/index.ts`.
  - Feature flags registered in `server/feature-flags.js`.
  - Middleware available to gate endpoints with feature flags.
- **Frontend Architecture**
  - API client defined in `client/src/lib/api.ts`.
  - Data fetching uses `react-query` (`useQuery`) consistently.
  - Existing feature flag queries can be mirrored for CSV integration.

- **Missing Dependencies**
  - No CSV parser currently installed.
  - Will need `fs` + `path` (Node built-ins) to load the CSV.

---

## Feature Flag
- **Name:** `ff.potato.leagues_csv`  
- **Env Var:** `FF_POTATO_LEAGUES_CSV`  
- **Default:** false  
- **Description:** "Enables CSV-based dynamic leagues content loading"  

---

## CSV Schema
The CSV will live in `data/leagues.csv` and follow this schema:

```
league_id,image_url,tag,header,subtext,users_count,trending_flag
1,/assets/weekend.jpg,Beginner,Weekend Warrior,Go on a weekend dry run!,55,true
2,/assets/nba.jpg,Beginner,NBA Finals,Professional Basketball League,55,true
```

- `league_id` → unique ID for the league (used later when selecting “Active”)  
- `image_url` → placeholder image path (for now still static assets or gray block)  
- `tag` → Beginner/Intermediate/Advanced  
- `header` → league title  
- `subtext` → short description  
- `users_count` → integer  
- `trending_flag` → true/false  

---

## Phased Implementation Plan

### Phase 1: Backend CSV Ingestion + API Endpoint
**Goal:** Enable `/api/leagues` to return JSON parsed from `data/leagues.csv`.

Deliverables:
- Install a CSV parsing library.
  - **Lean/testing recommendation:** `csv-parse/sync` (simpler, one-shot parsing).
  - **Alternative/production-ready:** `fast-csv` (streaming, scalable).
- Add new feature flag: `ff.potato.leagues_csv`.
- Add `data/leagues.csv` with starter content.
- Create parser function:
    - Read CSV synchronously from `data/leagues.csv`.
    - Validate required fields exist.
    - Parse into JSON objects.
    - If file missing or malformed → return `[]` instead of crashing.
- Add API endpoint `/api/leagues`:
    - Gated by feature flag.
    - Returns `{ leagues: [...], count: n, source: "csv" }`.

Notes:
- **For now:** no caching, just re-parse on every request (fine at small scale).
- **Later (optional):** add in-memory cache + schema validation (Zod).

---

### Phase 2: Frontend Integration
**Goal:** Replace hardcoded leagues with API-driven data (when flag enabled).

Deliverables:
- Extend API client (`client/src/lib/api.ts`) with `getLeagues()` method.
- Update `LeaguesPage.tsx`:
    - Add query for `ff.potato.leagues_csv`.
    - Add query for `/api/leagues` (enabled only when flag is true).
    - Render:
        - API leagues if flag + data available.
        - Fallback to hardcoded leagues if CSV missing or flag disabled.
- Add simple **loading** and **error states**:
    - `"Loading leagues..."` while waiting.
    - On error, log to console and fallback to hardcoded data.

---

### Phase 3: Future — League Selection Infrastructure
**Not part of current scope.**  

This will allow users to mark a League as “Active.”  
For now, **leagues are static placeholders only.**

Future deliverables:
- Add `league_id` to CSV schema.
- Add click handler in LeagueCard to set `activeLeagueId`.
- Store active state locally in frontend (context or state).
- Eventually → persist in DB with a `user_league_selections` table.

---

## Risks & Mitigations

- **CSV Malformed**  
  Risk: bad CSV breaks parsing.  
  Mitigation: try/catch parser, skip bad rows, fallback to empty array.  

- **File Missing**  
  Risk: no CSV found.  
  Mitigation: log warning, return `[]`, fallback to hardcoded.  

- **Schema Drift**  
  Risk: CSV fields don’t match expected columns.  
  Mitigation: document schema in repo, enforce reviews on updates.  

- **Performance**  
  Risk: parsing CSV on every request.  
  Mitigation: fine for testing (<100 rows). Cache later if needed.  

---

## Success Criteria
- ✅ `/api/leagues` returns JSON array from `data/leagues.csv` when flag enabled.  
- ✅ Frontend renders leagues dynamically from API response.  
- ✅ If CSV is missing/malformed, frontend gracefully falls back to hardcoded placeholders.  
- ✅ No crashes, responsive load time (<200ms).  

---
