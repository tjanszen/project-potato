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

### Playbook: Rebuild Runs (User or Range)

**Purpose:**  
Administrative data recovery and maintenance for runs table corruption, timezone migrations, or algorithm updates.

**Agent Prompt:**  
Goal: Safely rebuild user runs data from authoritative day_marks table.

Do:
- Backup existing runs: `CREATE TABLE runs_backup AS SELECT * FROM runs WHERE user_id = ?`
- Execute rebuild: `SELECT rebuild_user_runs(user_id, from_date, to_date)`
- Validate invariants: verify no overlapping runs, single active run, correct day_counts
- Compare before/after statistics to detect data corruption
- Log rebuild metrics: duration, runs affected, data changes

Proof:
- Backup table created successfully
- All data invariants hold post-rebuild
- User statistics match expected values
- No overlapping date ranges exist

**Why:**  
Ensures data consistency after corruption, algorithm changes, or timezone migrations while preserving rollback capability.

### Playbook: Shadow & Diff Before Enabling ff.potato.runs_v2

**Purpose:**  
Validate v2 algorithm correctness by comparing shadow calculations against legacy system before production cutover.

**Agent Prompt:**  
Goal: Ensure zero discrepancies between legacy and v2 runs calculations before cutover.

Do:
- Enable shadow mode: compute v2 runs without affecting user experience
- Generate diff reports: compare total_days, current_run_days, longest_run_days
- Monitor for 7 days: verify consistent results across all user scenarios
- Validate golden user dataset: test known edge cases and complex scenarios
- Check performance impact: <5% overhead during shadow calculations
- Document any discrepancies with root cause analysis and resolution

Proof:
- Zero diffs detected for golden user dataset
- 7-day monitoring shows consistent calculations
- Performance impact within acceptable limits
- All discrepancies investigated and resolved

**Why:**  
Prevents data corruption and user experience degradation by validating algorithm correctness before production deployment.

### Playbook: Cutover/Rollback

**Purpose:**  
Execute production cutover to v2 runs system with rapid rollback capability if quality gates fail.

**Agent Prompt:**  
Goal: Safely migrate users to v2 runs system with monitoring and rollback procedures.

Do:
- Pre-cutover checklist: shadow validation complete, SLI thresholds established, rollback tested
- Gradual rollout: internal users (1%) → beta users (10%) → full deployment (100%)
- Monitor SLIs: run_calculation_latency_p95, invariant_violations, api_response_time_p95
- Automated rollback triggers: disable ff.potato.runs_v2 if thresholds exceeded
- Post-cutover validation: verify user data integrity and feature functionality
- Declare steady state: decommission legacy system after 7-day stability period

Proof:
- All rollout phases completed without rollback triggers
- SLI metrics remain within thresholds
- 100% user data integrity validated
- Legacy system successfully decommissioned

**Why:**  
Ensures safe production deployment with rapid recovery capability and comprehensive quality validation.

### Playbook: Nightly Totals Reconciliation

**Purpose:**  
Maintain data consistency between real-time runs calculations and stored monthly aggregates in run_totals table.

**Agent Prompt:**  
Goal: Detect and correct data inconsistencies between runs and run_totals tables.

Do:
- Query inconsistencies: compare run_totals aggregates with real-time calculations
- Identify stale data: find totals not updated after recent day_marks changes
- Recompute monthly aggregates: update affected user-month combinations
- Validate corrections: verify totals match real-time calculations post-update
- Log reconciliation results: inconsistencies found, corrections applied, errors encountered
- Alert on persistent failures: escalate if same users fail reconciliation repeatedly

Proof:
- All identified inconsistencies corrected
- Monthly aggregates match real-time calculations
- Reconciliation completes within 1-hour maintenance window
- Zero persistent reconciliation failures

**Why:**  
Maintains data accuracy for performance-optimized totals while catching calculation bugs and data corruption.

### Playbook: Health Checks & Invariant Failure Response

**Purpose:**  
Respond to data invariant violations detected by automated health checks with investigation and remediation procedures.

**Agent Prompt:**  
Goal: Investigate and resolve data invariant violations to maintain system integrity.

Do:
- Identify violation type: overlapping runs, multiple active runs, incorrect day_counts, missing runs
- Isolate affected users: query scope of data corruption and impact assessment
- Execute emergency procedures: disable affected user access, backup corrupted data
- Root cause analysis: investigate recent operations, concurrent access patterns, system changes
- Apply corrective action: rebuild affected user runs, fix underlying bugs, update procedures
- Validate resolution: verify all invariants hold post-correction, monitor for recurrence

Proof:
- All invariant violations resolved within 1 hour
- Root cause identified and documented
- Preventive measures implemented to avoid recurrence
- System health checks return to healthy status

**Why:**  
Maintains data integrity guarantees essential for user trust and system reliability while enabling rapid incident response.

### Playbook: Constraint Violation Remediation

**Purpose:**  
Emergency response procedure for database constraint violations that require immediate system 
stabilization and selective data repair.

**Agent Prompt:**  
Goal: Safely remediate constraint violations while preserving system availability and data integrity.

Do:
- **Freeze writes:** Enable maintenance mode to prevent new constraint violations
  ```sql
  UPDATE system_config SET maintenance_mode = true, reason = 'constraint_violation_repair';
  ```
- **Snapshot current state:** Backup affected data before remediation
  ```sql
  CREATE TABLE runs_violation_backup AS SELECT * FROM runs WHERE <violation_condition>;
  ```
