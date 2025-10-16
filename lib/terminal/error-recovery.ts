/**
 * Error Recovery System
 * Provides contextual error messages with suggestions and fixes
 */

export interface ErrorSuggestion {
  error: string
  reason: string
  suggestions: string[]
  learnMore?: string
  severity: 'info' | 'warning' | 'error' | 'critical'
}

/**
 * Common error patterns and their solutions
 */
const ERROR_PATTERNS: Array<{
  pattern: RegExp
  getSuggestion: (match: RegExpMatchArray, command?: string) => ErrorSuggestion
}> = [
  // Permission denied
  {
    pattern: /permission denied/i,
    getSuggestion: (match, command) => ({
      error: 'Permission Denied',
      reason: 'You don\'t have permission to access this resource.',
      suggestions: [
        'Try using sudo: sudo ' + (command || '<command>'),
        'Check file permissions with: ls -l <file>',
        'Verify you are the owner: stat <file>',
      ],
      learnMore: 'Use "sudo" to run commands with elevated privileges. The password is P@ssw0rd!',
      severity: 'error',
    }),
  },

  // File not found
  {
    pattern: /no such file or directory/i,
    getSuggestion: (match, command) => ({
      error: 'File Not Found',
      reason: 'The file or directory does not exist.',
      suggestions: [
        'Check if the path is correct',
        'Use pwd to see current directory',
        'List files with: ls',
        'Search for the file: find / -name "<filename>"',
      ],
      severity: 'error',
    }),
  },

  // Command not found
  {
    pattern: /command not found/i,
    getSuggestion: (match, command) => {
      const cmdMatch = command?.match(/^(\w+)/)
      const cmd = cmdMatch ? cmdMatch[1] : ''
      
      const commonTypos: Record<string, string> = {
        'cta': 'cat',
        'sl': 'ls',
        'cd..': 'cd ..',
        'gerp': 'grep',
        'mkidr': 'mkdir',
        'thouch': 'touch',
        'sudp': 'sudo',
        'shh': 'ssh',
        'pign': 'ping',
      }
      
      const suggestions = ['Check if the command is spelled correctly']
      if (commonTypos[cmd]) {
        suggestions.unshift(`Did you mean: ${commonTypos[cmd]}?`)
      }
      suggestions.push('Use "help" to see available commands')
      suggestions.push('Try searching: type -a ' + cmd)
      
      return {
        error: 'Command Not Found',
        reason: `The command "${cmd}" is not recognized.`,
        suggestions,
        severity: 'error',
      }
    },
  },

  // Directory not empty
  {
    pattern: /directory not empty/i,
    getSuggestion: (match, command) => ({
      error: 'Directory Not Empty',
      reason: 'Cannot remove directory because it contains files.',
      suggestions: [
        'List contents: ls -la <directory>',
        'Remove contents first: rm -r <directory>/*',
        'Or use rm -r to remove recursively (CAUTION)',
      ],
      learnMore: 'rmdir only works on empty directories. Use rm -r for directories with contents.',
      severity: 'warning',
    }),
  },

  // Is a directory
  {
    pattern: /is a directory/i,
    getSuggestion: (match, command) => ({
      error: 'Is a Directory',
      reason: 'This operation requires a file, but a directory was given.',
      suggestions: [
        'Use cd to navigate into the directory',
        'Use ls to list directory contents',
        'Use rm -r to remove directories',
      ],
      severity: 'error',
    }),
  },

  // Operation not permitted
  {
    pattern: /operation not permitted/i,
    getSuggestion: (match, command) => ({
      error: 'Operation Not Permitted',
      reason: 'This operation requires root privileges or is restricted.',
      suggestions: [
        'Try with sudo: sudo ' + (command || '<command>'),
        'Check if file is read-only: ls -l <file>',
        'Verify system policy allows this operation',
      ],
      severity: 'error',
    }),
  },

  // File exists
  {
    pattern: /file exists/i,
    getSuggestion: (match, command) => ({
      error: 'File Already Exists',
      reason: 'A file with this name already exists.',
      suggestions: [
        'Choose a different name',
        'Remove existing file: rm <file>',
        'Use mv -f to force overwrite (CAUTION)',
        'Backup first: cp <file> <file>.backup',
      ],
      severity: 'warning',
    }),
  },

  // Invalid argument
  {
    pattern: /invalid (argument|option)/i,
    getSuggestion: (match, command) => ({
      error: 'Invalid Argument',
      reason: 'The command syntax is incorrect or unsupported.',
      suggestions: [
        'Check command syntax: <command> --help',
        'Verify flag spellings',
        'Common flags: -l (long), -a (all), -r (recursive)',
      ],
      severity: 'error',
    }),
  },

  // Network errors
  {
    pattern: /network unreachable|connection refused|no route to host/i,
    getSuggestion: (match, command) => ({
      error: 'Network Error',
      reason: 'Cannot reach the remote host.',
      suggestions: [
        'Check if host is correct',
        'Verify network connection with: ping <host>',
        'Check DNS resolution: nslookup <host>',
        'For local testing, use: ping localhost',
      ],
      learnMore: 'Some hosts may be unreachable or not exist in this simulation.',
      severity: 'error',
    }),
  },

  // SSH errors
  {
    pattern: /host key verification failed/i,
    getSuggestion: (match, command) => ({
      error: 'SSH Host Key Verification Failed',
      reason: 'The remote host key has changed or is unknown.',
      suggestions: [
        'For first connection, accept the host key',
        'Remove old key: ssh-keygen -R <host>',
        'Use -o StrictHostKeyChecking=no (CAUTION: Security risk)',
      ],
      severity: 'warning',
    }),
  },

  // Grep no match
  {
    pattern: /no matches found|no such file/i,
    getSuggestion: (match, command) => {
      const isGrep = command?.includes('grep')
      if (isGrep) {
        return {
          error: 'No Matches Found',
          reason: 'grep didn\'t find the search pattern.',
          suggestions: [
            'Check if pattern is correct',
            'Use -i for case-insensitive search',
            'Try broader pattern with wildcards',
            'Verify file contains the text: cat <file>',
          ],
          severity: 'info',
        }
      }
      return {
        error: 'No Results',
        reason: 'The operation produced no results.',
        suggestions: ['Verify input parameters', 'Check if resource exists'],
        severity: 'info',
      }
    },
  },

  // Disk space (simulated)
  {
    pattern: /no space left|disk full/i,
    getSuggestion: (match, command) => ({
      error: 'No Space Left',
      reason: 'The filesystem is full.',
      suggestions: [
        'Check disk usage: df -h',
        'Find large files: du -sh /* | sort -h',
        'Remove unnecessary files: rm <file>',
        'Clear temporary files: rm /tmp/*',
      ],
      severity: 'critical',
    }),
  },

  // Syntax errors
  {
    pattern: /syntax error|unexpected token/i,
    getSuggestion: (match, command) => ({
      error: 'Syntax Error',
      reason: 'The command has incorrect syntax.',
      suggestions: [
        'Check for typos or missing quotes',
        'Verify command structure',
        'Use proper shell escaping',
        'Check for unclosed quotes or brackets',
      ],
      severity: 'error',
    }),
  },
]

