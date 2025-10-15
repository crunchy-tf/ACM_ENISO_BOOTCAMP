"use client"

import { useEffect, useRef, useState } from "react"
import { Terminal as XTerm } from "xterm"
import { FitAddon } from "@xterm/addon-fit"
import { WebLinksAddon } from "@xterm/addon-web-links"
import "xterm/css/xterm.css"
import { executeCommand } from "@/lib/terminal/commands"
import { TerminalState, Adventure, Mission, Task } from "@/lib/terminal/types"

interface TerminalProps {
  adventure: Adventure
  onMissionComplete: (missionId: string) => void
  onTaskComplete: (taskId: string) => void
  onAllComplete: () => void
}

export function Terminal({ adventure, onMissionComplete, onTaskComplete, onAllComplete }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<XTerm | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const [state, setState] = useState<TerminalState>({
    currentPath: "/home/" + (adventure.id === "hack_mainframe" ? "hacker" : "archivist"),
    fileSystem: adventure.initialFileSystem,
    history: [],
    environment: {
      USER: adventure.id === "hack_mainframe" ? "hacker" : "archivist",
      HOME: "/home/" + (adventure.id === "hack_mainframe" ? "hacker" : "archivist"),
      PATH: "/usr/local/bin:/usr/bin:/bin",
      SHELL: "/bin/bash",
    },
    currentMissionIndex: 0,
    currentTaskIndex: 0,
    completedTasks: new Set<string>(),
    hintsUsed: {},
  })
  const [currentInput, setCurrentInput] = useState("")
  const inputBufferRef = useRef("")

  useEffect(() => {
    setIsMounted(true)
    return () => setIsMounted(false)
  }, [])

  useEffect(() => {
    if (!terminalRef.current || xtermRef.current || !isMounted) return

    // Initialize xterm.js
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
    })

    const fitAddon = new FitAddon()
    const webLinksAddon = new WebLinksAddon()

    term.loadAddon(fitAddon)
    term.loadAddon(webLinksAddon)
    term.open(terminalRef.current)
    
    // Store refs before fitting
    xtermRef.current = term
    fitAddonRef.current = fitAddon

    // Fit terminal after a brief delay to ensure renderer is ready
    setTimeout(() => {
      try {
        fitAddon.fit()
      } catch (error) {
        console.warn("Failed to fit terminal on initial load:", error)
      }
    }, 50)

    // Welcome message
    const username = state.environment.USER
    term.writeln("\x1b[1;32m╔════════════════════════════════════════════════════════╗\x1b[0m")
    term.writeln(
      `\x1b[1;32m║\x1b[0m  Welcome to ${adventure.title.padEnd(42)} \x1b[1;32m║\x1b[0m`
    )
    term.writeln("\x1b[1;32m╚════════════════════════════════════════════════════════╝\x1b[0m")
    term.writeln("")
    term.writeln(`Connected as: \x1b[1;36m${username}@terminal\x1b[0m`)
    term.writeln(`Type '\x1b[1;33mhelp\x1b[0m' for available commands`)
    term.writeln("")

    writePrompt(term, username, state.currentPath)

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
          writePrompt(term, username, state.currentPath)
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
        writePrompt(term, username, state.currentPath)
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
      term.dispose()
    }
  }, [isMounted])

  const writePrompt = (term: XTerm, username: string, path: string) => {
    const displayPath = path === `/home/${username}` ? "~" : path
    term.write(`\x1b[1;32m${username}@terminal\x1b[0m:\x1b[1;34m${displayPath}\x1b[0m$ `)
  }

  const handleCommand = (term: XTerm, command: string) => {
    const result = executeCommand(command, state, (newState) => {
      setState((prev) => ({ ...prev, ...newState }))
    })

    if (result.error) {
      term.writeln(`\x1b[1;31m${result.error}\x1b[0m`)
    } else if (result.output) {
      term.writeln(result.output)
    }

    // Check task completion
    checkTaskCompletion(command, result.output)

    const currentPath = result.modifiesState && state.currentPath !== state.currentPath ? state.currentPath : state.currentPath
    writePrompt(term, state.environment.USER, currentPath)
  }

  const checkTaskCompletion = (command: string, output: string) => {
    const currentMission = adventure.missions[state.currentMissionIndex]
    if (!currentMission) return

    const currentTask = currentMission.tasks[state.currentTaskIndex]
    if (!currentTask || state.completedTasks.has(currentTask.id)) return

    let isComplete = false

    // Check exact command match
    if (currentTask.command && command.trim() === currentTask.command) {
      isComplete = true
    }

    // Check command pattern
    if (currentTask.commandPattern) {
      const regex = new RegExp(currentTask.commandPattern)
      if (regex.test(command.trim())) {
        isComplete = true
      }
    }

    // Custom completion check
    if (currentTask.checkCompletion) {
      isComplete = currentTask.checkCompletion(output, command, state.fileSystem)
    }

    if (isComplete) {
      const newCompletedTasks = new Set(state.completedTasks)
      newCompletedTasks.add(currentTask.id)

      setState((prev) => ({
        ...prev,
        completedTasks: newCompletedTasks,
      }))

      onTaskComplete(currentTask.id)

      // Check if all tasks in mission are complete
      const allTasksComplete = currentMission.tasks.every((task) =>
        newCompletedTasks.has(task.id)
      )

      if (allTasksComplete) {
        setTimeout(() => {
          onMissionComplete(currentMission.id)

          // Move to next mission
          const nextMissionIndex = state.currentMissionIndex + 1
          if (nextMissionIndex < adventure.missions.length) {
            setState((prev) => ({
              ...prev,
              currentMissionIndex: nextMissionIndex,
              currentTaskIndex: 0,
            }))
          } else {
            // All missions complete!
            onAllComplete()
          }
        }, 500)
      } else {
        // Move to next task
        setState((prev) => ({
          ...prev,
          currentTaskIndex: prev.currentTaskIndex + 1,
        }))
      }
    }
  }

  return (
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
  )
}
