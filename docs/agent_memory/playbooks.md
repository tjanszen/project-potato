# Playbooks (Agent-Ready Prompts)

### Playbook: Daily Session Kickoff Context Refresh

**Purpose:**  
Ensure the agent always has full project context at the start of a session by reviewing implementation plans, decisions, history, and playbooks.

**Agent Prompt:**  
Goal: Refresh full project context before starting new work.

Do:
- Review the following files:
  - docs/agent_memory/imp_plans/ (all implementation plan files, e.g., v1.md, v2.md, future versions)
  - replit.md
  - docs/agent_memory/daily_briefs/<yesterday's date>-postbrief.md
  - docs/agent_memory/decisions.adrs.md
  - docs/agent_memory/playbooks.md
  - docs/agent_memory/bugs_journal.md
- For each file, summarize:
  - Its purpose
  - Key completed work, decisions, or practices it records
  - Any open questions, risks, or next steps noted
- End with a **"Session Kickoff Summary"** that highlights:
  - Current project status across all implementation phases
  - Active constraints, risks, or pending decisions
  - Playbook practices and ADRs to keep in mind
  - Known bugs already resolved (so they're not re-investigated)

Proof:
- Provide a 1–2 paragraph digest per file
- Finish with consolidated "Session Kickoff Summary"

**Why:**  
Guarantees continuity across sessions, prevents re-investigation of old bugs, and ensures decisions and playbooks are consistently applied.

## Phase 0 Health Check
**Use when:** verifying foundation infrastructure is operational  
**Agent Prompt:**
```
Verify Phase 0 infrastructure:

Check database tables exist: SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

Test health endpoint: curl http://localhost:3000/health

Verify feature flag via Replit Secret: echo $FF_POTATO_NO_DRINK_V1

Verify feature flag via API: curl http://localhost:3000/api/feature-flags/ff.potato.no_drink_v1

Confirm flag is OFF by default in both checks
Evidence: Database shows users, day_marks, click_events tables + health returns 200 + flag.enabled = false in both Secret and API
```

## Feature Flag Management (via Replit Secrets)
**Use when:** enabling/disabling features safely in development or production  
**Agent Prompt:**
Manage feature flag via Replit Secrets:

Check current state:
echo $FF_POTATO_NO_DRINK_V1
curl http://localhost:3000/api/feature-flags/ff.potato.no_drink_v1

Test with flag OFF first to ensure proper gating

Toggle to ON by updating the Replit Secret: FF_POTATO_NO_DRINK_V1="true"

Toggle to OFF by setting FF_POTATO_NO_DRINK_V1="false"

Restart the server if environment variables are not hot-reloaded

Monitor logs: server startup should print "[Feature Flag] FF_POTATO_NO_DRINK_V1 = <value>"

Evidence: Secret value matches API response, gated endpoints respond appropriately, flag state persists across restarts

## Database Schema Verification
**Use when:** confirming database structure matches code  
**Agent Prompt:**
```
Verify database schema integrity:
1. Check all tables: \dt in psql or information_schema query
2. Verify constraints: CHECK (date >= '2025-01-01'), CHECK (value = TRUE)
3. Test foreign keys: users.id references work correctly
4. Confirm UUID generation: gen_random_uuid() function available
Evidence: All constraints active, foreign keys enforced, UUIDs generating
```

### Playbook: Express Server Port Binding

**Purpose:** Ensure consistent port binding across all services to avoid Replit Preview failures and production deployment issues.

**Pattern:**
```js
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
```

### Playbook: Server Cleanup & Git Hygiene

**Purpose:**  
Prevent duplicate server entry points and build artifacts from causing port conflicts, instability, or unnecessary repo bloat.

---

**Rules:**  
- Only **one entry point** (`index.js`) should call `app.listen()`.  
- All other server files (`server.js`, `server/index.ts`) must **export the app** and never bind ports.  
- Compiled or build output must **not** be committed to Git.

---

**Cleanup Targets:**  
Add these to `.gitignore` and remove if committed accidentally:  
/server/index.js
/dist/
/server/server/


---

**Verification Checklist:**  
- [ ] `index.js` is the only file with `app.listen()`  
- [ ] Repo contains no duplicate server artifacts (`dist/`, compiled TS output)  
- [ ] `.gitignore` includes the cleanup targets  
- [ ] Server starts cleanly: `Server running on port <PORT>`  

---

**Why:**  
- Eliminates `EADDRINUSE` port conflicts  
- Reduces repo clutter from compiled code  
- Keeps architecture clear: one entry point, exportable modules for testing

### Playbook: Server Entry Point Confusion

**Purpose:**  
Prevent wasted effort from editing non-runtime files that cause authentication routes to fail with 404 errors, duplicate middleware conflicts leading to server crashes (exit code 7), and confusion about which file actually executes in Replit.

---

**Rules:**  
- Only edit **`index.js`** for backend routes and middleware.  
- **Ignore `server/index.ts`** unless/until we migrate fully to TypeScript runtime.  
- Always confirm **`package.json "main"`** field points to the intended runtime entry file.  
- Place new routes **logically** (login → logout flow) to avoid confusion.  
- **Don't duplicate global middleware** on individual routes.

---

**Verification Checklist:**  
- [ ] Added route is reachable via curl or browser after server restart  
- [ ] No duplicate routes exist (/api/auth/* vs /api/*)  
- [ ] Server starts without crashes or exit codes  
- [ ] Feature flag ff.potato.no_drink_v1 enabled for testing gated endpoints  
- [ ] package.json "main" points to index.js  

---

**Why:**  
- Prevents wasted time editing non-runtime files (server/index.ts)  
- Avoids "Cannot POST" errors when routes aren't picked up  
- Eliminates duplicate middleware conflicts and exit code 7 crashes  
- Ensures clarity on which file actually executes in Replit  
- Reinforces consistency until tooling unifies around TypeScript