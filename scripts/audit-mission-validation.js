#!/usr/bin/env node
/**
 * Audit Mission Validation
 * Checks that all tasks have proper validation criteria
 */

const fs = require('fs');
const path = require('path');

const missionFile = path.join(__dirname, '../public/stories/hack_mainframe.json');

console.log('🔍 Auditing mission validation...\n');

const data = JSON.parse(fs.readFileSync(missionFile, 'utf8'));

let totalTasks = 0;
let tasksWithValidation = 0;
let tasksWithMultipleValidation = 0;
let tasksWithoutValidation = 0;
const issuesFound = [];

data.missions.forEach((mission, mIdx) => {
  console.log(`\n📋 Mission ${mIdx + 1}: ${mission.title}`);
  
  mission.tasks.forEach((task, tIdx) => {
    totalTasks++;
    
    const validations = {
      outputPattern: !!task.outputPattern,
      outputCheck: !!task.outputCheck,
      requireOutput: !!task.requireOutput,
      checkCompletion: !!task.checkCompletion
    };
    
    const validationCount = Object.values(validations).filter(Boolean).length;
    
    if (validationCount === 0) {
      tasksWithoutValidation++;
      issuesFound.push({
        mission: mission.id,
        task: task.id,
        issue: '❌ NO VALIDATION - Task will always fail'
      });
      console.log(`  ❌ Task ${tIdx + 1} (${task.id}): NO VALIDATION CRITERIA!`);
    } else if (validationCount === 1) {
      tasksWithValidation++;
      const validationType = Object.keys(validations).find(k => validations[k]);
      console.log(`  ✅ Task ${tIdx + 1} (${task.id}): ${validationType}`);
    } else {
      tasksWithMultipleValidation++;
      const validationTypes = Object.keys(validations).filter(k => validations[k]);
      console.log(`  ✅ Task ${tIdx + 1} (${task.id}): ${validationTypes.join(' + ')}`);
    }
    
    // Validate outputCheck exists in validators
    if (task.outputCheck) {
      // List of all known validators
      const knownValidators = [
        'contains', 'notEmpty', 'isEmpty', 'hasError', 'noError',
        'grepFound', 'validPath', 'validFlag', 'lineCount', 'wordCount',
        'sudoExecuted', 'sudoPasswordPrompt',
        'sshConnected', 'sshFailed', 'scpSuccess', 'scpToRemote', 'scpFromRemote',
        'envVarSet', 'envVarExported', 'validEnvOutput',
        'redirectionSuccess', 'heredocCaptured',
        'pingSuccess', 'pingFailed', 'httpSuccess',
        'netstatListening', 'digResolved', 'containsIP',
        // Filesystem validators
        'fileExists', 'fileNotExists', 'fileContains', 'fileNotContains',
        'dirExists', 'dirNotExists', 'fileCopied', 'fileMoved', 'fileDeleted',
        // Advanced validators
        'commandExecuted', 'remoteFileExists', 'sshSessionActive', 'multiCondition'
      ];
      
      if (!knownValidators.includes(task.outputCheck)) {
        issuesFound.push({
          mission: mission.id,
          task: task.id,
          issue: `⚠️  Unknown validator: ${task.outputCheck}`
        });
        console.log(`     ⚠️  WARNING: Unknown validator "${task.outputCheck}"`);
      }
    }
  });
});

console.log(`\n\n📊 VALIDATION AUDIT SUMMARY`);
console.log(`════════════════════════════════`);
console.log(`Total tasks: ${totalTasks}`);
console.log(`✅ Tasks with single validation: ${tasksWithValidation}`);
console.log(`✅ Tasks with multiple validations (AND logic): ${tasksWithMultipleValidation}`);
console.log(`❌ Tasks without validation: ${tasksWithoutValidation}`);

if (issuesFound.length > 0) {
  console.log(`\n\n⚠️  ISSUES FOUND: ${issuesFound.length}`);
  console.log(`════════════════════════════════`);
  issuesFound.forEach(issue => {
    console.log(`\n${issue.mission} -> ${issue.task}`);
    console.log(`   ${issue.issue}`);
  });
  
  console.log('\n\n❌ Validation audit FAILED - fix issues above');
  process.exit(1);
} else {
  console.log(`\n\n✅ All tasks have proper validation!`);
  console.log(`\n🎉 Validation audit PASSED!`);
}
