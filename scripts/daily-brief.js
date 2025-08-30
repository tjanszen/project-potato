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
  
  const template = `# Daily Post-Brief - ${date}

## Completed Today
- [ ] <Task 1>
- [ ] <Task 2>

## Decisions Made
<Link to any ADRs created>

## Issues Found
<Link to any bugs logged>

## Tomorrow's Plan
- [ ] <Next task>
- [ ] <Next task>

## Knowledge Updates
**Updated files:**
- docs/agent_memory/features_overview.md
- docs/agent_memory/decisions.adrs.md
- docs/agent_memory/bugs_journal.md

## Notes
<Any important context for next session>
`;

  fs.writeFileSync(briefFile, template, 'utf8');
  console.log(`Created post-brief: ${briefFile}`);
}

// Export functions for reuse
module.exports = {
  buildTaskContext,
  prebrief,
  postbrief,
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