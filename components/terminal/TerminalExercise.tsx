"use client"

import { useState, useEffect } from "react"
import { AdventureSelection } from "./AdventureSelection"
import { Terminal } from "./Terminal"
import { MissionOverlay } from "./MissionOverlay"
import { Adventure } from "@/lib/terminal/types"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Trophy, Sparkles } from "lucide-react"

export function TerminalExercise() {
  const [selectedAdventure, setSelectedAdventure] = useState<"hack_mainframe" | "time_traveler" | null>(null)
  const [adventure, setAdventure] = useState<Adventure | null>(null)
  const [loading, setLoading] = useState(false)
  const [hintsUsed, setHintsUsed] = useState<Record<string, number>>({})
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set())
  const [completedMissions, setCompletedMissions] = useState<Set<string>>(new Set())
  const [allComplete, setAllComplete] = useState(false)
  const [currentMissionIndex, setCurrentMissionIndex] = useState(0)

  // Load saved progress from localStorage
  useEffect(() => {
    if (selectedAdventure) {
      const saved = localStorage.getItem(`terminal_progress_${selectedAdventure}`)
      if (saved) {
        try {
          const data = JSON.parse(saved)
          setHintsUsed(data.hintsUsed || {})
          setCompletedTasks(new Set(data.completedTasks || []))
          setCompletedMissions(new Set(data.completedMissions || []))
          setCurrentMissionIndex(data.currentMissionIndex || 0)
        } catch (e) {
          console.error("Failed to load progress", e)
        }
      }
    }
  }, [selectedAdventure])

  // Save progress to localStorage
  useEffect(() => {
    if (selectedAdventure) {
      const data = {
        hintsUsed,
        completedTasks: Array.from(completedTasks),
        completedMissions: Array.from(completedMissions),
        currentMissionIndex,
      }
      localStorage.setItem(`terminal_progress_${selectedAdventure}`, JSON.stringify(data))
    }
  }, [selectedAdventure, hintsUsed, completedTasks, completedMissions, currentMissionIndex])

  const handleAdventureSelect = async (id: "hack_mainframe" | "time_traveler") => {
    setLoading(true)
    setSelectedAdventure(id)

    try {
      const response = await fetch(`/stories/${id}.json`)
      const data: Adventure = await response.json()
      setAdventure(data)
    } catch (error) {
      console.error("Failed to load adventure", error)
    } finally {
      setLoading(false)
    }
  }

  const handleHintRequest = (taskId: string, level: 1 | 2 | 3) => {
    setHintsUsed((prev) => ({
      ...prev,
      [taskId]: level,
    }))
  }

  const handleTaskComplete = (taskId: string) => {
    setCompletedTasks((prev) => {
      const newSet = new Set(prev)
      newSet.add(taskId)
      return newSet
    })
  }

  const handleMissionComplete = (missionId: string) => {
    setCompletedMissions((prev) => {
      const newSet = new Set(prev)
      newSet.add(missionId)
      return newSet
    })

    // Move to next mission
    if (adventure) {
      const nextIndex = currentMissionIndex + 1
      if (nextIndex < adventure.missions.length) {
        setCurrentMissionIndex(nextIndex)
      }
    }
  }

  const handleAllComplete = () => {
    setAllComplete(true)
  }

  const handleReset = () => {
    if (selectedAdventure) {
      localStorage.removeItem(`terminal_progress_${selectedAdventure}`)
    }
    setSelectedAdventure(null)
    setAdventure(null)
    setHintsUsed({})
    setCompletedTasks(new Set())
    setCompletedMissions(new Set())
    setAllComplete(false)
    setCurrentMissionIndex(0)
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
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
      {/* Header */}
      <div className="max-w-[1800px] mx-auto mb-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={handleReset}
            className="text-slate-400 hover:text-cyan-400"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Change Adventure
          </Button>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
              {adventure.title}
            </h2>
            <p className="text-sm text-slate-400">
              Mission {currentMissionIndex + 1} of {adventure.missions.length}
            </p>
          </div>
          <div className="w-32" />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1800px] mx-auto">
        <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-140px)]">
          {/* Terminal */}
          <div className="flex-1 min-h-0">
            <Terminal
              adventure={adventure}
              onMissionComplete={handleMissionComplete}
              onTaskComplete={handleTaskComplete}
              onAllComplete={handleAllComplete}
            />
          </div>

          {/* Mission Overlay */}
          <div className="lg:w-96 overflow-y-auto">
            {currentMission && (
              <MissionOverlay
                mission={currentMission}
                currentTaskIndex={
                  currentMission.tasks.findIndex((t) => !completedTasks.has(t.id))
                }
                completedTasks={completedTasks}
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
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setAllComplete(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-gradient-to-br from-slate-900 to-slate-950 border-2 border-cyan-500 rounded-2xl p-8 max-w-2xl w-full text-center space-y-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 mb-4">
                <Trophy className="w-10 h-10 text-white" />
              </div>

              <div className="space-y-2">
                <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600">
                  Mission Complete!
                </h2>
                <p className="text-xl text-slate-300">
                  {adventure.missions[adventure.missions.length - 1].onComplete}
                </p>
              </div>

              <div className="flex items-center justify-center gap-2 text-cyan-400">
                <Sparkles className="w-5 h-5" />
                <p className="text-lg font-semibold">
                  You've mastered Linux commands!
                </p>
                <Sparkles className="w-5 h-5" />
              </div>

              <div className="grid grid-cols-3 gap-4 py-4">
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <p className="text-3xl font-bold text-cyan-400">{completedTasks.size}</p>
                  <p className="text-sm text-slate-400">Tasks Completed</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <p className="text-3xl font-bold text-blue-400">{adventure.missions.length}</p>
                  <p className="text-sm text-slate-400">Missions Finished</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <p className="text-3xl font-bold text-purple-400">
                    {Object.keys(hintsUsed).length}
                  </p>
                  <p className="text-sm text-slate-400">Hints Used</p>
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={handleReset}
                  className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:opacity-90 text-white"
                  size="lg"
                >
                  Try Another Adventure
                </Button>
                <Button
                  onClick={() => setAllComplete(false)}
                  variant="outline"
                  className="flex-1 border-slate-600 text-slate-300"
                  size="lg"
                >
                  Close
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
