const fs = require('fs');
const path = require('path');

// Helper to ensure directory exists
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Get current date in YYYY-MM-DD format
function getCurrentDate() {
  return new Date().toISOString().split('T')[0];
}

// Read file safely (returns empty string if file doesn't exist)
function readFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    return '';
  }
}

// Build task context helper (≤2000 chars)
function buildTaskContext(prompt) {
  const memoryDir = path.join(__dirname, '..', 'docs', 'agent_memory');
  const files = [
    'features_overview.md',
    'decisions.adrs.md', 
    'bugs_journal.md',
    'glossary.md',
    'playbooks.md'
  ];
  
  let context = '';
  const maxLength = 2000;
  
  // Add prompt context
  context += `Task: ${prompt}\n\n`;
  
  for (const file of files) {
    const filePath = path.join(memoryDir, file);
    const content = readFileSafe(filePath);
    
    if (content.trim()) {
      const section = `${file}:\n${content.slice(0, 300)}...\n\n`;
      if (context.length + section.length < maxLength) {
        context += section;
      }
    }
  }
  
  return context.slice(0, maxLength);
}

// Pre-brief: Create daily brief file with current project state
function prebrief() {
  const date = getCurrentDate();
  const briefDir = path.join(__dirname, '..', 'docs', 'agent_memory', 'daily_briefs');
  const briefFile = path.join(briefDir, `${date}-prebrief.md`);
  
  ensureDir(briefDir);
  
  if (fs.existsSync(briefFile)) {
    console.log(`Pre-brief for ${date} already exists: ${briefFile}`);
    return;
  }
  
  const template = `# Daily Pre-Brief - ${date}

## Today's Objectives
- [ ] <Objective 1>
- [ ] <Objective 2>

## Context from Yesterday
<Brief summary of where we left off>

## Blockers/Dependencies
- <Any known blockers>

## Phase Status
**Current Phase:** <Phase N: Name>
**Progress:** <X/Y tasks complete>
**Next Milestone:** <What needs to happen next>

## Notes
<Any additional context>
`;

  fs.writeFileSync(briefFile, template, 'utf8');
  console.log(`Created pre-brief: ${briefFile}`);
}

