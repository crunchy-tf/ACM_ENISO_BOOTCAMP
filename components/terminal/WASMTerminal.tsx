/**
 * WASM Terminal Component - Clean Implementation
 * Uses Emscripten MEMFS for real filesystem operations
 */

"use client"

import { useEffect, useRef, useState } from "react"
import { Terminal as XTerm } from "xterm"
import { FitAddon } from "@xterm/addon-fit"
import { WebLinksAddon } from "@xterm/addon-web-links"
import "xterm/css/xterm.css"
import { Adventure } from "@/lib/terminal/types"
import { BusyBoxWASM } from "@/lib/terminal/wasm-busybox"
import { MissionLayer } from "@/lib/terminal/mission-layer"
import { NetworkSimulator } from "@/lib/terminal/network-simulator"
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
        currentPath: currentPath,
        username: username,
        isSudo: false,
      })
      
      term.writeln("\x1b[1;32m✓ WASM BusyBox loaded successfully\x1b[0m")
    } catch (error) {
      term.writeln("\x1b[1;31m✗ Failed to load BusyBox\x1b[0m")
      console.error(error)
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
        onProgressUpdate(progress.currentMissionIndex, progress.currentTaskIndex)
      }
    })

    // Send initial progress
    const initialProgress = missionLayer.getProgress()
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
    term.writeln(`System: \x1b[1;33mBusyBox WASM + MEMFS\x1b[0m`)
    term.writeln(`Type '\x1b[1;33mhelp\x1b[0m' for available commands`)
    term.writeln("")

    writePrompt(term, username, currentPath)

    // Handle input
    term.onData((data) => {
      const code = data.charCodeAt(0)

      if (code === 13) {
        // Enter
        term.write('\r\n')
        const command = inputBufferRef.current.trim()
        inputBufferRef.current = ""

        if (command) {
          handleCommand(term, command)
        } else {
          writePrompt(term, username, currentPath)
        }
      } else if (code === 127) {
        // Backspace
        if (inputBufferRef.current.length > 0) {
          inputBufferRef.current = inputBufferRef.current.slice(0, -1)
          term.write('\b \b')
        }
      } else if (code >= 32) {
        // Printable character
        inputBufferRef.current += data
        term.write(data)
      }
    })
  }

  const writePrompt = (term: XTerm, user: string, path: string) => {
    const displayPath = path === `/home/${user}` ? "~" : path
    term.write(`\x1b[1;32m${user}@terminal\x1b[0m:\x1b[1;34m${displayPath}\x1b[0m$ `)
  }

  const handleCommand = async (term: XTerm, command: string) => {
    if (!busyboxRef.current) {
      term.writeln("\x1b[1;31mError: Terminal not initialized\x1b[0m")
      writePrompt(term, username, currentPath)
      return
    }

    // Handle special commands
    if (command === "clear") {
      term.write("\x1b[2J\x1b[H")
      writePrompt(term, username, currentPath)
      return
    }

    if (command === "help") {
      term.writeln("Available commands:")
      term.writeln("  ls, cd, pwd, cat, mkdir, touch, rm, rmdir, cp, mv")
      term.writeln("  echo, clear, help")
      term.writeln("  sudo - run commands with root privileges")
      writePrompt(term, username, currentPath)
      return
    }

    // Handle nano/vi/vim
    if (command.startsWith("nano ") || command.startsWith("vi ") || command.startsWith("vim ")) {
      const parts = command.split(" ")
      const filename = parts[1]
      if (filename) {
        handleEditor(filename)
      }
      writePrompt(term, username, currentPath)
      return
    }

    // Handle network commands
    const networkCmds = ["ping", "curl", "wget", "ssh", "scp", "ifconfig", "netstat", "dig", "nslookup", "ip"]
    const cmdName = command.split(" ")[0]
    if (networkSimRef.current && networkCmds.includes(cmdName)) {
      const result = handleNetworkCommand(command)
      if (result.output) term.writeln(result.output)
      if (result.error) term.writeln(`\x1b[1;31m${result.error}\x1b[0m`)
      writePrompt(term, username, currentPath)
      return
    }

    // Execute command through BusyBox
    try {
      const result = await busyboxRef.current.execute(command)
      
      // Update current path if cd command
      if (command.trim().startsWith("cd")) {
        const newContext = busyboxRef.current.getContext()
        setCurrentPath(newContext.currentPath)
      }

      // Display output
      if (result.stdout) {
        const lines = result.stdout.split('\n')
        lines.forEach(line => term.writeln(line))
      }

      if (result.stderr) {
        const errorLines = result.stderr.split('\n')
        errorLines.forEach(line => term.writeln(`\x1b[1;31m${line}\x1b[0m`))
      }

      // Validate with mission layer
      if (missionLayerRef.current && busyboxRef.current) {
        missionLayerRef.current.validateTask({
          command,
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode,
          fileSystem: busyboxRef.current.getFS(),
        })
      }

      // Use updated path from context for prompt
      const context = busyboxRef.current.getContext()
      writePrompt(term, username, context.currentPath)
    } catch (error) {
      term.writeln(`\x1b[1;31mError: ${error instanceof Error ? error.message : String(error)}\x1b[0m`)
      writePrompt(term, username, currentPath)
    }
  }

  const handleEditor = (filename: string) => {
    const fullPath = filename.startsWith('/') ? filename : `${currentPath}/${filename}`
    
    const fs = busyboxRef.current?.getFS()
    if (!fs) return

    let content = ""
    if (fs.exists(fullPath)) {
      try {
        content = fs.readFile(fullPath, { encoding: 'utf8' }) as string
      } catch (e) {
        console.error("Failed to read file:", e)
      }
    }

    setEditorFile(fullPath)
    setEditorContent(content)
    setEditorOpen(true)
  }

  const handleEditorSave = (content: string) => {
    const fs = busyboxRef.current?.getFS()
    if (!fs) return

    try {
      fs.writeFile(editorFile, content)
      setEditorOpen(false)
      
      // Refresh terminal
      if (xtermRef.current) {
        xtermRef.current.writeln(`\x1b[1;32mFile saved: ${editorFile}\x1b[0m`)
        writePrompt(xtermRef.current, username, currentPath)
      }
    } catch (e) {
      console.error("Failed to save file:", e)
    }
  }

  const handleEditorClose = () => {
    setEditorOpen(false)
    if (xtermRef.current) {
      writePrompt(xtermRef.current, username, currentPath)
    }
  }

  const handleNetworkCommand = (command: string): { success: boolean; output: string; error?: string } => {
    if (!networkSimRef.current) {
      return { success: false, output: "", error: "Network simulator not initialized" }
    }

    const parts = command.split(" ")
    const cmd = parts[0]
    const args = parts.slice(1)

    const fs = busyboxRef.current?.getFS()

    switch (cmd) {
      case "ping":
        return networkSimRef.current.ping(args[0] || "localhost")
      case "curl":
        return networkSimRef.current.curl(args[0] || "")
      case "wget":
        return networkSimRef.current.wget(args[0] || "", fs, currentPath)
      case "ssh":
        return networkSimRef.current.ssh(args[0] || "")
      case "scp":
        return networkSimRef.current.scp(args[0] || "", args[1] || "", fs, currentPath)
      case "ifconfig":
        return networkSimRef.current.ifconfig()
      case "netstat":
        return networkSimRef.current.netstat()
      case "dig":
        return networkSimRef.current.dig(args[0] || "")
      case "nslookup":
        return networkSimRef.current.nslookup(args[0] || "")
      default:
        return { success: false, output: "", error: "Command not found" }
    }
  }

  return (
    <>
      <div ref={terminalRef} className="w-full h-full" />
      {editorOpen && (
        <NanoEditor
          isOpen={editorOpen}
          filename={editorFile}
          initialContent={editorContent}
          onSave={handleEditorSave}
          onClose={handleEditorClose}
        />
      )}
    </>
  )
}
