/**
 * Command Executor Bridge
 * Executes terminal commands using the mock WASM filesystem
 */

import { FileSystem } from "./types"
import {
  resolvePath,
  getNode,
  listDirectory,
  readFile,
  normalizePath,
  getBasename,
  searchInFiles,
  findFiles,
} from "./filesystem"

export interface CommandExecutionResult {
  stdout: string
  stderr: string
  exitCode: number
}

/**
 * Execute a command against the filesystem
 */
export function executeCommandOnFS(
  command: string,
  currentPath: string,
  fs: any, // Mock WASM FS
  fileSystem: FileSystem, // Original filesystem structure
  isSudo: boolean = false
): CommandExecutionResult {
  const parts = parseCommand(command)
  const cmd = parts[0]
  const args = parts.slice(1)

  try {
    // Check for restricted commands first
    const restrictedCommands = ["rm", "mkdir", "touch", "mv", "cp", "rmdir"]
    if (restrictedCommands.includes(cmd) && !isSudo) {
      const mission = (fileSystem as any).currentMission
      if (mission && mission.requireSudo) {
        return {
          stdout: "",
          stderr: `bash: ${cmd}: Permission denied. Try using sudo.`,
          exitCode: 1,
        }
      }
    }

    switch (cmd) {
      case "sudo":
        if (args.length === 0) {
          return {
            stdout: "",
            stderr: "sudo: a command must be specified",
            exitCode: 1,
          }
        }
        // Execute the command with sudo privileges
        return executeCommandOnFS(
          args.join(" "),
          currentPath,
          fs,
          fileSystem,
          true
        )
      case "ls":
        return handleLs(args, currentPath, fs, isSudo)
      case "pwd":
        return handlePwd(currentPath)
      case "cat":
        return handleCat(args, currentPath, fs, isSudo)
      case "grep":
        return handleGrep(args, currentPath, fs)
      case "find":
        return handleFind(args, currentPath, fs)
      case "head":
        return handleHead(args, currentPath, fs)
      case "tail":
        return handleTail(args, currentPath, fs)
      case "less":
      case "more":
        return handleLess(args, currentPath, fs)
      case "echo":
        return handleEcho(args)
      case "env":
        return handleEnv(currentPath)
      case "mkdir":
        return handleMkdir(args, currentPath, fs)
      case "touch":
        return handleTouch(args, currentPath, fs)
      case "rm":
        return handleRm(args, currentPath, fs)
      case "cp":
        return handleCp(args, currentPath, fs)
      case "mv":
        return handleMv(args, currentPath, fs)
      case "rmdir":
        return handleRmdir(args, currentPath, fs)
      default:
        return {
          stdout: "",
          stderr: `bash: ${cmd}: command not found`,
          exitCode: 127,
        }
    }
  } catch (error) {
    return {
      stdout: "",
      stderr: error instanceof Error ? error.message : String(error),
      exitCode: 1,
    }
  }
}

