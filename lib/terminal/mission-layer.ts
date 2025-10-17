/**
 * Mission Layer - Pure Output Validation
 * Tracks mission progress and validates tasks based on command output only
 */

import { Adventure, Mission, Task, FileSystem } from "./types"
import { errorLogger, ErrorType, ErrorSeverity } from "./error-logger"
import { 
  validationRegistry, 
  fileSystemValidators, 
  advancedValidators,
  ValidationContext 
} from "./validation-registry"

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
  command: string       // For logging/debugging only
  stdout: string        // Primary validation source
  stderr?: string
  exitCode?: number
  fileSystem: any       // For custom validators
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
   * Validate task based on command output (pure output validation)
   */
  validateTask(context: TaskValidationContext): boolean {
    const task = this.getCurrentTask()
    const mission = this.getCurrentMission()
    
    console.log('[MissionLayer] ========== OUTPUT VALIDATION START ==========')
    console.log('[MissionLayer] Current mission:', mission?.id, mission?.title)
    console.log('[MissionLayer] Current task:', task?.id, task?.description)
    console.log('[MissionLayer] Command (for logging):', context.command)
    console.log('[MissionLayer] Output (first 150 chars):', context.stdout?.substring(0, 150))
    console.log('[MissionLayer] Task already complete?', task ? this.progress.completedTasks.has(task.id) : 'N/A')
    
    // 🎮 SECRET CHEAT CODE: Reset current task
    if (context.stdout?.includes('CHEAT_CODE_ACTIVATED:RESET_TASK')) {
      console.log('[MissionLayer] 🎮 CHEAT CODE DETECTED - Resetting current task!')
      if (task) {
        this.progress.completedTasks.delete(task.id)
        console.log('[MissionLayer] Task', task.id, 'has been reset and can be completed again')
      }
      console.log('[MissionLayer] ========== VALIDATION END ==========')
      return false
    }
    
    // 🎮 SECRET CHEAT CODE: Skip current mission
    if (context.stdout?.includes('CHEAT_CODE_ACTIVATED:SKIP_MISSION')) {
      console.log('[MissionLayer] 🎮 CHEAT CODE DETECTED - Skipping current mission!')
      if (mission && task) {
        // Only mark the CURRENT task as complete, not all tasks
        // This prevents conflicts when testing new missions
        if (!this.progress.completedTasks.has(task.id)) {
          this.progress.completedTasks.add(task.id)
          console.log('[MissionLayer] Marked current task as complete:', task.id)
        }
        
        // Move to next task
        this.progress.currentTaskIndex++
        
        // If this was the last task in the mission, complete the mission
        if (this.progress.currentTaskIndex >= mission.tasks.length) {
          console.log('[MissionLayer] Last task in mission - completing mission')
          this.completeMission(mission.id)
        } else {
          // Notify listeners of task completion
          if (this.listeners.onTaskComplete) {
            this.listeners.onTaskComplete(task.id)
          }
          console.log('[MissionLayer] Moved to next task:', mission.tasks[this.progress.currentTaskIndex]?.id)
        }
      }
      console.log('[MissionLayer] ========== VALIDATION END ==========')
      return false // Don't count as normal task completion
    }
    
    if (!task || this.progress.completedTasks.has(task.id)) {
      console.log('[MissionLayer] Skipping validation - no task or already complete')
      console.log('[MissionLayer] ========== VALIDATION END ==========')
      return false
    }

    // Build ValidationContext for advanced validators
    const validationContext: ValidationContext = {
      output: context.stdout || '',
      stderr: context.stderr || '',
      exitCode: context.exitCode || 0,
      fs: context.fileSystem,
      command: context.command,
      env: {} // TODO: Pass actual environment when available
    }

    let isComplete = false
    let hasAnyValidation = false

    // 1. Check output pattern (regex) - MUST PASS if specified
    if (task.outputPattern) {
      hasAnyValidation = true
      try {
        const regex = new RegExp(task.outputPattern, 'is')
        // Validate based on OUTPUT only (what the command produces)
        // This is more pedagogically sound for a terminal learning game
        const patternMatches = regex.test(context.stdout || '')
        
        console.log('[MissionLayer] Output pattern check:', {
          pattern: task.outputPattern,
          matches: patternMatches,
          command: context.command,
          output: context.stdout?.substring(0, 100)
        })
        
        if (!patternMatches) {
          console.log('[MissionLayer] ✗ Output pattern did not match - TASK FAILED')
          console.log('[MissionLayer] ========== VALIDATION END ==========')
          return false
        }
        
        console.log('[MissionLayer] ✓ Output pattern matched!')
        isComplete = true // Pattern passed, continue to check other validators
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.error('[MissionLayer] ✗ Invalid output pattern:', task.outputPattern, error)
        errorLogger.log(
          ErrorType.MISSION_VALIDATION,
          `Invalid output regex pattern in task: ${task.id}`,
          { 
            taskId: task.id, 
            pattern: task.outputPattern
          },
          error instanceof Error ? error : undefined,
          ErrorSeverity.ERROR
        )
        console.log('[MissionLayer] ========== VALIDATION END ==========')
        return false
      }
    }

    // 2. Check predefined output validation - MUST PASS if specified
    if (task.outputCheck) {
      hasAnyValidation = true
      
      // Check output validators
      let validator = validationRegistry[task.outputCheck]
      
      // Check filesystem validators
      if (!validator && fileSystemValidators[task.outputCheck]) {
        const fsValidator = fileSystemValidators[task.outputCheck]
        try {
          const fsCheckPassed = fsValidator(context.fileSystem, task.outputCheckParams)
          console.log('[MissionLayer] Filesystem check:', {
            type: task.outputCheck,
            params: task.outputCheckParams,
            result: fsCheckPassed
          })
          
          if (!fsCheckPassed) {
            console.log('[MissionLayer] ✗ Filesystem check failed - TASK FAILED')
            console.log('[MissionLayer] ========== VALIDATION END ==========')
            return false
          }
          
          console.log('[MissionLayer] ✓ Filesystem check passed!')
          isComplete = true
        } catch (error) {
          console.error('[MissionLayer] ✗ Filesystem check error:', error)
          errorLogger.log(
            ErrorType.MISSION_VALIDATION,
            `Filesystem check failed for task: ${task.id}`,
            {
              taskId: task.id,
              checkType: task.outputCheck,
              params: task.outputCheckParams
            },
            error instanceof Error ? error : undefined,
            ErrorSeverity.WARNING
          )
          console.log('[MissionLayer] ========== VALIDATION END ==========')
          return false
        }
      }
      // Check advanced validators
      else if (!validator && advancedValidators[task.outputCheck]) {
        const advValidator = advancedValidators[task.outputCheck]
        try {
          const advCheckPassed = advValidator(validationContext)
          console.log('[MissionLayer] Advanced check:', {
            type: task.outputCheck,
            params: task.outputCheckParams,
            result: advCheckPassed
          })
          
          if (!advCheckPassed) {
            console.log('[MissionLayer] ✗ Advanced check failed - TASK FAILED')
            console.log('[MissionLayer] ========== VALIDATION END ==========')
            return false
          }
          
          console.log('[MissionLayer] ✓ Advanced check passed!')
          isComplete = true
        } catch (error) {
          console.error('[MissionLayer] ✗ Advanced check error:', error)
          errorLogger.log(
            ErrorType.MISSION_VALIDATION,
            `Advanced check failed for task: ${task.id}`,
            {
              taskId: task.id,
              checkType: task.outputCheck,
              params: task.outputCheckParams
            },
            error instanceof Error ? error : undefined,
            ErrorSeverity.WARNING
          )
          console.log('[MissionLayer] ========== VALIDATION END ==========')
          return false
        }
      }
      // Use output validator
      else if (validator) {
        try {
          const outputCheckPassed = validator(context.stdout || '', task.outputCheckParams)
          
          console.log('[MissionLayer] Output check:', {
            type: task.outputCheck,
            params: task.outputCheckParams,
            result: outputCheckPassed
          })
          
          if (!outputCheckPassed) {
            console.log('[MissionLayer] ✗ Output check failed - TASK FAILED')
            console.log('[MissionLayer] ========== VALIDATION END ==========')
            return false
          }
          
          console.log('[MissionLayer] ✓ Output check passed!')
          isComplete = true
        } catch (error) {
          console.error('[MissionLayer] ✗ Output check error:', error)
          errorLogger.log(
            ErrorType.MISSION_VALIDATION,
            `Output check failed for task: ${task.id}`,
            {
              taskId: task.id,
              checkType: task.outputCheck,
              params: task.outputCheckParams
            },
            error instanceof Error ? error : undefined,
            ErrorSeverity.WARNING
          )
          console.log('[MissionLayer] ========== VALIDATION END ==========')
          return false
        }
      }
      else {
        console.error('[MissionLayer] ✗ Unknown output check type:', task.outputCheck)
        console.log('[MissionLayer] ========== VALIDATION END ==========')
        return false
      }
    }

    // 3. Require non-empty output - MUST PASS if specified
    if (task.requireOutput) {
      hasAnyValidation = true
      const hasOutput = (context.stdout?.trim().length ?? 0) > 0
      
      console.log('[MissionLayer] Require output check:', hasOutput)
      
      if (!hasOutput) {
        console.log('[MissionLayer] ✗ Output is empty but required - TASK FAILED')
        console.log('[MissionLayer] ========== VALIDATION END ==========')
        return false
      }
      
      console.log('[MissionLayer] ✓ Output is not empty')
      isComplete = true
    }

    // 4. Custom validation function - MUST PASS if specified
    if (task.checkCompletion) {
      hasAnyValidation = true
      try {
        const customCheckPassed = task.checkCompletion(context.stdout || '', context.fileSystem)
        
        console.log('[MissionLayer] Custom check result:', customCheckPassed)
        
        if (!customCheckPassed) {
          console.log('[MissionLayer] ✗ Custom validation failed - TASK FAILED')
          console.log('[MissionLayer] ========== VALIDATION END ==========')
          return false
        }
        
        console.log('[MissionLayer] ✓ Custom validation passed!')
        isComplete = true
      } catch (error) {
        console.error('[MissionLayer] ✗ Custom check error:', error)
        errorLogger.log(
          ErrorType.MISSION_VALIDATION,
          `Custom validation failed for task: ${task.id}`,
          {
            taskId: task.id,
            stdout: context.stdout?.substring(0, 200)
          },
          error instanceof Error ? error : undefined,
          ErrorSeverity.WARNING
        )
        console.log('[MissionLayer] ========== VALIDATION END ==========')
        return false
      }
    }

    // If no validation criteria specified, FAIL and warn
    if (!hasAnyValidation) {
      console.error('[MissionLayer] ❌ CRITICAL: No validation criteria specified for task:', task.id)
      console.error('[MissionLayer] Task must have at least one: outputPattern, outputCheck, requireOutput, or checkCompletion')
      console.log('[MissionLayer] ========== VALIDATION END ==========')
      return false
    }

    console.log('[MissionLayer] Final validation result:', isComplete ? '✓ COMPLETE' : '✗ INCOMPLETE')
    console.log('[MissionLayer] ========== VALIDATION END ==========')

    if (isComplete) {
      this.completeTask(task.id)
    }

    return isComplete
  }

  /**
   * Complete a task
   */
  private completeTask(taskId: string): void {
    console.log('[MissionLayer] ========== TASK COMPLETION START ==========')
    console.log('[MissionLayer] Completing task:', taskId)
    
    this.progress.completedTasks.add(taskId)
    
    // Calculate time taken
    const timeTaken = Date.now() - (this.progress.taskStartTime[taskId] || Date.now())
    console.log('[MissionLayer] Task completed in:', timeTaken, 'ms')
    
    // Notify listeners FIRST
    if (this.listeners.onTaskComplete) {
      console.log('[MissionLayer] Calling onTaskComplete listener')
      this.listeners.onTaskComplete(taskId)
    } else {
      console.log('[MissionLayer] WARNING: No onTaskComplete listener registered!')
    }

    // Check if mission is complete
    const mission = this.getCurrentMission()
    if (mission) {
      const allTasksComplete = mission.tasks.every((task) =>
        this.progress.completedTasks.has(task.id)
      )

      console.log('[MissionLayer] Mission check:', { 
        missionId: mission.id,
        allTasksComplete,
        currentTaskIndex: this.progress.currentTaskIndex,
        totalTasks: mission.tasks.length,
        completedTasks: Array.from(this.progress.completedTasks)
      })

      if (allTasksComplete) {
        console.log('[MissionLayer] Mission complete! Moving to next mission...')
        this.completeMission(mission.id)
      } else {
        // Move to next task
        this.progress.currentTaskIndex++
        const nextTask = this.getCurrentTask()
        console.log('[MissionLayer] Moving to next task:', { 
          newTaskIndex: this.progress.currentTaskIndex,
          nextTaskId: nextTask?.id,
          nextTaskDescription: nextTask?.description
        })
        if (nextTask) {
          this.progress.taskStartTime[nextTask.id] = Date.now()
        }
        // Notify progress update after moving to next task
        this.notifyProgressUpdate()
      }
    } else {
      console.log('[MissionLayer] WARNING: No current mission!')
      // No current mission, just notify progress
      this.notifyProgressUpdate()
    }
    
    console.log('[MissionLayer] ========== TASK COMPLETION END ==========')
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
      lastSaved: new Date().toISOString(),
    }

    try {
      localStorage.setItem(
        `mission_progress_${this.adventure.id}`,
        JSON.stringify(data)
      )
    } catch (error) {
      console.error('Failed to save progress:', error)
      errorLogger.log(
        ErrorType.INITIALIZATION,
        'Failed to save mission progress to localStorage',
        { adventureId: this.adventure.id },
        error instanceof Error ? error : undefined,
        ErrorSeverity.WARNING
      )
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
      errorLogger.log(
        ErrorType.INITIALIZATION,
        'Failed to load mission progress from localStorage',
        { adventureId },
        error instanceof Error ? error : undefined,
        ErrorSeverity.WARNING
      )
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
