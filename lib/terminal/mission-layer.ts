/**
 * Mission Layer - Tracks mission progress, validates tasks, and manages gamification
 */

import { Adventure, Mission, Task, FileSystem } from "./types"

export interface MissionProgress {
  currentMissionIndex: number
  currentTaskIndex: number
  completedTasks: Set<string>
  completedMissions: Set<string>
  hintsUsed: Record<string, number>
  missionStartTime: Record<string, number>
  taskStartTime: Record<string, number>
}

export interface TaskValidationContext {
  command: string
  stdout: string
  stderr: string
  exitCode: number
  fileSystem: any // WASM FS instance
}

export class MissionLayer {
  private adventure: Adventure
  private progress: MissionProgress
  private listeners: {
    onTaskComplete?: (taskId: string) => void
    onMissionComplete?: (missionId: string) => void
    onAllComplete?: () => void
    onProgressUpdate?: (progress: MissionProgress) => void
  }

  constructor(adventure: Adventure, initialProgress?: Partial<MissionProgress>) {
    this.adventure = adventure
    this.progress = {
      currentMissionIndex: 0,
      currentTaskIndex: 0,
      completedTasks: new Set(),
      completedMissions: new Set(),
      hintsUsed: {},
      missionStartTime: {},
      taskStartTime: {},
      ...initialProgress,
    }
    this.listeners = {}

    // Start timer for first mission/task
    const firstMission = this.getCurrentMission()
    if (firstMission) {
      this.progress.missionStartTime[firstMission.id] = Date.now()
      const firstTask = this.getCurrentTask()
      if (firstTask) {
        this.progress.taskStartTime[firstTask.id] = Date.now()
      }
    }
  }

  /**
   * Set event listeners
   */
  on(
    event: 'taskComplete' | 'missionComplete' | 'allComplete' | 'progressUpdate',
    callback: (data?: any) => void
  ): void {
    if (event === 'taskComplete') this.listeners.onTaskComplete = callback as (taskId: string) => void
    if (event === 'missionComplete') this.listeners.onMissionComplete = callback as (missionId: string) => void
    if (event === 'allComplete') this.listeners.onAllComplete = callback as () => void
    if (event === 'progressUpdate') this.listeners.onProgressUpdate = callback as (progress: MissionProgress) => void
  }

  /**
   * Validate command execution against current task
   */
  validateTask(context: TaskValidationContext): boolean {
    const task = this.getCurrentTask()
    console.log('[MissionLayer] validateTask called', { 
      hasTask: !!task, 
      taskId: task?.id,
      command: context.command,
      alreadyComplete: task ? this.progress.completedTasks.has(task.id) : false
    })
    
    if (!task || this.progress.completedTasks.has(task.id)) {
      return false
    }

    let isComplete = false

    // Check exact command match
    if (task.command && context.command.trim() === task.command) {
      console.log('[MissionLayer] Exact command match!')
      isComplete = true
    }

    // Check command pattern (regex)
    if (task.commandPattern && !isComplete) {
      try {
        // Patterns in JSON use single backslash, which is correct for RegExp constructor
        // The constructor takes a string and doesn't need double escaping
        const regex = new RegExp(task.commandPattern, 'i') // Case insensitive for flexibility
        const matches = regex.test(context.command.trim())
        console.log('[MissionLayer] Pattern test', { 
          pattern: task.commandPattern, 
          command: context.command.trim(),
          matches 
        })
        if (matches) {
          isComplete = true
        }
      } catch (error) {
        console.error('[MissionLayer] Invalid regex pattern:', task.commandPattern, error)
      }
    }

    // Custom completion check
    if (task.checkCompletion && !isComplete) {
      try {
        // Convert WASM FS to our FileSystem format for compatibility
        const mockFileSystem: FileSystem = { root: {} }
        isComplete = task.checkCompletion(context.stdout, context.command, mockFileSystem)
      } catch (error) {
        console.error('[MissionLayer] Custom check completion error:', error)
      }
    }

    console.log('[MissionLayer] Task validation result:', { isComplete, taskId: task.id })

    if (isComplete) {
      this.completeTask(task.id)
    }

    return isComplete
  }

  /**
   * Complete a task
   */
  private completeTask(taskId: string): void {
    console.log('[MissionLayer] completeTask called', { taskId })
    this.progress.completedTasks.add(taskId)
    
    // Calculate time taken
    const timeTaken = Date.now() - (this.progress.taskStartTime[taskId] || Date.now())
    
    // Notify listeners FIRST
    if (this.listeners.onTaskComplete) {
      console.log('[MissionLayer] Calling onTaskComplete listener')
      this.listeners.onTaskComplete(taskId)
    }

    // Check if mission is complete
    const mission = this.getCurrentMission()
    if (mission) {
      const allTasksComplete = mission.tasks.every((task) =>
        this.progress.completedTasks.has(task.id)
      )

      console.log('[MissionLayer] Mission check', { 
        missionId: mission.id,
        allTasksComplete,
        currentTaskIndex: this.progress.currentTaskIndex,
        totalTasks: mission.tasks.length
      })

      if (allTasksComplete) {
        this.completeMission(mission.id)
      } else {
        // Move to next task
        this.progress.currentTaskIndex++
        const nextTask = this.getCurrentTask()
        console.log('[MissionLayer] Moving to next task', { 
          newTaskIndex: this.progress.currentTaskIndex,
          nextTaskId: nextTask?.id 
        })
        if (nextTask) {
          this.progress.taskStartTime[nextTask.id] = Date.now()
        }
        // Notify progress update after moving to next task
        this.notifyProgressUpdate()
      }
    } else {
      // No current mission, just notify progress
      this.notifyProgressUpdate()
    }
  }

