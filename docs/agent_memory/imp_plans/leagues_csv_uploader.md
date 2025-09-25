# Implementation Plan — Leagues CSV Uploader (FF_POTATO_LEAGUES_CSV)

## Overview
We want to replace hardcoded placeholder leagues with a **CSV-driven system**.  
This enables us to maintain a simple `data/leagues.csv` file in the repo and serve its contents dynamically to the frontend via `/api/leagues`.

- Controlled by a new feature flag: **FF_POTATO_LEAGUES_CSV**  
- Backend parses CSV on-demand and exposes data via an API endpoint  
- Frontend conditionally consumes the API response when the flag is enabled, falling back to hardcoded placeholders otherwise  
- Scale is not a concern right now → optimize later only if needed  

---

## Spike Context & Findings

### Current Architecture
- **Backend**
  - Routes defined in `server/index.ts`
  - Feature flags stored in `server/feature-flags.js` with env var hydration
  - REST endpoints use `/api/*` with standard middleware
  - Auth system: `requireAuthentication` middleware

- **Frontend**
  - API client lives in `client/src/lib/api.ts`
  - Data fetching uses React Query (`useQuery`)
  - Hardcoded league data inside `LeaguesPage.tsx` (~lines 130–179)
  - Feature flags already gate Leagues page via `FF_POTATO_LEAGUES_PLACEHOLDER` and `FF_POTATO_LEAGUES_TABS`

- **Dependencies Missing**
  - No CSV parsing library installed
  - Need Node.js `fs` + `path` for file reads

### Mobile Styling Patterns
- `BottomNav.css` uses `@media (max-width: 480px)` for mobile-first breakpoints
- Reusable grid patterns found in `CalendarGrid.css`
- Card styling already standardized via TotalsPanel and LeagueCard

### Recommendations from Spike
- Keep it simple: use **CSV file + API endpoint** (no DB yet)  
- Parse CSV on-demand; caching not needed at current scale  
- Feature flag isolation ensures safe rollout  
- Fallback to hardcoded placeholders if CSV missing or invalid  
- CSV schema needs `league_id` now to prep for “Active League” future phase  

---

## Feature Flag
- **Name:** `ff.potato.leagues_csv`  
- **Env Var:** `FF_POTATO_LEAGUES_CSV`  
- **Default:** false  
- **Description:** "Enables CSV-based dynamic leagues content loading"  

---

## CSV Schema
File path: `data/leagues.csv`

```
league_id,image_url,tag,header,subtext,users_count,trending_flag
1,/assets/weekend.jpg,Beginner,Weekend Warrior,Go on a weekend dry run!,55,true
2,/assets/nba.jpg,Intermediate,NBA Finals,Professional Basketball League,55,true
```

Fields:
- `league_id` → unique ID for each league  
- `image_url` → placeholder image path (gray block or static asset)  
- `tag` → Beginner / Intermediate / Advanced  
- `header` → league name  
- `subtext` → short description  
- `users_count` → integer (e.g. 55)  
- `trending_flag` → true/false  

---

## Phase 1: Backend CSV Ingestion + API Endpoint

### Phase 1.1: Feature Flag Setup
- Add new entry in `server/feature-flags.js`:
    - Key: `ff.potato.leagues_csv`
    - Default: false
    - Env var: `FF_POTATO_LEAGUES_CSV`
    - Description: "Enables CSV-based dynamic leagues content loading"
- Verify flag toggle works via `/api/admin/toggle-flag/ff.potato.leagues_csv`

### Phase 1.2: CSV File Setup
- Create `data/leagues.csv`
- Add sample rows (2–3 leagues to start)
- Commit file into repo for version control

### Phase 1.3: CSV Parser Function
- Use a simple synchronous parser for now (`csv-parse/sync` or `papaparse`)
- Read file from `data/leagues.csv`
- Map rows into JSON objects:
    - Ensure `league_id` parsed as int
    - `users_count` parsed as int
    - `trending_flag` parsed as boolean
- Handle errors gracefully:
    - If file missing → return empty array
    - If row malformed → skip row and log warning

### Phase 1.4: API Endpoint
- Add `/api/leagues` in `server/index.ts`
- Gate with feature flag `ff.potato.leagues_csv`
- Response format:

```json
{
  "leagues": [ ... ],
  "count": <number>,
  "source": "csv"
}
```

- Error handling:
    - On failure, return `{ leagues: [], count: 0, source: "fallback" }`

---

## Phase 2: Frontend Integration

### Phase 2.1: API Client
- Extend `client/src/lib/api.ts` with new method:

```ts
async getLeagues() {
  return this.request('/api/leagues')
}
```

### Phase 2.2: Feature Flag Query
- In `LeaguesPage.tsx`, add React Query for `ff.potato.leagues_csv`
- Use `useQuery` to fetch flag state
- Default fallback: false

### Phase 2.3: Leagues Data Query
- If flag is enabled → query `/api/leagues`
- Cache for 10 minutes with React Query
- Use conditional rendering:
    - CSV data if available
    - Hardcoded placeholder data if not

### Phase 2.4: Loading + Error States
- Display `"Loading leagues..."` while fetching
- On error, log details and fallback to placeholders

---

## Phase 3: Future — League Selection Infrastructure

### Phase 3.1: Local Active State
- Add `league_id` to CSV schema (already included)
- In frontend → store `activeLeagueId` in component state
- User selects a league by clicking its card
- Highlight selection visually

### Phase 3.2: Persistent Storage (Later)
- Add DB table `user_league_selections`
- Schema:
    - `id`, `user_id`, `league_id`, `is_active`, `selected_at`
- Sync frontend selection with DB

(Not required for initial CSV uploader, but provides a roadmap)

---

## Risks & Mitigations

- **Malformed CSV**
  - Risk: missing/invalid fields
  - Mitigation: skip bad rows, log warnings, fallback to empty array

- **File Missing**
  - Risk: no CSV present
  - Mitigation: return `[]`, fallback to placeholders

- **Performance**
  - Risk: parsing file on every request
  - Mitigation: fine at small scale (<100 rows). Add caching if needed.

- **Schema Drift**
  - Risk: CSV edited incorrectly
  - Mitigation: keep schema documented in repo, validate on load

---

## Success Criteria
- ✅ `/api/leagues` returns parsed CSV data when flag is enabled  
- ✅ Frontend dynamically renders leagues from API  
- ✅ Fallback to hardcoded placeholders works if CSV missing/malformed  
- ✅ Feature flag gating confirmed (CSV → Tabs → Placeholder precedence)  
- ✅ No crashes, reasonable load time (<200ms for small CSVs)  

---
