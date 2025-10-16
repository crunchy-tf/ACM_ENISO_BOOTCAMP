/**
 * I/O Redirection Handler
 * Handles >, >>, <, and <<EOF (heredoc) redirection patterns
 */

import { MEMFS } from './memfs'

export interface RedirectionResult {
  hasRedirection: boolean
  command: string // Command without redirection
  type: 'output' | 'append' | 'input' | 'heredoc' | 'none'
  target?: string // Target file path
  heredocMarker?: string // Marker for heredoc (e.g., "EOF")
  error?: string
}

export interface RedirectionExecutionResult {
  success: boolean
  output?: string
  error?: string
  needsHeredocInput?: boolean
  heredocMarker?: string
}

/**
 * Parse command for I/O redirection patterns
 */
export function parseRedirection(command: string): RedirectionResult {
  const trimmed = command.trim()

  // Check for heredoc (<<MARKER or <<'MARKER')
  const heredocMatch = trimmed.match(/<<\s*['"]?(\w+)['"]?\s*(.*)$/)
  if (heredocMatch) {
    const marker = heredocMatch[1]
    const rest = heredocMatch[2].trim()
    
    // Extract command before <<
    const beforeHeredoc = trimmed.substring(0, trimmed.indexOf('<<')).trim()
    
    // Extract target file if using >> before heredoc
    let targetMatch = beforeHeredoc.match(/>>\s+(\S+)$/)
    if (!targetMatch) {
      targetMatch = beforeHeredoc.match(/>\s+(\S+)$/)
    }
    
    const baseCommand = targetMatch 
      ? beforeHeredoc.substring(0, beforeHeredoc.lastIndexOf('>')).trim()
      : beforeHeredoc

    return {
      hasRedirection: true,
      command: baseCommand || 'cat',
      type: 'heredoc',
      target: targetMatch ? targetMatch[1] : undefined,
      heredocMarker: marker,
    }
  }

  // Check for append (>>)
  const appendMatch = trimmed.match(/^(.+?)\s+>>\s+(\S+)$/)
  if (appendMatch) {
    return {
      hasRedirection: true,
      command: appendMatch[1].trim(),
      type: 'append',
      target: appendMatch[2],
    }
  }

  // Check for output redirection (>)
  const outputMatch = trimmed.match(/^(.+?)\s+>\s+(\S+)$/)
  if (outputMatch) {
    return {
      hasRedirection: true,
      command: outputMatch[1].trim(),
      type: 'output',
      target: outputMatch[2],
    }
  }

  // Check for input redirection (<)
  const inputMatch = trimmed.match(/^(.+?)\s+<\s+(\S+)$/)
  if (inputMatch) {
    return {
      hasRedirection: true,
      command: inputMatch[1].trim(),
      type: 'input',
      target: inputMatch[2],
    }
  }

  return {
    hasRedirection: false,
    command: trimmed,
    type: 'none',
  }
}

/**
 * Execute command with redirection
 */
export async function executeWithRedirection(
  redirection: RedirectionResult,
  commandOutput: string,
  fs: MEMFS,
  currentPath: string,
  heredocLines?: string[]
): Promise<RedirectionExecutionResult> {
  
  if (!redirection.hasRedirection || redirection.type === 'none') {
    return {
      success: true,
      output: commandOutput,
    }
  }

  try {
    const targetPath = resolvePath(redirection.target || '', currentPath)

    switch (redirection.type) {
      case 'output':
        // Overwrite file with command output
        return handleOutputRedirection(fs, targetPath, commandOutput, false)

      case 'append':
        // Append command output to file
        return handleOutputRedirection(fs, targetPath, commandOutput, true)

      case 'input':
        // Input redirection (< file)
        return handleInputRedirection(fs, targetPath)

      case 'heredoc':
        // Heredoc (<<EOF)
        return handleHeredoc(fs, targetPath, heredocLines, redirection.heredocMarker)

      default:
        return {
          success: false,
          error: `Unknown redirection type: ${redirection.type}`,
        }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Redirection failed',
    }
  }
}

/**
 * Handle > and >> redirection
 */
function handleOutputRedirection(
  fs: MEMFS,
  targetPath: string,
  content: string,
  append: boolean
): RedirectionExecutionResult {
  try {
    // Create parent directory if needed
    const parentDir = targetPath.substring(0, targetPath.lastIndexOf('/'))
    if (parentDir && !fs.exists(parentDir)) {
      fs.mkdirTree(parentDir)
    }

    // Get existing content if appending
    let finalContent = content
    if (append && fs.exists(targetPath)) {
      const existing = fs.readFile(targetPath, { encoding: 'utf8' }) as string
      finalContent = existing + '\n' + content
    }

    // Write to file
    fs.writeFile(targetPath, finalContent)

    return {
      success: true,
      output: '', // Redirection is silent
    }
  } catch (error) {
    return {
      success: false,
      error: `Redirection error: ${error instanceof Error ? error.message : 'Write failed'}`,
    }
  }
}

/**
 * Handle < input redirection
 */
function handleInputRedirection(
  fs: MEMFS,
  sourcePath: string
): RedirectionExecutionResult {
  try {
    if (!fs.exists(sourcePath)) {
      return {
        success: false,
        error: `${sourcePath}: No such file or directory`,
      }
    }

    const content = fs.readFile(sourcePath, { encoding: 'utf8' }) as string

    return {
      success: true,
      output: content,
    }
  } catch (error) {
    return {
      success: false,
      error: `Input redirection error: ${error instanceof Error ? error.message : 'Read failed'}`,
    }
  }
}

/**
 * Handle <<EOF heredoc
 */
function handleHeredoc(
  fs: MEMFS,
  targetPath: string | undefined,
  heredocLines: string[] | undefined,
  marker: string | undefined
): RedirectionExecutionResult {
  // If heredocLines not provided, we need to collect them
  if (!heredocLines) {
    return {
      success: false,
      needsHeredocInput: true,
      heredocMarker: marker,
      output: `> `, // Prompt for heredoc input
    }
  }

  // Join heredoc lines
  const content = heredocLines.join('\n')

  // If no target, just output to stdout
  if (!targetPath) {
    return {
      success: true,
      output: content,
    }
  }

  // Write to file (append mode for heredoc with >>)
  try {
    // Create parent directory if needed
    const parentDir = targetPath.substring(0, targetPath.lastIndexOf('/'))
    if (parentDir && !fs.exists(parentDir)) {
      fs.mkdirTree(parentDir)
    }

    // Always append for heredoc
    let finalContent = content
    if (fs.exists(targetPath)) {
      const existing = fs.readFile(targetPath, { encoding: 'utf8' }) as string
      finalContent = existing + '\n' + content
    }

    fs.writeFile(targetPath, finalContent)

    return {
      success: true,
      output: '', // Heredoc write is silent
    }
  } catch (error) {
    return {
      success: false,
      error: `Heredoc error: ${error instanceof Error ? error.message : 'Write failed'}`,
    }
  }
}

/**
 * Resolve relative path to absolute
 */
function resolvePath(path: string, currentPath: string): string {
  if (path.startsWith('/')) {
    return path
  }

  if (path.startsWith('~/')) {
    return `/home/student/${path.substring(2)}`
  }

  return `${currentPath}/${path}`.replace(/\/+/g, '/')
}

/**
 * Check if line is heredoc terminator
 */
export function isHeredocTerminator(line: string, marker: string): boolean {
  return line.trim() === marker
}

/**
 * Format heredoc prompt
 */
export function getHeredocPrompt(marker: string): string {
  return `> `
}
