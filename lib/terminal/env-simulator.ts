/**
 * Environment Variables Simulator
 * Manages shell environment variables for terminal session
 */

export interface EnvVariable {
  name: string
  value: string
  readonly?: boolean
  description?: string
}

/**
 * Environment Manager
 */
export class EnvSimulator {
  private variables: Map<string, EnvVariable>
  private exportedVars: Set<string>

  constructor() {
    this.variables = new Map()
    this.exportedVars = new Set()
    this.initializeDefaults()
  }

  /**
   * Initialize default environment variables
   */
  private initializeDefaults(): void {
    // Standard Unix/Linux environment variables
    this.setVariable('USER', 'agent', true, 'Current user')
    this.setVariable('HOME', '/home/agent', true, 'Home directory')
    this.setVariable('PWD', '/home/agent', false, 'Current working directory')
    this.setVariable('OLDPWD', '/home/agent', false, 'Previous working directory')
    this.setVariable('SHELL', '/bin/sh', true, 'Current shell')
    this.setVariable('PATH', '/usr/local/bin:/usr/bin:/bin', false, 'Executable search path')
    this.setVariable('TERM', 'xterm-256color', false, 'Terminal type')
    this.setVariable('LANG', 'en_US.UTF-8', false, 'Language locale')
    this.setVariable('LC_ALL', 'en_US.UTF-8', false, 'Locale override')
    
    // Mission-specific variables
    this.setVariable('MISSION_ID', '', false, 'Current mission identifier')
    this.setVariable('AGENT_CODENAME', 'Phoenix', false, 'Agent codename')
    this.setVariable('CLEARANCE_LEVEL', '3', false, 'Security clearance level')
    this.setVariable('AGENCY_ID', 'ORION', true, 'Intelligence agency identifier')
    this.setVariable('SECURE_MODE', 'enabled', false, 'Secure operation mode')
    
    // Mark some as exported by default
    this.exportedVars.add('USER')
    this.exportedVars.add('HOME')
    this.exportedVars.add('PATH')
    this.exportedVars.add('SHELL')
    this.exportedVars.add('TERM')
    this.exportedVars.add('LANG')
    this.exportedVars.add('AGENT_CODENAME')
  }

  /**
   * Set environment variable
   */
  setVariable(name: string, value: string, readonly = false, description?: string): void {
    // Check if readonly
    const existing = this.variables.get(name)
    if (existing?.readonly) {
      throw new Error(`${name}: readonly variable`)
    }

    this.variables.set(name, {
      name,
      value,
      readonly,
      description,
    })
  }

  /**
   * Get environment variable value
   */
  getVariable(name: string): string | undefined {
    return this.variables.get(name)?.value
  }

  /**
   * Get all variables
   */
  getAllVariables(): EnvVariable[] {
    return Array.from(this.variables.values())
  }

  /**
   * Export variable (make available to child processes)
   */
  exportVariable(name: string, value?: string): void {
    if (value !== undefined) {
      this.setVariable(name, value)
    }
    
    if (!this.variables.has(name)) {
      throw new Error(`${name}: variable not set`)
    }

    this.exportedVars.add(name)
  }

  /**
   * Unset variable
   */
  unsetVariable(name: string): void {
    const variable = this.variables.get(name)
    if (variable?.readonly) {
      throw new Error(`${name}: readonly variable`)
    }

    this.variables.delete(name)
    this.exportedVars.delete(name)
  }

  /**
   * Check if variable is exported
   */
  isExported(name: string): boolean {
    return this.exportedVars.has(name)
  }

  /**
   * Update PWD (called when directory changes)
   */
  updatePWD(newPath: string): void {
    const oldPwd = this.getVariable('PWD')
    if (oldPwd) {
      this.setVariable('OLDPWD', oldPwd)
    }
    this.setVariable('PWD', newPath)
  }

  /**
   * Expand variables in string (e.g., "$HOME/file" -> "/home/agent/file")
   */
  expandVariables(input: string): string {
    let result = input

    // Handle $VAR and ${VAR} syntax
    result = result.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (match, name) => {
      return this.getVariable(name) ?? match
    })

    result = result.replace(/\$([A-Za-z_][A-Za-z0-9_]*)/g, (match, name) => {
      return this.getVariable(name) ?? match
    })

