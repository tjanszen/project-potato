# Playbooks (Agent-Ready Prompts)

## Phase 0 Health Check
**Use when:** verifying foundation infrastructure is operational  
**Agent Prompt:**
```
Verify Phase 0 infrastructure:
1. Check database tables exist: SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
2. Test health endpoint: curl http://localhost:3000/health
3. Verify feature flag: curl http://localhost:3000/api/feature-flags/ff.potato.no_drink_v1
4. Confirm flag is OFF by default
Evidence: Database shows users, day_marks, click_events tables + health returns 200 + flag.enabled = false
```

## Feature Flag Toggle
**Use when:** enabling/disabling features safely  
**Agent Prompt:**
```
Toggle feature flag safely:
1. Current state: GET /api/feature-flags/ff.potato.no_drink_v1
2. Test with flag OFF first to ensure proper gating
3. Toggle to ON only after verification
4. Monitor logs for errors after toggle
Evidence: Flag state changes correctly, gated endpoints respond appropriately
```

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