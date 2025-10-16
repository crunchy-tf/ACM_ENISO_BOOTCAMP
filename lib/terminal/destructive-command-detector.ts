/**
 * Destructive Command Detector
 * Detects potentially destructive commands and determines warning levels
 */

export interface DestructiveCommandResult {
  isDestructive: boolean
  warningLevel: 'warning' | 'danger' | 'critical'
  reason: string
  affectedPaths: string[]
  canRecover: boolean
}

/**
 * Protected paths that should never be deleted
 */
const PROTECTED_PATHS = [
  '/home/agent',
  '/home',
  '/var',
  '/etc',
  '/usr',
  '/bin',
  '/lib',
  '/root',
  '/',
]

/**
 * Mission-critical paths that need extra confirmation
 */
const CRITICAL_PATHS = [
  '/home/agent/work',
  '/home/agent/work/evidence',
  '/home/agent/work/reports',
  '/var/log',
  '/etc/hosts',
  '/remotes',
]

/**
 * Important file patterns
 */
const IMPORTANT_PATTERNS = [
  /\.txt$/,
  /\.log$/,
  /\.json$/,
  /evidence/i,
  /report/i,
  /data/i,
  /backup/i,
  /mission/i,
]

/**
 * Detect if a command is destructive
 */
export function detectDestructiveCommand(command: string): DestructiveCommandResult | null {
  const trimmed = command.trim()
  
  // Parse command and arguments
  const parts = trimmed.split(/\s+/)
  const cmd = parts[0]
  const args = parts.slice(1)
  
  // Detect rm commands
  if (cmd === 'rm') {
    return detectRmCommand(args)
  }
  
  // Detect rmdir commands
  if (cmd === 'rmdir') {
    return detectRmdirCommand(args)
  }
  
  // Detect mv commands that might overwrite
  if (cmd === 'mv') {
    return detectMvCommand(args)
  }
  
  // Detect truncation redirections
  if (trimmed.includes('>') && !trimmed.includes('>>')) {
    return detectRedirectionCommand(trimmed)
  }
  
  // Detect format/wipe commands (if implemented)
  if (cmd === 'dd' || cmd === 'mkfs' || cmd === 'fdisk') {
    return {
      isDestructive: true,
      warningLevel: 'critical',
      reason: 'This command can cause permanent data loss to entire filesystems.',
      affectedPaths: ['<disk>'],
      canRecover: false,
    }
  }
  
  return null
}

/**
 * Detect rm command destructiveness
 */
function detectRmCommand(args: string[]): DestructiveCommandResult {
  const hasRecursive = args.includes('-r') || args.includes('-R') || args.includes('-rf') || args.includes('-fr')
  const hasForce = args.includes('-f') || args.includes('-rf') || args.includes('-fr')
  const targets = args.filter(arg => !arg.startsWith('-'))
  
  // Check for protected paths
  for (const target of targets) {
    if (PROTECTED_PATHS.includes(target)) {
      return {
        isDestructive: true,
        warningLevel: 'critical',
        reason: `Attempting to delete protected system directory: ${target}`,
        affectedPaths: [target],
        canRecover: false,
      }
    }
    
    // Check for critical paths
    if (CRITICAL_PATHS.some(path => target.startsWith(path) || path.startsWith(target))) {
      return {
        isDestructive: true,
        warningLevel: 'critical',
        reason: `Attempting to delete mission-critical directory: ${target}`,
        affectedPaths: targets,
        canRecover: false,
      }
    }
  }
  
  // Check for recursive deletion
  if (hasRecursive && targets.length > 0) {
    const hasCriticalPattern = targets.some(target => 
      IMPORTANT_PATTERNS.some(pattern => pattern.test(target))
    )
    
    if (hasCriticalPattern) {
      return {
        isDestructive: true,
        warningLevel: 'danger',
        reason: `Recursive deletion of important files: ${targets.join(', ')}`,
        affectedPaths: targets,
        canRecover: false,
      }
    }
    
    return {
      isDestructive: true,
      warningLevel: 'warning',
      reason: `Recursive deletion will remove all files in: ${targets.join(', ')}`,
      affectedPaths: targets,
      canRecover: false,
    }
  }
  
  // Regular file deletion
  if (targets.length > 0) {
    const hasCriticalPattern = targets.some(target => 
      IMPORTANT_PATTERNS.some(pattern => pattern.test(target))
    )
    
    if (hasCriticalPattern) {
      return {
        isDestructive: true,
        warningLevel: 'warning',
        reason: `Deleting important files: ${targets.join(', ')}`,
        affectedPaths: targets,
        canRecover: false,
      }
    }
  }
  
  // Not particularly destructive
  return {
    isDestructive: false,
    warningLevel: 'warning',
    reason: 'File deletion',
    affectedPaths: targets,
    canRecover: false,
  }
}

/**
 * Detect rmdir command destructiveness
 */
