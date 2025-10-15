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

export interface Task {
  id: string
  description: string
  command?: string // Optional: exact command required
  commandPattern?: string // Optional: regex pattern for flexible matching
  hints: Hint[]
  checkCompletion: (output: string, command: string, fs: FileSystem) => boolean
}

export interface Mission {
  id: string
  title: string
  story: string
  tasks: Task[]
  onComplete?: string // Story text shown on mission completion
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
