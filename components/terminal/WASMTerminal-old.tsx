"use client"

import { useEffect, useRef, useState } from "react"
import { Terminal as XTerm } from "xterm"
import { FitAddon } from "@xterm/addon-fit"
import { WebLinksAddon } from "@xterm/addon-web-links"
import "xterm/css/xterm.css"
import { Adventure } from "@/lib/terminal/types"
import { BusyBoxWASM } from "@/lib/terminal/wasm-busybox"
import { MissionLayer, MissionProgress } from "@/lib/terminal/mission-layer"
import { NetworkSimulator } from "@/lib/terminal/network-simulator"
import { resolvePath as resolvePathUtil, normalizePath as normalizePathUtil } from "@/lib/terminal/filesystem"
import { NanoEditor } from "./NanoEditor"

interface WASMTerminalProps {
  adventure: Adventure
  onMissionComplete: (missionId: string) => void
  onTaskComplete: (taskId: string) => void
  onAllComplete: () => void
  onProgressUpdate?: (currentMissionIndex: number, currentTaskIndex: number) => void
}

export function WASMTerminal({ 
  adventure, 
  onMissionComplete, 
  onTaskComplete, 
  onAllComplete,
  onProgressUpdate
}: WASMTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<XTerm | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const busyboxRef = useRef<BusyBoxWASM | null>(null)
  const missionLayerRef = useRef<MissionLayer | null>(null)
  const networkSimRef = useRef<NetworkSimulator | null>(null)
  
  const [isMounted, setIsMounted] = useState(false)
  const [currentPath, setCurrentPath] = useState(`/home/${adventure.id === "hack_mainframe" ? "student" : "archivist"}`)
  const [currentInput, setCurrentInput] = useState("")
  const inputBufferRef = useRef("")
  
  // Nano editor state
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorFile, setEditorFile] = useState("")
  const [editorContent, setEditorContent] = useState("")

  const username = adventure.id === "hack_mainframe" ? "student" : "archivist"

  useEffect(() => {
    setIsMounted(true)
    return () => setIsMounted(false)
  }, [])

  useEffect(() => {
    if (!terminalRef.current || xtermRef.current || !isMounted) return

    // Initialize components
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

    // Create xterm.js instance
    const term = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: "#0a0e27",
        foreground: "#00ff41",
        cursor: "#00ff41",
        black: "#000000",
        red: "#ff0000",
        green: "#00ff00",
        yellow: "#ffff00",
        blue: "#0000ff",
        magenta: "#ff00ff",
        cyan: "#00ffff",
        white: "#ffffff",
        brightBlack: "#666666",
        brightRed: "#ff6666",
        brightGreen: "#66ff66",
        brightYellow: "#ffff66",
        brightBlue: "#6666ff",
        brightMagenta: "#ff66ff",
        brightCyan: "#66ffff",
        brightWhite: "#ffffff",
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

    // Initialize WASM BusyBox
    term.writeln("\x1b[1;33mInitializing terminal environment...\x1b[0m")
    
    const busybox = new BusyBoxWASM()
    busyboxRef.current = busybox

    try {
      await busybox.load()
      await busybox.initializeFilesystem(adventure.initialFileSystem)
      
      // Set execution context for command execution
      busybox.setExecutionContext({
        currentPath: currentPath,
        fileSystem: adventure.initialFileSystem
      })
      
      term.writeln("\x1b[1;32m✓ WASM BusyBox loaded successfully\x1b[0m")
    } catch (error) {
      term.writeln("\x1b[1;31m✗ Failed to load BusyBox WASM\x1b[0m")
      term.writeln("\x1b[1;33mFalling back to simulation mode\x1b[0m")
    }

    // Initialize Mission Layer
    const savedProgress = MissionLayer.loadProgress(adventure.id)
    const missionLayer = new MissionLayer(adventure, savedProgress || undefined)
    missionLayerRef.current = missionLayer

    // Set up mission layer listeners
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
      console.log('[WASMTerminal] progressUpdate received', progress)
      if (onProgressUpdate) {
        onProgressUpdate(progress.currentMissionIndex, progress.currentTaskIndex)
      }
    })

    // Send initial progress to parent
    const initialProgress = missionLayer.getProgress()
    console.log('[WASMTerminal] Sending initial progress', initialProgress)
    if (onProgressUpdate) {
      onProgressUpdate(initialProgress.currentMissionIndex, initialProgress.currentTaskIndex)
    }

    // Initialize Network Simulator
    networkSimRef.current = new NetworkSimulator()

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
    term.writeln(`System: \x1b[1;33mBusyBox WASM + Mission Layer\x1b[0m`)
    term.writeln(`Type '\x1b[1;33mhelp\x1b[0m' for available commands`)
    term.writeln("")

    writePrompt(term, username, currentPath)

    // Handle input
    term.onData((data) => {
      const code = data.charCodeAt(0)

      if (code === 13) {
        // Enter
        term.write("\r\n")
        const command = inputBufferRef.current.trim()
        inputBufferRef.current = ""
        setCurrentInput("")

        if (command) {
          handleCommand(term, command)
        } else {
          writePrompt(term, username, currentPath)
        }
      } else if (code === 127) {
        // Backspace
        if (inputBufferRef.current.length > 0) {
          inputBufferRef.current = inputBufferRef.current.slice(0, -1)
          setCurrentInput(inputBufferRef.current)
          term.write("\b \b")
        }
      } else if (code === 3) {
        // Ctrl+C
        term.write("^C\r\n")
        inputBufferRef.current = ""
        setCurrentInput("")
        writePrompt(term, username, currentPath)
      } else if (code >= 32 && code <= 126) {
        // Printable characters
        inputBufferRef.current += data
        setCurrentInput(inputBufferRef.current)
        term.write(data)
      }
    })

    // Handle resize
    const handleResize = () => {
      if (fitAddonRef.current && xtermRef.current) {
        try {
          fitAddonRef.current.fit()
        } catch (error) {
          console.warn("Failed to fit terminal on resize:", error)
        }
      }
    }
    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }

  const writePrompt = (term: XTerm, user: string, path: string) => {
    const displayPath = path === `/home/${user}` ? "~" : path
    term.write(`\x1b[1;32m${user}@terminal\x1b[0m:\x1b[1;34m${displayPath}\x1b[0m$ `)
  }

  const handleCommand = async (term: XTerm, command: string) => {
    const parts = parseCommand(command)
    const cmd = parts[0]
    const args = parts.slice(1)

    let output = ""
    let error = ""
    let exitCode = 0
    let newPath = currentPath

    // Special commands handled by JS layer
    if (cmd === "clear") {
      term.write("\x1b[2J\x1b[H")
      writePrompt(term, username, currentPath)
      return
    }

    if (cmd === "help") {
      const helpLines = getHelpText().split('\n')
      helpLines.forEach(line => term.writeln(line))
      writePrompt(term, username, currentPath)
      return
    }

    if (cmd === "nano" || cmd === "vi" || cmd === "vim") {
      handleEditor(args)
      writePrompt(term, username, currentPath)
      return
    }

    // Network simulation commands
    if (networkSimRef.current && ["ping", "curl", "wget", "ssh", "scp", "ifconfig", "netstat", "dig", "nslookup", "ip"].includes(cmd)) {
      const result = handleNetworkCommand(cmd, args)
      if (result.output) term.writeln(result.output)
      if (result.error) term.writeln(`\x1b[1;31m${result.error}\x1b[0m`)
      writePrompt(term, username, currentPath)
      
      // Validate with mission layer
      if (missionLayerRef.current) {
        missionLayerRef.current.validateTask({
          command,
          stdout: result.output,
          stderr: result.error || "",
          exitCode: result.success ? 0 : 1,
          fileSystem: busyboxRef.current?.getFS(),
        })
      }
      return
    }

    // Handle cd separately (changes state)
    if (cmd === "cd") {
      const targetPath = args[0] || `/home/${username}`
      const resolved = resolvePathUtil(currentPath, targetPath === "~" ? `/home/${username}` : targetPath)
      
      const fs = busyboxRef.current?.getFS()
      if (fs) {
        try {
          const pathInfo = fs.analyzePath(resolved)
          if (pathInfo.exists && pathInfo.isDir) {
            newPath = resolved
            setCurrentPath(resolved)
            // Update execution context when path changes
            if (busyboxRef.current) {
              busyboxRef.current.setExecutionContext({
                currentPath: resolved,
                fileSystem: adventure.initialFileSystem
              })
            }
            
            // Validate cd command with mission layer
            if (missionLayerRef.current) {
              missionLayerRef.current.validateTask({
                command,
                stdout: "",
                stderr: "",
                exitCode: 0,
                fileSystem: fs,
              })
            }
          } else if (pathInfo.exists) {
            error = `cd: ${targetPath}: Not a directory`
          } else {
            error = `cd: ${targetPath}: No such file or directory`
          }
        } catch (e) {
          error = `cd: ${targetPath}: No such file or directory`
        }
      }

      if (error) {
        term.writeln(`\x1b[1;31m${error}\x1b[0m`)
      }
      writePrompt(term, username, newPath)
      return
    }

    // Execute command in WASM BusyBox
    if (busyboxRef.current && busyboxRef.current.isLoaded()) {
      try {
        // Update execution context before executing command
        // Use newPath (synchronously updated) instead of currentPath (async React state)
        busyboxRef.current.setExecutionContext({
          currentPath: newPath,
          fileSystem: adventure.initialFileSystem
        })
        
        const result = await busyboxRef.current.execute(command)
        output = result.stdout
        error = result.stderr
        exitCode = result.exitCode
      } catch (e) {
        error = `bash: ${cmd}: command not found`
        exitCode = 127
      }
    } else {
      error = `bash: ${cmd}: command not found`
      exitCode = 127
    }

    // Display output
    if (output) {
      const lines = output.split('\n')
      lines.forEach(line => term.writeln(line))
    }

    if (error) {
      const errorLines = error.split('\n')
      errorLines.forEach(line => term.writeln(`\x1b[1;31m${line}\x1b[0m`))
    }

    // Validate with mission layer
    if (missionLayerRef.current) {
      const isValid = missionLayerRef.current.validateTask({
        command,
        stdout: output,
        stderr: error,
        exitCode,
        fileSystem: busyboxRef.current?.getFS(),
      })
      console.log('[VALIDATION]', { command, isValid, output: output.substring(0, 50) })
    }

    writePrompt(term, username, newPath)
  }

  const handleNetworkCommand = (cmd: string, args: string[]): { success: boolean; output: string; error?: string } => {
    const network = networkSimRef.current!
    const fs = busyboxRef.current?.getFS()

    switch (cmd) {
      case "ping":
        return network.ping(args[0] || "localhost")
      case "curl":
        return network.curl(args[0] || "")
      case "wget":
        return network.wget(args[0] || "", fs, currentPath)
      case "ssh":
        return network.ssh(args[0] || "")
      case "scp":
        return network.scp(args[0] || "", args[1] || "", fs, currentPath)
      case "ifconfig":
        return network.ifconfig()
      case "netstat":
        return network.netstat()
      case "dig":
        return network.dig(args[0] || "")
      case "nslookup":
        return network.nslookup(args[0] || "")
      case "ip":
        if (args[0] === "addr" || args[0] === "address") {
          return network.ipAddr()
        }
        return { success: false, output: "", error: `ip: unknown command '${args[0]}'\nTry: ip addr` }
      default:
        return { success: false, output: "", error: `${cmd}: command not found` }
    }
  }

  const handleEditor = (args: string[]) => {
    if (args.length === 0) {
      xtermRef.current?.writeln("\x1b[1;33mUsage: nano <filename>\x1b[0m")
      return
    }

    const filename = args[0]
    const filepath = filename.startsWith('/') ? filename : `${currentPath}/${filename}`
    const fs = busyboxRef.current?.getFS()

    let content = ""
    if (fs) {
      try {
        content = fs.readFile(filepath, { encoding: 'utf8' })
      } catch (e) {
        // File doesn't exist, create new
        content = ""
      }
    }

    setEditorFile(filepath)
    setEditorContent(content)
    setEditorOpen(true)
  }

  const handleEditorSave = (content: string) => {
    const fs = busyboxRef.current?.getFS()
    if (fs) {
      try {
        fs.writeFile(editorFile, content, { encoding: 'utf8' })
        xtermRef.current?.writeln(`\x1b[1;32m✓ File saved: ${editorFile}\x1b[0m`)
        
        // Validate nano-save task for mission tracking
        if (missionLayerRef.current) {
          missionLayerRef.current.validateTask({
            command: "nano-save",
            stdout: `File saved: ${editorFile}`,
            stderr: "",
            exitCode: 0,
            fileSystem: fs,
          })
        }
      } catch (e) {
        xtermRef.current?.writeln(`\x1b[1;31m✗ Failed to save file: ${e}\x1b[0m`)
      }
    }
  }

  const parseCommand = (command: string): string[] => {
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

  const getHelpText = (): string => {
    const lines = [
      "\x1b[1;36mAvailable Commands:\x1b[0m",
      "",
      "\x1b[1;33mFile System:\x1b[0m",
      "  ls [-la]          - List directory contents",
      "  cd <dir>          - Change directory",
      "  pwd               - Print working directory",
      "  cat <file>        - Display file contents",
      "  grep <pattern>    - Search for pattern in files",
      "  find <path>       - Find files",
      "  mkdir <dir>       - Create directory",
      "  rmdir <dir>       - Remove empty directory",
      "  rm <file>         - Remove file",
      "  cp <src> <dst>    - Copy file",
      "  mv <src> <dst>    - Move/rename file",
      "  touch <file>      - Create empty file",
      "  less/more <file>  - Page through file",
      "  head <file>       - Show first lines",
      "  tail <file>       - Show last lines",
      "  nano <file>       - Edit file",
      "",
      "\x1b[1;33mNetwork:\x1b[0m",
      "  ping <host>       - Ping a host",
      "  curl <url>        - Transfer data from URL",
      "  wget <url>        - Download file",
      "  ssh <user@host>   - Connect to remote host",
      "  scp <src> <dst>   - Secure copy",
      "  ifconfig          - Network interface info",
      "  netstat           - Network statistics",
      "",
      "\x1b[1;33mSystem:\x1b[0m",
      "  echo <text>       - Display text",
      "  env               - Show environment",
      "  clear             - Clear screen",
      "  help              - Show this help",
      "  history           - Command history",
      "",
      "\x1b[1;32mTip:\x1b[0m Follow the mission objectives to progress through the story!",
    ]
    
    return lines.join('\n')
  }

  return (
    <>
      <div className="w-full h-full bg-[#0a0e27] rounded-lg overflow-hidden border-2 border-green-500/30 shadow-[0_0_20px_rgba(0,255,65,0.3)]">
        {!isMounted && (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-green-500 text-sm">Initializing terminal...</div>
          </div>
        )}
        <div 
          ref={terminalRef} 
          className="w-full h-full p-4" 
          style={{ display: isMounted ? 'block' : 'none' }}
        />
      </div>

      <NanoEditor
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
        filename={editorFile}
        initialContent={editorContent}
        onSave={handleEditorSave}
      />
    </>
  )
}