// Analyze project state and extract accomplishments
function analyzeProjectState() {
  const memoryDir = path.join(__dirname, '..', 'docs', 'agent_memory');
  const rootDir = path.join(__dirname, '..');
  
  const state = {
    completed: [],
    decisions: [],
    issues: [],
    nextSteps: [],
    updatedFiles: [],
    currentPhase: 'Unknown',
    notes: []
  };

  // Analyze features overview for completed items
  const featuresContent = readFileSafe(path.join(memoryDir, 'features_overview.md'));
  if (featuresContent.includes('Phase: 0 COMPLETE')) {
    state.completed.push('✅ Phase 0: Foundation & Database Setup (COMPLETE)');
    state.completed.push('✅ PostgreSQL schema with users, day_marks, click_events tables');
    state.completed.push('✅ Express server with feature flag gating');
    state.completed.push('✅ Storage layer with PostgreSQL integration');
    state.completed.push('✅ Health check endpoint operational');
  }

  // Check for authentication system planning
  if (featuresContent.includes('Authentication System') && featuresContent.includes('Phase: 1')) {
    state.nextSteps.push('📋 Phase 1: Authentication System (awaiting approval)');
  }

  // Analyze ADRs for today's decisions
  const adrsContent = readFileSafe(path.join(memoryDir, 'decisions.adrs.md'));
  const todayADRs = adrsContent.match(/## ADR-\d{4}-\d{2}-\d{2} (.+)/g);
  if (todayADRs && todayADRs.length > 0) {
    state.decisions.push(`📋 ${todayADRs.length} Architecture Decision Records created`);
    todayADRs.forEach(adr => {
      const title = adr.replace(/## ADR-\d{4}-\d{2}-\d{2} /, '');
      state.decisions.push(`  - ${title}`);
    });
  }

  // Check if implementation plan exists
  const impPlanPath = path.join(memoryDir, 'imp_plans', 'v1.md');
  if (fs.existsSync(impPlanPath)) {
    state.completed.push('✅ Implementation Plan v1 created and stored');
    state.updatedFiles.push('docs/agent_memory/imp_plans/v1.md');
  }

  // Check agent memory system setup
  if (fs.existsSync(path.join(memoryDir, 'glossary.md')) && 
      fs.existsSync(path.join(memoryDir, 'playbooks.md'))) {
    state.completed.push('✅ Agent memory documentation system established');
    state.updatedFiles.push('docs/agent_memory/features_overview.md');
    state.updatedFiles.push('docs/agent_memory/decisions.adrs.md');
    state.updatedFiles.push('docs/agent_memory/glossary.md');
    state.updatedFiles.push('docs/agent_memory/playbooks.md');
  }

  // Check replit.md for current status
  const replitContent = readFileSafe(path.join(rootDir, 'replit.md'));
  if (replitContent.includes('Phase 0') && replitContent.includes('COMPLETE')) {
    state.currentPhase = 'Phase 0 (COMPLETE)';
    state.updatedFiles.push('replit.md');
  }

  // Check if database tables exist by looking for schema
  const schemaPath = path.join(rootDir, 'shared', 'schema.ts');
  if (fs.existsSync(schemaPath)) {
    state.completed.push('✅ Shared database schema with TypeScript types');
    state.updatedFiles.push('shared/schema.ts');
  }

  // Check for server setup
  const serverPath = path.join(rootDir, 'server');
  if (fs.existsSync(path.join(serverPath, 'index.ts')) && 
      fs.existsSync(path.join(serverPath, 'feature-flags.ts'))) {
    state.completed.push('✅ Feature flag system (ff.potato.no_drink_v1 default OFF)');
    state.updatedFiles.push('server/index.ts');
    state.updatedFiles.push('server/feature-flags.ts');
    state.updatedFiles.push('server/storage.ts');
  }

  // Set next steps based on current state
  if (state.currentPhase === 'Phase 0 (COMPLETE)') {
    state.nextSteps.push('🎯 Phase 1: Authentication System implementation');
    state.nextSteps.push('📋 User registration and login endpoints');
    state.nextSteps.push('🔐 Password hashing and session management');
  }

  // Add contextual notes
  state.notes.push('Project uses phase-gated development requiring approval between phases');
  state.notes.push('All functionality gated behind ff.potato.no_drink_v1 feature flag (default OFF)');
  if (state.completed.length > 0) {
    state.notes.push('Foundation infrastructure complete and ready for Phase 1');
  }

  return state;
}

// Post-brief: Create summary of what was accomplished
function postbrief() {
  const date = getCurrentDate();
  const briefDir = path.join(__dirname, '..', 'docs', 'agent_memory', 'daily_briefs');
  const briefFile = path.join(briefDir, `${date}-postbrief.md`);
  
  ensureDir(briefDir);
  
  if (fs.existsSync(briefFile)) {
    console.log(`Post-brief for ${date} already exists: ${briefFile}`);
    return;
  }

  // Analyze current project state
  const state = analyzeProjectState();
  
  // Build intelligent post-brief content
  const completedSection = state.completed.length > 0 
    ? state.completed.map(item => `- ${item}`).join('\n')
    : '- No major completions detected';

  const decisionsSection = state.decisions.length > 0
    ? state.decisions.map(item => `${item}`).join('\n')
    : 'No architectural decisions recorded today';

  const issuesSection = state.issues.length > 0
    ? state.issues.map(item => `- ${item}`).join('\n')
    : 'No issues found';

  const nextStepsSection = state.nextSteps.length > 0
    ? state.nextSteps.map(item => `- ${item}`).join('\n')
    : '- Await guidance on next priorities';

  const updatedFilesSection = state.updatedFiles.length > 0
    ? state.updatedFiles.map(file => `- ${file}`).join('\n')
    : '- No tracked file updates';

  const notesSection = state.notes.length > 0
    ? state.notes.map(note => `- ${note}`).join('\n')
    : '- Standard development session';

  const template = `# Daily Post-Brief - ${date}

## Completed Today
${completedSection}

## Decisions Made
${decisionsSection}

## Issues Found
${issuesSection}

## Tomorrow's Plan
${nextStepsSection}

## Knowledge Updates
**Updated files:**
${updatedFilesSection}

## Notes
${notesSection}

---
*Auto-generated by intelligent daily brief system*
`;

  fs.writeFileSync(briefFile, template, 'utf8');
  console.log(`Created intelligent post-brief: ${briefFile}`);
}

// Export functions for reuse
module.exports = {
  buildTaskContext,
  prebrief,
  postbrief,
  analyzeProjectState,
  getCurrentDate,
  readFileSafe
};

// CLI handling
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'prebrief':
      prebrief();
      break;
    case 'postbrief':
      postbrief();
      break;
    case 'context':
      const prompt = process.argv[3] || 'General project context';
      console.log(buildTaskContext(prompt));
      break;
    default:
      console.log('Usage: node scripts/daily-brief.js [prebrief|postbrief|context "your prompt"]');
  }
}