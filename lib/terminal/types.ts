// Type definitions for the terminal learning system

export interface FileNode {
  type: "file" | "directory"
  name: string
  content?: string // Only for files
  children?: Record<string, FileNode> // Only for directories
  permissions?: string
  owner?: string
}

export interface FileSystem {
  root: Record<string, FileNode>
}

export interface Hint {
  level: 1 | 2 | 3 // General, Syntax, Example
  text: string
}

/**
 * Output validation types
 */
export type OutputCheckType =
  | 'contains'           // Output contains text
  | 'notEmpty'          // Output is not empty
  | 'isEmpty'           // Output is empty (for silent commands)
  | 'hasError'          // Output contains error message
  | 'noError'           // Output has no error
  | 'grepFound'         // Grep found matches
  | 'validPath'         // Output is valid path format
  | 'validFlag'         // Output contains FLAG{...} format
  | 'lineCount'         // Output has X lines
  | 'wordCount'         // Output has X words

/**
 * Task definition with pure output validation
 */
export interface Task {
  id: string
  description: string
  
  // ========== OUTPUT VALIDATION ==========
  outputPattern?: string        // Regex pattern for stdout
  outputCheck?: OutputCheckType // Predefined validation type
  outputCheckParams?: any       // Parameters for outputCheck
  
  // ========== ADVANCED ==========
  checkCompletion?: (stdout: string, fileSystem: any) => boolean
  requireOutput?: boolean       // Must have non-empty output
  
  // ========== UI ==========
  hints: Hint[]
}

export interface Mission {
  id: string
  title: string
  story: string
  tasks: Task[]
  onComplete?: string // Story text shown on mission completion
  requireSudo?: boolean
}

export interface Adventure {
  id: string
  title: string
  description: string
  theme: "cyberpunk" | "scifi"
  missions: Mission[]
  initialFileSystem: FileSystem
}

export interface TerminalState {
  currentPath: string
  fileSystem: FileSystem
  history: string[]
  environment: Record<string, string>
  currentMissionIndex: number
  currentTaskIndex: number
  completedTasks: Set<string>
  hintsUsed: Record<string, number> // taskId -> hint level used
}

export interface CommandResult {
  output: string
  error?: string
  modifiesState?: boolean
}

export interface NetworkMockResponse {
  command: string
  response: string
  delay?: number
}
