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