# Potato No Drink Tracker

Simple habit tracking web application for marking calendar days as "No Drink". Built with React, Express, and PostgreSQL.

## How We Work

This project maintains institutional knowledge in `/docs/agent_memory/` to ensure continuity across development sessions.

### Documentation Structure
- **decisions.adrs.md** - Architecture Decision Records for major choices
- **features_overview.md** - Current feature status (Planned → In Progress → Live)
- **bugs_journal.md** - Bug tracking with root cause analysis
- **glossary.md** - Project terminology and concepts
- **playbooks.md** - Agent-ready prompts for common tasks
- **daily_briefs/** - Daily session planning and summaries

### Daily Workflow
```bash
# Start of day - create planning brief
node scripts/daily-brief.js prebrief

# Get context for any task
node scripts/daily-brief.js context "your task description"

# End of day - summarize accomplishments
node scripts/daily-brief.js postbrief
```

### Development Rules
- All features ship behind feature flags (default OFF)
- Phase-gated development with clear exit criteria
- Document decisions in ADRs before implementation
- Update feature overview as work progresses
- Log bugs with evidence and follow-up actions

## Getting Started

1. Install dependencies: `npm install`
2. Set up environment: Copy `.env.example` to `.env` and configure
3. Run development server: `npm run dev`
4. Health check: Visit `/health` endpoint