    return result
  }

  /**
   * Get formatted output for 'env' command
   */
  formatEnvOutput(exportedOnly = false): string {
    const vars = exportedOnly
      ? Array.from(this.variables.values()).filter((v) => this.exportedVars.has(v.name))
      : Array.from(this.variables.values())

    return vars
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((v) => `${v.name}=${v.value}`)
      .join('\n')
  }

  /**
   * Get formatted output for 'export' command (bash style)
   */
  formatExportOutput(): string {
    return Array.from(this.variables.values())
      .filter((v) => this.exportedVars.has(v.name))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((v) => `declare -x ${v.name}="${v.value}"`)
      .join('\n')
  }

  /**
   * Get formatted output for 'set' command (show all variables)
   */
  formatSetOutput(): string {
    return Array.from(this.variables.values())
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((v) => {
        const exported = this.exportedVars.has(v.name) ? ' [exported]' : ''
        const readonly = v.readonly ? ' [readonly]' : ''
        return `${v.name}='${v.value}'${exported}${readonly}`
      })
      .join('\n')
  }

  /**
   * Parse and execute env command
   */
  executeEnvCommand(args: string[]): string {
    // No args - show all variables
    if (args.length === 0) {
      return this.formatEnvOutput(false)
    }

    // Parse options
    let showExportedOnly = false
    let varName: string | undefined
    let operation: 'set' | 'unset' | 'show' = 'show'

    for (const arg of args) {
      if (arg === '-0' || arg === '--null') {
        // Use null byte as separator (not implemented)
        continue
      } else if (arg === '-i' || arg === '--ignore-environment') {
        // Ignore environment (not implemented)
        continue
      } else if (arg === '-u' || arg.startsWith('--unset=')) {
        operation = 'unset'
        varName = arg.startsWith('--unset=') ? arg.slice(8) : undefined
      } else if (arg.includes('=')) {
        // Setting a variable
        const [name, ...valueParts] = arg.split('=')
        const value = valueParts.join('=')
        try {
          this.setVariable(name, value)
        } catch (error) {
          return `env: ${error instanceof Error ? error.message : 'failed to set variable'}`
        }
      } else if (operation === 'unset') {
        varName = arg
        try {
          this.unsetVariable(arg)
        } catch (error) {
          return `env: ${error instanceof Error ? error.message : 'failed to unset variable'}`
        }
      } else {
        // Show specific variable
        varName = arg
        const value = this.getVariable(arg)
        return value !== undefined ? value : ''
      }
    }

    // After processing all args, show environment
    return this.formatEnvOutput(showExportedOnly)
  }

  /**
   * Parse and execute export command
   */
  executeExportCommand(args: string[]): string {
    // No args - show all exported variables
    if (args.length === 0) {
      return this.formatExportOutput()
    }

    const results: string[] = []

    for (const arg of args) {
      if (arg.startsWith('-')) {
        // Options like -n, -p (not fully implemented)
        if (arg === '-p') {
          return this.formatExportOutput()
        }
        continue
      }

      if (arg.includes('=')) {
        // export VAR=value
        const [name, ...valueParts] = arg.split('=')
        const value = valueParts.join('=')
        try {
          this.exportVariable(name, value)
        } catch (error) {
          results.push(`export: ${error instanceof Error ? error.message : 'failed to export'}`)
        }
      } else {
        // export VAR (export existing variable)
        try {
          this.exportVariable(arg)
        } catch (error) {
          results.push(`export: ${error instanceof Error ? error.message : 'failed to export'}`)
        }
      }
    }

    return results.join('\n')
  }

  /**
   * Clear all non-readonly variables
   */
  reset(): void {
    const toDelete: string[] = []
    for (const [name, variable] of this.variables.entries()) {
      if (!variable.readonly) {
        toDelete.push(name)
      }
    }
    toDelete.forEach((name) => this.variables.delete(name))
    this.exportedVars.clear()
    this.initializeDefaults()
  }

  /**
   * Clone environment (useful for creating new contexts)
   */
  clone(): EnvSimulator {
    const cloned = new EnvSimulator()
    cloned.variables = new Map(this.variables)
    cloned.exportedVars = new Set(this.exportedVars)
    return cloned
  }
}
