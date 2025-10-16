/**
 * Update Mission Validators Script
 * Adds proper outputCheck validators to all tasks
 */

const fs = require('fs');

// Read the current JSON
const jsonPath = './public/stories/hack_mainframe.json';
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// Validation assignments for each task
const validators = {
  // Mission 1
  'task_1_1': { outputCheck: 'contains', outputCheckParams: ['PROJECT_ALPHA', 'GHOST'] },
  'task_1_2': { outputCheck: 'dirExists', outputCheckParams: '/home/student/temp_exfil' },
  
  // Mission 2
  'task_2_1': { outputCheck: 'sudoExecuted', outputCheckParams: null },
  'task_2_2': { outputCheck: 'contains', outputCheckParams: 'SECURITY_TOKEN' },
  
  // Mission 3
  'task_3_1': { outputCheck: 'contains', outputCheckParams: '/home/student' },
  'task_3_2': { outputCheck: 'contains', outputCheckParams: 'projects' },
  'task_3_3': { outputCheck: 'contains', outputCheckParams: '/home/student/projects' },
  
  // Mission 4
  'task_4_1': { outputCheck: 'contains', outputCheckParams: 'SECRET_KEY' },
  'task_4_2': { outputCheck: 'contains', outputCheckParams: 'CONNECTION' },
  
  // Mission 5
  'task_5_1': { outputCheck: 'grepFound', outputCheckParams: null },
  'task_5_2': { outputCheck: 'contains', outputCheckParams: 'omega-corp.com' },
  
  // Mission 6
  'task_6_1': { outputCheck: 'contains', outputCheckParams: 'project_alpha.txt' },
  'task_6_2': { outputCheck: 'contains', outputCheckParams: '.log' },
  
  // Mission 7
  'task_7_1': { outputCheck: 'dirExists', outputCheckParams: '/home/student/temp_exfil' },
  'task_7_2': { outputCheck: 'fileDeleted', outputCheckParams: '/home/student/old_temp' },
  'task_7_3': { 
    outputCheck: 'fileCopied', 
    outputCheckParams: {
      source: '/home/student/projects/project_alpha.txt',
      dest: '/home/student/temp_exfil/project_alpha.txt'
    }
  },
  'task_7_4': { outputCheck: 'fileExists', outputCheckParams: '/home/student/projects/network_analysis.txt' },
  'task_7_5': { outputCheck: 'fileDeleted', outputCheckParams: '/home/student/projects/old_project_beta.txt' },
  
  // Mission 8
  'task_8_1': { outputCheck: 'fileExists', outputCheckParams: '/home/student/temp_exfil/exfil_log.txt' },
  
  // Mission 9
  'task_9_1': { outputCheck: 'contains', outputCheckParams: 'CONNECTION' },
  'task_9_2': { outputCheck: 'lineCount', outputCheckParams: { max: 15 } },
  'task_9_3': { outputCheck: 'lineCount', outputCheckParams: { min: 15 } },
  
  // Mission 10
  'task_10_1': { outputCheck: 'pingSuccess', outputCheckParams: null },
  'task_10_2': { outputCheck: 'httpSuccess', outputCheckParams: null },
  'task_10_3': { outputCheck: 'fileExists', outputCheckParams: '/home/student/briefing.txt' },
  
  // Mission 11
  'task_11_1': { outputCheck: 'netstatListening', outputCheckParams: null },
  'task_11_2': { outputCheck: 'digResolved', outputCheckParams: null },
  'task_11_3': { outputCheck: 'containsIP', outputCheckParams: null },
  
  // Mission 12
  'task_12_1': { outputCheck: 'sshConnected', outputCheckParams: null },
  'task_12_2': { 
    outputCheck: 'remoteFileExists', 
    outputCheckParams: {
      user: 'omega_agent',
      path: '/home/omega/incoming/exfil_log.txt'
    }
  },
  
  // Mission 13
  'task_13_1': { 
    outputCheck: 'fileContains', 
    outputCheckParams: {
      path: '/home/student/temp_exfil/exfil_log.txt',
      text: 'Mission Success'
    }
  },
  'task_13_2': { 
    outputCheck: 'fileContains', 
    outputCheckParams: {
      path: '/home/student/temp_exfil/exfil_log.txt',
      text: 'USER='
    }
  },
  'task_13_3': { 
    outputCheck: 'fileContains', 
    outputCheckParams: {
      path: '/home/student/temp_exfil/exfil_log.txt',
      text: ['Mission Success', 'USER=']
    }
  },
  
  // Mission 14
  'task_14_1': { 
    outputCheck: 'fileContains', 
    outputCheckParams: {
      path: '/home/student/temp_exfil/exfil_log.txt',
      text: 'Agent'
    }
  },
  
  // Mission 15
  'task_15_1': { outputCheck: 'fileDeleted', outputCheckParams: '/home/student/temp_exfil' },
  
  // Mission 16
  'task_16_1': { 
    outputCheck: 'remoteFileExists', 
    outputCheckParams: {
      user: 'omega_agent',
      path: '/home/omega/incoming/exfil_log.txt'
    }
  },
  'task_16_2': { outputCheck: 'fileDeleted', outputCheckParams: '/home/student/temp_exfil' },
};

// Apply validators to tasks
data.missions.forEach(mission => {
  mission.tasks.forEach(task => {
    if (validators[task.id]) {
      // Update or add validation fields
      if (!task.validation) {
        task.validation = {};
      }
      task.validation.outputCheck = validators[task.id].outputCheck;
      task.validation.outputCheckParams = validators[task.id].outputCheckParams;
      console.log(`✅ Updated ${task.id}: ${validators[task.id].outputCheck}`);
    } else {
      console.log(`⚠️  No validator defined for ${task.id}`);
    }
  });
});

// Write back to file
fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
console.log('\n✅ Mission JSON updated with validators!');
console.log(`Total tasks updated: ${Object.keys(validators).length}`);
