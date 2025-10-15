import { FileNode, FileSystem } from "./types"

/**
 * Navigate to a path in the filesystem
 */
export function resolvePath(currentPath: string, targetPath: string): string {
  // Handle absolute paths
  if (targetPath.startsWith("/")) {
    return normalizePath(targetPath)
  }

  // Handle relative paths
  const parts = currentPath.split("/").filter(Boolean)

  targetPath.split("/").forEach((part) => {
    if (part === "..") {
      parts.pop()
    } else if (part !== "." && part !== "") {
      parts.push(part)
    }
  })

  return "/" + parts.join("/")
}

/**
 * Normalize a path (remove double slashes, trailing slashes, etc.)
 */
export function normalizePath(path: string): string {
  const parts = path.split("/").filter(Boolean)
  return "/" + parts.join("/")
}

/**
 * Get a node at a specific path
 */
export function getNode(fs: FileSystem, path: string): FileNode | null {
  const normalizedPath = normalizePath(path)
  if (normalizedPath === "/") {
    return {
      type: "directory",
      name: "/",
      children: fs.root,
    }
  }

  const parts = normalizedPath.split("/").filter(Boolean)
  let current: FileNode | null = {
    type: "directory",
    name: "/",
    children: fs.root,
  }

  for (const part of parts) {
    if (!current || current.type !== "directory" || !current.children) {
      return null
    }
    current = current.children[part] || null
  }

  return current
}

/**
 * Get the parent directory path
 */
export function getParentPath(path: string): string {
  const parts = path.split("/").filter(Boolean)
  parts.pop()
  return "/" + parts.join("/")
}

/**
 * Get the basename of a path
 */
export function getBasename(path: string): string {
  const parts = path.split("/").filter(Boolean)
  return parts[parts.length - 1] || "/"
}

/**
 * List directory contents
 */
export function listDirectory(fs: FileSystem, path: string): string[] {
  const node = getNode(fs, path)
  if (!node || node.type !== "directory" || !node.children) {
    return []
  }
  return Object.keys(node.children).sort()
}

/**
 * Read file contents
 */
export function readFile(fs: FileSystem, path: string): string | null {
  const node = getNode(fs, path)
  if (!node || node.type !== "file") {
    return null
  }
  return node.content || ""
}

/**
 * Create a directory
 */
export function createDirectory(fs: FileSystem, path: string): boolean {
  const parentPath = getParentPath(path)
  const dirName = getBasename(path)
  const parent = getNode(fs, parentPath)

  if (!parent || parent.type !== "directory" || !parent.children) {
    return false
  }

  if (parent.children[dirName]) {
    return false // Already exists
  }

  parent.children[dirName] = {
    type: "directory",
    name: dirName,
    children: {},
    permissions: "rwxr-xr-x",
    owner: "user",
  }

  return true
}

/**
 * Remove a directory (must be empty)
 */
export function removeDirectory(fs: FileSystem, path: string): boolean {
  const node = getNode(fs, path)
  if (!node || node.type !== "directory") {
    return false
  }

  if (node.children && Object.keys(node.children).length > 0) {
    return false // Directory not empty
  }

  const parentPath = getParentPath(path)
  const dirName = getBasename(path)
  const parent = getNode(fs, parentPath)

  if (!parent || parent.type !== "directory" || !parent.children) {
    return false
  }

  delete parent.children[dirName]
  return true
}

/**
 * Remove a file or directory recursively
 */
export function removeNode(fs: FileSystem, path: string, recursive: boolean = false): boolean {
  const node = getNode(fs, path)
  if (!node) {
    return false
  }

  if (node.type === "directory" && !recursive) {
    if (node.children && Object.keys(node.children).length > 0) {
      return false
    }
  }

  const parentPath = getParentPath(path)
  const nodeName = getBasename(path)
  const parent = getNode(fs, parentPath)

  if (!parent || parent.type !== "directory" || !parent.children) {
    return false
  }

  delete parent.children[nodeName]
  return true
}

/**
 * Create or update a file
 */
export function writeFile(fs: FileSystem, path: string, content: string): boolean {
  const parentPath = getParentPath(path)
  const fileName = getBasename(path)
  const parent = getNode(fs, parentPath)

  if (!parent || parent.type !== "directory" || !parent.children) {
    return false
  }

  parent.children[fileName] = {
    type: "file",
    name: fileName,
    content,
    permissions: "rw-r--r--",
    owner: "user",
  }

  return true
}

/**
 * Copy a file or directory
 */
export function copyNode(fs: FileSystem, sourcePath: string, destPath: string): boolean {
  const sourceNode = getNode(fs, sourcePath)
  if (!sourceNode) {
    return false
  }

  const destParentPath = getParentPath(destPath)
  const destName = getBasename(destPath)
  const destParent = getNode(fs, destParentPath)

  if (!destParent || destParent.type !== "directory" || !destParent.children) {
    return false
  }

  // Deep clone the node
  destParent.children[destName] = JSON.parse(JSON.stringify(sourceNode))
  destParent.children[destName].name = destName

  return true
}

/**
 * Move a file or directory
 */
export function moveNode(fs: FileSystem, sourcePath: string, destPath: string): boolean {
  if (copyNode(fs, sourcePath, destPath)) {
    return removeNode(fs, sourcePath, true)
  }
  return false
}

/**
 * Find files matching a pattern (simple glob support)
 */
export function findFiles(
  fs: FileSystem,
  startPath: string,
  pattern: string,
  results: string[] = []
): string[] {
  const node = getNode(fs, startPath)
  if (!node) {
    return results
  }

  if (node.type === "file") {
    if (matchPattern(node.name, pattern)) {
      results.push(startPath)
    }
  } else if (node.children) {
    Object.keys(node.children).forEach((childName) => {
      const childPath = startPath === "/" ? `/${childName}` : `${startPath}/${childName}`
      findFiles(fs, childPath, pattern, results)
    })
  }

  return results
}

/**
 * Simple pattern matching (supports * wildcard)
 */
function matchPattern(text: string, pattern: string): boolean {
  const regexPattern = pattern.replace(/\*/g, ".*").replace(/\?/g, ".")
  const regex = new RegExp(`^${regexPattern}$`)
  return regex.test(text)
}

/**
 * Search for text in files (grep functionality)
 */
export function searchInFiles(
  fs: FileSystem,
  startPath: string,
  searchTerm: string,
  isRegex: boolean = false
): Array<{ path: string; matches: string[] }> {
  const results: Array<{ path: string; matches: string[] }> = []

  function search(path: string) {
    const node = getNode(fs, path)
    if (!node) return

    if (node.type === "file" && node.content) {
      const lines = node.content.split("\n")
      const matches: string[] = []

      lines.forEach((line, index) => {
        const matchFound = isRegex
          ? new RegExp(searchTerm).test(line)
          : line.includes(searchTerm)

        if (matchFound) {
          matches.push(`${index + 1}:${line}`)
        }
      })

      if (matches.length > 0) {
        results.push({ path, matches })
      }
    } else if (node.type === "directory" && node.children) {
      Object.keys(node.children).forEach((childName) => {
        const childPath = path === "/" ? `/${childName}` : `${path}/${childName}`
        search(childPath)
      })
    }
  }

  search(startPath)
  return results
}
