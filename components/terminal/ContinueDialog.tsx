/**
 * Continue Dialog Component
 * Shows when saved progress is detected, allowing user to continue or start fresh
 */

"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { PlayCircle, RotateCcw, Trophy, Clock, Target } from "lucide-react"

interface ContinueDialogProps {
  isOpen: boolean
  adventureName: string
  stats: {
    currentMission: number
    totalMissions: number
    completedTasks: number
    totalTasks: number
    hintsUsed: number
    lastPlayed?: Date
  }
  onContinue: () => void
  onStartFresh: () => void
}

export function ContinueDialog({
  isOpen,
  adventureName,
  stats,
  onContinue,
  onStartFresh,
}: ContinueDialogProps) {
  const progressPercent = Math.round(
    (stats.completedTasks / stats.totalTasks) * 100
  )

  const formatLastPlayed = (date?: Date) => {
    if (!date) return "Unknown"
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`
    if (diffHours < 24)
      return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`
    return date.toLocaleDateString()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-gradient-to-br from-slate-900 to-slate-950 border border-cyan-500/30 rounded-lg shadow-2xl max-w-md w-full overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 p-6 border-b border-cyan-500/30">
              <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-2">
                Welcome Back, Agent
              </h2>
              <p className="text-slate-400 text-sm">
                Saved progress detected for{" "}
                <span className="text-cyan-400 font-semibold">
                  {adventureName}
                </span>
              </p>
            </div>

            {/* Progress Stats */}
            <div className="p-6 space-y-4">
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 space-y-3">
                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Overall Progress</span>
                    <span className="text-cyan-400 font-bold">
                      {progressPercent}%
                    </span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercent}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                    />
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-cyan-400" />
                    <div>
                      <div className="text-xs text-slate-400">Mission</div>
                      <div className="text-sm font-semibold text-white">
                        {stats.currentMission} / {stats.totalMissions}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <div>
                      <div className="text-xs text-slate-400">Tasks</div>
                      <div className="text-sm font-semibold text-white">
                        {stats.completedTasks} / {stats.totalTasks}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-green-400" />
                    <div>
                      <div className="text-xs text-slate-400">Last Played</div>
                      <div className="text-sm font-semibold text-white">
                        {formatLastPlayed(stats.lastPlayed)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-lg">💡</span>
                    <div>
                      <div className="text-xs text-slate-400">Hints Used</div>
                      <div className="text-sm font-semibold text-white">
                        {stats.hintsUsed}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 pt-2">
                <Button
                  onClick={onContinue}
                  size="lg"
                  className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold"
                >
                  <PlayCircle className="w-5 h-5 mr-2" />
                  Continue Mission
                </Button>

                <Button
                  onClick={onStartFresh}
                  variant="outline"
                  size="lg"
                  className="w-full border-slate-600 hover:bg-slate-800 text-slate-300"
                >
                  <RotateCcw className="w-5 h-5 mr-2" />
                  Start Fresh
                </Button>
              </div>

              <p className="text-xs text-slate-500 text-center pt-2">
                Starting fresh will permanently delete your saved progress
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
