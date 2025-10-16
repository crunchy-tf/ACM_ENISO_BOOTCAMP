"use client"

import { useState, useEffect, useRef } from "react"
import { AdventureSelection } from "./AdventureSelection"
import { WASMTerminal, WASMTerminalRef } from "./WASMTerminal"
import { MissionOverlay } from "./MissionOverlay"
import { ConfirmDialog } from "./ConfirmDialog"
import { ContinueDialog } from "./ContinueDialog"
import { Adventure } from "@/lib/terminal/types"
import { MissionLayer } from "@/lib/terminal/mission-layer"
import { Button } from "@/components/ui/button"
import { ArrowLeft, RotateCcw } from "lucide-react"

export function TerminalExercise() {
  const terminalRef = useRef<WASMTerminalRef>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  const [selectedAdventure, setSelectedAdventure] = useState<"hack_mainframe" | null>(null)
  const [adventure, setAdventure] = useState<Adventure | null>(null)
  const [loading, setLoading] = useState(false)
  
  // Reset confirmation dialog state
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  
  // Continue dialog state
  const [showContinueDialog, setShowContinueDialog] = useState(false)
  const [savedProgress, setSavedProgress] = useState<any>(null)
  
  // Progress state from MissionLayer - single source of truth
  const [currentMissionIndex, setCurrentMissionIndex] = useState(0)
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0)
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set())
  const [completedMissions, setCompletedMissions] = useState<Set<string>>(new Set())
  const [hintsUsed, setHintsUsed] = useState<Record<string, number>>({})

  // Keyboard shortcut for reset (Ctrl+Shift+R or Cmd+Shift+R)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && (e.ctrlKey || e.metaKey) && e.key === 'R') {
        e.preventDefault()
        if (adventure && !isResetting) {
          setShowResetDialog(true)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [adventure, isResetting])

  // Prevent scrolling out of the exercise - lock the slide
  useEffect(() => {
    if (!containerRef.current) return

    const preventDefault = (e: Event) => {
      e.preventDefault()
      e.stopPropagation()
    }

    const preventScroll = (e: WheelEvent) => {
      e.preventDefault()
      e.stopPropagation()
    }

    const preventKeyScroll = (e: KeyboardEvent) => {
      // Prevent arrow keys and page up/down from scrolling to other slides
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End'].includes(e.key)) {
        // Only prevent default if not inside an input field
        const target = e.target as HTMLElement
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.stopPropagation()
        }
      }
    }

    // Add event listeners with capture to intercept before parent handlers
    window.addEventListener('wheel', preventScroll, { passive: false, capture: true })
    window.addEventListener('touchmove', preventDefault, { passive: false, capture: true })
    window.addEventListener('keydown', preventKeyScroll, { capture: true })

    // Prevent body scroll
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('wheel', preventScroll, { capture: true })
      window.removeEventListener('touchmove', preventDefault, { capture: true })
      window.removeEventListener('keydown', preventKeyScroll, { capture: true })
      document.body.style.overflow = ''
    }
  }, [])

  const handleAdventureSelect = async (id: "hack_mainframe") => {
    setLoading(true)
    setSelectedAdventure(id)

    try {
      const response = await fetch(`/stories/${id}.json`)
      const data: Adventure = await response.json()
      setAdventure(data)
      
      // Check for saved progress
      const progress = MissionLayer.loadProgress(id)
      if (progress && (progress.completedTasks?.size || 0) > 0) {
        setSavedProgress(progress)
        setShowContinueDialog(true)
      }
    } catch (error) {
      console.error("Failed to load adventure", error)
    } finally {
      setLoading(false)
    }
  }

  const handleContinueProgress = () => {
    setShowContinueDialog(false)
    // Progress will be loaded automatically by MissionLayer
  }

  const handleStartFresh = async () => {
    setShowContinueDialog(false)
    
    if (selectedAdventure && terminalRef.current) {
      try {
        // Clear saved progress
        localStorage.removeItem(`mission_progress_${selectedAdventure}`)
        
        // Reset terminal
        await terminalRef.current.resetExercise()
        
        // Reset local state
        setHintsUsed({})
        setCompletedTasks(new Set())
        setCompletedMissions(new Set())
        setCurrentMissionIndex(0)
        setCurrentTaskIndex(0)
      } catch (error) {
        console.error('[TerminalExercise] Start fresh failed:', error)
      }
    }
  }

  const handleHintRequest = (taskId: string, level: 1 | 2 | 3) => {
    setHintsUsed((prev) => ({
      ...prev,
      [taskId]: level,
    }))
  }

  const handleTaskComplete = (taskId: string) => {
    console.log('[TerminalExercise] Task completed:', taskId)
    setCompletedTasks((prev) => {
      const newSet = new Set(prev)
      newSet.add(taskId)
      return newSet
    })
  }

  const handleMissionComplete = (missionId: string) => {
    console.log('[TerminalExercise] Mission completed:', missionId)
    setCompletedMissions((prev) => {
      const newSet = new Set(prev)
      newSet.add(missionId)
      return newSet
    })
  }

  const handleAllComplete = () => {
    console.log('[TerminalExercise] All missions complete!')
  }

  const handleProgressUpdate = (missionIndex: number, taskIndex: number, completed: { tasks: Set<string>, missions: Set<string> }) => {
    console.log('[TerminalExercise] Progress update:', { missionIndex, taskIndex, completed })
    setCurrentMissionIndex(missionIndex)
    setCurrentTaskIndex(taskIndex)
    setCompletedTasks(completed.tasks)
    setCompletedMissions(completed.missions)
  }

  const handleReset = () => {
    setShowResetDialog(true)
  }

  const handleConfirmReset = async () => {
    setIsResetting(true)
    setShowResetDialog(false)
    
    try {
      // Call the terminal's reset method
      if (terminalRef.current) {
        await terminalRef.current.resetExercise()
      }
      
      // Reset local state
      setHintsUsed({})
      setCompletedTasks(new Set())
      setCompletedMissions(new Set())
      setCurrentMissionIndex(0)
      setCurrentTaskIndex(0)
    } catch (error) {
      console.error('[TerminalExercise] Reset failed:', error)
      alert('Failed to reset exercise. Please try again.')
    } finally {
      setIsResetting(false)
    }
  }

  const handleCancelReset = () => {
    setShowResetDialog(false)
  }

  const handleRestartExercise = async () => {
    // Use the same reset logic
    await handleConfirmReset()
  }

  if (!selectedAdventure) {
    return <AdventureSelection onSelect={handleAdventureSelect} />
  }

  if (loading || !adventure) {
    return (
      <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center z-[100]">
        <div className="text-center space-y-6">
          <div className="w-20 h-20 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-cyan-300 text-xl font-semibold">Loading adventure...</p>
        </div>
      </div>
    )
  }

  const currentMission = adventure.missions[currentMissionIndex]

  return (
    <div 
      ref={containerRef}
      className="terminal-exercise-container fixed inset-0 w-screen h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex flex-col z-[100]"
    >
      {/* Header - Fixed height with better contrast */}
      <div className="flex-shrink-0 border-b border-cyan-500/30 bg-slate-900/95 backdrop-blur-md shadow-lg shadow-cyan-500/10">
        <div className="max-w-full mx-auto px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center justify-between gap-4">
            <Button
              variant="ghost"
              onClick={handleReset}
              className="text-cyan-300 hover:text-cyan-100 hover:bg-cyan-500/20 transition-all duration-200 flex-shrink-0 font-medium"
              size="sm"
            >
              <ArrowLeft className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Change Adventure</span>
            </Button>
            
            <div className="text-center flex-1 min-w-0">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-400 to-purple-400 truncate">
                {adventure.title}
              </h2>
              <p className="text-sm text-cyan-300/90 mt-1 font-medium">
                Mission {currentMissionIndex + 1} of {adventure.missions.length}
              </p>
            </div>
            
            <Button
              variant="outline"
              onClick={handleRestartExercise}
              disabled={isResetting}
              className="text-amber-300 border-amber-400/40 hover:bg-amber-400/20 hover:border-amber-400/60 hover:text-amber-200 disabled:opacity-50 transition-all duration-200 flex-shrink-0 font-medium"
              title="Reset exercise (Ctrl+Shift+R)"
              size="sm"
            >
              <RotateCcw className={`w-4 h-4 sm:mr-2 ${isResetting ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isResetting ? "Resetting..." : "Restart"}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content - Takes remaining space with proper overflow handling */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-0">
        {/* Terminal - Left side on desktop, bottom on mobile - Takes all remaining vertical space */}
        <div className="flex-1 min-h-0 min-w-0 order-2 lg:order-1 flex flex-col bg-slate-950/80">
          <WASMTerminal
            ref={terminalRef}
            key={adventure.id}
            adventure={adventure}
            onMissionComplete={handleMissionComplete}
            onTaskComplete={handleTaskComplete}
            onAllComplete={handleAllComplete}
            onProgressUpdate={handleProgressUpdate}
          />
        </div>

        {/* Mission Overlay - Right side on desktop, top on mobile - Better contrast */}
        <div className="mission-overlay-scroll flex-shrink-0 order-1 lg:order-2 overflow-y-auto overflow-x-hidden border-b lg:border-b-0 lg:border-l border-cyan-500/30 bg-slate-900/95 backdrop-blur-md w-full lg:w-[420px] xl:w-[480px] max-h-[40vh] lg:max-h-none shadow-lg shadow-cyan-500/5">
          <div className="h-full">
            {currentMission && (
              <MissionOverlay
                mission={currentMission}
                currentTaskIndex={currentTaskIndex}
                completedTasks={completedTasks}
                completedMissions={completedMissions}
                hintsUsed={hintsUsed}
                onHintRequest={handleHintRequest}
              />
            )}
          </div>
        </div>
      </div>

      {/* Reset Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showResetDialog}
        title="Reset Exercise?"
        message="This will reset all progress, clear your filesystem, and restart the adventure from the beginning. This action cannot be undone."
        confirmLabel={isResetting ? "Resetting..." : "Reset Exercise"}
        warningLevel="danger"
        onConfirm={handleConfirmReset}
        onCancel={handleCancelReset}
      />
      
      {/* Continue Dialog */}
      {adventure && savedProgress && (
        <ContinueDialog
          isOpen={showContinueDialog}
          adventureName={adventure.title}
          stats={{
            currentMission: (savedProgress.currentMissionIndex || 0) + 1,
            totalMissions: adventure.missions.length,
            completedTasks: savedProgress.completedTasks?.size || 0,
            totalTasks: adventure.missions.reduce((sum, m) => sum + m.tasks.length, 0),
            hintsUsed: Object.keys(savedProgress.hintsUsed || {}).length,
            lastPlayed: savedProgress.lastSaved ? new Date(savedProgress.lastSaved) : undefined
          }}
          onContinue={handleContinueProgress}
          onStartFresh={handleStartFresh}
        />
      )}
    </div>
  )
}
