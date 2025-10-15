/**
 * WASM BusyBox Integration Layer
 * Loads BusyBox WASM and provides a bridge between xterm.js and the WASM runtime
 */

import { executeCommandOnFS } from './command-executor'
import { FileSystem } from './types'

export interface BusyBoxInstance {
  callMain: (args: string[]) => number
  FS: any // Emscripten filesystem API
  MEMFS: any
  IDBFS: any
  stdout: string
  stderr: string
  stdin: string
}

export interface ExecutionContext {
  currentPath: string
  fileSystem: FileSystem
}

export interface WASMBusyBoxConfig {
  wasmUrl?: string
  onStdout?: (data: string) => void
  onStderr?: (data: string) => void
  onExit?: (code: number) => void
}

/**
 * BusyBox WASM Runtime Manager
 */
export class BusyBoxWASM {
  private instance: BusyBoxInstance | null = null
  private loading: boolean = false
  private loaded: boolean = false
  private config: WASMBusyBoxConfig
  private stdoutBuffer: string = ""
  private stderrBuffer: string = ""
  private executionContext: ExecutionContext | null = null

  constructor(config: WASMBusyBoxConfig = {}) {
    this.config = {
      wasmUrl: config.wasmUrl || '/busybox.wasm',
      onStdout: config.onStdout || (() => {}),
      onStderr: config.onStderr || (() => {}),
      onExit: config.onExit || (() => {}),
    }
  }

  /**
   * Set execution context for command execution
   */
  setExecutionContext(context: ExecutionContext): void {
    this.executionContext = context
  }

  /**
   * Load BusyBox WASM module
   */
  async load(): Promise<void> {
    if (this.loaded) return
    if (this.loading) {
      // Wait for existing load to complete
      await new Promise((resolve) => {
        const check = setInterval(() => {
          if (this.loaded) {
            clearInterval(check)
            resolve(true)
          }
        }, 100)
      })
      return
    }

    this.loading = true

    try {
      // For now, we'll use a mock implementation
      // In production, this would load the actual BusyBox WASM
      await this.loadMockBusyBox()
      this.loaded = true
    } catch (error) {
      console.error('Failed to load BusyBox WASM:', error)
      throw error
    } finally {
      this.loading = false
    }
  }

  /**
   * Mock BusyBox implementation for demonstration
   * In production, replace with actual WASM loading
   */
  private async loadMockBusyBox(): Promise<void> {
    // Simulate async loading
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Create a mock Emscripten-like instance
    this.instance = {
      callMain: (args: string[]) => {
        const cmd = args[0]
        // Return 0 for success, 1 for error
        return 0
      },
      FS: this.createMockFS(),
      MEMFS: {},
      IDBFS: {},
      stdout: '',
      stderr: '',
      stdin: '',
    }
  }

