"use client"

import { Mission, Task, Hint } from "@/lib/terminal/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Circle, HelpCircle, Lightbulb, Terminal, Target } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useState } from "react"

interface MissionOverlayProps {
  mission: Mission
  currentTaskIndex: number
  completedTasks: Set<string>
  hintsUsed: Record<string, number>
  onHintRequest: (taskId: string, level: 1 | 2 | 3) => void
}

export function MissionOverlay({
  mission,
  currentTaskIndex,
  completedTasks,
  hintsUsed,
  onHintRequest,
}: MissionOverlayProps) {
  const [expanded, setExpanded] = useState(true)

  const currentTask = mission.tasks[currentTaskIndex]
  const completedCount = mission.tasks.filter((t) => completedTasks.has(t.id)).length
  const totalCount = mission.tasks.length

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="w-full lg:w-96 bg-gradient-to-b from-slate-900/95 to-slate-950/95 backdrop-blur-sm border border-cyan-500/30 rounded-lg shadow-[0_0_20px_rgba(6,182,212,0.3)] overflow-hidden"
    >
      <div
        className="p-4 bg-gradient-to-r from-cyan-600 to-blue-600 cursor-pointer flex items-center justify-between"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <Target className="w-5 h-5 text-white" />
          <div>
            <h3 className="font-bold text-white">{mission.title}</h3>
            <p className="text-xs text-cyan-100">
              {completedCount}/{totalCount} tasks complete
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="bg-white/20 text-white">
          {Math.round((completedCount / totalCount) * 100)}%
        </Badge>
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
              {/* Story Text */}
              <div className="text-sm text-cyan-50 leading-relaxed border-l-2 border-cyan-500 pl-3">
                {mission.story}
              </div>

              {/* Current Task */}
              {currentTask && !completedTasks.has(currentTask.id) && (
                <Card className="bg-slate-800/50 border-cyan-500/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2 text-cyan-400">
                      <Terminal className="w-4 h-4" />
                      Current Objective
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-100 mb-3">{currentTask.description}</p>
                    <TaskHints
                      task={currentTask}
                      hintsUsed={hintsUsed}
                      onHintRequest={onHintRequest}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Task List */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Mission Progress
                </h4>
                {mission.tasks.map((task, index) => {
                  const isComplete = completedTasks.has(task.id)
                  const isCurrent = index === currentTaskIndex
                  return (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`flex items-start gap-2 p-2 rounded ${
                        isCurrent
                          ? "bg-cyan-500/10 border border-cyan-500/30"
                          : isComplete
                          ? "bg-green-500/10"
                          : "bg-slate-800/30"
                      }`}
                    >
                      {isComplete ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      ) : (
                        <Circle
                          className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                            isCurrent ? "text-cyan-400" : "text-slate-600"
                          }`}
                        />
                      )}
                      <span
                        className={`text-sm ${
                          isComplete
                            ? "text-slate-400 line-through"
                            : isCurrent
                            ? "text-cyan-100 font-medium"
                            : "text-slate-500"
                        }`}
                      >
                        {task.description}
                      </span>
                    </motion.div>
                  )
                })}
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
