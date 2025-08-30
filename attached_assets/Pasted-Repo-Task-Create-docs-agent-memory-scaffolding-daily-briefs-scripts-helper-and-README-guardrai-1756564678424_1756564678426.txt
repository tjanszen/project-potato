Repo Task — Create /docs/agent_memory scaffolding, daily briefs scripts, helper, and README guardrails

CONSTRAINTS
- Do NOT modify runtime app features. Docs + scripts only.
- Keep everything small, dependency-free (Node standard library only).
- Make operations idempotent (re-running should not break anything).
- Use CommonJS (require/module.exports) for Node files.

DELIVERABLES
1) Create /docs/agent_memory/ with the files below, each pre-populated with concise, practical templates.
2) Add two Node scripts: `daily:prebrief` and `daily:postbrief` that read/write these files.
3) Add a helper function `buildTaskContext(prompt)` that returns ≤2000 chars of relevant snippets for any task.
4) Add a short “How we work” section to the repo root README.md.

DIRECTORY & FILES (CREATE EXACTLY)
- /docs/agent_memory/
  - decisions.adrs.md
  - features_overview.md
  - bugs_journal.md
  - glossary.md
  - playbooks.md
  - daily_briefs/            (directory; include empty .gitkeep)

FILE CONTENT TEMPLATES (WRITE THESE VERBATIM EXCEPT {{placeholders}})
Create or overwrite the following with these contents:

--- path: docs/agent_memory/decisions.adrs.md
# Architecture Decision Records (ADRs)
> Use for decisions that change architecture or business rules. Keep ≤20 lines each.

## ADR-{{YYYY-MM-DD}} <Decision Title>
**Context:** <why we had to decide>  
**Decision:** <what we chose>  
**Status:** Accepted | Superseded(by ADR-XXXX)  
**Consequences:** <trade-offs, risks>  
**Links:** <PRs, issues, docs>

--- path: docs/agent_memory/features_overview.md
# Features Overview
- Keep this short; link to code/PRs instead of restating details.

## Planned
- <FeatureName> — Flag: <FLAG_NAME> — Owner: <you> — Links: <PR/issue>

## In Progress
- <FeatureName> — Phase: <N> — Testable criteria: <1–2 bullets> — Links: <PR/branch>

## Live
- <FeatureName> — Flag: ON — Rollout: 10%→50%→100% complete — Links: <PR/release>

--- path: docs/agent_memory/bugs_journal.md
# Bugs Journal
### {{YYYY-MM-DD}} <Short Title>
**Symptom:**  
**Root Cause:**  
**Fix:**  
**Evidence:** <tests/logs/queries>  
**Follow-ups:** <action items, if any>

--- path: docs/agent_memory/glossary.md
# Glossary
### <Term (canonical)>
**Definition:** <1–2 lines>  
**Context:** <where used>  
**Example:** <short data example>  
**Related:** ADR-XXXX, Features Overview section, Playbook

--- path: docs/agent_memory/playbooks.md
# Playbooks (Agent-Ready Prompts)

## Deploy (Flagged Release)
**Use when:** shipping behind a feature flag.  
**Agent Prompt:**