function detectRmdirCommand(args: string[]): DestructiveCommandResult {
  const targets = args.filter(arg => !arg.startsWith('-'))
  
  // Check for protected paths
  for (const target of targets) {
    if (PROTECTED_PATHS.includes(target)) {
      return {
        isDestructive: true,
        warningLevel: 'critical',
        reason: `Attempting to remove protected directory: ${target}`,
        affectedPaths: [target],
        canRecover: false,
      }
    }
    
    // Check for critical paths
    if (CRITICAL_PATHS.some(path => target.startsWith(path) || path.startsWith(target))) {
      return {
        isDestructive: true,
        warningLevel: 'danger',
        reason: `Removing mission-critical directory: ${target}`,
        affectedPaths: targets,
        canRecover: false,
      }
    }
  }
  
  if (targets.length > 0) {
    return {
      isDestructive: true,
      warningLevel: 'warning',
      reason: `Removing directories: ${targets.join(', ')}`,
      affectedPaths: targets,
      canRecover: false,
    }
  }
  
  return {
    isDestructive: false,
    warningLevel: 'warning',
    reason: 'Directory removal',
    affectedPaths: targets,
    canRecover: false,
  }
}

/**
 * Detect mv command destructiveness (overwrites)
 */
function detectMvCommand(args: string[]): DestructiveCommandResult | null {
  const hasForce = args.includes('-f')
  const targets = args.filter(arg => !arg.startsWith('-'))
  
  if (targets.length >= 2) {
    const dest = targets[targets.length - 1]
    
    // Check if moving to critical location
    if (CRITICAL_PATHS.some(path => dest.startsWith(path))) {
      return {
        isDestructive: true,
        warningLevel: 'warning',
        reason: `Moving files to mission-critical directory: ${dest}`,
        affectedPaths: targets,
        canRecover: true,
      }
    }
    
    // Check if source is critical
    const hasCriticalSource = targets.slice(0, -1).some(src =>
      CRITICAL_PATHS.some(path => src.startsWith(path)) ||
      IMPORTANT_PATTERNS.some(pattern => pattern.test(src))
    )
    
    if (hasCriticalSource && hasForce) {
      return {
        isDestructive: true,
        warningLevel: 'warning',
        reason: `Force moving important files: ${targets.slice(0, -1).join(', ')}`,
        affectedPaths: targets,
        canRecover: true,
      }
    }
  }
  
  return null
}

/**
 * Detect output redirection that might overwrite files
 */
function detectRedirectionCommand(command: string): DestructiveCommandResult | null {
  const redirectMatch = command.match(/>\s*(\S+)/)
  if (!redirectMatch) return null
  
  const targetFile = redirectMatch[1]
  
  // Check if redirecting to important file
  const isImportant = IMPORTANT_PATTERNS.some(pattern => pattern.test(targetFile)) ||
                      CRITICAL_PATHS.some(path => targetFile.startsWith(path))
  
  if (isImportant) {
    return {
      isDestructive: true,
      warningLevel: 'warning',
      reason: `Overwriting important file: ${targetFile}`,
      affectedPaths: [targetFile],
      canRecover: false,
    }
  }
  
  return null
}

/**
 * Get user-friendly message for destructive command
 */
export function getDestructiveCommandMessage(result: DestructiveCommandResult): {
  title: string
  message: string
  confirmLabel: string
} {
  if (result.warningLevel === 'critical') {
    return {
      title: '⛔ CRITICAL: Permanent Data Loss',
      message: result.reason + ' This operation is IRREVERSIBLE and may corrupt the system or lose mission-critical data.',
      confirmLabel: 'I Understand, Execute Anyway',
    }
  }
  
  if (result.warningLevel === 'danger') {
    return {
      title: '⚠️ DANGER: Destructive Operation',
      message: result.reason + ' This operation cannot be easily undone and may affect mission progress.',
      confirmLabel: 'Execute Anyway',
    }
  }
  
  return {
    title: '⚠️ Warning: Destructive Operation',
    message: result.reason + ' This operation will modify or delete files. Are you sure?',
    confirmLabel: 'Continue',
  }
}

/**
 * Check if path should be protected from deletion
 */
export function isProtectedPath(path: string): boolean {
  return PROTECTED_PATHS.some(protectedPath => 
    path === protectedPath || path.startsWith(protectedPath + '/')
  )
}

/**
 * Check if path is mission-critical
 */
export function isCriticalPath(path: string): boolean {
  return CRITICAL_PATHS.some(critical =>
    path === critical || path.startsWith(critical + '/')
  )
}

/**
 * Get suggestions for safer alternatives
 */
export function getSaferAlternative(command: string): string | null {
  if (command.startsWith('rm -rf')) {
    return 'Consider using "rm -r" without -f to get confirmation prompts, or move files to a backup location first.'
  }
  
  if (command.includes('>') && !command.includes('>>')) {
    return 'Consider using ">>" to append instead of overwriting, or backup the file first with "cp".'
  }
  
  if (command.startsWith('rmdir')) {
    return 'Ensure the directory is empty and backed up before removal.'
  }
  
  if (command.startsWith('mv') && command.includes('-f')) {
    return 'Remove the -f flag to get confirmation before overwriting files.'
  }
  
  return null
}
