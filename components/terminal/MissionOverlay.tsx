"use client"

import { Mission, Task, Hint } from "@/lib/terminal/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { CheckCircle2, Circle, HelpCircle, Lightbulb, Terminal, Target, Book, Sparkles } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useState } from "react"

interface MissionOverlayProps {
  mission: Mission
  currentTaskIndex: number
  completedTasks: Set<string>
  completedMissions: Set<string>
  hintsUsed: Record<string, number>
  onHintRequest: (taskId: string, level: 1 | 2 | 3) => void
}

// Act information mapping
const ACT_INFO: Record<number, { name: string; icon: string; color: string }> = {
  1: { name: "Act I: Entry & Privilege", icon: "🚪", color: "from-cyan-600 to-blue-600" },
  2: { name: "Act I: Entry & Privilege", icon: "🚪", color: "from-cyan-600 to-blue-600" },
  3: { name: "Act II: Navigate & Inspect", icon: "🧭", color: "from-blue-600 to-indigo-600" },
  4: { name: "Act II: Navigate & Inspect", icon: "🧭", color: "from-blue-600 to-indigo-600" },
  5: { name: "Act III: Staging & Organizing", icon: "📁", color: "from-indigo-600 to-purple-600" },
  6: { name: "Act III: Staging & Organizing", icon: "📁", color: "from-indigo-600 to-purple-600" },
  7: { name: "Act IV: Analyze & Read", icon: "🔍", color: "from-purple-600 to-pink-600" },
  8: { name: "Act IV: Analyze & Read", icon: "🔍", color: "from-purple-600 to-pink-600" },
  9: { name: "Act IV: Analyze & Read", icon: "🔍", color: "from-purple-600 to-pink-600" },
  10: { name: "Act V: Network Recon", icon: "🌐", color: "from-pink-600 to-rose-600" },
  11: { name: "Act V: Network Recon", icon: "🌐", color: "from-pink-600 to-rose-600" },
  12: { name: "Act VI: Remote Transfer", icon: "📡", color: "from-rose-600 to-red-600" },
  13: { name: "Act VII: Finalize Report", icon: "📝", color: "from-red-600 to-orange-600" },
  14: { name: "Act VIII: Cleanup & Evasion", icon: "🧹", color: "from-orange-600 to-amber-600" },
  15: { name: "Act VIII: Cleanup & Evasion", icon: "🧹", color: "from-orange-600 to-amber-600" },
  16: { name: "Act VIII: Cleanup & Evasion", icon: "🧹", color: "from-orange-600 to-amber-600" },
}

