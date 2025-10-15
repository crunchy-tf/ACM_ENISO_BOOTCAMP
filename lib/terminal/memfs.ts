/**
 * MEMFS - In-Memory Filesystem (Emscripten-style)
 * 
 * A proper POSIX-compliant filesystem implementation that behaves like
 * Emscripten's MEMFS. This provides real filesystem semantics instead of
 * simulated nested objects.
 */

export interface FSNode {
  mode: number          // File mode (type + permissions)
  timestamp: number     // Last modified timestamp
  parent: FSNode | null // Parent directory
  name: string          // Node name
  
  // For files
  contents?: Uint8Array
  
  // For directories
  entries?: Map<string, FSNode>
  
  // Metadata
  owner: string
}

export interface FSStats {
  mode: number
  size: number
  timestamp: number
  owner: string
  isDirectory(): boolean
  isFile(): boolean
}

// File mode constants (same as POSIX)
const S_IFMT = 0o170000   // File type mask
const S_IFDIR = 0o040000  // Directory
const S_IFREG = 0o100000  // Regular file
const S_IRWXU = 0o000700  // User RWX
const S_IRWXG = 0o000070  // Group RWX
const S_IRWXO = 0o000007  // Other RWX

export class MEMFS {
  private root: FSNode
  private nextInode: number = 1

  constructor() {
    // Create root directory
    this.root = this.createNode(null, '/', S_IFDIR | 0o755, 'root')
  }

  /**
   * Create a new filesystem node
   */
  private createNode(parent: FSNode | null, name: string, mode: number, owner: string = 'student'): FSNode {
    const node: FSNode = {
      mode,
      timestamp: Date.now(),
      parent,
      name,
      owner,
    }

    if (this.isDir(mode)) {
      node.entries = new Map()
    } else if (this.isFile(mode)) {
      node.contents = new Uint8Array(0)
    }

    return node
  }

  /**
   * Check if mode represents a directory
   */
  private isDir(mode: number): boolean {
    return (mode & S_IFMT) === S_IFDIR
  }

  /**
   * Check if mode represents a file
   */
  private isFile(mode: number): boolean {
    return (mode & S_IFMT) === S_IFREG
  }

  /**
   * Split path into components
   */
  private splitPath(path: string): string[] {
    return path.split('/').filter(p => p.length > 0)
  }

  /**
   * Lookup a node at the given path
   */
  private lookupNode(path: string, followSymlinks: boolean = true): FSNode | null {
    if (path === '/' || path === '') {
      return this.root
    }

    const parts = this.splitPath(path)
    let current = this.root

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]

      if (!this.isDir(current.mode)) {
        return null // Not a directory
      }

      if (!current.entries) {
        return null
      }

      const next = current.entries.get(part)
      if (!next) {
        return null // Not found
      }