- **Selective rebuild:** Rebuild only affected users/date ranges
  ```bash
  rebuild_user_runs --user-list=affected_users.txt --validate-constraints=true
  ```
- **Invariant check:** Verify all constraints satisfied post-repair
  ```sql
  SELECT COUNT(*) FROM runs r1 JOIN runs r2 ON r1.user_id = r2.user_id 
  WHERE r1.id != r2.id AND r1.span && r2.span; -- Should return 0
  ```
- **Thaw operations:** Re-enable writes after validation
  ```sql
  UPDATE system_config SET maintenance_mode = false;
  ```

Proof:
- All constraint violations resolved
- System invariants verified via health checks
- Affected users' data restored to consistent state
- Maintenance window duration <30 minutes

**Why:**  
Provides structured emergency response for constraint violations while minimizing system downtime 
and preventing data corruption spread.

### Playbook: Mid-Phase Error Handling Protocol

**Purpose:**  
Prevent runaway error handling loops and ensure human oversight when critical issues are encountered during phase execution.

**Agent Prompt:**  
Goal: Stop execution and seek guidance when critical errors prevent progress.

When to Apply:
- Missing endpoints or API routes (>2 endpoints not responding)
- TypeScript compilation errors (>3 blocking errors)
- Repeated server crashes (>2 crashes in succession)
- Unmet phase prerequisites (dependencies not satisfied)
- Infrastructure failures (database connectivity, feature flag issues)

Do:
1. **Stop execution immediately** - Do not continue attempting fixes
2. **Document findings** - Provide clear summary of errors encountered
3. **Assess impact** - Identify what was completed vs. what failed
4. **Recommend next steps** - Suggest specific actions or prerequisite phases
5. **Wait for user approval** - Do not resume until user provides direction

Proof:
- Clear summary of error conditions and their causes
- Specific recommendations for resolution
- Confirmation that execution has stopped pending user guidance

**Why:**  
Prevents wasted compute cycles, reduces frustration, and ensures critical issues receive appropriate human oversight before continuing.

### Playbook: Working with PostgreSQL Daterange Constraints

**Purpose:**  
Ensure smooth use and debugging of PostgreSQL `daterange` constraints (used in `runs.span`).

**Context:**  
The `runs` table uses a `span daterange` column with the constraint:

EXCLUDE USING gist (
  user_id WITH =,
  span WITH &&
) DEFERRABLE INITIALLY IMMEDIATE;

This enforces that a user cannot have overlapping runs. Helper columns (`start_date`, `end_date`) are generated from `span`.

**Agent Prompt:**  
When working with daterange constraints in the runs table:

1. Check for overlaps:
   SELECT a.id, b.id, a.user_id, a.span, b.span
   FROM runs a
   JOIN runs b ON a.user_id = b.user_id AND a.id < b.id
   WHERE a.span && b.span;

2. Debug constraint violations:  
   If an insert/update fails with "violates exclusion constraint", inspect spans:
   SELECT * FROM runs WHERE user_id = '<user-uuid>' ORDER BY start_date;

3. Remediation options:
   - Merge runs:
     UPDATE runs
     SET span = daterange(LEAST(lower(span), lower(:other)), GREATEST(upper(span), upper(:other)))
     WHERE id IN (:ids_to_merge);
     DELETE FROM runs WHERE id = :redundant_id;

   - Truncate run:
     UPDATE runs
     SET span = daterange(lower(span), DATE '2025-09-01')
     WHERE id = :id;

4. Verify integrity:
   SELECT COUNT(*) FROM (
     SELECT a.id
     FROM runs a
     JOIN runs b ON a.user_id = b.user_id AND a.id < b.id
     WHERE a.span && b.span
   ) q;
   -- Should return 0

5. Checklist:
   - All spans are non-overlapping
   - `day_count` matches span length (`upper - lower`)
   - `active` flag points to the current run only

Why:  
- `daterange + gist` is powerful but less familiar than basic columns  
- Prevents subtle data corruption (overlaps, misaligned runs)  
- Provides clear recovery steps if violations occur

### Session Kickoff Reminder
When preparing the daily prebrief:

1. **Check ADR ↔ Bug Journal Cross-Links**
   - For any ADR created in the last 7 days, confirm it is referenced by at least one bug journal entry (if triggered by an incident).
   - For any bug journal entries in the last 7 days, confirm they reference the ADR(s) that resolved or influenced them.
   - If cross-links are missing, add them immediately.

2. **Verify Cross-Link Consistency**
   - Bug journal entry must mention the ADR ID in *Follow-ups*.
   - ADR must reference the bug entry in *Context* or *Consequences*.

3. **Proof in Prebrief**
   - Explicitly state in the daily prebrief:  
     "Cross-links between ADRs and bug journal entries checked. ✅/⚠️"

**Why:**
- Ensures incident-driven ADRs are always traceable to their root cause
- Keeps decision history and bug history tightly aligned
- Reduces risk of repeated mistakes or lost context

### Server Validation Checklist

Before marking any server-related phase as complete (e.g., endpoint integration, cutover, migrations), confirm:
- Server binds to process.env.PORT (or fallback port) using app.listen()
- Server remains running (not exiting immediately)
- Feature flags load and log correctly at startup
- curl /health returns HTTP 200 with { healthy: true }
- Logs confirm "Server listening on port $PORT"
- lsof or ss shows process bound to the expected port

**Why:**
- Prevents silent failures where server logs success but exits
- Ensures Replit-compatible binding to dynamic $PORT
- Guarantees endpoints are actually reachable during validation