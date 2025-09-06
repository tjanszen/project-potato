# Glossary

### Feature Flag
**Definition:** Toggle mechanism to enable/disable functionality without code deployment  
**Context:** All app features gated behind ff.potato.no_drink_v1 flag  
**Example:** `ff.potato.no_drink_v1: { enabled: false }`  
**Related:** ADR-2025-08-30 Feature Flag Gating, server/feature-flags.ts

### Day Mark
**Definition:** Boolean record indicating user marked a specific date as "No Drink"  
**Context:** Primary business entity stored in day_marks table  
**Example:** `{ user_id: "uuid", date: "2025-08-30", value: true }`  
**Related:** Phase 0 schema, dual-table pattern

### Click Event
**Definition:** Immutable audit log entry for every user day-marking action  
**Context:** Append-only table for debugging and future analytics  
**Example:** `{ user_id: "uuid", date: "2025-08-30", user_timezone: "America/New_York" }`  
**Related:** ADR-2025-08-30 Dual-Table Pattern

### Phase-Gated Development
**Definition:** Incremental delivery approach with explicit approval gates between phases  
**Context:** Project development methodology requiring user approval before phase transitions  
**Example:** Phase 0 (Foundation) → Phase 1 (Auth) → Phase 2 (API)  
**Related:** Features Overview, project planning

### Timezone-Aware Date
**Definition:** Date calculation that considers user's local timezone for "today" determination  
**Context:** Critical for accurate day boundary calculations across global users  
**Example:** 2025-08-30 23:59 PST = 2025-08-31 02:59 EST  
**Related:** ADR-2025-08-30 Timezone Handling, users.timezone field

### Run
**Definition:** Sequence of consecutive calendar days where user marked "No Drink"  
**Context:** Primary business entity for V2 tracking consecutive habit completion  
**Example:** `{start_date: "2025-06-15", end_date: "2025-06-18", day_count: 4, active: true}`  
**Related:** V2 runs table, run calculation algorithm

### Active Run
**Definition:** Current ongoing run that user can extend by marking consecutive days  
**Context:** Only one active run allowed per user, end_date equals most recent check-in  
**Example:** User's current 5-day run from June 15-19 with active=true flag  
**Related:** Database constraint UNIQUE(user_id) WHERE active = true

### Day Count
**Definition:** Total number of calendar days in a run (end_date - start_date + 1)  
**Context:** Must match actual date range; enforced by database CHECK constraint  
**Example:** Run from June 15 to June 18 has day_count = 4  
**Related:** Data invariant validation, run accuracy requirements

### Rebuild
**Definition:** Administrative operation to reconstruct runs from authoritative day_marks data  
**Context:** Used for data recovery, algorithm updates, and timezone migrations  
**Example:** `rebuild_user_runs(user_id)` deletes existing runs and recalculates from day_marks  
**Related:** Deterministic algorithm, operator playbooks, data consistency

### Shadow
**Definition:** Parallel computation of V2 runs alongside legacy system for validation  
**Context:** Enables production cutover validation without affecting user experience  
**Example:** Shadow mode computes runs_v2 data while users continue using legacy system  
**Related:** Zero-diff requirement, cutover validation, production safety