/**
 * Command Executor using MEMFS
 * Clean implementation with real filesystem operations
 */

import { MEMFS } from './memfs'

export interface ExecutionContext {
  currentPath: string
  username: string
  isSudo: boolean
}

export interface CommandResult {
  stdout: string
  stderr: string
  exitCode: number
  newPath?: string // If cd command changed the path
}

/**
 * Parse command string into command and arguments
 */
function parseCommand(command: string): string[] {
  const args: string[] = []
  let current = ''
  let inQuotes = false
  let quoteChar = ''

  for (let i = 0; i < command.length; i++) {
    const char = command[i]

    if ((char === '"' || char === "'") && !inQuotes) {
      inQuotes = true
      quoteChar = char
    } else if (char === quoteChar && inQuotes) {
      inQuotes = false
      quoteChar = ''
    } else if (char === ' ' && !inQuotes) {
      if (current) {
        args.push(current)
        current = ''
      }
    } else {
      current += char
    }
  }

  if (current) {
    args.push(current)
  }

  return args
}

/**
 * Resolve path (handle relative paths, .., ~, etc.)
 */
function resolvePath(currentPath: string, targetPath: string, username: string): string {
  // Handle home directory
  if (targetPath === '~') {
    return `/home/${username}`
  }

  // Handle absolute paths
  if (targetPath.startsWith('/')) {
    return normalizePath(targetPath)
  }

  // Handle relative paths
  const parts = currentPath.split('/').filter(Boolean)
  const targetParts = targetPath.split('/')

  for (const part of targetParts) {
    if (part === '..') {
      if (parts.length > 0) {
        parts.pop()
      }
    } else if (part !== '.' && part !== '') {
      parts.push(part)
    }
  }

  return '/' + parts.join('/')
}

/**
 * Normalize path
 */
function normalizePath(path: string): string {
  const parts = path.split('/').filter(Boolean)
  return '/' + parts.join('/')
}

/**
 * Get basename of path
 */
function basename(path: string): string {
  const parts = path.split('/').filter(Boolean)
  return parts[parts.length - 1] || '/'
}

/**
 * Format file permissions for ls -l
 */
function formatPermissions(mode: number, isDir: boolean): string {
  const type = isDir ? 'd' : '-'
  const perms = mode & 0o777
  
  let result = type
  // Owner
  result += (perms & 0o400) ? 'r' : '-'
  result += (perms & 0o200) ? 'w' : '-'
  result += (perms & 0o100) ? 'x' : '-'
  // Group
  result += (perms & 0o040) ? 'r' : '-'
  result += (perms & 0o020) ? 'w' : '-'
  result += (perms & 0o010) ? 'x' : '-'
  // Other
  result += (perms & 0o004) ? 'r' : '-'
  result += (perms & 0o002) ? 'w' : '-'
  result += (perms & 0o001) ? 'x' : '-'
  
  return result
}

/**
 * Format file size
 */
function formatSize(size: number): string {
  return size.toString().padStart(8)
}

/**
 * Execute a command
 */
