/**
 * Terminal Output Formatter
 * Provides consistent, colorful, and semantic terminal output formatting
 */

export const TerminalColors = {
  // Status colors
  SUCCESS: '\x1b[1;32m', // Bright green
  ERROR: '\x1b[1;31m',   // Bright red  
  WARNING: '\x1b[1;33m', // Bright yellow
  INFO: '\x1b[1;36m',    // Bright cyan
  
  // Accent colors
  PRIMARY: '\x1b[1;34m',  // Bright blue
  SECONDARY: '\x1b[1;35m', // Bright magenta
  HIGHLIGHT: '\x1b[1;93m', // Bright yellow (lighter)
  
  // Text styles
  BOLD: '\x1b[1m',
  DIM: '\x1b[2m',
  ITALIC: '\x1b[3m',
  UNDERLINE: '\x1b[4m',
  
  // Reset
  RESET: '\x1b[0m',
} as const

export const TerminalIcons = {
  SUCCESS: '✓',
  ERROR: '✗',
  WARNING: '⚠',
  INFO: 'ℹ',
  LOADING: '⏳',
  LOCK: '🔒',
  UNLOCK: '🔓',
  STAR: '⭐',
  FIRE: '🔥',
  ROCKET: '🚀',
  TARGET: '🎯',
  CHECKMARK: '✅',
  CROSS: '❌',
  ARROW: '→',
} as const

export class TerminalFormatter {
  /**
   * Format success message
   */
  static success(message: string, icon: boolean = true): string {
    const prefix = icon ? `${TerminalIcons.SUCCESS} ` : ''
    return `${TerminalColors.SUCCESS}${prefix}${message}${TerminalColors.RESET}`
  }

  /**
   * Format error message
   */
  static error(message: string, icon: boolean = true): string {
    const prefix = icon ? `${TerminalIcons.ERROR} ` : ''
    return `${TerminalColors.ERROR}${prefix}${message}${TerminalColors.RESET}`
  }

  /**
   * Format warning message
   */
  static warning(message: string, icon: boolean = true): string {
    const prefix = icon ? `${TerminalIcons.WARNING} ` : ''
    return `${TerminalColors.WARNING}${prefix}${message}${TerminalColors.RESET}`
  }

  /**
   * Format info message
   */
  static info(message: string, icon: boolean = true): string {
    const prefix = icon ? `${TerminalIcons.INFO} ` : ''
    return `${TerminalColors.INFO}${prefix}${message}${TerminalColors.RESET}`
  }

  /**
   * Format command (bold cyan)
   */
  static command(cmd: string): string {
    return `${TerminalColors.INFO}${TerminalColors.BOLD}${cmd}${TerminalColors.RESET}`
  }

  /**
   * Format file path (underline)
   */
  static path(path: string): string {
    return `${TerminalColors.HIGHLIGHT}${path}${TerminalColors.RESET}`
  }

  /**
   * Format section header
   */
  static header(title: string, width: number = 60): string {
    const line = '='.repeat(width)
    return `${TerminalColors.INFO}${line}\n  ${title}\n${line}${TerminalColors.RESET}`
  }

  /**
   * Format task completion
   */
  static taskComplete(taskDescription: string): string {
    return `\n${TerminalColors.SUCCESS}${TerminalIcons.CHECKMARK} Task Complete: ${taskDescription}${TerminalColors.RESET}\n`
  }

  /**
   * Format mission complete
   */
  static missionComplete(missionTitle: string, taskCount: number): string {
    return `\n${TerminalColors.SUCCESS}${TerminalColors.BOLD}${TerminalIcons.STAR}  MISSION COMPLETE: ${missionTitle}${TerminalColors.RESET}\n${TerminalColors.INFO}   ${taskCount} tasks completed${TerminalColors.RESET}\n`
  }

  /**
   * Format hint message
   */
  static hint(hintText: string, level: number): string {
    const prefix = `${TerminalIcons.INFO} Hint (Level ${level}): `
    return `${TerminalColors.HIGHLIGHT}${prefix}${hintText}${TerminalColors.RESET}`
  }

  /**
   * Format progress indicator
   */
  static progress(current: number, total: number, label: string = ''): string {
    const percentage = Math.round((current / total) * 100)
    const barLength = 20
    const filled = Math.round((barLength * current) / total)
    const empty = barLength - filled
    
    const bar = `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`
    const text = label ? `${label}: ` : ''
    
    return `${TerminalColors.INFO}${text}${bar} ${current}/${total} (${percentage}%)${TerminalColors.RESET}`
  }

  /**
   * Format box message
   */
  static box(message: string, width: number = 60): string {
    const lines = message.split('\n')
    const maxLineLength = Math.min(width - 4, Math.max(...lines.map(l => l.length)))
    const topBottom = '─'.repeat(maxLineLength + 2)
    
    const formattedLines = lines.map(line => {
      const padding = ' '.repeat(Math.max(0, maxLineLength - line.length))
      return `│ ${line}${padding} │`
    })
    
    return `${TerminalColors.INFO}┌${topBottom}┐\n${formattedLines.join('\n')}\n└${topBottom}┘${TerminalColors.RESET}`
  }

  /**
   * Format list item
   */
  static listItem(text: string, icon: string = '•'): string {
    return `${TerminalColors.INFO}  ${icon} ${TerminalColors.RESET}${text}`
  }

  /**
   * Format numbered list item
   */
  static numberedItem(num: number, text: string): string {
    return `${TerminalColors.INFO}  ${num}. ${TerminalColors.RESET}${text}`
  }

  /**
   * Format command suggestion
   */
  static suggestion(command: string, description: string): string {
    return `${TerminalColors.HIGHLIGHT}${command}${TerminalColors.RESET} - ${TerminalColors.DIM}${description}${TerminalColors.RESET}`
  }

  /**
   * Animate dots (for loading)
   */
  static loadingDots(count: number = 3): string {
    return '.'.repeat(count % 4)
  }
}

// Export utility functions for backwards compatibility
export const formatSuccess = TerminalFormatter.success
export const formatError = TerminalFormatter.error
export const formatWarning = TerminalFormatter.warning
export const formatInfo = TerminalFormatter.info
export const formatCommand = TerminalFormatter.command
export const formatPath = TerminalFormatter.path