/**
 * Command-specific help messages
 */
const COMMAND_HELP: Record<string, { description: string; examples: string[] }> = {
  sudo: {
    description: 'Execute commands with elevated privileges',
    examples: [
      'sudo ls /restricted',
      'sudo cat /root/secret.txt',
      'sudo rm /protected/file.txt',
    ],
  },
  ssh: {
    description: 'Connect to remote servers',
    examples: [
      'ssh omega_agent@remote-server',
      'ssh user@agency.local',
    ],
  },
  scp: {
    description: 'Securely copy files to/from remote servers',
    examples: [
      'scp file.txt omega_agent@remote-server:/home/omega/incoming/',
      'scp omega_agent@remote-server:/path/file.txt ./',
    ],
  },
  less: {
    description: 'View file contents with pagination',
    examples: [
      'less /var/log/system.log',
      'less large_file.txt',
    ],
  },
  grep: {
    description: 'Search for patterns in files',
    examples: [
      'grep "pattern" file.txt',
      'grep -r "search" /directory/',
      'grep -i "case-insensitive" file.txt',
    ],
  },
  find: {
    description: 'Search for files and directories',
    examples: [
      'find / -name "*.txt"',
      'find /home -type f -name "evidence*"',
      'find . -mtime -7',
    ],
  },
  env: {
    description: 'Display or set environment variables',
    examples: [
      'env',
      'env | grep PATH',
      'export VAR=value',
    ],
  },
}

