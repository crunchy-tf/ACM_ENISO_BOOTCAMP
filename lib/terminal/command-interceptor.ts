/**
 * Command Interceptor
 * Routes special commands that need frontend simulation
 * Handles: sudo, ssh, less, env, and other commands that can't run in BusyBox
 */

import { MEMFS } from './memfs'

export interface InterceptResult {
  intercepted: boolean
  handled: boolean
  output?: string
  error?: string
  action?: 'openModal' | 'setState' | 'executeCommand' | 'redirect'
  modalType?: 'less' | 'ssh' | 'nano'
  modalData?: Record<string, any>
  newContext?: Partial<ExecutionContext>
  actualCommand?: string // For commands like sudo that need to pass through a modified command
}

export interface ExecutionContext {
  currentPath: string
  username: string
  isSudo: boolean
  isRemote?: boolean
  remoteHost?: string
  remoteUser?: string
}

export interface CommandInterceptorOptions {
  fs: MEMFS
  context: ExecutionContext
  onModalOpen?: (type: string, data: any) => void
  onContextChange?: (context: Partial<ExecutionContext>) => void
}

/**
 * Main command interceptor class
 */
export class CommandInterceptor {
  private fs: MEMFS
  private context: ExecutionContext
  private onModalOpen?: (type: string, data: any) => void
  private onContextChange?: (context: Partial<ExecutionContext>) => void

  constructor(options: CommandInterceptorOptions) {
    this.fs = options.fs
    this.context = options.context
    this.onModalOpen = options.onModalOpen
    this.onContextChange = options.onContextChange
  }

  /**
   * Check if command should be intercepted
   */
  shouldIntercept(command: string): boolean {
    const cmd = this.parseCommand(command)
    const interceptedCommands = [
      'ssh',
      'scp',
      'less',
      'more',
      'env',
      'export',
      'nano',
      'vi',
      'vim',
    ]

    // Check if base command is intercepted
    if (interceptedCommands.includes(cmd.base)) {
      return true
    }

    // Don't intercept sudo - let it go to command executor for password prompt
    // The command executor will handle password authentication
    
    return false
  }

  /**
   * Intercept and handle special commands
   */
  async intercept(command: string): Promise<InterceptResult> {
    const cmd = this.parseCommand(command)

    // Note: sudo is not intercepted anymore - it goes to command executor for password prompt

    // Handle SSH
    if (cmd.base === 'ssh') {
      return this.handleSSH(cmd.args)
    }

    // Handle SCP
    if (cmd.base === 'scp') {
      return this.handleSCP(cmd.args)
    }

    // Handle less/more
    if (cmd.base === 'less' || cmd.base === 'more') {
      return this.handleLess(cmd.args)
    }

    // Handle env
    if (cmd.base === 'env') {
      return this.handleEnv(cmd.args)
    }

    // Handle nano/vi/vim
    if (['nano', 'vi', 'vim'].includes(cmd.base)) {
      return this.handleEditor(cmd.base, cmd.args)
    }

    return {
      intercepted: false,
      handled: false,
    }
  }

  /**
   * Handle sudo command
   */
  private handleSudo(command: string): InterceptResult {
    // Strip sudo prefix and extract actual command
    const actualCommand = command.trim().replace(/^sudo\s+/, '')

    if (!actualCommand) {
      return {
        intercepted: true,
        handled: true,
        error: 'sudo: no command specified',
      }
    }

    // Instead of setting sudo context directly, let the command executor handle password prompt
    // Return false for intercepted so it goes through the normal execution path
    return {
      intercepted: false,
      handled: false,
    }
  }

  /**
   * Handle SSH command
   */
  private handleSSH(args: string[]): InterceptResult {
    if (args.length === 0) {
      return {
        intercepted: true,
        handled: true,
        error: 'usage: ssh [user@]host',
      }
    }

    const target = args[0]
    const parts = target.split('@')
    
    let user: string
    let host: string

    if (parts.length === 2) {
      user = parts[0]
      host = parts[1]
    } else {
      user = this.context.username
      host = parts[0]
    }

    // Open SSH modal
    return {
      intercepted: true,
      handled: true,
      action: 'openModal',
      modalType: 'ssh',
      modalData: {
        host,
        user,
        fullTarget: target,
      },
      output: `Connecting to ${host}...`,
    }
  }