      current = next
    }

    return current
  }

  /**
   * Get parent directory and name from path
   */
  private getPathInfo(path: string): { parent: FSNode | null; name: string } {
    if (path === '/') {
      return { parent: null, name: '/' }
    }

    const parts = this.splitPath(path)
    const name = parts.pop()!
    const parentPath = parts.length === 0 ? '/' : '/' + parts.join('/')
    const parent = this.lookupNode(parentPath)

    return { parent, name }
  }

  /**
   * Create a directory
   */
  mkdir(path: string, mode: number = 0o777): void {
    const { parent, name } = this.getPathInfo(path)

    if (!parent) {
      throw new Error(`ENOENT: parent directory does not exist: ${path}`)
    }

    if (!this.isDir(parent.mode)) {
      throw new Error(`ENOTDIR: parent is not a directory: ${path}`)
    }

    if (!parent.entries) {
      throw new Error(`ENOTDIR: parent has no entries: ${path}`)
    }

    if (parent.entries.has(name)) {
      throw new Error(`EEXIST: file already exists: ${path}`)
    }

    // Apply umask (simplified - just use provided mode)
    const nodeMode = S_IFDIR | (mode & 0o777)
    const node = this.createNode(parent, name, nodeMode, parent.owner)
    parent.entries.set(name, node)
  }

  /**
   * Create directories recursively
   */
  mkdirTree(path: string, mode: number = 0o777): void {
    const parts = this.splitPath(path)
    let currentPath = ''

    for (const part of parts) {
      currentPath += '/' + part
      
      try {
        this.mkdir(currentPath, mode)
      } catch (e) {
        // If it already exists, that's fine
        const node = this.lookupNode(currentPath)
        if (!node || !this.isDir(node.mode)) {
          throw e
        }
      }
    }
  }

  /**
   * Write data to a file
   */
  writeFile(path: string, data: string | Uint8Array, options?: { encoding?: string }): void {
    const { parent, name } = this.getPathInfo(path)

    if (!parent) {
      throw new Error(`ENOENT: parent directory does not exist: ${path}`)
    }

    if (!this.isDir(parent.mode)) {
      throw new Error(`ENOTDIR: parent is not a directory: ${path}`)
    }

    if (!parent.entries) {
      throw new Error(`ENOTDIR: parent has no entries: ${path}`)
    }

    // Convert string to Uint8Array if needed
    const contents = typeof data === 'string' 
      ? new TextEncoder().encode(data)
      : data

    let node = parent.entries.get(name)

    if (node) {
      // Update existing file
      if (!this.isFile(node.mode)) {
        throw new Error(`EISDIR: path is a directory: ${path}`)
      }
      node.contents = contents
      node.timestamp = Date.now()
    } else {
      // Create new file
      const mode = S_IFREG | 0o644
      node = this.createNode(parent, name, mode, parent.owner)
      node.contents = contents
      parent.entries.set(name, node)
    }
  }

  /**
   * Read data from a file
   */
  readFile(path: string, options?: { encoding?: string }): string | Uint8Array {
    const node = this.lookupNode(path)

    if (!node) {
      throw new Error(`ENOENT: no such file or directory: ${path}`)
    }

    if (!this.isFile(node.mode)) {
      throw new Error(`EISDIR: path is a directory: ${path}`)
    }

    if (!node.contents) {
      return options?.encoding === 'utf8' ? '' : new Uint8Array(0)
    }

    if (options?.encoding === 'utf8') {
      return new TextDecoder().decode(node.contents)
    }

    return node.contents
  }

  /**
   * Read directory contents
   */
  readdir(path: string): string[] {
    const node = this.lookupNode(path)

    if (!node) {
      throw new Error(`ENOENT: no such file or directory: ${path}`)
    }

    if (!this.isDir(node.mode)) {
      throw new Error(`ENOTDIR: not a directory: ${path}`)
    }

    if (!node.entries) {
      return []
    }

    // Return directory entries (excluding . and ..)
    return Array.from(node.entries.keys())
  }

  /**
   * Get file/directory stats
   */
  stat(path: string): FSStats {
    const node = this.lookupNode(path)

    if (!node) {
      throw new Error(`ENOENT: no such file or directory: ${path}`)
    }

    const size = this.isFile(node.mode) && node.contents 
      ? node.contents.length 
      : 0

    return {
      mode: node.mode,
      size,
      timestamp: node.timestamp,
      owner: node.owner,
      isDirectory: () => this.isDir(node.mode),
      isFile: () => this.isFile(node.mode),
    }
  }

  /**
   * Check if path exists
   */
  exists(path: string): boolean {
    return this.lookupNode(path) !== null
  }

  /**
   * Delete a file
   */
  unlink(path: string): void {
    const { parent, name } = this.getPathInfo(path)

    if (!parent) {
      throw new Error(`ENOENT: no such file or directory: ${path}`)
    }

    if (!parent.entries) {
      throw new Error(`ENOTDIR: parent has no entries: ${path}`)
    }

    const node = parent.entries.get(name)

    if (!node) {
      throw new Error(`ENOENT: no such file or directory: ${path}`)
    }

    if (this.isDir(node.mode)) {
      throw new Error(`EISDIR: is a directory: ${path}`)
    }

    parent.entries.delete(name)
  }

  /**
   * Delete a directory (must be empty)
   */
  rmdir(path: string): void {
    const { parent, name } = this.getPathInfo(path)

    if (!parent) {
      throw new Error(`ENOENT: no such file or directory: ${path}`)
    }

    if (!parent.entries) {
      throw new Error(`ENOTDIR: parent has no entries: ${path}`)
    }

    const node = parent.entries.get(name)

    if (!node) {
      throw new Error(`ENOENT: no such file or directory: ${path}`)
    }

    if (!this.isDir(node.mode)) {
      throw new Error(`ENOTDIR: not a directory: ${path}`)
    }

    if (node.entries && node.entries.size > 0) {
      throw new Error(`ENOTEMPTY: directory not empty: ${path}`)
    }

    parent.entries.delete(name)
  }

  /**
   * Rename/move a file or directory
   */
  rename(oldPath: string, newPath: string): void {
    const oldNode = this.lookupNode(oldPath)

    if (!oldNode) {
      throw new Error(`ENOENT: no such file or directory: ${oldPath}`)
    }

    const { parent: oldParent, name: oldName } = this.getPathInfo(oldPath)
    const { parent: newParent, name: newName } = this.getPathInfo(newPath)

    if (!oldParent || !newParent) {
      throw new Error(`ENOENT: parent directory does not exist`)
    }

    if (!oldParent.entries || !newParent.entries) {
      throw new Error(`ENOTDIR: parent has no entries`)
    }

    // Remove from old location
    oldParent.entries.delete(oldName)

    // Add to new location (overwrite if exists)
    oldNode.name = newName
    oldNode.parent = newParent
    newParent.entries.set(newName, oldNode)
  }

  /**
   * Set file owner
   */
  chown(path: string, owner: string): void {
    const node = this.lookupNode(path)

    if (!node) {
      throw new Error(`ENOENT: no such file or directory: ${path}`)
    }

    node.owner = owner
  }

  /**
   * Set file permissions
   */
  chmod(path: string, mode: number): void {
    const node = this.lookupNode(path)

    if (!node) {
      throw new Error(`ENOENT: no such file or directory: ${path}`)
    }

    // Preserve file type, only change permissions
    node.mode = (node.mode & S_IFMT) | (mode & 0o777)
  }

  /**
   * Analyze path (check existence and type)
   */
  analyzePath(path: string): { exists: boolean; isDirectory: boolean; isFile: boolean } {
    const node = this.lookupNode(path)

    if (!node) {
      return { exists: false, isDirectory: false, isFile: false }
    }

    return {
      exists: true,
      isDirectory: this.isDir(node.mode),
      isFile: this.isFile(node.mode),
    }
  }
}
