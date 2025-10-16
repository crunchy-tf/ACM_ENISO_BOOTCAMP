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
      className="w-full lg:w-96 bg-gradient-to-b from-slate-900/95 to-slate-950/95 backdrop-blur-sm border border-cyan-500/30 rounded-lg shadow-[0_0_20px_rgba(6,182,212,0.3)] overflow-hidden"
    >
      <div
        className={`p-4 bg-gradient-to-r ${actInfo.color} cursor-pointer`}
        onClick={() => setExpanded(!expanded)}
      >
        {/* Act Badge */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">{actInfo.icon}</span>
          <Badge variant="secondary" className="bg-white/20 text-white text-xs font-mono">
            {actInfo.name}
          </Badge>
        </div>

        {/* Mission Title */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Target className="w-5 h-5 text-white" />
            <div>
              <div className="text-xs text-white/80 font-mono mb-0.5">
                MISSION #{missionNumber.toString().padStart(2, '0')}
              </div>
              <h3 className="font-bold text-white text-lg leading-tight">{mission.title}</h3>
              <p className="text-xs text-cyan-100 mt-1">
                {completedCount}/{totalCount} objectives complete
              </p>
            </div>
          </div>
          {isMissionComplete && (
            <CheckCircle2 className="w-6 h-6 text-white animate-pulse" />
          )}
        </div>

        {/* Progress Bar */}
        <div className="mt-3">
          <Progress 
            value={(completedCount / totalCount) * 100} 
            className="h-2 bg-white/20"
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
          >
            <div className="p-4 space-y-4">
              {/* Mission Story */}
              <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-cyan-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs flex items-center gap-2 text-cyan-400 uppercase tracking-wide">
                    <Book className="w-3 h-3" />
                    Mission Briefing
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-200 leading-relaxed border-l-2 border-cyan-500/50 pl-3">
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
                  <Card className="bg-gradient-to-br from-cyan-950/30 to-blue-950/30 border-2 border-cyan-500/50 shadow-lg shadow-cyan-500/10">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2 text-cyan-300">
                        <Sparkles className="w-4 h-4 animate-pulse" />
                        Current Objective
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-white font-medium mb-3 leading-relaxed">
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
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    Objectives ({completedCount}/{totalCount})
                  </h4>
                  <Badge 
                    variant="outline" 
                    className="text-xs border-cyan-500/30 text-cyan-400"
                  >
                    {Math.round((completedCount / totalCount) * 100)}%
                  </Badge>
                </div>
                
                <div className="space-y-1.5">
                  {mission.tasks.map((task, index) => {
                    const isComplete = completedTasks.has(task.id)
                    const isCurrent = index === currentTaskIndex
                    return (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`flex items-start gap-2 p-2.5 rounded-md transition-all ${
                          isCurrent
                            ? "bg-cyan-500/10 border border-cyan-500/40 shadow-sm shadow-cyan-500/20"
                            : isComplete
                            ? "bg-green-500/10 border border-green-500/20"
                            : "bg-slate-800/30 border border-transparent hover:border-slate-700/50"
                        }`}
                      >
                        {isComplete ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        ) : (
                          <Circle
                            className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                              isCurrent ? "text-cyan-400 animate-pulse" : "text-slate-600"
                            }`}
                          />
                        )}
                        <span
                          className={`text-xs leading-relaxed ${
                            isComplete
                              ? "text-slate-400 line-through"
                              : isCurrent
                              ? "text-cyan-100 font-medium"
                              : "text-slate-400"
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
    <div className="space-y-2">
      {currentHintLevel < 3 && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleHintClick}
          className="w-full bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20"
        >
          <HelpCircle className="w-4 h-4 mr-2" />
          Get {getHintLabel(currentHintLevel + 1)} ({3 - currentHintLevel} remaining)
        </Button>
      )}

      {currentHint && showHint && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-md"
        >
          <div className="flex items-start gap-2">
            <Lightbulb className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-400 mb-1">
                {getHintLabel(currentHintLevel)}
              </p>
              <p className="text-sm text-amber-100">{currentHint.text}</p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
