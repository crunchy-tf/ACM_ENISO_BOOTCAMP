/**
 * Error Logger - Centralized error tracking and logging
 */

export enum ErrorType {
  COMMAND_EXECUTION = 'COMMAND_EXECUTION',
  MISSION_VALIDATION = 'MISSION_VALIDATION',
  FILESYSTEM = 'FILESYSTEM',
  NETWORK = 'NETWORK',
  EDITOR = 'EDITOR',
  INITIALIZATION = 'INITIALIZATION',
}

export enum ErrorSeverity {
  INFO = 'INFO',       // Informational, expected behavior (e.g., permission denied)
  WARNING = 'WARNING', // Unexpected but handled
  ERROR = 'ERROR',     // Critical errors
}

export interface ErrorLog {
  timestamp: number
  type: ErrorType
  severity: ErrorSeverity
  message: string
  context?: Record<string, any>
  stack?: string
}

class ErrorLogger {
  private logs: ErrorLog[] = []
  private maxLogs = 100
  private listeners: ((log: ErrorLog) => void)[] = []

  /**
   * Log an error
   */
  log(
    type: ErrorType,
    message: string,
    context?: Record<string, any>,
    error?: Error,
    severity: ErrorSeverity = ErrorSeverity.ERROR
  ): void {
    const log: ErrorLog = {
      timestamp: Date.now(),
      type,
      severity,
      message,
      context,
      stack: error?.stack,
    }

    this.logs.push(log)
    
    // Keep only the last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }

    // Console output with color coding (only in browser)
    if (typeof window !== 'undefined') {
      const color = this.getColorForType(type)
      const consoleMethod = this.getConsoleMethod(severity)
      
      consoleMethod(
        `%c[${severity}] [${type}] ${message}`,
        `color: ${color}; font-weight: bold`
      )
      
      if (context && Object.keys(context).length > 0) {
        consoleMethod('Context:', context)
      }
      
      if (error?.stack) {
        consoleMethod(error.stack)
      }
    }

    // Notify listeners
    this.listeners.forEach(listener => listener(log))
  }

  /**
   * Get console method based on severity
   */
  private getConsoleMethod(severity: ErrorSeverity): (...args: any[]) => void {
    switch (severity) {
      case ErrorSeverity.INFO:
        return console.log
      case ErrorSeverity.WARNING:
        return console.warn
      case ErrorSeverity.ERROR:
        return console.error
      default:
        return console.log
    }
  }

  /**
   * Get color for error type
   */
  private getColorForType(type: ErrorType): string {
    switch (type) {
      case ErrorType.COMMAND_EXECUTION:
        return '#ff6b6b'
      case ErrorType.MISSION_VALIDATION:
        return '#ffa500'
      case ErrorType.FILESYSTEM:
        return '#ff4757'
      case ErrorType.NETWORK:
        return '#5f27cd'
      case ErrorType.EDITOR:
        return '#00d2d3'
      case ErrorType.INITIALIZATION:
        return '#ff6348'
      default:
        return '#ea4335'
    }
  }

  /**
   * Subscribe to error logs
   */
  subscribe(listener: (log: ErrorLog) => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  /**
   * Get all logs
   */
  getLogs(type?: ErrorType): ErrorLog[] {
    if (type) {
      return this.logs.filter(log => log.type === type)
    }
    return [...this.logs]
  }

  /**
   * Clear all logs
   */
  clear(): void {
    this.logs = []
  }

  /**
   * Get recent logs
   */
  getRecent(count: number = 10): ErrorLog[] {
    return this.logs.slice(-count)
  }

  /**
   * Export logs as JSON
   */
  export(): string {
    return JSON.stringify(this.logs, null, 2)
  }
}

// Singleton instance
export const errorLogger = new ErrorLogger()