  /**
   * Handle SCP command
   */
  private handleSCP(args: string[]): InterceptResult {
    if (args.length < 2) {
      return {
        intercepted: true,
        handled: true,
        error: 'usage: scp <source> <destination>',
      }
    }

    const source = args[0]
    const destination = args[1]

    // Parse source and destination
    const sourceInfo = this.parseSCPPath(source)
    const destInfo = this.parseSCPPath(destination)

    try {
      // Local to remote
      if (!sourceInfo.isRemote && destInfo.isRemote) {
        return this.scpLocalToRemote(sourceInfo.path, destInfo)
      }

      // Remote to local
      if (sourceInfo.isRemote && !destInfo.isRemote) {
        return this.scpRemoteToLocal(sourceInfo, destInfo.path)
      }

      return {
        intercepted: true,
        handled: true,
        error: 'scp: only local<->remote transfers supported',
      }
    } catch (error) {
      return {
        intercepted: true,
        handled: true,
        error: error instanceof Error ? error.message : 'scp: transfer failed',
      }
    }
  }

  /**
   * Handle less/more command
   */
  private handleLess(args: string[]): InterceptResult {
    if (args.length === 0) {
      return {
        intercepted: true,
        handled: true,
        error: 'usage: less <filename>',
      }
    }

    const filename = args[0]
    const fullPath = this.resolvePath(filename)

    try {
      if (!this.fs.exists(fullPath)) {
        return {
          intercepted: true,
          handled: true,
          error: `less: ${filename}: No such file or directory`,
        }
      }

      const stat = this.fs.stat(fullPath)
      if (stat.isDirectory()) {
        return {
          intercepted: true,
          handled: true,
          error: `less: ${filename}: Is a directory`,
        }
      }

      const content = this.fs.readFile(fullPath, { encoding: 'utf8' }) as string

      // Open less viewer modal
      return {
        intercepted: true,
        handled: true,
        action: 'openModal',
        modalType: 'less',
        modalData: {
          filename: fullPath,
          content,
        },
        output: '', // Modal handles display
      }
    } catch (error) {
      return {
        intercepted: true,
        handled: true,
        error: `less: ${filename}: ${error instanceof Error ? error.message : 'Error reading file'}`,
      }
    }
  }

  /**
   * Handle env command
   */
  private handleEnv(args: string[]): InterceptResult {
    // Generate simulated environment variables
    const envVars = this.generateEnvVars()

    // Format as env output
    const output = Object.entries(envVars)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n')

    return {
      intercepted: true,
      handled: true,
      output,
    }
  }

  /**
   * Handle editor commands (nano/vi/vim)
   */
  private handleEditor(editor: string, args: string[]): InterceptResult {
    if (args.length === 0) {
      return {
        intercepted: true,
        handled: true,
        error: `usage: ${editor} <filename>`,
      }
    }

    const filename = args[0]
    const fullPath = this.resolvePath(filename)

    let content = ''
    
    // Try to read existing file
    try {
      if (this.fs.exists(fullPath)) {
        content = this.fs.readFile(fullPath, { encoding: 'utf8' }) as string
      }
    } catch (error) {
      // File doesn't exist or can't be read - start with empty content
    }

    return {
      intercepted: true,
      handled: true,
      action: 'openModal',
      modalType: 'nano',
      modalData: {
        filename: fullPath,
        content,
      },
      output: '', // Modal handles display
    }
  }

  /**
   * Parse SCP path (user@host:/path or /local/path)
   */
  private parseSCPPath(path: string): {
    isRemote: boolean
    user?: string
    host?: string
    path: string
  } {
    const remoteMatch = path.match(/^(?:([^@]+)@)?([^:]+):(.+)$/)
    
    if (remoteMatch) {
      return {
        isRemote: true,
        user: remoteMatch[1] || this.context.username,
        host: remoteMatch[2],
        path: remoteMatch[3],
      }
    }

    return {
      isRemote: false,
      path: this.resolvePath(path),
    }
  }

