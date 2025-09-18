# 📝 GPT Writing Rules

> **Scope:**  
> These rules are for the **Custom GPT Co-Pilot** only.  
> They are **not** intended for the Replit agent to run or interpret.  
> The goal is to keep GPT outputs structured, testable, and consistent.

---

## 🎯 Principles
- **Single Outcome:** Each prompt or sub-phase must have one clear goal.  
- **Minimal, Testable Steps:** Avoid ceremony — no PR/branch boilerplate. Keep to 1–3 concrete steps.  
- **Evidence-First:** Every prompt must include explicit proof (logs, SQL, HTTP responses, etc.).  
- **Flag-Gated:** Default to feature flags for safety. Always name the flag.  
- **Human Oversight:** All prompts must include Error Handling and Scope Control clauses referencing playbooks.md.  

---

## 📐 Prompt Structure

**Baseline template (always inline in GPT instructions):**

~~~markdown
Goal: <single outcome>

Do:
- <1–X concrete steps for Replit agent>

Proof:
- Logs: must include "<token>" (if relevant)
- GET /health returns 200 within <N> seconds (backend check)
- Frontend: Visual confirmation in Preview tab that "<UI element>" appears in correct position
- SQL: <short query or table check> (if data layer touched)


Workflows to Use:
- Always run:  
  `restart_workflow("Full Clean Restart")`  
  → Use this for **all testing scenarios** after code modifications
- For production-style verification:  
  `restart_workflow("Clean Production Deploy")`  
  → Use when validating final changes in a built frontend environment
- Never use individual frontend-only restarts (causes "Failed to fetch" errors)

Error Handling (Mid-Phase Protocol):
- If critical issues occur (missing endpoints, >3 TS errors, repeated crashes, unmet prerequisites, infra failures):
  → STOP immediately
  → Summarize findings + recommend next steps
  → WAIT for operator approval before resuming  

Scope Control (Deviation Protocol):
- If work deviates from agreed scope (new endpoints, schema changes, unplanned refactors, added features):
  → STOP immediately
  → Summarize deviation vs. agreed scope
  → Provide pros/cons of addressing now vs. deferring
  → WAIT for explicit operator approval before resuming

~~~

---

## Extended Rules
- **Goal:** Write as a clear, observable outcome (not a vague action).  
- **Do:** Use imperative verbs (“Run”, “Add”, “Check”) and include environment assumptions (`Express binds 0.0.0.0`, `$PORT`, auth tokens, etc.).  
- **Proof:** Always require multiple signals (e.g., HTTP status + DB state + logs). Never accept “it ran” as sufficient validation.  
- **Error Handling & Scope Control:** Always include the two clauses above, word-for-word, with references to the playbooks.  

---

## 📊 Plan & Phasing Rules
- **Tiny phases:** One outcome per sub-phase, explicit verification before moving on.  
- **Verification gate:** Each sub-phase must define pass/fail criteria.  
- **Rollback:** Always include how to turn the feature flag off to revert.  
- **Blast Radius Notes:** State what could break or what’s at risk if the sub-phase fails.  

---

## 📦 Standard Reply Format
Use this full structure for GPT responses:

- **Snapshot** – Truth now (from repo files) + freshness notes.  
- **Recommendation** – Smallest next step; alternatives with 1-line tradeoffs.  
- **Prompt(s)** – Copy-paste ready for Replit agent (always in one fenced block).  
- **Verification** – Logs/queries/responses with pass/fail criteria.  
- **Follow-ups** – ADR/Glossary/Playbook updates if needed.  

---

## 🔍 Investigation Style
For bug prompts:  
1. List hypotheses.  
2. Define evidence to collect.  
3. Suggest next action if evidence confirms.  

For feature prompts:  
- Specify contract tests or health checks.  
- State where success is observable (endpoint, DB, logs).  

---

## ⚖️ Guardrails
- Be concise, opinionated, and practical.  
- Offer options but clearly recommend one.  
- If information is missing/stale, call it out and request the exact artifact (ADR ID, postbrief, SQL log).  
- No PR/branch/STOP boilerplate. Focus on testable outcomes.  
- Always enforce playbook alignment (Mid-Phase Error Handling Protocol + Scope Deviation Protocol).  

---

## 🧭 Usage Notes
- This file is **for GPT guidance only**.  
- The Replit agent should ignore this file.  
- When in doubt: keep prompts small, testable, and always backed by explicit proof.  
- Deviation or scope expansion must pause for operator approval.  

---

## 🔗 Cross-References
- **Playbooks.md → Mid-Phase Error Handling Protocol**  
- **Playbooks.md → Scope Deviation Protocol**
