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
 * Parse flags and arguments from command arguments
 * Returns flags as a Set and non-flag arguments as an array
 */
interface ParsedArgs {
  flags: Set<string>
  args: string[]
  namedArgs: Map<string, string> // For args like -n 10, --name value
}

function parseArgs(args: string[], namedOptions: string[] = []): ParsedArgs {
  const flags = new Set<string>()
  const nonFlagArgs: string[] = []
  const namedArgs = new Map<string, string>()
  
  let i = 0
  while (i < args.length) {
    const arg = args[i]
    
    if (arg.startsWith('--')) {
      // Long option like --name
      const optName = arg.substring(2)
      const nextArg = i + 1 < args.length ? args[i + 1] : null
      if (nextArg && !nextArg.startsWith('-')) {
        namedArgs.set(optName, nextArg)
        i += 2
      } else {
        flags.add(optName)
        i++
      }
    } else if (arg.startsWith('-') && arg.length > 1) {
      // Check if this is a named option that expects a value
      const firstChar = arg.substring(1)
      
      // Check if it's a number like -10 or -20 (for head/tail)
      const numValue = parseInt(firstChar)
      if (!isNaN(numValue) && firstChar === numValue.toString()) {
        // It's a numeric flag like -10
        flags.add(firstChar)
        i++
        continue
      }
      
      // Check if it's in the named options list (e.g., 'n', 'name', 'type')
      if (namedOptions.includes(firstChar) && i + 1 < args.length && !args[i + 1].startsWith('-')) {
        namedArgs.set(firstChar, args[i + 1])
        i += 2
        continue
      }
      
      // For single-char flags followed by a value (could be either flag or named arg)
      if (arg.length === 2 && i + 1 < args.length && !args[i + 1].startsWith('-')) {
        // If next arg looks like a value, treat as named arg
        // Otherwise, treat as flag
        const nextArg = args[i + 1]
        if (namedOptions.includes(firstChar) || /^\d+$/.test(nextArg)) {
          namedArgs.set(firstChar, nextArg)
          i += 2
          continue
        }
      }
      
      // Short flags like -rf or -la
      for (let j = 1; j < arg.length; j++) {
        flags.add(arg[j])
      }
      i++
    } else {
      // Not a flag, regular argument
      nonFlagArgs.push(arg)
      i++
    }
  }
  
  return { flags, args: nonFlagArgs, namedArgs }
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
        const parsed = parseArgs(args)
        const longFormat = parsed.flags.has('l')
        const showAll = parsed.flags.has('a') || parsed.flags.has('A')
        const paths = parsed.args.length > 0 ? parsed.args : [currentPath]

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

        const parsed = parseArgs(args)
        const recursive = parsed.flags.has('r') || parsed.flags.has('R')
        const ignoreCase = parsed.flags.has('i')
        const invertMatch = parsed.flags.has('v')
        const lineNumber = parsed.flags.has('n')
        
        if (parsed.args.length === 0) {
          return { stdout: '', stderr: 'grep: missing pattern', exitCode: 2 }
        }
        
        const pattern = parsed.args[0]
        let files = parsed.args.slice(1)

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

        const parsed = parseArgs(args)
        const parents = parsed.flags.has('p')
        
        if (parsed.args.length === 0) {
          return { stdout: '', stderr: 'mkdir: missing operand', exitCode: 1 }
        }

        for (const dir of parsed.args) {
          const fullPath = resolvePath(currentPath, dir, username)

          try {
            if (parents) {
              // Create parent directories if needed
              const parts = fullPath.split('/').filter(Boolean)
              let currentDir = '/'
              for (const part of parts) {
                currentDir = `${currentDir}${part}/`.replace(/\/+/g, '/')
                if (!fs.exists(currentDir)) {
                  fs.mkdir(currentDir)
                }
              }
            } else {
              fs.mkdir(fullPath)
            }
          } catch (e) {
            return {
              stdout: '',
              stderr: `mkdir: cannot create directory '${dir}': ${e instanceof Error ? e.message : 'Error'}`,
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

        const parsed = parseArgs(args)
        const recursive = parsed.flags.has('r') || parsed.flags.has('R')
        const force = parsed.flags.has('f')
        
        if (parsed.args.length === 0) {
          return { stdout: '', stderr: 'rm: missing operand', exitCode: 1 }
        }

        for (const target of parsed.args) {
          const fullPath = resolvePath(currentPath, target, username)

          try {
            if (!fs.exists(fullPath)) {
              if (!force) {
                return {
                  stdout: '',
                  stderr: `rm: cannot remove '${target}': No such file or directory`,
                  exitCode: 1,
                }
              }
              continue
            }
            
            const stat = fs.stat(fullPath)
            
            if (stat.isDirectory()) {
              if (!recursive) {
                return {
                  stdout: '',
                  stderr: `rm: cannot remove '${target}': Is a directory`,
                  exitCode: 1,
                }
              }
              // Recursive directory removal
              const removeDir = (dirPath: string) => {
                const entries = fs.readdir(dirPath)
                for (const entry of entries) {
                  const entryPath = dirPath === '/' ? `/${entry}` : `${dirPath}/${entry}`
                  const entryStat = fs.stat(entryPath)
                  
                  if (entryStat.isDirectory()) {
                    removeDir(entryPath)
                  } else {
                    fs.unlink(entryPath)
                  }
                }
                fs.rmdir(dirPath)
              }
              
              removeDir(fullPath)
              
              // Verify removal succeeded
              if (fs.exists(fullPath)) {
                throw new Error('Failed to remove directory')
              }
            } else {
              fs.unlink(fullPath)
              
              // Verify removal succeeded
              if (fs.exists(fullPath)) {
                throw new Error('Failed to remove file')
              }
            }
          } catch (e) {
            if (!force) {
              return {
                stdout: '',
                stderr: `rm: cannot remove '${target}': ${e instanceof Error ? e.message : 'Error'}`,
                exitCode: 1,
              }
            }
          }
        }

        return { stdout: '', stderr: '', exitCode: 0 }
      }

      case 'rmdir': {
        if (args.length === 0) {
          return { stdout: '', stderr: 'rmdir: missing operand', exitCode: 1 }
        }

        const parsed = parseArgs(args)
        const parents = parsed.flags.has('p')
        
        if (parsed.args.length === 0) {
          return { stdout: '', stderr: 'rmdir: missing operand', exitCode: 1 }
        }

        for (const target of parsed.args) {
          const fullPath = resolvePath(currentPath, target, username)

          try {
            if (!fs.exists(fullPath)) {
              return {
                stdout: '',
                stderr: `rmdir: failed to remove '${target}': No such file or directory`,
                exitCode: 1,
              }
            }
            
            const stat = fs.stat(fullPath)
            if (!stat.isDirectory()) {
              return {
                stdout: '',
                stderr: `rmdir: failed to remove '${target}': Not a directory`,
                exitCode: 1,
              }
            }
            
            fs.rmdir(fullPath)
          } catch (e) {
            return {
              stdout: '',
              stderr: `rmdir: failed to remove '${target}': ${e instanceof Error ? e.message : 'Error'}`,
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

        const parsed = parseArgs(args)
        const recursive = parsed.flags.has('r') || parsed.flags.has('R')
        
        if (parsed.args.length < 2) {
          return { stdout: '', stderr: 'cp: missing destination file operand', exitCode: 1 }
        }

        const sources = parsed.args.slice(0, -1)
        let dest = resolvePath(currentPath, parsed.args[parsed.args.length - 1], username)

        for (const src of sources) {
          const source = resolvePath(currentPath, src, username)

          try {
            if (!fs.exists(source)) {
              return {
                stdout: '',
                stderr: `cp: cannot stat '${src}': No such file or directory`,
                exitCode: 1,
              }
            }

            const sourceStat = fs.stat(source)
            
            if (sourceStat.isDirectory() && !recursive) {
              return {
                stdout: '',
                stderr: `cp: -r not specified; omitting directory '${src}'`,
                exitCode: 1,
              }
            }

            // If destination is a directory, append the source filename
            let targetPath = dest
            if (fs.exists(dest)) {
              const destStat = fs.stat(dest)
              if (destStat.isDirectory()) {
                const sourceFilename = basename(source)
                targetPath = dest === '/' ? `/${sourceFilename}` : `${dest}/${sourceFilename}`
              }
            }

            if (sourceStat.isDirectory()) {
              // Recursive copy - simplified version
              const copyDir = (srcPath: string, dstPath: string) => {
                if (!fs.exists(dstPath)) {
                  fs.mkdir(dstPath)
                }
                
                const entries = fs.readdir(srcPath)
                for (const entry of entries) {
                  const srcEntry = srcPath === '/' ? `/${entry}` : `${srcPath}/${entry}`
                  const dstEntry = dstPath === '/' ? `/${entry}` : `${dstPath}/${entry}`
                  
                  const entryStat = fs.stat(srcEntry)
                  if (entryStat.isDirectory()) {
                    copyDir(srcEntry, dstEntry)
                  } else {
                    const content = fs.readFile(srcEntry) as Uint8Array
                    fs.writeFile(dstEntry, content)
                  }
                }
              }
              
              copyDir(source, targetPath)
            } else {
              const content = fs.readFile(source) as Uint8Array
              fs.writeFile(targetPath, content)
            }
          } catch (e) {
            return {
              stdout: '',
              stderr: `cp: ${e instanceof Error ? e.message : 'Error'}`,
              exitCode: 1,
            }
          }
        }

        return { stdout: '', stderr: '', exitCode: 0 }
      }

      case 'mv': {
        if (args.length < 2) {
          return { stdout: '', stderr: 'mv: missing file operand', exitCode: 1 }
        }

        const parsed = parseArgs(args)
        const force = parsed.flags.has('f')
        
        if (parsed.args.length < 2) {
          return { stdout: '', stderr: 'mv: missing destination file operand', exitCode: 1 }
        }

        const sources = parsed.args.slice(0, -1)
        let dest = resolvePath(currentPath, parsed.args[parsed.args.length - 1], username)

        for (const src of sources) {
          const source = resolvePath(currentPath, src, username)

          try {
            if (!fs.exists(source)) {
              if (!force) {
                return {
                  stdout: '',
                  stderr: `mv: cannot stat '${src}': No such file or directory`,
                  exitCode: 1,
                }
              }
              continue
            }
            
            // If destination is a directory, append the source filename
            let targetPath = dest
            if (fs.exists(dest)) {
              const destStat = fs.stat(dest)
              if (destStat.isDirectory()) {
                const sourceFilename = basename(source)
                targetPath = dest === '/' ? `/${sourceFilename}` : `${dest}/${sourceFilename}`
              }
            }

            fs.rename(source, targetPath)
          } catch (e) {
            if (!force) {
              return {
                stdout: '',
                stderr: `mv: ${e instanceof Error ? e.message : 'Error'}`,
                exitCode: 1,
              }
            }
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

        const parsed = parseArgs(args, ['n'])
        let numLines = 10 // Default to 10 lines
        
        // Check for -n flag
        if (parsed.namedArgs.has('n')) {
          const value = parsed.namedArgs.get('n')!
          numLines = parseInt(value)
          if (isNaN(numLines) || numLines < 0) {
            return {
              stdout: '',
              stderr: 'head: invalid number of lines',
              exitCode: 1,
            }
          }
        }
        
        // Check for shorthand -10 format
        for (const flag of parsed.flags) {
          const num = parseInt(flag)
          if (!isNaN(num) && num > 0) {
            numLines = num
            break
          }
        }
        
        if (parsed.args.length === 0) {
          return { stdout: '', stderr: 'head: missing file operand', exitCode: 1 }
        }

        const filePath = parsed.args[0]
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

        const parsed = parseArgs(args, ['n'])
        let numLines = 10 // Default to 10 lines
        
        // Check for -n flag
        if (parsed.namedArgs.has('n')) {
          const value = parsed.namedArgs.get('n')!
          numLines = parseInt(value)
          if (isNaN(numLines) || numLines < 0) {
            return {
              stdout: '',
              stderr: 'tail: invalid number of lines',
              exitCode: 1,
            }
          }
        }
        
        // Check for shorthand -20 format
        for (const flag of parsed.flags) {
          const num = parseInt(flag)
          if (!isNaN(num) && num > 0) {
            numLines = num
            break
          }
        }
        
        if (parsed.args.length === 0) {
          return { stdout: '', stderr: 'tail: missing file operand', exitCode: 1 }
        }

        const filePath = parsed.args[0]
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

        const parsed = parseArgs(args, ['name', 'type', 'maxdepth', 'mindepth', 'mtime'])
        let searchPath = currentPath
        let namePattern: string | null = null
        let typeFilter: string | null = null
        let maxDepth: number | null = null
        let minDepth: number | null = null

        // Get named arguments
        if (parsed.namedArgs.has('name')) {
          namePattern = parsed.namedArgs.get('name')!
        }
        if (parsed.namedArgs.has('type')) {
          typeFilter = parsed.namedArgs.get('type')!
        }
        if (parsed.namedArgs.has('maxdepth')) {
          maxDepth = parseInt(parsed.namedArgs.get('maxdepth')!)
        }
        if (parsed.namedArgs.has('mindepth')) {
          minDepth = parseInt(parsed.namedArgs.get('mindepth')!)
        }
        
        // First non-flag argument is the search path
        if (parsed.args.length > 0) {
          searchPath = resolvePath(currentPath, parsed.args[0], username)
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
