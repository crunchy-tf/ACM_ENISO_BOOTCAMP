"use client"

import { useState, useEffect, useRef } from "react"
import { AdventureSelection } from "./AdventureSelection"
import { WASMTerminal, WASMTerminalRef } from "./WASMTerminal"
import { MissionOverlay } from "./MissionOverlay"
import { SuccessAnimation } from "./SuccessAnimations"
import { ConfirmDialog } from "./ConfirmDialog"
import { ContinueDialog } from "./ContinueDialog"
import { Adventure } from "@/lib/terminal/types"
import { MissionLayer } from "@/lib/terminal/mission-layer"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Trophy, Sparkles, RotateCcw } from "lucide-react"

export function TerminalExercise() {
  const terminalRef = useRef<WASMTerminalRef>(null)
  
  const [selectedAdventure, setSelectedAdventure] = useState<"hack_mainframe" | "time_traveler" | null>(null)
  const [adventure, setAdventure] = useState<Adventure | null>(null)
  const [loading, setLoading] = useState(false)
  const [allComplete, setAllComplete] = useState(false)
  
  // Reset confirmation dialog state
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  
  // Continue dialog state
  const [showContinueDialog, setShowContinueDialog] = useState(false)
  const [savedProgress, setSavedProgress] = useState<any>(null)
  
  // Success animation state
  const [showTaskSuccess, setShowTaskSuccess] = useState(false)
  const [showMissionSuccess, setShowMissionSuccess] = useState(false)
  const [showAdventureSuccess, setShowAdventureSuccess] = useState(false)
  const [successTitle, setSuccessTitle] = useState("")
  const [successSubtitle, setSuccessSubtitle] = useState("")
  
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

  const handleAdventureSelect = async (id: "hack_mainframe" | "time_traveler") => {
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
    
    // Show task success animation
    if (adventure) {
      const task = adventure.missions
        .flatMap(m => m.tasks)
        .find(t => t.id === taskId)
      
      if (task) {
        setSuccessTitle(task.description)
        setSuccessSubtitle("Keep going!")
        setShowTaskSuccess(true)
      }
    }
  }

  const handleMissionComplete = (missionId: string) => {
    console.log('[TerminalExercise] Mission completed:', missionId)
    setCompletedMissions((prev) => {
      const newSet = new Set(prev)
      newSet.add(missionId)
      return newSet
    })
    
    // Show mission success animation
    if (adventure) {
      const mission = adventure.missions.find(m => m.id === missionId)
      if (mission) {
        setSuccessTitle(mission.title)
        setSuccessSubtitle(`${mission.tasks.length} tasks completed!`)
        setShowMissionSuccess(true)
      }
    }
  }

  const handleAllComplete = () => {
    console.log('[TerminalExercise] All missions complete!')
    setAllComplete(true)
    
    // Show adventure complete animation
    if (adventure) {
      setSuccessTitle(adventure.title)
      setSuccessSubtitle(`Completed all ${adventure.missions.length} missions!`)
      setShowAdventureSuccess(true)
    }
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
      setAllComplete(false)
      setCurrentMissionIndex(0)
      setCurrentTaskIndex(0)
      
      // Hide success animations
      setShowTaskSuccess(false)
      setShowMissionSuccess(false)
      setShowAdventureSuccess(false)
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
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-cyan-400 text-lg">Loading adventure...</p>
        </div>
      </div>
    )
  }

  const currentMission = adventure.missions[currentMissionIndex]

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-2 sm:p-4">
      {/* Header */}
      <div className="max-w-[1800px] mx-auto mb-2 sm:mb-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-0">
          <Button
            variant="ghost"
            onClick={handleReset}
            className="text-slate-400 hover:text-cyan-400 text-sm sm:text-base order-2 sm:order-1"
            size="sm"
          >
            <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Change Adventure</span>
            <span className="sm:hidden">Change</span>
          </Button>
          <div className="text-center order-1 sm:order-2">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
              {adventure.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Mission {currentMissionIndex + 1} of {adventure.missions.length}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleRestartExercise}
            disabled={isResetting}
            className="text-amber-400 border-amber-500/30 hover:bg-amber-500/10 disabled:opacity-50 text-sm sm:text-base order-3"
            title="Reset exercise (Ctrl+Shift+R)"
            size="sm"
          >
            <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">{isResetting ? "Resetting..." : "Restart Exercise"}</span>
            <span className="sm:hidden">{isResetting ? "..." : "Restart"}</span>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1800px] mx-auto">
        <div className="flex flex-col lg:flex-row gap-2 sm:gap-4 h-[calc(100vh-100px)] sm:h-[calc(100vh-140px)]">
          {/* Terminal */}
          <div className="flex-1 min-h-0 order-2 lg:order-1">
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

          {/* Mission Overlay */}
          <div className="lg:w-96 overflow-y-auto order-1 lg:order-2 max-h-[30vh] lg:max-h-none">
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

      {/* Completion Modal */}
      <AnimatePresence>
        {allComplete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4"
            onClick={() => setAllComplete(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-gradient-to-br from-slate-900 to-slate-950 border-2 border-cyan-500 rounded-2xl p-4 sm:p-8 max-w-2xl w-full text-center space-y-4 sm:space-y-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 mb-2 sm:mb-4">
                <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600">
                  Mission Complete!
                </h2>
                <p className="text-base sm:text-xl text-slate-300 px-2">
                  {adventure.missions[adventure.missions.length - 1].onComplete}
                </p>
              </div>

              <div className="flex items-center justify-center gap-2 text-cyan-400">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
                <p className="text-base sm:text-lg font-semibold">
                  You've mastered Linux commands!
                </p>
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-4 py-2 sm:py-4">
                <div className="bg-slate-800/50 rounded-lg p-2 sm:p-4">
                  <p className="text-2xl sm:text-3xl font-bold text-cyan-400">{completedTasks.size}</p>
                  <p className="text-xs sm:text-sm text-slate-400">Tasks</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-2 sm:p-4">
                  <p className="text-2xl sm:text-3xl font-bold text-blue-400">{adventure.missions.length}</p>
                  <p className="text-xs sm:text-sm text-slate-400">Missions</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-2 sm:p-4">
                  <p className="text-2xl sm:text-3xl font-bold text-purple-400">
                    {Object.keys(hintsUsed).length}
                  </p>
                  <p className="text-xs sm:text-sm text-slate-400">Hints</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                <Button
                  onClick={handleReset}
                  className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:opacity-90 text-white text-sm sm:text-base"
                  size="lg"
                >
                  Try Another Adventure
                </Button>
                <Button
                  onClick={() => setAllComplete(false)}
                  variant="outline"
                  className="flex-1 border-slate-600 text-slate-300 text-sm sm:text-base"
                  size="lg"
                >
                  Close
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Animations */}
      <SuccessAnimation
        type="task"
        title={successTitle}
        subtitle={successSubtitle}
        isVisible={showTaskSuccess}
        onComplete={() => setShowTaskSuccess(false)}
      />
      
      <SuccessAnimation
        type="mission"
        title={successTitle}
        subtitle={successSubtitle}
        isVisible={showMissionSuccess}
        onComplete={() => setShowMissionSuccess(false)}
      />
      
      <SuccessAnimation
        type="adventure"
        title={successTitle}
        subtitle={successSubtitle}
        isVisible={showAdventureSuccess}
        onComplete={() => setShowAdventureSuccess(false)}
      />
      
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