export function executeCommand(
  command: string,
  context: ExecutionContext,
  fs: MEMFS
): CommandResult {
  const parts = parseCommand(command.trim())
  if (parts.length === 0) {
    return { stdout: '', stderr: '', exitCode: 0 }
  }

  const [cmd, ...args] = parts
  const { currentPath, username, isSudo } = context

  try {
    switch (cmd) {
      case 'sudo':
        if (args.length === 0) {
          return { stdout: '', stderr: 'sudo: a command must be specified', exitCode: 1 }
        }
        // Execute with sudo privileges
        return executeCommand(
          args.join(' '),
          { ...context, isSudo: true },
          fs
        )

      case 'pwd':
        return { stdout: currentPath, stderr: '', exitCode: 0 }

      case 'cd': {
        const target = args[0] || `/home/${username}`
        const newPath = resolvePath(currentPath, target, username)

        if (!fs.exists(newPath)) {
          return {
            stdout: '',
            stderr: `cd: ${target}: No such file or directory`,
            exitCode: 1,
          }
        }

        const stat = fs.stat(newPath)
        if (!stat.isDirectory()) {
          return {
            stdout: '',
            stderr: `cd: ${target}: Not a directory`,
            exitCode: 1,
          }
        }

        return { stdout: '', stderr: '', exitCode: 0, newPath }
      }

      case 'ls': {
        let longFormat = false
        let showAll = false
        const paths: string[] = []

        // Parse flags and paths
        for (const arg of args) {
          if (arg.startsWith('-')) {
            if (arg.includes('l')) longFormat = true
            if (arg.includes('a')) showAll = true
          } else {
            paths.push(arg)
          }
        }

        if (paths.length === 0) {
          paths.push(currentPath)
        }

        const output: string[] = []

        for (const path of paths) {
          const fullPath = resolvePath(currentPath, path, username)

          // Check permissions
          if (!fs.exists(fullPath)) {
            return {
              stdout: '',
              stderr: `ls: cannot access '${path}': No such file or directory`,
              exitCode: 2,
            }
          }

          const stat = fs.stat(fullPath)

          // Check if we need root access
          if (stat.owner === 'root' && !isSudo) {
            return {
              stdout: '',
              stderr: `ls: cannot open directory '${path}': Permission denied`,
              exitCode: 1,
            }
          }

          if (!stat.isDirectory()) {
            // List single file
            if (longFormat) {
              const perms = formatPermissions(stat.mode, false)
              output.push(`${perms}  1 ${stat.owner} ${stat.owner} ${formatSize(stat.size)} Oct 15 14:30 ${basename(path)}`)
            } else {
              output.push(basename(path))
            }
            continue
          }

          // List directory
          const files = fs.readdir(fullPath)
          const filtered = showAll ? files : files.filter(f => !f.startsWith('.'))

          if (longFormat) {
            if (paths.length > 1) output.push(`${fullPath}:`)
            output.push(`total ${filtered.length}`)

            for (const file of filtered) {
              const filePath = fullPath === '/' ? `/${file}` : `${fullPath}/${file}`
              try {
                const fileStat = fs.stat(filePath)
                const perms = formatPermissions(fileStat.mode, fileStat.isDirectory())
                const size = fileStat.isDirectory() ? 4096 : fileStat.size
                output.push(`${perms}  1 ${fileStat.owner} ${fileStat.owner} ${formatSize(size)} Oct 15 14:30 ${file}`)
              } catch (e) {
                output.push(`?????????? ?? ${username} ${username}     ???? ??? ?? ??:?? ${file}`)
              }
            }
          } else {
            if (paths.length > 1) output.push(`${fullPath}:`)
            output.push(filtered.join('  '))
          }

          if (paths.length > 1) output.push('')
        }

        return { stdout: output.join('\n'), stderr: '', exitCode: 0 }
      }

      case 'cat': {
        if (args.length === 0) {
          return { stdout: '', stderr: 'cat: missing operand', exitCode: 1 }
        }

        const output: string[] = []

        for (const arg of args) {
          const fullPath = resolvePath(currentPath, arg, username)

          if (!fs.exists(fullPath)) {
            return {
              stdout: output.join('\n'),
              stderr: `cat: ${arg}: No such file or directory`,
              exitCode: 1,
            }
          }

          const stat = fs.stat(fullPath)

          // Check permissions
          if (stat.owner === 'root' && !isSudo) {
            return {
              stdout: '',
              stderr: `cat: ${arg}: Permission denied`,
              exitCode: 1,
            }
          }

          if (stat.isDirectory()) {
            return {
              stdout: output.join('\n'),
              stderr: `cat: ${arg}: Is a directory`,
              exitCode: 1,
            }
          }

          const content = fs.readFile(fullPath, { encoding: 'utf8' }) as string
          output.push(content)
        }

        return { stdout: output.join('\n'), stderr: '', exitCode: 0 }
      }

      case 'mkdir': {
        if (args.length === 0) {
          return { stdout: '', stderr: 'mkdir: missing operand', exitCode: 1 }
        }

        for (const arg of args) {
          const fullPath = resolvePath(currentPath, arg, username)

          try {
            fs.mkdir(fullPath)
          } catch (e) {
            return {
              stdout: '',
              stderr: `mkdir: cannot create directory '${arg}': ${e instanceof Error ? e.message : 'Error'}`,
              exitCode: 1,
            }
          }
        }

        return { stdout: '', stderr: '', exitCode: 0 }
      }

      case 'touch': {
        if (args.length === 0) {
          return { stdout: '', stderr: 'touch: missing file operand', exitCode: 1 }
        }

        for (const arg of args) {
          const fullPath = resolvePath(currentPath, arg, username)

          try {
            if (fs.exists(fullPath)) {
              // Update timestamp
              const stat = fs.stat(fullPath)
              if (stat.isDirectory()) {
                return {
                  stdout: '',
                  stderr: `touch: cannot touch '${arg}': Is a directory`,
                  exitCode: 1,
                }
              }
              // File exists, just touch it (we don't update timestamps in our simple impl)
            } else {
              // Create empty file
              fs.writeFile(fullPath, '')
            }
          } catch (e) {
            return {
              stdout: '',
              stderr: `touch: cannot touch '${arg}': ${e instanceof Error ? e.message : 'Error'}`,
              exitCode: 1,
            }
          }
        }

        return { stdout: '', stderr: '', exitCode: 0 }
      }

      case 'rm': {
        if (args.length === 0) {
          return { stdout: '', stderr: 'rm: missing operand', exitCode: 1 }
        }

        for (const arg of args) {
          const fullPath = resolvePath(currentPath, arg, username)

          try {
            const stat = fs.stat(fullPath)
            if (stat.isDirectory()) {
              return {
                stdout: '',
                stderr: `rm: cannot remove '${arg}': Is a directory`,
                exitCode: 1,
              }
            }
            fs.unlink(fullPath)
          } catch (e) {
            return {
              stdout: '',
              stderr: `rm: cannot remove '${arg}': ${e instanceof Error ? e.message : 'Error'}`,
              exitCode: 1,
            }
          }
        }

        return { stdout: '', stderr: '', exitCode: 0 }
      }

      case 'rmdir': {
        if (args.length === 0) {
          return { stdout: '', stderr: 'rmdir: missing operand', exitCode: 1 }
        }

        for (const arg of args) {
          const fullPath = resolvePath(currentPath, arg, username)

          try {
            fs.rmdir(fullPath)
          } catch (e) {
            return {
              stdout: '',
              stderr: `rmdir: failed to remove '${arg}': ${e instanceof Error ? e.message : 'Error'}`,
              exitCode: 1,
            }
          }
        }

        return { stdout: '', stderr: '', exitCode: 0 }
      }

      case 'cp': {
        if (args.length < 2) {
          return { stdout: '', stderr: 'cp: missing file operand', exitCode: 1 }
        }

        const source = resolvePath(currentPath, args[0], username)
        const dest = resolvePath(currentPath, args[1], username)

        try {
          if (!fs.exists(source)) {
            return {
              stdout: '',
              stderr: `cp: cannot stat '${args[0]}': No such file or directory`,
              exitCode: 1,
            }
          }

          const sourceStat = fs.stat(source)
          if (sourceStat.isDirectory()) {
            return {
              stdout: '',
              stderr: `cp: omitting directory '${args[0]}'`,
              exitCode: 1,
            }
          }

          const content = fs.readFile(source) as Uint8Array
          fs.writeFile(dest, content)
        } catch (e) {
          return {
            stdout: '',
            stderr: `cp: ${e instanceof Error ? e.message : 'Error'}`,
            exitCode: 1,
          }
        }

        return { stdout: '', stderr: '', exitCode: 0 }
      }

      case 'mv': {
        if (args.length < 2) {
          return { stdout: '', stderr: 'mv: missing file operand', exitCode: 1 }
        }

        const source = resolvePath(currentPath, args[0], username)
        const dest = resolvePath(currentPath, args[1], username)

        try {
          fs.rename(source, dest)
        } catch (e) {
          return {
            stdout: '',
            stderr: `mv: ${e instanceof Error ? e.message : 'Error'}`,
            exitCode: 1,
          }
        }

        return { stdout: '', stderr: '', exitCode: 0 }
      }

      case 'echo': {
        return { stdout: args.join(' '), stderr: '', exitCode: 0 }
      }

      case 'clear':
        return { stdout: '\x1b[2J\x1b[H', stderr: '', exitCode: 0 }

      default:
        return {
          stdout: '',
          stderr: `bash: ${cmd}: command not found`,
          exitCode: 127,
        }
    }
  } catch (error) {
    return {
      stdout: '',
      stderr: error instanceof Error ? error.message : String(error),
      exitCode: 1,
    }
  }
}
