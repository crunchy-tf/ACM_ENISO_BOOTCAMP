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
  requiresPassword?: boolean // If command requires password authentication
  pendingCommand?: string // The command waiting for password
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
        // Request password authentication
        return {
          stdout: '',
          stderr: '',
          exitCode: 0,
          requiresPassword: true,
          pendingCommand: args.join(' ')
        }

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

      case 'grep': {
        if (args.length === 0) {
          return { stdout: '', stderr: 'grep: missing operand', exitCode: 2 }
        }

        let pattern = ''
        let files: string[] = []
        let recursive = false
        let ignoreCase = false
        let invertMatch = false
        let lineNumber = false

        // Parse flags and arguments
        for (let i = 0; i < args.length; i++) {
          const arg = args[i]
          if (arg.startsWith('-')) {
            if (arg.includes('r') || arg.includes('R')) recursive = true
            if (arg.includes('i')) ignoreCase = true
            if (arg.includes('v')) invertMatch = true
            if (arg.includes('n')) lineNumber = true
          } else if (!pattern) {
            pattern = arg
          } else {
            files.push(arg)
          }
        }

        if (!pattern) {
          return { stdout: '', stderr: 'grep: missing pattern', exitCode: 2 }
        }

        // If no files specified and not recursive, read from stdin (not supported here)
        if (files.length === 0 && !recursive) {
          return { stdout: '', stderr: 'grep: no files specified', exitCode: 2 }
        }

        // Handle * glob pattern
        if (files.length === 1 && files[0] === '*') {
          try {
            files = fs.readdir(currentPath).filter(f => {
              const fullPath = currentPath === '/' ? `/${f}` : `${currentPath}/${f}`
              const stat = fs.stat(fullPath)
              return !stat.isDirectory()
            })
          } catch (e) {
            return { stdout: '', stderr: `grep: ${e instanceof Error ? e.message : 'Error'}`, exitCode: 2 }
          }
        }

        const output: string[] = []
        let matchFound = false
        const regex = new RegExp(pattern, ignoreCase ? 'i' : '')

        for (const file of files) {
          const fullPath = resolvePath(currentPath, file, username)

          if (!fs.exists(fullPath)) {
            output.push(`grep: ${file}: No such file or directory`)
            continue
          }

          const stat = fs.stat(fullPath)

          // Check permissions
          if (stat.owner === 'root' && !isSudo) {
            output.push(`grep: ${file}: Permission denied`)
            continue
          }

          if (stat.isDirectory()) {
            if (!recursive) {
              output.push(`grep: ${file}: Is a directory`)
              continue
            }
            // Recursive not fully implemented
            continue
          }

          try {
            const content = fs.readFile(fullPath, { encoding: 'utf8' }) as string
            const lines = content.split('\n')

            lines.forEach((line, index) => {
              const matches = regex.test(line)
              const shouldOutput = invertMatch ? !matches : matches

              if (shouldOutput) {
                matchFound = true
                let prefix = files.length > 1 ? `${file}:` : ''
                if (lineNumber) {
                  prefix += `${index + 1}:`
                }
                output.push(prefix + line)
              }
            })
          } catch (e) {
            output.push(`grep: ${file}: ${e instanceof Error ? e.message : 'Error'}`)
          }
        }

        return { 
          stdout: output.join('\n'), 
          stderr: '', 
          exitCode: matchFound ? 0 : 1 
        }
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
        let dest = resolvePath(currentPath, args[1], username)

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

          // If destination is a directory, append the source filename
          if (fs.exists(dest)) {
            const destStat = fs.stat(dest)
            if (destStat.isDirectory()) {
              const sourceFilename = basename(source)
              dest = dest === '/' ? `/${sourceFilename}` : `${dest}/${sourceFilename}`
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
        let dest = resolvePath(currentPath, args[1], username)

        try {
          // If destination is a directory, append the source filename
          if (fs.exists(dest)) {
            const destStat = fs.stat(dest)
            if (destStat.isDirectory()) {
              const sourceFilename = basename(source)
              dest = dest === '/' ? `/${sourceFilename}` : `${dest}/${sourceFilename}`
            }
          }

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

      case 'head': {
        if (args.length === 0) {
          return { stdout: '', stderr: 'head: missing operand', exitCode: 1 }
        }

        let numLines = 10 // Default to 10 lines
        let filePath: string | null = null

        // Parse arguments
        for (let i = 0; i < args.length; i++) {
          const arg = args[i]
          if (arg === '-n' && i + 1 < args.length) {
            numLines = parseInt(args[++i])
            if (isNaN(numLines) || numLines < 0) {
              return {
                stdout: '',
                stderr: 'head: invalid number of lines',
                exitCode: 1,
              }
            }
          } else if (arg.startsWith('-') && arg.length > 1 && !isNaN(parseInt(arg.substring(1)))) {
            // Handle -10 format
            numLines = parseInt(arg.substring(1))
          } else if (!arg.startsWith('-')) {
            filePath = arg
          }
        }

        if (!filePath) {
          return { stdout: '', stderr: 'head: missing file operand', exitCode: 1 }
        }

        const fullPath = resolvePath(currentPath, filePath, username)

        if (!fs.exists(fullPath)) {
          return {
            stdout: '',
            stderr: `head: cannot open '${filePath}' for reading: No such file or directory`,
            exitCode: 1,
          }
        }

        const stat = fs.stat(fullPath)

        // Check permissions
        if (stat.owner === 'root' && !isSudo) {
          return {
            stdout: '',
            stderr: `head: cannot open '${filePath}' for reading: Permission denied`,
            exitCode: 1,
          }
        }

        if (stat.isDirectory()) {
          return {
            stdout: '',
            stderr: `head: error reading '${filePath}': Is a directory`,
            exitCode: 1,
          }
        }

        try {
          const content = fs.readFile(fullPath, { encoding: 'utf8' }) as string
          const lines = content.split('\n')
          const output = lines.slice(0, numLines).join('\n')
          return { stdout: output, stderr: '', exitCode: 0 }
        } catch (e) {
          return {
            stdout: '',
            stderr: `head: ${e instanceof Error ? e.message : 'Error'}`,
            exitCode: 1,
          }
        }
      }

      case 'tail': {
        if (args.length === 0) {
          return { stdout: '', stderr: 'tail: missing operand', exitCode: 1 }
        }

        let numLines = 10 // Default to 10 lines
        let filePath: string | null = null

        // Parse arguments
        for (let i = 0; i < args.length; i++) {
          const arg = args[i]
          if (arg === '-n' && i + 1 < args.length) {
            numLines = parseInt(args[++i])
            if (isNaN(numLines) || numLines < 0) {
              return {
                stdout: '',
                stderr: 'tail: invalid number of lines',
                exitCode: 1,
              }
            }
          } else if (arg.startsWith('-') && arg.length > 1 && !isNaN(parseInt(arg.substring(1)))) {
            // Handle -20 format
            numLines = parseInt(arg.substring(1))
          } else if (!arg.startsWith('-')) {
            filePath = arg
          }
        }

        if (!filePath) {
          return { stdout: '', stderr: 'tail: missing file operand', exitCode: 1 }
        }

        const fullPath = resolvePath(currentPath, filePath, username)

        if (!fs.exists(fullPath)) {
          return {
            stdout: '',
            stderr: `tail: cannot open '${filePath}' for reading: No such file or directory`,
            exitCode: 1,
          }
        }

        const stat = fs.stat(fullPath)

        // Check permissions
        if (stat.owner === 'root' && !isSudo) {
          return {
            stdout: '',
            stderr: `tail: cannot open '${filePath}' for reading: Permission denied`,
            exitCode: 1,
          }
        }

        if (stat.isDirectory()) {
          return {
            stdout: '',
            stderr: `tail: error reading '${filePath}': Is a directory`,
            exitCode: 1,
          }
        }

        try {
          const content = fs.readFile(fullPath, { encoding: 'utf8' }) as string
          const lines = content.split('\n')
          const startIndex = Math.max(0, lines.length - numLines)
          const output = lines.slice(startIndex).join('\n')
          return { stdout: output, stderr: '', exitCode: 0 }
        } catch (e) {
          return {
            stdout: '',
            stderr: `tail: ${e instanceof Error ? e.message : 'Error'}`,
            exitCode: 1,
          }
        }
      }

      case 'find': {
        if (args.length === 0) {
          return { stdout: '', stderr: 'find: missing operand', exitCode: 1 }
        }

        let searchPath = currentPath
        let namePattern: string | null = null
        let typeFilter: string | null = null
        let maxDepth: number | null = null
        let minDepth: number | null = null
        let mtimeValue: number | null = null

        // Parse arguments
        for (let i = 0; i < args.length; i++) {
          const arg = args[i]
          
          if (arg === '-name' && i + 1 < args.length) {
            namePattern = args[++i]
          } else if (arg === '-type' && i + 1 < args.length) {
            typeFilter = args[++i]
          } else if (arg === '-maxdepth' && i + 1 < args.length) {
            maxDepth = parseInt(args[++i])
          } else if (arg === '-mindepth' && i + 1 < args.length) {
            minDepth = parseInt(args[++i])
          } else if (arg === '-mtime' && i + 1 < args.length) {
            mtimeValue = parseInt(args[++i])
          } else if (!arg.startsWith('-')) {
            // First non-flag argument is the search path
            if (!namePattern && !typeFilter && !maxDepth) {
              searchPath = resolvePath(currentPath, arg, username)
            }
          }
        }

        // Check if path exists
        if (!fs.exists(searchPath)) {
          return {
            stdout: '',
            stderr: `find: '${searchPath}': No such file or directory`,
            exitCode: 1,
          }
        }

        // Check permissions
        const pathStat = fs.stat(searchPath)
        if (pathStat.owner === 'root' && !isSudo) {
          return {
            stdout: '',
            stderr: `find: '${searchPath}': Permission denied`,
            exitCode: 1,
          }
        }

        const results: string[] = []

        // Recursive search function
        const search = (path: string, depth: number = 0) => {
          try {
            const stat = fs.stat(path)

            // Check depth constraints
            if (maxDepth !== null && depth > maxDepth) return
            if (minDepth !== null && depth < minDepth) {
              // Don't add to results yet, but continue searching
              if (stat.isDirectory()) {
                const entries = fs.readdir(path)
                for (const entry of entries) {
                  const fullPath = path === '/' ? `/${entry}` : `${path}/${entry}`
                  search(fullPath, depth + 1)
                }
              }
              return
            }

            // Check type filter
            if (typeFilter) {
              if (typeFilter === 'f' && !stat.isDirectory()) {
                // File
              } else if (typeFilter === 'd' && stat.isDirectory()) {
                // Directory
              } else {
                // Type doesn't match, but continue searching if directory
                if (stat.isDirectory()) {
                  const entries = fs.readdir(path)
                  for (const entry of entries) {
                    const fullPath = path === '/' ? `/${entry}` : `${path}/${entry}`
                    search(fullPath, depth + 1)
                  }
                }
                return
              }
            }

            // Check name pattern
            if (namePattern) {
              const fileName = basename(path)
              const pattern = namePattern
                .replace(/\./g, '\\.')
                .replace(/\*/g, '.*')
                .replace(/\?/g, '.')
              const regex = new RegExp(`^${pattern}$`)
              
              if (regex.test(fileName)) {
                results.push(path)
              }
            } else {
              // No name filter, add all matching items
              results.push(path)
            }

            // Recurse into directories
            if (stat.isDirectory()) {
              try {
                const entries = fs.readdir(path)
                for (const entry of entries) {
                  const fullPath = path === '/' ? `/${entry}` : `${path}/${entry}`
                  try {
                    search(fullPath, depth + 1)
                  } catch (e) {
                    // Permission denied or other error, skip this entry
                  }
                }
              } catch (e) {
                // Can't read directory, skip
              }
            }
          } catch (e) {
            // Permission denied or other error, skip this path
          }
        }

        search(searchPath)

        return { 
          stdout: results.join('\n'), 
          stderr: '', 
          exitCode: results.length > 0 ? 0 : 1 
        }
      }

      case 'clear':
        return { stdout: '\x1b[2J\x1b[H', stderr: '', exitCode: 0 }

      case 'konami':
        // Secret command to skip mission/task - outputs special marker for mission layer
        return { 
          stdout: '🎮 CHEAT_CODE_ACTIVATED:SKIP_MISSION 🎮', 
          stderr: '', 
          exitCode: 0 
        }

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

/**
 * Execute a command with sudo privileges after password verification
 */
export function executeSudoCommand(
  command: string,
  password: string,
  context: ExecutionContext,
  fs: MEMFS
): CommandResult {
  const correctPassword = 'P@ssw0rd!'
  
  if (password !== correctPassword) {
    return {
      stdout: '',
      stderr: 'sudo: 3 incorrect password attempts',
      exitCode: 1,
    }
  }
  
  // Execute with sudo privileges
  return executeCommand(
    command,
    { ...context, isSudo: true },
    fs
  )
}
