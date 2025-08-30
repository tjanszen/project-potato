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