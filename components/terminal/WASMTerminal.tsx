/**
 * WASM Terminal Component - Clean Implementation
 * Uses Emscripten MEMFS for real filesystem operations
 */

"use client"

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react"
import { Terminal as XTerm } from "xterm"
import { FitAddon } from "@xterm/addon-fit"
import { WebLinksAddon } from "@xterm/addon-web-links"
import "xterm/css/xterm.css"
import { Adventure } from "@/lib/terminal/types"
import { BusyBoxWASM } from "@/lib/terminal/wasm-busybox"
import { MissionLayer } from "@/lib/terminal/mission-layer"
import { NetworkSimulator } from "@/lib/terminal/network-simulator"
import { errorLogger, ErrorType, ErrorSeverity } from "@/lib/terminal/error-logger"
import { CommandInterceptor } from "@/lib/terminal/command-interceptor"
import { parseRedirection, executeWithRedirection } from "@/lib/terminal/io-redirection"
import { SSHSimulator } from "@/lib/terminal/ssh-simulator"
import { EnvSimulator } from "@/lib/terminal/env-simulator"
import { NanoEditor } from "./NanoEditor"
import { LessViewer } from "./LessViewer"
import { SSHModal } from "./SSHModal"
import { ConfirmDialog } from "./ConfirmDialog"
import { detectDestructiveCommand, getDestructiveCommandMessage, getSaferAlternative } from "@/lib/terminal/destructive-command-detector"
import { analyzeError, formatErrorSuggestion } from "@/lib/terminal/error-recovery"

interface WASMTerminalProps {
  adventure: Adventure
  onMissionComplete: (missionId: string) => void
  onTaskComplete: (taskId: string) => void
  onAllComplete: () => void
  onProgressUpdate?: (
    currentMissionIndex: number, 
    currentTaskIndex: number,
    completed: { tasks: Set<string>, missions: Set<string> }
  ) => void
}

export interface WASMTerminalRef {
  resetExercise: () => Promise<void>
  getCurrentState: () => {
    sshConnected: boolean
    modalsOpen: boolean
    heredocActive: boolean
  }
}

