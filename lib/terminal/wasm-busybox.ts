/**
 * BusyBox WASM Runtime with Emscripten MEMFS
 * Clean implementation using real POSIX filesystem APIs
 */

import { MEMFS } from './memfs'
import { executeCommand } from './command-executor'

export interface ExecutionContext {
  currentPath: string
  username: string
  isSudo: boolean
}

export interface CommandResult {
  stdout: string
  stderr: string
  exitCode: number
}

/**
 * BusyBox WASM Runtime with real MEMFS
 */
export class BusyBoxWASM {
  private fs: MEMFS
  private context: ExecutionContext
  private loaded: boolean = false

  constructor() {
    this.fs = new MEMFS()
    this.context = {
      currentPath: '/home/student',
      username: 'student',
      isSudo: false,
    }
  }

  /**
   * Load and initialize the filesystem
   */
  async load(): Promise<void> {
    // Simulate async loading
    await new Promise(resolve => setTimeout(resolve, 100))
    this.loaded = true
  }

  /**
   * Initialize filesystem from JSON structure
   */
  async initializeFilesystem(structure: any): Promise<void> {
    if (!this.loaded) {
      throw new Error('BusyBox not loaded')
    }

    // Recursively create filesystem structure
    const createNode = (path: string, node: any) => {
      const fullPath = path === '' ? `/${node.name}` : `${path}/${node.name}`

      if (node.type === 'directory') {
        try {
          this.fs.mkdir(fullPath)
          // Set owner if specified
          if (node.owner) {
            this.fs.chown(fullPath, node.owner)
          }
        } catch (e) {
          // Directory might already exist
        }

        // Create children
        if (node.children) {
          for (const childName in node.children) {
            const child = node.children[childName]
            createNode(fullPath, child)
          }
        }
      } else if (node.type === 'file') {
        this.fs.writeFile(fullPath, node.content || '')
        if (node.owner) {
          this.fs.chown(fullPath, node.owner)
        }
      }
    }

    // Create root directories
    for (const name in structure.root) {
      const node = structure.root[name]
      createNode('', { name, ...node })
    }
  }

  /**
   * Execute a command
   */
  async execute(command: string): Promise<CommandResult> {
    if (!this.loaded) {
      return {
        stdout: '',
        stderr: 'BusyBox not loaded',
        exitCode: 1,
      }
    }

    try {
      const result = executeCommand(command, this.context, this.fs)
      
      // Update context if command modified it
      if (result.newPath) {
        this.context.currentPath = result.newPath
      }
      
      return {
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
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
   * Get the filesystem instance
   */
  getFS(): MEMFS {
    return this.fs
  }

  /**
   * Set execution context
   */
  setContext(context: Partial<ExecutionContext>): void {
    this.context = { ...this.context, ...context }
  }

  /**
   * Get current context
   */
  getContext(): ExecutionContext {
    return { ...this.context }
  }

  /**
   * Check if loaded
   */
  isLoaded(): boolean {
    return this.loaded
  }

  /**
   * Destroy instance
   */
  destroy(): void {
    this.loaded = false
  }
}
