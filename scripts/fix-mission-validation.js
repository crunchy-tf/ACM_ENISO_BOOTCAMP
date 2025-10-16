#!/usr/bin/env node
/**
 * Fix Mission Validation Structure
 * Converts nested validation objects to flat structure expected by TypeScript
 */

const fs = require('fs');
const path = require('path');

const missionFile = path.join(__dirname, '../public/stories/hack_mainframe.json');

console.log('🔧 Fixing mission validation structure...\n');

// Read the mission file
const data = JSON.parse(fs.readFileSync(missionFile, 'utf8'));

let fixCount = 0;
let totalTasks = 0;

// Process each mission
data.missions.forEach((mission, mIdx) => {
  console.log(`\n📋 Mission ${mIdx + 1}: ${mission.title}`);
  
  mission.tasks.forEach((task, tIdx) => {
    totalTasks++;
    
    // Check if task has nested validation object
    if (task.validation) {
      fixCount++;
      console.log(`  ✏️  Fixing task ${tIdx + 1}: ${task.id}`);
      console.log(`     Before: validation = ${JSON.stringify(task.validation)}`);
      
      const validation = task.validation;
      
      // Map nested fields to flat structure
      if (validation.pattern) {
        task.outputPattern = validation.pattern;
      }
      
      if (validation.outputCheck || validation.check) {
        task.outputCheck = validation.outputCheck || validation.check;
      }
      
      if (validation.outputCheckParams !== undefined) {
        task.outputCheckParams = validation.outputCheckParams;
      }
      
      // Handle requireOutput
      if (validation.requireOutput !== undefined) {
        task.requireOutput = validation.requireOutput;
      }
      
      // Remove the nested validation object
      delete task.validation;
      
      console.log(`     After: outputPattern="${task.outputPattern || 'none'}", outputCheck="${task.outputCheck || 'none'}"`);
    }
  });
});

console.log(`\n\n✅ Fixed ${fixCount} out of ${totalTasks} tasks`);

// Write back to file
fs.writeFileSync(missionFile, JSON.stringify(data, null, 2), 'utf8');
console.log(`\n💾 Saved to: ${missionFile}`);
console.log('\n🎉 Validation fix complete!\n');