/**
 * Analyze error and provide suggestions
 */
export function analyzeError(
  output: string,
  stderr: string,
  command?: string
): ErrorSuggestion | null {
  const errorText = stderr || output
  
  // Check each pattern
  for (const { pattern, getSuggestion } of ERROR_PATTERNS) {
    const match = errorText.match(pattern)
    if (match) {
      return getSuggestion(match, command)
    }
  }
  
  // Generic error if stderr exists
  if (stderr && stderr.trim().length > 0) {
    return {
      error: 'Command Failed',
      reason: stderr.split('\n')[0], // First line of error
      suggestions: [
        'Check command syntax',
        'Verify file paths exist',
        'Try with sudo if permission-related',
      ],
      severity: 'error',
    }
  }
  
  return null
}

/**
 * Get command-specific help
 */
export function getCommandHelp(command: string): { description: string; examples: string[] } | null {
  const cmd = command.split(' ')[0]
  return COMMAND_HELP[cmd] || null
}

/**
 * Format error suggestion for display
 */
export function formatErrorSuggestion(suggestion: ErrorSuggestion): string {
  let output = `\n\x1b[1;31m✗ ${suggestion.error}\x1b[0m\n`
  output += `\x1b[33m${suggestion.reason}\x1b[0m\n\n`
  
  if (suggestion.suggestions.length > 0) {
    output += `\x1b[1;36m💡 Suggestions:\x1b[0m\n`
    suggestion.suggestions.forEach((s, i) => {
      output += `  ${i + 1}. ${s}\n`
    })
  }
  
  if (suggestion.learnMore) {
    output += `\n\x1b[1;34mℹ️  ${suggestion.learnMore}\x1b[0m\n`
  }
  
  return output
}

/**
 * Get severity icon
 */
export function getSeverityIcon(severity: ErrorSuggestion['severity']): string {
  switch (severity) {
    case 'info':
      return 'ℹ️'
    case 'warning':
      return '⚠️'
    case 'error':
      return '❌'
    case 'critical':
      return '🔥'
  }
}

/**
 * Get severity color
 */
export function getSeverityColor(severity: ErrorSuggestion['severity']): string {
  switch (severity) {
    case 'info':
      return '\x1b[36m' // Cyan
    case 'warning':
      return '\x1b[33m' // Yellow
    case 'error':
      return '\x1b[31m' // Red
    case 'critical':
      return '\x1b[1;31m' // Bright Red
  }
}

/**
 * Suggest command corrections for common typos
 */
export function suggestCommandCorrection(command: string): string[] {
  const commands = {
    'cta': 'cat',
    'sl': 'ls',
    'cd..': 'cd ..',
    'gerp': 'grep',
    'mkidr': 'mkdir',
    'thouch': 'touch',
    'sudp': 'sudo',
    'shh': 'ssh',
    'pign': 'ping',
    'crul': 'curl',
    'wegt': 'wget',
    'cehck': 'check',
    'eixt': 'exit',
  }
  
  const cmd = command.split(' ')[0]
  const correction = commands[cmd as keyof typeof commands]
  
  if (correction) {
    return [correction + command.slice(cmd.length)]
  }
  
  return []
}

/**
 * Check if error is recoverable
 */
export function isRecoverableError(suggestion: ErrorSuggestion): boolean {
  return suggestion.severity !== 'critical' && suggestion.suggestions.length > 0
}

/**
 * Get quick fix command for common errors
 */
export function getQuickFix(error: string, command?: string): string | null {
  if (error.includes('permission denied') && command) {
    return `sudo ${command}`
  }
  
  if (error.includes('no such file')) {
    return 'ls'
  }
  
  if (error.includes('directory not empty')) {
    const match = command?.match(/rmdir\s+(.+)/)
    if (match) {
      return `rm -r ${match[1]}`
    }
  }
  
  return null
}