  /**
   * Complete a mission
   */
  private completeMission(missionId: string): void {
    this.progress.completedMissions.add(missionId)
    
    // Notify listeners
    if (this.listeners.onMissionComplete) {
      this.listeners.onMissionComplete(missionId)
    }

    // Move to next mission
    const nextMissionIndex = this.progress.currentMissionIndex + 1
    if (nextMissionIndex < this.adventure.missions.length) {
      this.progress.currentMissionIndex = nextMissionIndex
      this.progress.currentTaskIndex = 0
      
      const nextMission = this.getCurrentMission()
      if (nextMission) {
        this.progress.missionStartTime[nextMission.id] = Date.now()
        const firstTask = this.getCurrentTask()
        if (firstTask) {
          this.progress.taskStartTime[firstTask.id] = Date.now()
        }
      }
    } else {
      // All missions complete!
      if (this.listeners.onAllComplete) {
        this.listeners.onAllComplete()
      }
    }

    this.notifyProgressUpdate()
  }

  /**
   * Request a hint for current task
   */
  requestHint(level: 1 | 2 | 3): string | null {
    const task = this.getCurrentTask()
    if (!task) return null

    const hint = task.hints.find((h) => h.level === level)
    if (!hint) return null

    this.progress.hintsUsed[task.id] = level
    this.notifyProgressUpdate()

    return hint.text
  }

  /**
   * Get current mission
   */
  getCurrentMission(): Mission | null {
    return this.adventure.missions[this.progress.currentMissionIndex] || null
  }

  /**
   * Get current task
   */
  getCurrentTask(): Task | null {
    const mission = this.getCurrentMission()
    if (!mission) return null
    return mission.tasks[this.progress.currentTaskIndex] || null
  }

  /**
   * Get progress summary
   */
  getProgress(): MissionProgress {
    return { ...this.progress }
  }

  /**
   * Get overall completion percentage
   */
  getCompletionPercentage(): number {
    const totalTasks = this.adventure.missions.reduce(
      (acc, mission) => acc + mission.tasks.length,
      0
    )
    const completedTasks = this.progress.completedTasks.size
    return totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
  }

  /**
   * Calculate score based on hints used and time taken
   */
  calculateScore(): number {
    let score = 1000 // Base score
    
    // Deduct points for hints
    const totalHints = Object.values(this.progress.hintsUsed).reduce((acc, level) => {
      return acc + level * 10 // Level 1 = -10, Level 2 = -20, Level 3 = -30
    }, 0)
    score -= totalHints

    // Bonus for completion
    if (this.progress.completedMissions.size === this.adventure.missions.length) {
      score += 500
    }

    return Math.max(0, score)
  }

  /**
   * Save progress to storage
   */
  saveProgress(): void {
    const data = {
      currentMissionIndex: this.progress.currentMissionIndex,
      currentTaskIndex: this.progress.currentTaskIndex,
      completedTasks: Array.from(this.progress.completedTasks),
      completedMissions: Array.from(this.progress.completedMissions),
      hintsUsed: this.progress.hintsUsed,
      missionStartTime: this.progress.missionStartTime,
      taskStartTime: this.progress.taskStartTime,
    }

    try {
      localStorage.setItem(
        `mission_progress_${this.adventure.id}`,
        JSON.stringify(data)
      )
    } catch (error) {
      console.error('Failed to save progress:', error)
    }
  }

  /**
   * Load progress from storage
   */
  static loadProgress(adventureId: string): Partial<MissionProgress> | null {
    try {
      const data = localStorage.getItem(`mission_progress_${adventureId}`)
      if (!data) return null

      const parsed = JSON.parse(data)
      return {
        currentMissionIndex: parsed.currentMissionIndex || 0,
        currentTaskIndex: parsed.currentTaskIndex || 0,
        completedTasks: new Set(parsed.completedTasks || []),
        completedMissions: new Set(parsed.completedMissions || []),
        hintsUsed: parsed.hintsUsed || {},
        missionStartTime: parsed.missionStartTime || {},
        taskStartTime: parsed.taskStartTime || {},
      }
    } catch (error) {
      console.error('Failed to load progress:', error)
      return null
    }
  }

  /**
   * Reset progress
   */
  resetProgress(): void {
    this.progress = {
      currentMissionIndex: 0,
      currentTaskIndex: 0,
      completedTasks: new Set(),
      completedMissions: new Set(),
      hintsUsed: {},
      missionStartTime: {},
      taskStartTime: {},
    }

    try {
      localStorage.removeItem(`mission_progress_${this.adventure.id}`)
    } catch (error) {
      console.error('Failed to reset progress:', error)
    }

    this.notifyProgressUpdate()
  }

  /**
   * Notify listeners of progress update
   */
  private notifyProgressUpdate(): void {
    console.log('[MissionLayer] notifyProgressUpdate', {
      currentMissionIndex: this.progress.currentMissionIndex,
      currentTaskIndex: this.progress.currentTaskIndex,
      hasListener: !!this.listeners.onProgressUpdate
    })
    if (this.listeners.onProgressUpdate) {
      this.listeners.onProgressUpdate(this.getProgress())
    }
  }
}