export const WASMTerminal = forwardRef<WASMTerminalRef, WASMTerminalProps>(function WASMTerminal({ 
  adventure, 
  onMissionComplete, 
  onTaskComplete, 
  onAllComplete,
  onProgressUpdate
}, ref) {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<XTerm | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const busyboxRef = useRef<BusyBoxWASM | null>(null)
  const missionLayerRef = useRef<MissionLayer | null>(null)
  const networkSimRef = useRef<NetworkSimulator | null>(null)
  const interceptorRef = useRef<CommandInterceptor | null>(null)
  const sshSimRef = useRef<SSHSimulator | null>(null)
  const envSimRef = useRef<EnvSimulator | null>(null)
  
  const [isMounted, setIsMounted] = useState(false)
  const inputBufferRef = useRef("")
  const heredocBufferRef = useRef<string[]>([])
  const heredocTerminatorRef = useRef<string | null>(null)
  const sudoContextRef = useRef(false)
  const commandHistoryRef = useRef<string[]>([])
  const historyIndexRef = useRef(-1)
  
  // Password input state for sudo
  const passwordModeRef = useRef(false)
  const passwordBufferRef = useRef("")
  const pendingSudoCommandRef = useRef<string | null>(null)
  
  // Nano editor state
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorFile, setEditorFile] = useState("")
  const [editorContent, setEditorContent] = useState("")
  
  // Less viewer state
  const [lessOpen, setLessOpen] = useState(false)
  const [lessContent, setLessContent] = useState("")
  const [lessFile, setLessFile] = useState("")
  
  // SSH session state
  const [sshConnected, setSSHConnected] = useState(false)
  const [sshHost, setSSHHost] = useState("")
  const [sshUser, setSSHUser] = useState("")
  const [sshDuration, setSSHDuration] = useState(0)

  // Destructive command confirmation state
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmTitle, setConfirmTitle] = useState("")
  const [confirmMessage, setConfirmMessage] = useState("")
  const [confirmLabel, setConfirmLabel] = useState("")
  const [confirmCommand, setConfirmCommand] = useState("")
  const [confirmSeverity, setConfirmSeverity] = useState<'warning' | 'danger' | 'critical'>('warning')
  const [confirmAlternative, setConfirmAlternative] = useState<string | undefined>()

  const username = adventure.id === "hack_mainframe" ? "student" : "archivist"
  const initialPath = `/home/${username}`

  // Expose reset functionality via ref
  useImperativeHandle(ref, () => ({
    resetExercise: async () => {
      if (!xtermRef.current || !busyboxRef.current || !missionLayerRef.current) {
        throw new Error("Terminal not initialized")
      }

      const term = xtermRef.current

      // 1. Clear terminal
      term.clear()
      term.writeln("\x1b[1;33m🔄 Resetting exercise...\x1b[0m")

      // 2. Close all modals
      setEditorOpen(false)
      setLessOpen(false)
      setConfirmOpen(false)

      // 3. Disconnect SSH if connected
      if (sshConnected && sshSimRef.current) {
        sshSimRef.current.disconnect()
        setSSHConnected(false)
        setSSHHost("")
        setSSHUser("")
        setSSHDuration(0)
      }

      // 4. Reset heredoc state
      heredocBufferRef.current = []
      heredocTerminatorRef.current = null

      // 5. Clear input buffer
      inputBufferRef.current = ""

      // 6. Reset sudo context
      sudoContextRef.current = false
      
      // 6.1. Reset password mode
      passwordModeRef.current = false
      passwordBufferRef.current = ""
      pendingSudoCommandRef.current = null

      // 7. Clear command history
      commandHistoryRef.current = []
      historyIndexRef.current = -1

      // 8. Reset filesystem
      try {
        await busyboxRef.current.initializeFilesystem(adventure.initialFileSystem)
        busyboxRef.current.setContext({
          currentPath: initialPath,
          username: username,
          isSudo: false,
        })
        term.writeln("\x1b[1;32m✓ Filesystem reset\x1b[0m")
      } catch (error) {
        term.writeln("\x1b[1;31m✗ Failed to reset filesystem\x1b[0m")
        throw error
      }

      // 9. Reset mission progress
      missionLayerRef.current.resetProgress()
      term.writeln("\x1b[1;32m✓ Mission progress reset\x1b[0m")

      // 10. Notify parent of progress update
      if (onProgressUpdate) {
        onProgressUpdate(0, 0, {
          tasks: new Set<string>(),
          missions: new Set<string>()
        })
      }

      // 11. Show welcome message
      term.writeln("")
      term.writeln("\x1b[1;32m" + "=".repeat(60) + "\x1b[0m")
      term.writeln(`\x1b[1;32m  ${adventure.title}\x1b[0m`)
      term.writeln("\x1b[1;32m" + "=".repeat(60) + "\x1b[0m")
      term.writeln("")
      term.writeln("Exercise has been reset. All progress cleared.")
      term.writeln("Type 'help' for available commands.")
      term.writeln("")
      
      // 12. Show prompt
      const prompt = `${username}@terminal:${initialPath}$ `
      term.write(prompt)
    },
    getCurrentState: () => ({
      sshConnected,
      modalsOpen: editorOpen || lessOpen || confirmOpen,
      heredocActive: heredocTerminatorRef.current !== null
    })
  }), [
    adventure, 
    sshConnected, 
    editorOpen, 
    lessOpen, 
    confirmOpen, 
    username, 
    initialPath,
    onProgressUpdate
  ])

  useEffect(() => {
    setIsMounted(true)
    return () => setIsMounted(false)
  }, [])

  useEffect(() => {
    if (!terminalRef.current || xtermRef.current || !isMounted) return

    initializeTerminal()

    return () => {
      if (xtermRef.current) {
        xtermRef.current.dispose()
      }
      if (busyboxRef.current) {
        busyboxRef.current.destroy()
      }
    }
  }, [isMounted])

  const initializeTerminal = async () => {
    if (!terminalRef.current) return

    const term = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: "#0a0e27",
        foreground: "#00ff41",
        cursor: "#00ff41",
      },
      convertEol: true,
      scrollback: 1000,
    })

    const fitAddon = new FitAddon()
    const webLinksAddon = new WebLinksAddon()

    term.loadAddon(fitAddon)
    term.loadAddon(webLinksAddon)
    term.open(terminalRef.current)

    xtermRef.current = term
    fitAddonRef.current = fitAddon

    // Initialize BusyBox with MEMFS
    term.writeln("\x1b[1;33mInitializing terminal environment...\x1b[0m")
    
    const busybox = new BusyBoxWASM()
    busyboxRef.current = busybox

    try {
      await busybox.load()
      await busybox.initializeFilesystem(adventure.initialFileSystem)
      
      // Set initial context
      busybox.setContext({
        currentPath: initialPath,
        username: username,
        isSudo: false,
      })
      
      term.writeln("\x1b[1;32m✓ WASM BusyBox loaded successfully\x1b[0m")
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      term.writeln("\x1b[1;31m✗ Failed to load BusyBox\x1b[0m")
      errorLogger.log(
        ErrorType.INITIALIZATION,
        `Failed to initialize BusyBox: ${errorMessage}`,
        { adventure: adventure.id },
        error instanceof Error ? error : undefined,
        ErrorSeverity.ERROR
      )
      return
    }

    // Initialize Mission Layer
    const savedProgress = MissionLayer.loadProgress(adventure.id)
    const missionLayer = new MissionLayer(adventure, savedProgress || undefined)
    missionLayerRef.current = missionLayer

    missionLayer.on('taskComplete', (taskId) => {
      onTaskComplete(taskId)
      missionLayer.saveProgress()
    })

    missionLayer.on('missionComplete', (missionId) => {
      onMissionComplete(missionId)
      missionLayer.saveProgress()
    })

    missionLayer.on('allComplete', () => {
      onAllComplete()
      missionLayer.saveProgress()
    })

    missionLayer.on('progressUpdate', (progress) => {
      if (onProgressUpdate) {
        onProgressUpdate(
          progress.currentMissionIndex, 
          progress.currentTaskIndex,
          {
            tasks: progress.completedTasks,
            missions: progress.completedMissions
          }
        )
      }
    })

    // Send initial progress
    const initialProgress = missionLayer.getProgress()
    if (onProgressUpdate) {
      onProgressUpdate(
        initialProgress.currentMissionIndex, 
        initialProgress.currentTaskIndex,
        {
          tasks: initialProgress.completedTasks,
          missions: initialProgress.completedMissions
        }
      )
    }

    // Initialize Network Simulator
    networkSimRef.current = new NetworkSimulator()
    
    // Initialize SSH Simulator
    const sshSim = new SSHSimulator({
      fs: busybox.getFS(),
      onSessionStart: (session) => {
        term.writeln(`\x1b[1;32m[SSH] Connected to ${session.host} as ${session.user}\x1b[0m`)
        setSSHConnected(true)
        setSSHHost(session.host)
        setSSHUser(session.user)
        
        // Start duration tracking
        const intervalId = setInterval(() => {
          setSSHDuration(Math.floor((Date.now() - session.startTime) / 1000))
        }, 1000)
        
        // Store interval ID for cleanup
        ;(session as any).durationInterval = intervalId
      },
      onSessionEnd: (sessionId) => {
        term.writeln(`\x1b[1;32m[SSH] Connection closed\x1b[0m`)
        setSSHConnected(false)
        setSSHHost("")
        setSSHUser("")
        setSSHDuration(0)
        
        // Clear interval
        const session = sshSim.getSessions().find(s => s.id === sessionId)
        if (session && (session as any).durationInterval) {
          clearInterval((session as any).durationInterval)
        }
      }
    })
    sshSimRef.current = sshSim
    
    // Initialize Environment Simulator
    envSimRef.current = new EnvSimulator()
    
    // Initialize Command Interceptor
    interceptorRef.current = new CommandInterceptor({
      fs: busybox.getFS(),
      context: {
        currentPath: initialPath,
        username: username,
        isSudo: false,
      },
      onModalOpen: (type, data) => {
        if (type === 'less') {
          setLessFile(data.filename)
          setLessContent(data.content)
          setLessOpen(true)
        } else if (type === 'nano') {
          handleEditor(data.filename)
        }
      },
      onContextChange: (newContext) => {
        if (newContext.isSudo !== undefined) {
          sudoContextRef.current = newContext.isSudo
        }
      }
    })

    // Fit terminal
    setTimeout(() => {
      try {
        fitAddon.fit()
      } catch (error) {
        console.warn("Failed to fit terminal:", error)
      }
    }, 50)

    // Welcome message
    term.writeln("")
    term.writeln("\x1b[1;32m" + "=".repeat(60) + "\x1b[0m")
    term.writeln(`\x1b[1;32m  ${adventure.title}\x1b[0m`)
    term.writeln("\x1b[1;32m" + "=".repeat(60) + "\x1b[0m")
    term.writeln("")
    term.writeln(`Connected as: \x1b[1;36m${username}@terminal\x1b[0m`)
    term.writeln(`System: \x1b[1;33mBusyBox WASM + MEMFS\x1b[0m`)
    term.writeln(`Type '\x1b[1;33mhelp\x1b[0m' for available commands`)
    term.writeln("")

    writePrompt(term, busybox, username)

    // Handle input
    term.onData((data) => {
      const code = data.charCodeAt(0)

      if (code === 13) {
        // Enter
        term.write('\r\n')
        
        // Check if in password mode
        if (passwordModeRef.current) {
          const password = passwordBufferRef.current
          const sudoCommand = pendingSudoCommandRef.current
          
          // Clear password state
          passwordBufferRef.current = ""
          passwordModeRef.current = false
          pendingSudoCommandRef.current = null
          
          if (sudoCommand) {
            handleSudoWithPassword(term, sudoCommand, password)
          } else {
            writePrompt(term, busybox, username)
          }
          return
        }
        
        const command = inputBufferRef.current.trim()
        inputBufferRef.current = ""

        if (command) {
          handleCommand(term, command)
        } else if (busybox) {
          writePrompt(term, busybox, username)
        }
      } else if (code === 127) {
        // Backspace
        if (passwordModeRef.current) {
          // In password mode, just remove from buffer without showing anything
          if (passwordBufferRef.current.length > 0) {
            passwordBufferRef.current = passwordBufferRef.current.slice(0, -1)
            term.write('\b \b')
          }
        } else if (inputBufferRef.current.length > 0) {
          inputBufferRef.current = inputBufferRef.current.slice(0, -1)
          term.write('\b \b')
        }
      } else if (code >= 32) {
        // Printable character
        if (passwordModeRef.current) {
          // In password mode, hide the character
          passwordBufferRef.current += data
          term.write('*') // Show asterisk instead of actual character
        } else {
          inputBufferRef.current += data
          term.write(data)
        }
      }
    })
  }

  const writePrompt = (term: XTerm, busybox: BusyBoxWASM, user: string) => {
    // Check if in SSH session
    const sshSim = sshSimRef.current
    if (sshSim && sshSim.isConnected()) {
      const prompt = sshSim.getRemotePrompt()
      term.write(prompt)
      return
    }
    
    const context = busybox.getContext()
    const path = context.currentPath
    const displayPath = path === `/home/${user}` ? "~" : path
    const sudoIndicator = sudoContextRef.current ? '\x1b[1;31m[SUDO]\x1b[0m ' : ''
    term.write(`${sudoIndicator}\x1b[1;32m${user}@terminal\x1b[0m:\x1b[1;34m${displayPath}\x1b[0m$ `)
  }

  const handleSudoWithPassword = async (term: XTerm, command: string, password: string) => {
    const busybox = busyboxRef.current
    if (!busybox) {
      term.writeln("\x1b[1;31mError: Terminal not initialized\x1b[0m")
      return
    }

    // Execute sudo command with password
    const result = await busybox.executeSudo(command, password)
    
    if (result.stdout) {
      term.writeln(result.stdout)
    }
    
    if (result.stderr) {
      term.writeln(`\x1b[1;31m${result.stderr}\x1b[0m`)
    }
    
    writePrompt(term, busybox, username)
  }

  const handleCommand = async (term: XTerm, command: string) => {
    const busybox = busyboxRef.current
    const interceptor = interceptorRef.current
    const sshSim = sshSimRef.current
    const envSim = envSimRef.current
    
    if (!busybox) {
      term.writeln("\x1b[1;31mError: Terminal not initialized\x1b[0m")
      return
    }

    // Handle heredoc continuation
    if (heredocTerminatorRef.current) {
      heredocBufferRef.current.push(command)
      
      // Check for terminator
      const terminator = heredocTerminatorRef.current
      if (command.trim() === terminator) {
        // Heredoc complete - execute the buffered input
        const heredocContent = heredocBufferRef.current.slice(0, -1).join('\n') + '\n'
        heredocBufferRef.current = []
        heredocTerminatorRef.current = null
        
        // Process with redirection handler (it stored the command)
        // For now, just output confirmation
        term.writeln(`\x1b[1;32m✓ Heredoc input captured (${heredocContent.split('\n').length} lines)\x1b[0m`)
        writePrompt(term, busybox, username)
      } else {
        // Continue heredoc - just show continuation prompt
        term.write('> ')
      }
      return
    }

    // Handle special commands
    if (command === "clear") {
      term.write("\x1b[2J\x1b[H")
      writePrompt(term, busybox, username)
      return
    }

    if (command === "help") {
      term.writeln("Available commands:")
      term.writeln("  ls, cd, pwd, cat, mkdir, touch, rm, rmdir, cp, mv")
      term.writeln("  echo, env, export, sudo, ssh, scp, less, grep, find")
      term.writeln("  ping, curl, wget, netstat, dig, nslookup, ifconfig, ip")
      term.writeln("  nano, vi, vim, clear, help")
      term.writeln("")
      term.writeln("I/O Redirection:")
      term.writeln("  > file    - redirect output to file (overwrite)")
      term.writeln("  >> file   - redirect output to file (append)")
      term.writeln("  <<EOF     - heredoc input (multi-line)")
      writePrompt(term, busybox, username)
      return
    }

    // Check if in SSH session
    if (sshSim && sshSim.isConnected()) {
      const result = sshSim.executeRemote(command, busybox)
      if (result.output) {
        term.writeln(result.output)
      }
      if (result.error) {
        term.writeln(`\x1b[1;31m${result.error}\x1b[0m`)
      }
      writePrompt(term, busybox, username)
      return
    }

    // Parse I/O redirection
    let redirection = parseRedirection(command)
    
    // Check for heredoc
    if (redirection.type === 'heredoc' && redirection.heredocMarker) {
      heredocTerminatorRef.current = redirection.heredocMarker
      heredocBufferRef.current = []
      term.write('> ')
      return
    }

    // Update interceptor context
    if (interceptor) {
      const context = busybox.getContext()
      interceptor.updateContext({
        ...context,
        isSudo: sudoContextRef.current
      })
    }

    // Check if command should be intercepted
    if (interceptor && interceptor.shouldIntercept(redirection.command)) {
      const result = await interceptor.intercept(redirection.command)
      
      if (result.intercepted && result.handled) {
        // Command was fully handled by interceptor - show output and stop
        // Handle output
        if (result.output) {
          // Apply output redirection if needed
          if (redirection.hasRedirection && redirection.target && (redirection.type === 'output' || redirection.type === 'append')) {
            try {
              const redirectResult = await executeWithRedirection(
                redirection,
                result.output,
                busybox.getFS(),
                busybox.getContext().currentPath
              )
              if (redirectResult.success) {
                term.writeln(`\x1b[1;32m✓ Output redirected to ${redirection.target}\x1b[0m`)
              } else if (redirectResult.error) {
                term.writeln(`\x1b[1;31mRedirection error: ${redirectResult.error}\x1b[0m`)
              }
            } catch (error) {
              term.writeln(`\x1b[1;31mRedirection error: ${error}\x1b[0m`)
            }
          } else {
            term.writeln(result.output)
          }
        }
        
        if (result.error) {
          term.writeln(`\x1b[1;31m${result.error}\x1b[0m`)
        }
        
        // Handle context changes
        if (result.newContext) {
          const context = busybox.getContext()
          if (result.newContext.isSudo !== undefined) {
            sudoContextRef.current = result.newContext.isSudo
          }
          if (result.newContext.currentPath) {
            busybox.setContext({
              ...context,
              currentPath: result.newContext.currentPath
            })
          }
        }
        
        writePrompt(term, busybox, username)
        return
      } else if (result.intercepted && !result.handled) {
        // Command was intercepted but not handled - apply context changes and continue execution
        if (result.newContext) {
          const context = busybox.getContext()
          if (result.newContext.isSudo !== undefined) {
            sudoContextRef.current = result.newContext.isSudo
            busybox.setContext({
              ...context,
              isSudo: result.newContext.isSudo
            })
          }
          if (result.newContext.currentPath) {
            busybox.setContext({
              ...context,
              currentPath: result.newContext.currentPath
            })
          }
        }
        
        // If interceptor provided an actualCommand, use it instead
        if (result.actualCommand) {
          redirection = parseRedirection(result.actualCommand)
        }
        // Continue to execute the actual command below
      }
    }

    // Handle network commands
    const cmdName = redirection.command.split(" ")[0]
    if (networkSimRef.current && networkSimRef.current.isNetworkCommand(cmdName)) {
      const parts = redirection.command.split(" ")
      const args = parts.slice(1)
      const result = networkSimRef.current.execute(cmdName, args, {
        fs: busybox.getFS(),
        currentPath: busybox.getContext().currentPath
      })
      
      let output = result.output || ''
      if (result.error) output += `\x1b[1;31m${result.error}\x1b[0m\n`
      
      // Apply redirection if needed
      if (redirection.hasRedirection && redirection.target && output && (redirection.type === 'output' || redirection.type === 'append')) {
        try {
          const redirectResult = await executeWithRedirection(
            redirection,
            output,
            busybox.getFS(),
            busybox.getContext().currentPath
          )
          if (redirectResult.success) {
            term.writeln(`\x1b[1;32m✓ Output redirected to ${redirection.target}\x1b[0m`)
          } else if (redirectResult.error) {
            term.writeln(`\x1b[1;31mRedirection error: ${redirectResult.error}\x1b[0m`)
          }
        } catch (error) {
          term.writeln(`\x1b[1;31mRedirection error: ${error}\x1b[0m`)
        }
      } else {
        if (result.output) term.writeln(result.output)
        if (result.error) term.writeln(`\x1b[1;31m${result.error}\x1b[0m`)
      }
      
      writePrompt(term, busybox, username)
      return
    }

    // Check for destructive commands before execution
    const destructiveCheck = detectDestructiveCommand(redirection.command)

    if (destructiveCheck?.isDestructive) {
      // Store command for later execution if confirmed
      setConfirmCommand(redirection.command)
      setConfirmSeverity(destructiveCheck.warningLevel)
      
      const messageData = getDestructiveCommandMessage(destructiveCheck)
      setConfirmTitle(messageData.title)
      setConfirmMessage(messageData.message)
      setConfirmLabel(messageData.confirmLabel)
      
      const alternative = getSaferAlternative(redirection.command)
      setConfirmAlternative(alternative || undefined)
      
      setConfirmOpen(true)
      return // Don't execute yet - wait for confirmation
    }

    // Execute command through BusyBox
    try {
      const result = await busybox.execute(redirection.command)

      // Check if password is required for sudo
      if (result.requiresPassword && result.pendingCommand) {
        // Enter password mode
        passwordModeRef.current = true
        passwordBufferRef.current = ""
        pendingSudoCommandRef.current = result.pendingCommand
        
        // Show password prompt
        term.write('[sudo] password for ' + username + ': ')
        return
      }

      let stdout = result.stdout
      let stderr = result.stderr
      
      // Preserve original output for error logging
      const originalStdout = stdout
      const originalStderr = stderr
      
      // Apply I/O redirection if needed
      if (redirection.hasRedirection && redirection.target && (redirection.type === 'output' || redirection.type === 'append')) {
        try {
          const redirectResult = await executeWithRedirection(
            redirection,
            stdout,
            busybox.getFS(),
            busybox.getContext().currentPath
          )
          if (redirectResult.success) {
            term.writeln(`\x1b[1;32m✓ Output redirected to ${redirection.target}\x1b[0m`)
            // Don't show output if redirected
            stdout = ''
            stderr = ''
          } else if (redirectResult.error) {
            term.writeln(`\x1b[1;31mRedirection error: ${redirectResult.error}\x1b[0m`)
          }
        } catch (error) {
          term.writeln(`\x1b[1;31mRedirection error: ${error}\x1b[0m`)
        }
      }

      // Display output
      if (stdout) {
        const lines = stdout.split('\n')
        lines.forEach(line => {
          if (line) term.writeln(line)
        })
      }

      if (stderr) {
        const errorLines = stderr.split('\n')
        errorLines.forEach(line => {
          if (line) term.writeln(`\x1b[1;31m${line}\x1b[0m`)
        })
        
        // Analyze error and provide suggestions
        const errorSuggestion = analyzeError(stdout, stderr, command)
        if (errorSuggestion) {
          term.writeln(formatErrorSuggestion(errorSuggestion))
        }
      }
      
      // Log errors using original values before redirection
      if (result.exitCode !== 0) {
        // Determine severity: expected failures (exit codes 1-2) are INFO, others are WARNINGS
        const severity = result.exitCode <= 2 ? ErrorSeverity.INFO : ErrorSeverity.WARNING
        
        errorLogger.log(
          ErrorType.COMMAND_EXECUTION,
          `Command failed: ${command}`,
          {
            exitCode: result.exitCode,
            stderr: originalStderr,
            stdout: originalStdout
          },
          undefined,
          severity
        )
      }
      
      // Update environment PWD if command changed directory
      if (envSim) {
        const newPath = busybox.getContext().currentPath
        envSim.updatePWD(newPath)
      }

      // Validate with mission layer (pure output validation)
      if (missionLayerRef.current) {
        try {
          missionLayerRef.current.validateTask({
            command,                        // For logging only
            stdout: originalStdout,         // Primary validation source - use original before redirection
            stderr: originalStderr,
            exitCode: result.exitCode,
            fileSystem: busybox.getFS(),
          })
        } catch (validationError) {
          errorLogger.log(
            ErrorType.MISSION_VALIDATION,
            `Mission validation error for command: ${command}`,
            { command, result },
            validationError instanceof Error ? validationError : undefined,
            ErrorSeverity.WARNING
          )
        }
      }

      // Write prompt with current path from BusyBox context
      writePrompt(term, busybox, username)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      term.writeln(`\x1b[1;31mError: ${errorMessage}\x1b[0m`)
      errorLogger.log(
        ErrorType.COMMAND_EXECUTION,
        `Command execution error: ${command}`,
        { command },
        error instanceof Error ? error : undefined,
        ErrorSeverity.ERROR
      )
      writePrompt(term, busybox, username)
    }
  }

  const handleEditor = (filename: string) => {
    const busybox = busyboxRef.current
    if (!busybox) return

    const context = busybox.getContext()
    const currentPath = context.currentPath
    const fullPath = filename.startsWith('/') ? filename : `${currentPath}/${filename}`
    
    const fs = busybox.getFS()

    let content = ""
    if (fs.exists(fullPath)) {
      try {
        content = fs.readFile(fullPath, { encoding: 'utf8' }) as string
      } catch (error) {
        errorLogger.log(
          ErrorType.EDITOR,
          `Failed to read file: ${fullPath}`,
          { filename, fullPath },
          error instanceof Error ? error : undefined,
          ErrorSeverity.ERROR
        )
        return
      }
    }

    setEditorFile(fullPath)
    setEditorContent(content)
    setEditorOpen(true)
  }

  const handleEditorSave = (content: string) => {
    const busybox = busyboxRef.current
    if (!busybox) return

    const fs = busybox.getFS()

    try {
      fs.writeFile(editorFile, content)
      setEditorOpen(false)
      
      // Refresh terminal
      if (xtermRef.current) {
        xtermRef.current.writeln(`\x1b[1;32mFile saved: ${editorFile}\x1b[0m`)
        writePrompt(xtermRef.current, busybox, username)
      }
    } catch (error) {
      errorLogger.log(
        ErrorType.EDITOR,
        `Failed to save file: ${editorFile}`,
        { filename: editorFile },
        error instanceof Error ? error : undefined,
        ErrorSeverity.ERROR
      )
    }
  }

  const handleEditorClose = () => {
    setEditorOpen(false)
    const busybox = busyboxRef.current
    if (xtermRef.current && busybox) {
      writePrompt(xtermRef.current, busybox, username)
    }
  }

  const handleLessClose = () => {
    setLessOpen(false)
    const busybox = busyboxRef.current
    if (xtermRef.current && busybox) {
      writePrompt(xtermRef.current, busybox, username)
    }
  }

  const handleSSHDisconnect = () => {
    const sshSim = sshSimRef.current
    const term = xtermRef.current
    const busybox = busyboxRef.current
    
    if (sshSim && term && busybox) {
      sshSim.disconnect()
      writePrompt(term, busybox, username)
    }
  }

  const handleConfirmExecute = async () => {
    const term = xtermRef.current
    const busybox = busyboxRef.current
    
    setConfirmOpen(false)
    
    if (!term || !busybox || !confirmCommand) return
    
    // Execute the destructive command
    term.writeln(`\x1b[1;33m⚠️  Executing destructive command...\x1b[0m`)
    
    try {
      const result = await busybox.execute(confirmCommand)
      
      if (result.stdout) {
        term.writeln(result.stdout)
      }
      
      if (result.stderr) {
        term.writeln(`\x1b[1;31m${result.stderr}\x1b[0m`)
      }
      
      if (result.exitCode === 0) {
        term.writeln(`\x1b[1;32m✓ Command executed successfully\x1b[0m`)
      }
    } catch (error) {
      term.writeln(`\x1b[1;31mError: ${error}\x1b[0m`)
    }
    
    setConfirmCommand("")
    writePrompt(term, busybox, username)
  }

  const handleConfirmCancel = () => {
    const term = xtermRef.current
    const busybox = busyboxRef.current
    
    setConfirmOpen(false)
    setConfirmCommand("")
    
    if (term && busybox) {
      term.writeln(`\x1b[1;33m✗ Command cancelled\x1b[0m`)
      writePrompt(term, busybox, username)
    }
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div ref={terminalRef} className="w-full h-full flex-1" />
      
      {/* Nano Editor Modal */}
      {editorOpen && (
        <NanoEditor
          isOpen={editorOpen}
          filename={editorFile}
          initialContent={editorContent}
          onSave={handleEditorSave}
          onClose={handleEditorClose}
        />
      )}
      
      {/* Less Viewer Modal */}
      {lessOpen && (
        <LessViewer
          isOpen={lessOpen}
          filename={lessFile}
          content={lessContent}
          onClose={handleLessClose}
        />
      )}
      
      {/* SSH Session Indicator */}
      <SSHModal
        isConnected={sshConnected}
        host={sshHost}
        user={sshUser}
        sessionDuration={sshDuration}
        onDisconnect={handleSSHDisconnect}
      />
      
      {/* Destructive Command Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmOpen}
        title={confirmTitle}
        message={confirmMessage}
        confirmLabel={confirmLabel}
        warningLevel={confirmSeverity}
        saferAlternative={confirmAlternative}
        onConfirm={handleConfirmExecute}
        onCancel={handleConfirmCancel}
      />
    </div>
  )
})
