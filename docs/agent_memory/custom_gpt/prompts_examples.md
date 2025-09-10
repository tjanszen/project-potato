# 📚 Prompt Examples Library

These are curated examples of strong prompts for the GPT co-pilot.  
They demonstrate correct structure, clarity, and proof requirements.  

---

# 🔍 Validate Current State: Day Marking Functionality (Read-Only)

⚠️ IMPORTANT: Do not fix, change, or modify any code or database schema. Only run tests and provide a structured report.  

Goal: Confirm whether the "500 Internal Server Error when marking days" (September 8 bug) is resolved or misdiagnosed. Provide definitive proof of current behavior.

---

## Do (Read-Only Validation):

1. **Setup Authenticated Session**
   - Create or log in as a test user (email: testuser_validate@example.com, password: password123).
   - Save session cookie for reuse.

2. **Mark a Day (Test Only)**
   - Run:
     ```bash
     curl -X POST http://localhost:3000/api/days/2025-09-08/no-drink \
       -H "Content-Type: application/json" \
       -b test_cookies.txt -c test_cookies.txt -v
     ```
   - Capture HTTP status and JSON response.
   - ❌ Do not modify any server or schema code if error occurs.

3. **Check Database State (Read-Only)**
   - Run:
     ```sql
     SELECT * FROM day_marks ORDER BY local_date DESC LIMIT 5;
     ```
   - Show results only, no schema edits.

4. **Prove Server Stability**
   - Confirm server process stays running after the request.
   - Show server logs for the marking request.

5. **Output Structured Validation Report**
   - ✅ If marking succeeds: Show HTTP 200 response + inserted DB row.
   - ❌ If marking fails: Show HTTP 500 error details + server logs.
   - Highlight whether this proves the original September 8 issue is:
     - **Resolved** (day marking works end-to-end), or
     - **Misdiagnosed** (table exists but schema mismatch/constraint error caused the failure).

---

## Proof Required:
- HTTP response status + JSON  
- DB row from `day_marks`  
- Relevant server log snippet  
- Final conclusion: Resolved ✅ or Misdiagnosed ⚠️  

---

# ✏️ Patch Plan: Schema Fix & Validation

Goal: Insert a new "Patch Plan: Schema Fix & Validation" section between **7C-1** and **7C-2** in `docs/agent_memory/imp_plans/v2.md`.

Do:

1. Locate **Phase 7C-1: Dashboard Components**.  
2. After its section ends, insert the following new section:  

---

### Patch Plan: Schema Fix & Validation

**Goal:** Ensure the database schema matches Drizzle definitions before proceeding with further phases. This plan acts as a corrective patch if critical tables (e.g., `day_marks`) are missing.

#### Step 1: Schema Check
- List current DB tables (`\dt`)
- Verify existence of `users`, `day_marks`, `runs`, `run_totals`
- Compare with Drizzle `shared/schema.ts`  
👉 **Output:** A schema diff (what’s missing, what’s out of sync).

#### Step 2: Migration Apply
- If tables are missing, run `npx drizzle-kit push` or generate safe `CREATE TABLE` SQL
- Ensure **non-destructive** changes (only add missing objects)  
👉 **Output:** Confirmation tables created without touching existing data.

#### Step 3: Validation
- Retry marking a day via `curl`
- Confirm no more 500 errors
- Show resulting DB rows in `day_marks`  
👉 **Output:** Proof the endpoint works end-to-end.

#### Step 4: Documentation
- Update `bugs_journal.md` with entry about missing tables → resolved
- (Optional) Update `playbooks.md` with rule: “Always run schema check before new phases.”  
👉 **Output:** Docs updated with permanent record.

---

3. Keep all existing formatting in v2.md intact. Do not overwrite other sections.  

**Proof:** The new section appears **between 7C-1 and 7C-2**, clearly marked as a standalone corrective patch plan.  

---

# 📏 Right-Sizing Implementation Plans (100–500 Users)

Goal: Add a new section to the playbook that enshrines “Right-Sizing Implementation Plans” for a 100–500 user base.

Do:
1. Open `docs/agent_memory/playbooks.md`  
2. Append a new section at the end:

### Right-Sizing Implementation Plans (100–500 Users)
- Scope implementation plans and tasks for small-scale (100–500 user) apps, not enterprise scale.
- Avoid premature optimizations (e.g., nightly jobs, high-concurrency stress tests, complex capacity planning) unless clearly needed.
- Prefer simple, direct solutions that balance correctness with maintainability.
- If a phase/sub-phase looks like it’s designed for thousands of users, simplify it (e.g., batch jobs → on-demand checks, global dashboards → minimal logs).
- Cross-reference: Apply this principle whenever evaluating risks, tasks, or exit criteria in implementation plans.
- For large-scale readiness (1k+ users), explicitly add a “Phase X-Lite” now, and defer “Phase X-Full” as a fast-follow only when justified.

**Proof:**  
- `docs/agent_memory/playbooks.md` contains the new section at the end.  
- Section includes bullets about simplifying phases, avoiding overkill, and deferring large-scale features.  

---

# 🐞 Debugging Authenticated V2 Endpoint Crashes

Goal: Debug why server exits when hitting authenticated V2 endpoints.

Do:

1. **Run Server in Foreground**  
   - Start server with: `node index.js`  
   - Keep process attached so logs persist after requests  

2. **Simulate Requests**  
   - Run: `curl -s http://localhost:3000/api/v2/runs`  
   - Run: `curl -s http://localhost:3000/api/v2/totals`  

3. **Capture Crash Logs**  
   - Collect all `console.error` output  
   - Collect full stack traces if Node process exits  
   - Note if errors mention database, authentication, or unhandled promise rejection  

4. **Summarize**  
   - Report exact error message and file/line if available  
   - Identify whether crash occurs before/after DB access  
   - Confirm if unhandled promise rejection or missing error handling is root cause  

**Important:**  
- Do not attempt fixes  
- Stop after capturing logs and summarizing crash cause  

**Proof:**  
- Full crash logs from requests to `/api/v2/runs` and `/api/v2/totals`  
- Exact error type identified (DB error, auth issue, promise rejection, etc.)  

---

# 🛡️ Strengthen Server Validation

Goal: Strengthen server validation by updating Phase 6X Exit Criteria and adding a Playbook checklist.

Do:

1. In `docs/agent_memory/imp_plans/v2.md`:  
   - Locate the section **"PHASE 6X: V2 Endpoints & Storage Implementation"**  
   - In the **Exit Criteria** list, add:  
     - Server binds successfully to `process.env.PORT` (or 3000 fallback) and remains running without premature exit  

2. In `docs/agent_memory/playbooks.md`:  
   - Append a new section:  

### Server Validation Checklist
Before marking any server-related phase as complete (e.g., endpoint integration, cutover, migrations), confirm:  
- Server binds to `process.env.PORT` (or fallback port) using `app.listen()`  
- Server remains running (not exiting immediately)  
- Feature flags load and log correctly at startup  
- `curl /health` returns HTTP 200 with `{ healthy: true }`  
- Logs confirm `"Server listening on port $PORT"`  
- `lsof` or `ss` shows process bound to the expected port  

**Why:**  
- Prevents silent failures where server logs success but exits  
- Ensures Replit-compatible binding to dynamic `$PORT`  
- Guarantees endpoints are actually reachable during validation  

**Proof:**  
- `v2.md` updated with new Exit Criteria for Phase 6X  
- `playbooks.md` updated with new "Server Validation Checklist" entry  

---
