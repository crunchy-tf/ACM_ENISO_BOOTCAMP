/**
 * SSH Simulator
 * Manages SSH session state and remote filesystem context
 */

import { MEMFS } from './memfs'

export interface SSHSession {
  id: string
  host: string
  user: string
  connected: boolean
  remotePath: string
  startTime: number
}

export interface SSHSimulatorOptions {
  fs: MEMFS
  onSessionStart?: (session: SSHSession) => void
  onSessionEnd?: (sessionId: string) => void
}

/**
 * SSH Session Manager
 */
export class SSHSimulator {
  private fs: MEMFS
  private sessions: Map<string, SSHSession>
  private activeSession: SSHSession | null
  private onSessionStart?: (session: SSHSession) => void
  private onSessionEnd?: (sessionId: string) => void

  constructor(options: SSHSimulatorOptions) {
    this.fs = options.fs
    this.sessions = new Map()
    this.activeSession = null
    this.onSessionStart = options.onSessionStart
    this.onSessionEnd = options.onSessionEnd
  }

  /**
   * Check if currently in SSH session
   */
  isConnected(): boolean {
    return this.activeSession !== null && this.activeSession.connected
  }

  /**
   * Get active SSH session
   */
  getActiveSession(): SSHSession | null {
    return this.activeSession
  }

  /**
   * Connect to remote server
   */
  connect(host: string, user: string): { success: boolean; message: string; session?: SSHSession } {
    // Check if already connected
    if (this.activeSession) {
      return {
        success: false,
        message: `Already connected to ${this.activeSession.host}. Disconnect first.`,
      }
    }

    // Validate host
    const validHosts = ['remote-server', 'agency.local', 'omega-corp.com', 'localhost']
    if (!validHosts.includes(host)) {
      return {
        success: false,
        message: `ssh: connect to host ${host} port 22: No route to host`,
      }
    }

    // Create remote filesystem if it doesn't exist
    const remoteFSPath = `/remotes/${user}/filesystem`
    if (!this.fs.exists(remoteFSPath)) {
      try {
        this.fs.mkdirTree(remoteFSPath)
      } catch (error) {
        return {
          success: false,
          message: `ssh: failed to initialize remote filesystem: ${error}`,
        }
      }
    }

    // Create session
    const sessionId = `${user}@${host}-${Date.now()}`
    const session: SSHSession = {
      id: sessionId,
      host,
      user,
      connected: true,
      remotePath: `/home/${user}`,
      startTime: Date.now(),
    }

    this.sessions.set(sessionId, session)
    this.activeSession = session

    // Notify
    if (this.onSessionStart) {
      this.onSessionStart(session)
    }

    return {
      success: true,
      message: `Connected to ${host} as ${user}`,
      session,
    }
  }

  /**
   * Disconnect from remote server
   */
  disconnect(): { success: boolean; message: string } {
    if (!this.activeSession) {
      return {
        success: false,
        message: 'Not connected to any remote server',
      }
    }

    const session = this.activeSession
    session.connected = false

    // Calculate session duration
    const duration = Math.floor((Date.now() - session.startTime) / 1000)

    // Notify
    if (this.onSessionEnd) {
      this.onSessionEnd(session.id)
    }

    this.activeSession = null

    return {
      success: true,
      message: `Connection to ${session.host} closed (session duration: ${duration}s)`,
    }
  }

  /**
   * Get remote filesystem path
   */
  getRemoteFSPath(path: string): string {
    if (!this.activeSession) {
      throw new Error('Not connected to remote server')
    }

    // Map remote path to local MEMFS path
    // Remote: /home/omega/incoming/file.txt
    // Local: /remotes/omega_agent/filesystem/home/omega/incoming/file.txt
    const basePath = `/remotes/${this.activeSession.user}/filesystem`
    
    if (path.startsWith('/')) {
      return `${basePath}${path}`
    }

    // Relative path
    return `${basePath}${this.activeSession.remotePath}/${path}`.replace(/\/+/g, '/')
  }

  /**
   * Update remote working directory
   */
  updateRemotePath(newPath: string): void {
    if (this.activeSession) {
      this.activeSession.remotePath = newPath
    }
  }

  /**
   * Get prompt for remote session
   */
  getRemotePrompt(): string {
    if (!this.activeSession) {
      return ''
    }

    const displayPath = this.activeSession.remotePath === `/home/${this.activeSession.user}` 
      ? '~' 
      : this.activeSession.remotePath

    return `\x1b[1;35m${this.activeSession.user}@${this.activeSession.host}\x1b[0m:\x1b[1;34m${displayPath}\x1b[0m$ `
  }

  /**
   * Execute command in remote context
   */
  executeRemote(command: string, busybox: any): { success: boolean; output: string; error?: string; newPath?: string } {
    if (!this.activeSession) {
      return {
        success: false,
        output: '',
        error: 'Not connected to remote server',
      }
    }

    try {
      // Handle 'exit' specially
      if (command.trim() === 'exit' || command.trim() === 'logout') {
        const result = this.disconnect()
        return {
          success: result.success,
          output: result.message,
        }
      }

      // Map current path to remote filesystem
      const currentRemotePath = this.getRemoteFSPath('.')
      
      // Set busybox context to remote filesystem
      const originalContext = busybox.getContext()
      busybox.setContext({
        ...originalContext,
        currentPath: currentRemotePath,
      })

      // Execute command
      const result = busybox.execute(command)

      // Get new path from busybox context (in case cd was used)
      const newContext = busybox.getContext()
      
      // Map back to remote display path
      if (newContext.currentPath !== currentRemotePath) {
        const basePath = `/remotes/${this.activeSession.user}/filesystem`
        const remotePath = newContext.currentPath.replace(basePath, '')
        this.updateRemotePath(remotePath || '/')
      }

      // Restore original context
      busybox.setContext(originalContext)

      return {
        success: result.exitCode === 0,
        output: result.stdout,
        error: result.stderr,
        newPath: this.activeSession.remotePath,
      }
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : 'Command execution failed',
      }
    }
  }

  /**
   * Initialize remote filesystem with default structure
   */
  initializeRemoteFS(user: string): void {
    const basePath = `/remotes/${user}/filesystem`
    
    try {
      // Create base directory
      if (!this.fs.exists(basePath)) {
        this.fs.mkdirTree(basePath)
      }

      // Create home directory
      const homePath = `${basePath}/home/${user}`
      if (!this.fs.exists(homePath)) {
        this.fs.mkdirTree(homePath)
      }

      // Create incoming directory for omega_agent
      if (user === 'omega_agent') {
        const incomingPath = `${homePath}/incoming`
        if (!this.fs.exists(incomingPath)) {
          this.fs.mkdirTree(incomingPath)
        }

        // Create README
        const readmePath = `${homePath}/README.txt`
        if (!this.fs.exists(readmePath)) {
          const content = `FIELD AGENT SECURE DROP

Agent: ${user}
Location: Remote Server (Classified)
Status: ACTIVE

Upload evidence files to /home/${user.replace('_agent', '')}/incoming/

All transfers are encrypted and logged.
Mission critical files only.

- Orion Command`

          this.fs.writeFile(readmePath, content)
        }
      }
    } catch (error) {
      console.error('Failed to initialize remote filesystem:', error)
    }
  }

  /**
   * List all sessions
   */
  getSessions(): SSHSession[] {
    return Array.from(this.sessions.values())
  }

  /**
   * Clear all sessions
   */
  clearSessions(): void {
    this.sessions.clear()
    this.activeSession = null
  }
}