  /**
   * Create mock Emscripten FS API
   */
  private createMockFS() {
    const storage: Record<string, any> = {}
    const metadata: Record<string, { owner: string; permissions: number }> = {}

    return {
      // Internal metadata storage (accessible for initializeFilesystem)
      _nodeMetadata: metadata,

      // Mount filesystem
      mount: (type: any, opts: any, mountpoint: string) => {
        storage[mountpoint] = { type, opts, files: {} }
      },

      // Create directory
      mkdir: (path: string, mode?: number) => {
        console.log('[mkdir] Creating directory:', path, 'mode:', mode)
        const parts = path.split('/').filter(Boolean)
        console.log('[mkdir] Parts:', parts)
        let current = storage
        for (const part of parts) {
          if (!current[part]) {
            current[part] = { 
              type: 'dir', 
              files: {},
              owner: 'student',
              permissions: mode || 0o755
            }
            console.log('[mkdir] Created new directory node:', part)
          }
          current = current[part].files
        }
        console.log('[mkdir] Final storage structure at path:', JSON.stringify(storage, null, 2).substring(0, 500))
      },

      // Write file
      writeFile: (path: string, data: string | Uint8Array, opts?: { encoding?: string }) => {
        const parts = path.split('/').filter(Boolean)
        const filename = parts.pop()!
        let current = storage
        for (const part of parts) {
          if (!current[part]) {
            current[part] = { type: 'dir', files: {}, owner: 'student', permissions: 0o755 }
          }
          current = current[part].files
        }
        current[filename] = {
          type: 'file',
          content: typeof data === 'string' ? data : new TextDecoder().decode(data),
          owner: 'student',
          permissions: 0o644
        }
      },

      // Read file
      readFile: (path: string, opts?: { encoding?: string }) => {
        const parts = path.split('/').filter(Boolean)
        const filename = parts.pop()!
        let current = storage
        for (const part of parts) {
          if (!current[part]) throw new Error(`Path not found: ${path}`)
          current = current[part].files
        }
        if (!current[filename]) throw new Error(`File not found: ${path}`)
        const content = current[filename].content
        if (opts?.encoding === 'utf8') return content
        return new TextEncoder().encode(content)
      },

      // Read directory
      readdir: (path: string) => {
        console.log('[readdir] Called with path:', path)
        const parts = path.split('/').filter(Boolean)
        console.log('[readdir] Parts:', parts)
        let current = storage
        
        // Handle root directory specially
        if (parts.length === 0) {
          const result = ['.', '..', ...Object.keys(storage)]
          console.log('[readdir] Root result:', result)
          return result
        }
        
        for (const part of parts) {
          console.log('[readdir] Navigating to part:', part, 'Available keys:', Object.keys(current))
          if (!current[part]) throw new Error(`Path not found: ${path}`)
          current = current[part].files
          console.log('[readdir] After navigation, current keys:', Object.keys(current))
        }
        const result = ['.', '..', ...Object.keys(current)]
        console.log('[readdir] Final result:', result)
        return result
      },

      // Get file/directory stats
      stat: (path: string) => {
        const parts = path.split('/').filter(Boolean)
        if (parts.length === 0) {
          return { 
            mode: 0o40755, // directory with 755 permissions
            owner: 'root',
            isDir: () => true,
            isFile: () => false
          }
        }
        const filename = parts.pop()!
        let current = storage
        for (const part of parts) {
          if (!current[part]) throw new Error(`Path not found: ${path}`)
          current = current[part].files
        }
        if (!current[filename]) throw new Error(`File not found: ${path}`)
        const node = current[filename]
        const isDir = node.type === 'dir'
        const mode = (isDir ? 0o40000 : 0o100000) | (node.permissions || 0o644)
        
        // Check for metadata override
        const meta = metadata[path] || {}
        
        return {
          mode,
          owner: meta.owner || node.owner || 'student',
          permissions: meta.permissions || node.permissions,
          isDir: () => isDir,
          isFile: () => !isDir
        }
      },

      // Helper methods for mode checking
      isDir: (mode: number) => (mode & 0o40000) !== 0,
      isFile: (mode: number) => (mode & 0o100000) !== 0,

      // Check if file/dir exists
      analyzePath: (path: string) => {
        try {
          const parts = path.split('/').filter(Boolean)
          if (parts.length === 0) return { exists: true, isDir: true }
          const filename = parts.pop()!
          let current = storage
          for (const part of parts) {
            if (!current[part]) return { exists: false }
            current = current[part].files
          }
          if (!current[filename]) return { exists: false }
          return {
            exists: true,
            isDir: current[filename].type === 'dir',
          }
        } catch {
          return { exists: false }
        }
      },

      // Remove file
      unlink: (path: string) => {
        const parts = path.split('/').filter(Boolean)
        const filename = parts.pop()!
        let current = storage
        for (const part of parts) {
          if (!current[part]) throw new Error(`Path not found: ${path}`)
          current = current[part].files
        }
        delete current[filename]
      },

      // Remove directory
      rmdir: (path: string) => {
        const parts = path.split('/').filter(Boolean)
        const dirname = parts.pop()!
        let current = storage
        for (const part of parts) {
          if (!current[part]) throw new Error(`Path not found: ${path}`)
          current = current[part].files
        }
        if (Object.keys(current[dirname].files).length > 0) {
          throw new Error('Directory not empty')
        }
        delete current[dirname]
      },

      // Sync to persistent storage
      syncfs: async (populate: boolean, callback: (err: any) => void) => {
        // Mock implementation
        callback(null)
      },
    }
  }