  /**
   * SCP local to remote
   */
  private scpLocalToRemote(
    sourcePath: string,
    dest: { user?: string; host?: string; path: string }
  ): InterceptResult {
    // Read source file
    if (!this.fs.exists(sourcePath)) {
      throw new Error(`${sourcePath}: No such file or directory`)
    }

    const content = this.fs.readFile(sourcePath, { encoding: 'utf8' }) as string
    const stat = this.fs.stat(sourcePath)
    const filename = sourcePath.split('/').pop() || 'file'

    // Write to remote filesystem (simulated at /remotes/<user>/filesystem/<path>)
    const remoteFSPath = `/remotes/${dest.user}/filesystem${dest.path}`
    
    try {
      // Create target directory if needed
      const targetDir = remoteFSPath.substring(0, remoteFSPath.lastIndexOf('/'))
      if (!this.fs.exists(targetDir)) {
        this.fs.mkdirTree(targetDir)
      }

      // Determine final path (if dest is directory, append filename)
      let finalPath = remoteFSPath
      if (this.fs.exists(remoteFSPath) && this.fs.stat(remoteFSPath).isDirectory()) {
        finalPath = `${remoteFSPath}/${filename}`
      }

      // Write file
      this.fs.writeFile(finalPath, content)

      const size = new Blob([content]).size
      return {
        intercepted: true,
        handled: true,
        output: `${filename}    100%  ${size}B  ${(size / 1024).toFixed(1)}KB/s  00:00`,
      }
    } catch (error) {
      throw new Error(`scp: ${error instanceof Error ? error.message : 'transfer failed'}`)
    }
  }

  /**
   * SCP remote to local
   */
  private scpRemoteToLocal(
    source: { user?: string; host?: string; path: string },
    destPath: string
  ): InterceptResult {
    // Read from remote filesystem (simulated at /remotes/<user>/filesystem/<path>)
    const remoteFSPath = `/remotes/${source.user}/filesystem${source.path}`
    
    if (!this.fs.exists(remoteFSPath)) {
      throw new Error(`${source.path}: No such file or directory`)
    }

    const content = this.fs.readFile(remoteFSPath, { encoding: 'utf8' }) as string
    const filename = source.path.split('/').pop() || 'file'

    // Write to local filesystem
    try {
      // Determine final path
      let finalPath = destPath
      if (this.fs.exists(destPath) && this.fs.stat(destPath).isDirectory()) {
        finalPath = `${destPath}/${filename}`
      }

      this.fs.writeFile(finalPath, content)

      const size = new Blob([content]).size
      return {
        intercepted: true,
        handled: true,
        output: `${filename}    100%  ${size}B  ${(size / 1024).toFixed(1)}KB/s  00:00`,
      }
    } catch (error) {
      throw new Error(`scp: ${error instanceof Error ? error.message : 'transfer failed'}`)
    }
  }

  /**
   * Generate simulated environment variables
   */
  private generateEnvVars(): Record<string, string> {
    return {
      USER: this.context.username,
      HOME: `/home/${this.context.username}`,
      SHELL: '/bin/sh',
      PATH: '/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin',
      PWD: this.context.currentPath,
      TERM: 'xterm-256color',
      LANG: 'en_US.UTF-8',
      MISSION: 'hack_mainframe',
      CLEARANCE_LEVEL: 'ORION',
      OPERATION: 'GHOST',
    }
  }

  /**
   * Resolve relative path to absolute path
   */
  private resolvePath(path: string): string {
    if (path.startsWith('/')) {
      return path
    }

    if (path === '~') {
      return `/home/${this.context.username}`
    }

    if (path.startsWith('~/')) {
      return `/home/${this.context.username}/${path.substring(2)}`
    }

    return `${this.context.currentPath}/${path}`.replace(/\/+/g, '/')
  }

  /**
   * Parse command into base and args
   */
  private parseCommand(command: string): { base: string; args: string[] } {
    const parts = command.trim().split(/\s+/)
    return {
      base: parts[0],
      args: parts.slice(1),
    }
  }

  /**
   * Update context
   */
  updateContext(context: ExecutionContext): void {
    this.context = context
  }
}