export function MissionOverlay({
  mission,
  currentTaskIndex,
  completedTasks,
  completedMissions,
  hintsUsed,
  onHintRequest,
}: MissionOverlayProps) {
  const [expanded, setExpanded] = useState(true)

  const currentTask = mission.tasks[currentTaskIndex]
  const completedCount = mission.tasks.filter((t) => completedTasks.has(t.id)).length
  const totalCount = mission.tasks.length
  const missionNumber = parseInt(mission.id.replace('mission', ''))
  const actInfo = ACT_INFO[missionNumber] || ACT_INFO[1]
  const isMissionComplete = completedMissions.has(mission.id)

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="h-full flex flex-col bg-gradient-to-b from-slate-900/98 to-blue-950/98"
    >
      <div
        className={`flex-shrink-0 p-5 sm:p-6 bg-gradient-to-r ${actInfo.color} cursor-pointer hover:opacity-95 transition-all duration-200 shadow-lg`}
        onClick={() => setExpanded(!expanded)}
      >
        {/* Act Badge */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl sm:text-3xl" role="img" aria-label={actInfo.name}>{actInfo.icon}</span>
          <Badge variant="secondary" className="bg-white/25 text-white text-xs font-mono backdrop-blur-sm font-semibold px-3 py-1">
            {actInfo.name}
          </Badge>
        </div>

        {/* Mission Title */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <Target className="w-6 h-6 text-white flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-white/95 font-mono mb-1 tracking-wider font-semibold">
                MISSION #{missionNumber.toString().padStart(2, '0')}
              </div>
              <h3 className="font-bold text-white text-lg sm:text-xl leading-tight">{mission.title}</h3>
              <p className="text-sm sm:text-base text-white/95 mt-2 font-semibold">
                {completedCount}/{totalCount} objectives complete
              </p>
            </div>
          </div>
          {isMissionComplete && (
            <CheckCircle2 className="w-7 h-7 text-white animate-pulse flex-shrink-0 drop-shadow-lg" />
          )}
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <Progress 
            value={(completedCount / totalCount) * 100} 
            className="h-3 bg-white/25 shadow-inner"
          />
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex-1 overflow-y-auto overflow-x-hidden mission-overlay-scroll"
          >
            <div className="p-5 sm:p-6 space-y-5">
              {/* Mission Story */}
              <Card className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-cyan-400/40 shadow-xl shadow-cyan-500/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2 text-cyan-200 uppercase tracking-wider font-bold">
                    <Book className="w-5 h-5" />
                    Mission Briefing
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-base sm:text-lg text-slate-50 leading-relaxed border-l-3 border-cyan-400/70 pl-4 py-2 font-medium">
                    {mission.story}
                  </p>
                </CardContent>
              </Card>

              {/* Current Task */}
              {currentTask && !completedTasks.has(currentTask.id) && (
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="bg-gradient-to-br from-cyan-950/60 to-blue-950/60 border-2 border-cyan-300/70 shadow-2xl shadow-cyan-400/30">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2 text-cyan-200 font-bold">
                        <Sparkles className="w-5 h-5 animate-pulse text-yellow-300" />
                        Current Objective
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-base sm:text-lg text-white font-semibold mb-5 leading-relaxed">
                        {currentTask.description}
                      </p>
                      <TaskHints
                        task={currentTask}
                        hintsUsed={hintsUsed}
                        onHintRequest={onHintRequest}
                      />
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Task List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h4 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                    All Objectives
                  </h4>
                  <Badge 
                    variant="outline" 
                    className="text-xs border-cyan-400/50 text-cyan-200 bg-cyan-500/20 font-semibold"
                  >
                    {completedCount}/{totalCount} • {Math.round((completedCount / totalCount) * 100)}%
                  </Badge>
                </div>
                
                <div className="space-y-2.5">
                  {mission.tasks.map((task, index) => {
                    const isComplete = completedTasks.has(task.id)
                    const isCurrent = index === currentTaskIndex
                    return (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`flex items-start gap-3 p-4 rounded-lg transition-all duration-200 ${
                          isCurrent
                            ? "bg-cyan-500/25 border-2 border-cyan-300/60 shadow-lg shadow-cyan-500/20"
                            : isComplete
                            ? "bg-green-500/20 border-2 border-green-400/50 shadow-md"
                            : "bg-slate-800/60 border-2 border-slate-600/50 hover:border-slate-500/70 hover:bg-slate-700/60"
                        }`}
                      >
                        {isComplete ? (
                          <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-green-300 flex-shrink-0 mt-0.5 drop-shadow-lg" />
                        ) : (
                          <Circle
                            className={`w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 mt-0.5 ${
                              isCurrent ? "text-cyan-300 animate-pulse" : "text-slate-400"
                            }`}
                          />
                        )}
                        <span
                          className={`text-sm sm:text-base leading-relaxed font-medium ${
                            isComplete
                              ? "text-slate-300 line-through"
                              : isCurrent
                              ? "text-white font-semibold"
                              : "text-slate-200"
                          }`}
                        >
                          {task.description}
                        </span>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

interface TaskHintsProps {
  task: Task
  hintsUsed: Record<string, number>
  onHintRequest: (taskId: string, level: 1 | 2 | 3) => void
}

function TaskHints({ task, hintsUsed, onHintRequest }: TaskHintsProps) {
  const currentHintLevel = hintsUsed[task.id] || 0
  const [showHint, setShowHint] = useState(false)

  const getHintLabel = (level: number) => {
    if (level === 1) return "General Hint"
    if (level === 2) return "Syntax Hint"
    return "Example"
  }

  const handleHintClick = () => {
    if (currentHintLevel < 3) {
      const nextLevel = (currentHintLevel + 1) as 1 | 2 | 3
      onHintRequest(task.id, nextLevel)
      setShowHint(true)
    }
  }

  const currentHint = task.hints.find((h) => h.level === currentHintLevel)

  return (
    <div className="space-y-4">
      {currentHintLevel < 3 && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleHintClick}
          className="w-full bg-amber-400/20 border-amber-400/50 text-amber-100 hover:bg-amber-400/30 hover:border-amber-300/70 hover:text-white transition-all duration-200 font-semibold py-5"
        >
          <HelpCircle className="w-5 h-5 mr-2" />
          Get {getHintLabel(currentHintLevel + 1)} ({3 - currentHintLevel} remaining)
        </Button>
      )}

      {currentHint && showHint && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 bg-amber-400/20 border-2 border-amber-300/50 rounded-lg shadow-lg shadow-amber-500/20"
        >
          <div className="flex items-start gap-3">
            <Lightbulb className="w-6 h-6 text-amber-200 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-amber-100 mb-2 uppercase tracking-wider">
                {getHintLabel(currentHintLevel)}
              </p>
              <p className="text-sm sm:text-base text-white leading-relaxed font-medium">{currentHint.text}</p>
            </div>
          </div>
        </motion.div>
      )}
      
      {currentHintLevel === 3 && (
        <div className="text-sm text-slate-300 text-center py-2 font-medium">
          All hints used for this objective
        </div>
      )}
    </div>
  )
}