  /**
   * Execute a command in BusyBox
   */
  async execute(command: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    if (!this.instance) {
      throw new Error('BusyBox WASM not loaded')
    }

    if (!this.executionContext) {
      throw new Error('Execution context not set')
    }

    this.stdoutBuffer = ""
    this.stderrBuffer = ""

    // Parse command
    const args = this.parseCommand(command)
    if (args.length === 0) {
      return { stdout: '', stderr: '', exitCode: 0 }
    }

    try {
      // Execute command using the command executor bridge
      const result = executeCommandOnFS(
        command,
        this.executionContext.currentPath,
        this.instance.FS,
        this.executionContext.fileSystem
      )
      
      return result
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      return {
        stdout: '',
        stderr: errorMsg,
        exitCode: 1,
      }
    }
  }

  /**
   * Parse command string into arguments
   */
  private parseCommand(command: string): string[] {
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
   * Get the Emscripten FS instance
   */
  getFS() {
    return this.instance?.FS
  }

  /**
   * Check if WASM is loaded
   */
  isLoaded(): boolean {
    return this.loaded
  }

  /**
   * Initialize filesystem with initial structure
   */
  async initializeFilesystem(structure: any): Promise<void> {
    if (!this.instance) {
      throw new Error('BusyBox WASM not loaded')
    }

    const fs = this.instance.FS

    // Helper to convert permission string to octal
    const permissionsToOctal = (perms: string): number => {
      if (!perms || perms.length !== 9) return 0o755
      let mode = 0
      if (perms[0] === 'r') mode |= 0o400
      if (perms[1] === 'w') mode |= 0o200
      if (perms[2] === 'x') mode |= 0o100
      if (perms[3] === 'r') mode |= 0o040
      if (perms[4] === 'w') mode |= 0o020
      if (perms[5] === 'x') mode |= 0o010
      if (perms[6] === 'r') mode |= 0o004
      if (perms[7] === 'w') mode |= 0o002
      if (perms[8] === 'x') mode |= 0o001
      return mode
    }

    // Get access to internal storage
    const getStorage = () => {
      // Access the private storage from createMockFS
      const testPath = '/__test_path__'
      try {
        fs.mkdir(testPath)
        fs.rmdir(testPath)
      } catch (e) {
        // Path operations work
      }
      // We need to directly access the node metadata through the FS API
      return null // We'll use stat/writeFile with metadata instead
    }

    // Create node with proper metadata
    const createNode = (path: string, node: any) => {
      // Properly construct the full path, avoiding double slashes
      const fullPath = path === '' ? '/' + node.name : path + '/' + node.name
      console.log('[createNode] Creating:', fullPath, 'type:', node.type)
      const owner = node.owner || 'student'
      const permissions = node.permissions ? permissionsToOctal(node.permissions) : (node.type === 'directory' ? 0o755 : 0o644)
      
      if (node.type === 'directory') {
        try {
          fs.mkdir(fullPath, permissions)
          // Set owner metadata through internal storage access
          try {
            const stat = fs.stat(fullPath)
            if (stat && typeof stat === 'object') {
              (stat as any).owner = owner
              (stat as any).permissions = permissions
            }
          } catch (e) {
            // Stat might not work, try alternative approach
            // We'll store metadata in a separate structure
            if (!(fs as any)._nodeMetadata) {
              (fs as any)._nodeMetadata = {}
            }
            (fs as any)._nodeMetadata[fullPath] = { owner, permissions }
          }
        } catch (e) {
          // Directory might already exist
        }
        
        if (node.children) {
          for (const childName in node.children) {
            createNode(fullPath, node.children[childName])
          }
        }
      } else if (node.type === 'file') {
        fs.writeFile(fullPath, node.content || '', { encoding: 'utf8' })
        // Set metadata
        try {
          const stat = fs.stat(fullPath)
          if (stat && typeof stat === 'object') {
            (stat as any).owner = owner
            (stat as any).permissions = permissions
          }
        } catch (e) {
          if (!(fs as any)._nodeMetadata) {
            (fs as any)._nodeMetadata = {}
          }
          (fs as any)._nodeMetadata[fullPath] = { owner, permissions }
        }
      }
    }

    // Create root structure
    for (const name in structure.root) {
      createNode('', { name, ...structure.root[name] })
    }

    // Sync to persistent storage (IndexedDB)
    await new Promise((resolve, reject) => {
      fs.syncfs(false, (err: any) => {
        if (err) reject(err)
        else resolve(true)
      })
    })
  }

  /**
   * Cleanup and destroy instance
   */
  destroy(): void {
    this.instance = null
    this.loaded = false
    this.loading = false
  }
}