function parseCommand(command: string): string[] {
  const args: string[] = []
  let current = ""
  let inQuotes = false
  let quoteChar = ""

  for (let i = 0; i < command.length; i++) {
    const char = command[i]

    if ((char === '"' || char === "'") && !inQuotes) {
      inQuotes = true
      quoteChar = char
    } else if (char === quoteChar && inQuotes) {
      inQuotes = false
      quoteChar = ""
    } else if (char === " " && !inQuotes) {
      if (current) {
        args.push(current)
        current = ""
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

function handleLs(
  args: string[],
  currentPath: string,
  fs: any,
  isSudo: boolean = false
): CommandExecutionResult {
  console.log('[handleLs] Called with currentPath:', currentPath, 'args:', args)
  let longFormat = false
  let showAll = false
  let paths: string[] = []

  // If no path is provided, use the current working directory
  for (const arg of args) {
    if (arg.startsWith("-")) {
      if (arg.includes("l")) longFormat = true
      if (arg.includes("a")) showAll = true
    } else {
      paths.push(arg)
    }
  }

  if (paths.length === 0) {
    paths = [currentPath === "" ? "/" : currentPath]
  }

  console.log('[handleLs] Resolved paths:', paths)
  const output: string[] = []

  for (const path of paths) {
    const fullPath = path.startsWith("/") ? path : resolvePath(currentPath, path)
    console.log('[handleLs] Processing path:', path, '=> fullPath:', fullPath)

    try {
      // Check permissions for root-owned directories
      const node = getNode(fs, fullPath)
      if (node && node.owner === 'root' && !isSudo) {
        return {
          stdout: "",
          stderr: `ls: cannot open directory '${path}': Permission denied`,
          exitCode: 1,
        }
      }

      const pathInfo = fs.analyzePath(fullPath)

      if (!pathInfo.exists) {
        return {
          stdout: "",
          stderr: `ls: cannot access '${path}': No such file or directory`,
          exitCode: 2,
        }
      }

      if (!pathInfo.isDir) {
        if (longFormat) {
          output.push(
            `-rw-r--r--  1 student student    0 Oct 15 14:30 ${getBasename(
              path
            )}`
          )
        } else {
          output.push(getBasename(path))
        }
        continue
      }

      const files = fs.readdir(fullPath)
      const filtered = showAll
        ? files
        : files.filter((f: string) => !f.startsWith(".") && f !== "." && f !== "..")

      if (longFormat) {
        if (paths.length > 1) output.push(`${fullPath}:`)
        output.push(`total ${filtered.length}`)

        for (const file of filtered) {
          if (file === "." || file === "..") continue
          const filePath = fullPath === "/" ? `/${file}` : `${fullPath}/${file}`
          try {
            const fileInfo = fs.analyzePath(filePath)
            const fileNode = getNode(fs, filePath)
            const type = fileInfo.isDir ? "d" : "-"
            const perms = fileNode?.permissions
              ? formatPermissions(parseInt(fileNode.permissions, 8), type)
              : "----------"
            const size = fileInfo.isDir ? "4096" : "1234"
            const owner = fileNode?.owner || "student"
            output.push(
              `${perms}  1 ${owner} ${owner} ${size.padStart(
                8
              )} Oct 15 14:30 ${file}`
            )
          } catch (e) {
            output.push(
              `?????????? ?? student student     ???? ??? ?? ??:?? ${file}`
            )
          }
        }
      } else {
        if (paths.length > 1) output.push(`${fullPath}:`)
        output.push(
          filtered.filter((f: string) => f !== "." && f !== "..").join("  ")
        )
      }

      if (paths.length > 1) output.push("")
    } catch (e) {
      return {
        stdout: "",
        stderr: `ls: cannot access '${path}': ${e}`,
        exitCode: 2,
      }
    }
  }

  return {
    stdout: output.join("\n"),
    stderr: "",
    exitCode: 0,
  }
}

function formatPermissions(mode: number, type: "d" | "-"): string {
  const r = 4,
    w = 2,
    x = 1
  let result = type
  result += mode & r ? "r" : "-"
  result += mode & w ? "w" : "-"
  result += mode & x ? "x" : "-"
  result += mode & (r >> 3) ? "r" : "-"
  result += mode & (w >> 3) ? "w" : "-"
  result += mode & (x >> 3) ? "x" : "-"
  result += mode & (r >> 6) ? "r" : "-"
  result += mode & (w >> 6) ? "w" : "-"
  result += mode & (x >> 6) ? "x" : "-"
  return result
}

function handlePwd(currentPath: string): CommandExecutionResult {
  return {
    stdout: currentPath,
    stderr: "",
    exitCode: 0,
  }
}

function handleCat(
  args: string[],
  currentPath: string,
  fs: any,
  isSudo: boolean = false
): CommandExecutionResult {
  if (args.length === 0) {
    return {
      stdout: "",
      stderr: "cat: missing operand",
      exitCode: 1,
    }
  }

  const output: string[] = []

  for (const arg of args) {
    const fullPath = arg.startsWith("/") ? arg : resolvePath(currentPath, arg)

    try {
      const node = getNode(fs, fullPath)

      // Check if file is owned by root and requires sudo
      if (node && node.owner === 'root' && !isSudo) {
        return {
          stdout: "",
          stderr: `cat: ${arg}: Permission denied`,
          exitCode: 1,
        }
      }

      const content = fs.readFile(fullPath, { encoding: "utf8" })
      output.push(content)
    } catch (e) {
      return {
        stdout: output.join("\n"),
        stderr: `cat: ${getBasename(arg)}: No such file or directory`,
        exitCode: 1,
      }
    }
  }

  return {
    stdout: output.join("\n"),
    stderr: "",
    exitCode: 0,
  }
}

function handleGrep(args: string[], currentPath: string, fs: any): CommandExecutionResult {
  if (args.length < 2) {
    return {
      stdout: "",
      stderr: "grep: missing pattern or file",
      exitCode: 2,
    }
  }

  const pattern = args[0]
  let files = args.slice(1)
  const output: string[] = []
  let found = false

  // Expand wildcards
  const expandedFiles: string[] = []
  for (const filePattern of files) {
    if (filePattern === '*') {
      // Get all files in current directory
      try {
        const dirFiles = fs.readdir(currentPath)
        for (const file of dirFiles) {
          if (file !== '.' && file !== '..') {
            const filePath = resolvePath(currentPath, file)
            try {
              const fileInfo = fs.analyzePath(filePath)
              if (fileInfo.exists && !fileInfo.isDir) {
                expandedFiles.push(file)
              }
            } catch (e) {
              // Skip if can't access file
            }
          }
        }
      } catch (e) {
        // Skip if can't read directory
      }
    } else if (filePattern.includes('*') || filePattern.includes('?')) {
      // Pattern matching for wildcards
      const dirPath = filePattern.includes('/') 
        ? filePattern.substring(0, filePattern.lastIndexOf('/')) 
        : '.'
      const searchPath = dirPath === '.' 
        ? currentPath 
        : (dirPath.startsWith('/') ? dirPath : resolvePath(currentPath, dirPath))
      
      try {
        const dirFiles = fs.readdir(searchPath)
        const baseName = filePattern.includes('/') 
          ? filePattern.substring(filePattern.lastIndexOf('/') + 1) 
          : filePattern
        
        // Convert wildcard pattern to regex
        const regexPattern = '^' + baseName
          .replace(/\./g, '\\.')
          .replace(/\*/g, '.*')
          .replace(/\?/g, '.') + '$'
        const patternRegex = new RegExp(regexPattern)
        
        for (const file of dirFiles) {
          if (file !== '.' && file !== '..' && patternRegex.test(file)) {
            const filePath = searchPath === currentPath 
              ? file 
              : searchPath + '/' + file
            try {
              const fileInfo = fs.analyzePath(filePath.startsWith('/') ? filePath : resolvePath(currentPath, filePath))
              if (fileInfo.exists && !fileInfo.isDir) {
                expandedFiles.push(filePath)
              }
            } catch (e) {
              // Skip if can't access file
            }
          }
        }
      } catch (e) {
        // Skip if can't read directory
      }
    } else {
      expandedFiles.push(filePattern)
    }
  }

  // Use expanded files or fallback to original if no expansions
  files = expandedFiles.length > 0 ? expandedFiles : files

  for (const file of files) {
    const fullPath = file.startsWith("/") ? file : resolvePath(currentPath, file)

    try {
      const content = fs.readFile(fullPath, { encoding: "utf8" })
      const lines = content.split("\n")

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(pattern)) {
          found = true
          if (files.length > 1) {
            output.push(`${file}:${lines[i]}`)
          } else {
            output.push(lines[i])
          }
        }
      }
    } catch (e) {
      return {
        stdout: output.join("\n"),
        stderr: `grep: ${file}: No such file or directory`,
        exitCode: 2,
      }
    }
  }

  return {
    stdout: output.join("\n"),
    stderr: "",
    exitCode: found ? 0 : 1,
  }
}

function handleFind(args: string[], currentPath: string, fs: any): CommandExecutionResult {
  const searchPath = args[0] || currentPath
  const fullPath = searchPath.startsWith("/") ? searchPath : resolvePath(currentPath, searchPath)

  const results: string[] = []

  function search(path: string) {
    try {
      const files = fs.readdir(path)

      for (const file of files) {
        if (file === "." || file === "..") continue

        const filePath = path + "/" + file
        results.push(filePath)

        try {
          const fileInfo = fs.analyzePath(filePath)
          if (fileInfo.isDir) {
            search(filePath)
          }
        } catch (e) {
          // Skip if can't access
        }
      }
    } catch (e) {
      // Skip if can't read directory
    }
  }

  try {
    results.push(fullPath)
    const pathInfo = fs.analyzePath(fullPath)
    if (pathInfo.isDir) {
      search(fullPath)
    }
  } catch (e) {
    return {
      stdout: "",
      stderr: `find: '${searchPath}': No such file or directory`,
      exitCode: 1,
    }
  }

  return {
    stdout: results.join("\n"),
    stderr: "",
    exitCode: 0,
  }
}

function handleHead(args: string[], currentPath: string, fs: any): CommandExecutionResult {
  const lines = 10
  const file = args[0]

  if (!file) {
    return {
      stdout: "",
      stderr: "head: missing operand",
      exitCode: 1,
    }
  }

  const fullPath = file.startsWith("/") ? file : resolvePath(currentPath, file)

  try {
    const content = fs.readFile(fullPath, { encoding: "utf8" })
    const contentLines = content.split("\n")
    return {
      stdout: contentLines.slice(0, lines).join("\n"),
      stderr: "",
      exitCode: 0,
    }
  } catch (e) {
    return {
      stdout: "",
      stderr: `head: ${file}: No such file or directory`,
      exitCode: 1,
    }
  }
}

function handleTail(args: string[], currentPath: string, fs: any): CommandExecutionResult {
  const lines = 10
  const file = args[0]

  if (!file) {
    return {
      stdout: "",
      stderr: "tail: missing operand",
      exitCode: 1,
    }
  }

  const fullPath = file.startsWith("/") ? file : resolvePath(currentPath, file)

  try {
    const content = fs.readFile(fullPath, { encoding: "utf8" })
    const contentLines = content.split("\n")
    return {
      stdout: contentLines.slice(-lines).join("\n"),
      stderr: "",
      exitCode: 0,
    }
  } catch (e) {
    return {
      stdout: "",
      stderr: `tail: ${file}: No such file or directory`,
      exitCode: 1,
    }
  }
}

function handleLess(args: string[], currentPath: string, fs: any): CommandExecutionResult {
  return handleCat(args, currentPath, fs)
}

function handleEcho(args: string[]): CommandExecutionResult {
  return {
    stdout: args.join(" "),
    stderr: "",
    exitCode: 0,
  }
}

function handleEnv(currentPath: string): CommandExecutionResult {
  const username = currentPath.includes("student") ? "student" : "archivist"
  const output = [
    `USER=${username}`,
    `HOME=/home/${username}`,
    `PATH=/usr/local/bin:/usr/bin:/bin`,
    `SHELL=/bin/bash`,
    `PWD=${currentPath}`,
  ]

  return {
    stdout: output.join("\n"),
    stderr: "",
    exitCode: 0,
  }
}

function handleMkdir(args: string[], currentPath: string, fs: any): CommandExecutionResult {
  if (args.length === 0) {
    return {
      stdout: "",
      stderr: "mkdir: missing operand",
      exitCode: 1,
    }
  }

  let createParents = false
  const paths: string[] = []

  for (const arg of args) {
    if (arg === "-p") {
      createParents = true
    } else if (!arg.startsWith("-")) {
      paths.push(arg)
    }
  }

  if (paths.length === 0) {
    return {
      stdout: "",
      stderr: "mkdir: missing operand",
      exitCode: 1,
    }
  }

  for (const path of paths) {
    const fullPath = path.startsWith("/") ? path : resolvePath(currentPath, path)

    try {
      if (createParents) {
        // Create parent directories recursively
        const parts = fullPath.split("/").filter(Boolean)
        let currentDir = ""
        for (const part of parts) {
          currentDir += "/" + part
          try {
            const info = fs.analyzePath(currentDir)
            if (!info.exists) {
              fs.mkdir(currentDir)
            }
          } catch (e) {
            fs.mkdir(currentDir)
          }
        }
      } else {
        // Check if parent exists
        const parentPath = fullPath.substring(0, fullPath.lastIndexOf("/")) || "/"
        const parentInfo = fs.analyzePath(parentPath)
        if (!parentInfo.exists) {
          return {
            stdout: "",
            stderr: `mkdir: cannot create directory '${path}': No such file or directory`,
            exitCode: 1,
          }
        }

        const info = fs.analyzePath(fullPath)
        if (info.exists) {
          return {
            stdout: "",
            stderr: `mkdir: cannot create directory '${path}': File exists`,
            exitCode: 1,
          }
        }

        fs.mkdir(fullPath)
      }
    } catch (e) {
      return {
        stdout: "",
        stderr: `mkdir: cannot create directory '${path}': ${e}`,
        exitCode: 1,
      }
    }
  }

  return {
    stdout: "",
    stderr: "",
    exitCode: 0,
  }
}

function handleTouch(args: string[], currentPath: string, fs: any): CommandExecutionResult {
  if (args.length === 0) {
    return {
      stdout: "",
      stderr: "touch: missing file operand",
      exitCode: 1,
    }
  }

  for (const file of args) {
    const fullPath = file.startsWith("/") ? file : resolvePath(currentPath, file)

    try {
      const info = fs.analyzePath(fullPath)
      if (!info.exists) {
        fs.writeFile(fullPath, "", { encoding: "utf8" })
      }
      // If file exists, we would update timestamp, but mock FS doesn't track that
    } catch (e) {
      return {
        stdout: "",
        stderr: `touch: cannot touch '${file}': ${e}`,
        exitCode: 1,
      }
    }
  }

  return {
    stdout: "",
    stderr: "",
    exitCode: 0,
  }
}

function handleRm(args: string[], currentPath: string, fs: any): CommandExecutionResult {
  if (args.length === 0) {
    return {
      stdout: "",
      stderr: "rm: missing operand",
      exitCode: 1,
    }
  }

  let recursive = false
  let force = false
  const paths: string[] = []

  for (const arg of args) {
    if (arg === "-r" || arg === "-R") {
      recursive = true
    } else if (arg === "-f") {
      force = true
    } else if (arg === "-rf" || arg === "-fr") {
      recursive = true
      force = true
    } else if (!arg.startsWith("-")) {
      paths.push(arg)
    }
  }

  if (paths.length === 0) {
    return {
      stdout: "",
      stderr: "rm: missing operand",
      exitCode: 1,
    }
  }

  for (const path of paths) {
    const fullPath = path.startsWith("/") ? path : resolvePath(currentPath, path)

    try {
      const info = fs.analyzePath(fullPath)
      
      if (!info.exists) {
        if (!force) {
          return {
            stdout: "",
            stderr: `rm: cannot remove '${path}': No such file or directory`,
            exitCode: 1,
          }
        }
        continue
      }

      if (info.isDir) {
        if (!recursive) {
          return {
            stdout: "",
            stderr: `rm: cannot remove '${path}': Is a directory`,
            exitCode: 1,
          }
        }
        // Recursive delete
        removeRecursive(fullPath, fs)
      } else {
        fs.unlink(fullPath)
      }
    } catch (e) {
      if (!force) {
        return {
          stdout: "",
          stderr: `rm: cannot remove '${path}': ${e}`,
          exitCode: 1,
        }
      }
    }
  }

  return {
    stdout: "",
    stderr: "",
    exitCode: 0,
  }
}

function removeRecursive(path: string, fs: any): void {
  try {
    const files = fs.readdir(path)
    for (const file of files) {
      if (file === "." || file === "..") continue
      const filePath = path + "/" + file
      const info = fs.analyzePath(filePath)
      if (info.isDir) {
        removeRecursive(filePath, fs)
      } else {
        fs.unlink(filePath)
      }
    }
    fs.rmdir(path)
  } catch (e) {
    // Ignore errors in recursive delete
  }
}

function handleRmdir(args: string[], currentPath: string, fs: any): CommandExecutionResult {
  if (args.length === 0) {
    return {
      stdout: "",
      stderr: "rmdir: missing operand",
      exitCode: 1,
    }
  }

  for (const path of args) {
    const fullPath = path.startsWith("/") ? path : resolvePath(currentPath, path)

    try {
      const info = fs.analyzePath(fullPath)
      
      if (!info.exists) {
        return {
          stdout: "",
          stderr: `rmdir: failed to remove '${path}': No such file or directory`,
          exitCode: 1,
        }
      }

      if (!info.isDir) {
        return {
          stdout: "",
          stderr: `rmdir: failed to remove '${path}': Not a directory`,
          exitCode: 1,
        }
      }

      const files = fs.readdir(fullPath).filter((f: string) => f !== "." && f !== "..")
      if (files.length > 0) {
        return {
          stdout: "",
          stderr: `rmdir: failed to remove '${path}': Directory not empty`,
          exitCode: 1,
        }
      }

      fs.rmdir(fullPath)
    } catch (e) {
      return {
        stdout: "",
        stderr: `rmdir: failed to remove '${path}': ${e}`,
        exitCode: 1,
      }
    }
  }

  return {
    stdout: "",
    stderr: "",
    exitCode: 0,
  }
}

function handleCp(args: string[], currentPath: string, fs: any): CommandExecutionResult {
  if (args.length < 2) {
    return {
      stdout: "",
      stderr: "cp: missing file operand",
      exitCode: 1,
    }
  }

  let recursive = false
  const paths: string[] = []

  for (const arg of args) {
    if (arg === "-r" || arg === "-R") {
      recursive = true
    } else if (!arg.startsWith("-")) {
      paths.push(arg)
    }
  }

  if (paths.length < 2) {
    return {
      stdout: "",
      stderr: "cp: missing destination file operand",
      exitCode: 1,
    }
  }

  const dest = paths[paths.length - 1]
  const sources = paths.slice(0, -1)
  const destFullPath = dest.startsWith("/") ? dest : resolvePath(currentPath, dest)

  try {
    const destInfo = fs.analyzePath(destFullPath)
    const destIsDir = destInfo.exists && destInfo.isDir

    for (const source of sources) {
      const srcFullPath = source.startsWith("/") ? source : resolvePath(currentPath, source)
      
      try {
        const srcInfo = fs.analyzePath(srcFullPath)
        
        if (!srcInfo.exists) {
          return {
            stdout: "",
            stderr: `cp: cannot stat '${source}': No such file or directory`,
            exitCode: 1,
          }
        }

        if (srcInfo.isDir && !recursive) {
          return {
            stdout: "",
            stderr: `cp: -r not specified; omitting directory '${source}'`,
            exitCode: 1,
          }
        }

        let targetPath = destFullPath
        if (destIsDir) {
          const basename = srcFullPath.split("/").pop()
          targetPath = destFullPath + "/" + basename
        }

        if (srcInfo.isDir) {
          copyRecursive(srcFullPath, targetPath, fs)
        } else {
          const content = fs.readFile(srcFullPath, { encoding: "utf8" })
          fs.writeFile(targetPath, content, { encoding: "utf8" })
        }
      } catch (e) {
        return {
          stdout: "",
          stderr: `cp: cannot copy '${source}': ${e}`,
          exitCode: 1,
        }
      }
    }
  } catch (e) {
    // Dest doesn't exist, which is fine for single file copy
    if (sources.length === 1) {
      try {
        const srcFullPath = sources[0].startsWith("/") ? sources[0] : resolvePath(currentPath, sources[0])
        const srcInfo = fs.analyzePath(srcFullPath)
        
        if (!srcInfo.exists) {
          return {
            stdout: "",
            stderr: `cp: cannot stat '${sources[0]}': No such file or directory`,
            exitCode: 1,
          }
        }

        if (srcInfo.isDir && !recursive) {
          return {
            stdout: "",
            stderr: `cp: -r not specified; omitting directory '${sources[0]}'`,
            exitCode: 1,
          }
        }

        if (srcInfo.isDir) {
          copyRecursive(srcFullPath, destFullPath, fs)
        } else {
          const content = fs.readFile(srcFullPath, { encoding: "utf8" })
          fs.writeFile(destFullPath, content, { encoding: "utf8" })
        }
      } catch (e) {
        return {
          stdout: "",
          stderr: `cp: cannot copy: ${e}`,
          exitCode: 1,
        }
      }
    } else {
      return {
        stdout: "",
        stderr: `cp: target '${dest}' is not a directory`,
        exitCode: 1,
      }
    }
  }

  return {
    stdout: "",
    stderr: "",
    exitCode: 0,
  }
}

function copyRecursive(src: string, dest: string, fs: any): void {
  fs.mkdir(dest)
  const files = fs.readdir(src)
  
  for (const file of files) {
    if (file === "." || file === "..") continue
    const srcPath = src + "/" + file
    const destPath = dest + "/" + file
    const info = fs.analyzePath(srcPath)
    
    if (info.isDir) {
      copyRecursive(srcPath, destPath, fs)
    } else {
      const content = fs.readFile(srcPath, { encoding: "utf8" })
      fs.writeFile(destPath, content, { encoding: "utf8" })
    }
  }
}

function handleMv(args: string[], currentPath: string, fs: any): CommandExecutionResult {
  if (args.length < 2) {
    return {
      stdout: "",
      stderr: "mv: missing file operand",
      exitCode: 1,
    }
  }

  const dest = args[args.length - 1]
  const sources = args.slice(0, -1)
  const destFullPath = dest.startsWith("/") ? dest : resolvePath(currentPath, dest)

  try {
    const destInfo = fs.analyzePath(destFullPath)
    const destIsDir = destInfo.exists && destInfo.isDir

    for (const source of sources) {
      const srcFullPath = source.startsWith("/") ? source : resolvePath(currentPath, source)
      
      try {
        const srcInfo = fs.analyzePath(srcFullPath)
        
        if (!srcInfo.exists) {
          return {
            stdout: "",
            stderr: `mv: cannot stat '${source}': No such file or directory`,
            exitCode: 1,
          }
        }

        let targetPath = destFullPath
        if (destIsDir) {
          const basename = srcFullPath.split("/").pop()
          targetPath = destFullPath + "/" + basename
        }

        // Copy then delete
        if (srcInfo.isDir) {
          copyRecursive(srcFullPath, targetPath, fs)
          removeRecursive(srcFullPath, fs)
        } else {
          const content = fs.readFile(srcFullPath, { encoding: "utf8" })
          fs.writeFile(targetPath, content, { encoding: "utf8" })
          fs.unlink(srcFullPath)
        }
      } catch (e) {
        return {
          stdout: "",
          stderr: `mv: cannot move '${source}': ${e}`,
          exitCode: 1,
        }
      }
    }
  } catch (e) {
    // Dest doesn't exist, rename single source
    if (sources.length === 1) {
      try {
        const srcFullPath = sources[0].startsWith("/") ? sources[0] : resolvePath(currentPath, sources[0])
        const srcInfo = fs.analyzePath(srcFullPath)
        
        if (!srcInfo.exists) {
          return {
            stdout: "",
            stderr: `mv: cannot stat '${sources[0]}': No such file or directory`,
            exitCode: 1,
          }
        }

        if (srcInfo.isDir) {
          copyRecursive(srcFullPath, destFullPath, fs)
          removeRecursive(srcFullPath, fs)
        } else {
          const content = fs.readFile(srcFullPath, { encoding: "utf8" })
          fs.writeFile(destFullPath, content, { encoding: "utf8" })
          fs.unlink(srcFullPath)
        }
      } catch (e) {
        return {
          stdout: "",
          stderr: `mv: cannot move: ${e}`,
          exitCode: 1,
        }
      }
    } else {
      return {
        stdout: "",
        stderr: `mv: target '${dest}' is not a directory`,
        exitCode: 1,
      }
    }
  }

  return {
    stdout: "",
    stderr: "",
    exitCode: 0,
  }
}
