/**
 * Validation Registry - Predefined Output Validators
 * Pure output-based validation for terminal tasks
 */

import { MEMFS } from './memfs'

export type OutputValidator = (output: string, params?: any) => boolean
export type FileSystemValidator = (fs: MEMFS, params?: any) => boolean
export type AdvancedValidator = (context: ValidationContext) => boolean

export interface ValidationContext {
  output: string
  stderr: string
  exitCode: number
  fs: MEMFS
  command?: string
  env?: Record<string, string>
}

export const validationRegistry: Record<string, OutputValidator> = {
  /**
   * Check if output contains specific text (case-insensitive)
   */
  contains: (output, params: string | string[]) => {
    const searches = Array.isArray(params) ? params : [params]
    return searches.every(text => output.toLowerCase().includes(text.toLowerCase()))
  },

  /**
   * Check output is not empty
   */
  notEmpty: (output) => {
    return output.trim().length > 0
  },

  /**
   * Check output is empty (for silent commands like cd)
   */
  isEmpty: (output) => {
    return output.trim().length === 0
  },

  /**
   * Check if output contains error indicators
   */
  hasError: (output) => {
    const errorPatterns = [
      /error/i,
      /cannot/i,
      /failed/i,
      /not found/i,
      /permission denied/i,
      /no such file/i
    ]
    return errorPatterns.some(pattern => pattern.test(output))
  },

  /**
   * Check output has no errors
   */
  noError: (output) => {
    return !validationRegistry.hasError(output, undefined)
  },

  /**
   * Check if grep found results (non-empty output without error messages)
   */
  grepFound: (output) => {
    return output.trim().length > 0 && 
           !output.includes('No such file') &&
           !output.includes('No such file or directory')
  },

  /**
   * Check if output is a valid Unix path
   */
  validPath: (output) => {
    const path = output.trim()
    return /^\/[\w\-\/]*$/.test(path) && path.length > 1
  },

  /**
   * Check if output contains a flag in format FLAG{...}
   */
  validFlag: (output) => {
    return /FLAG\{[A-Z0-9_]+\}/.test(output)
  },

  /**
   * Check line count in output
   */
  lineCount: (output, params: { min?: number; max?: number; exact?: number }) => {
    const lines = output.split('\n').filter(l => l.trim().length > 0)
    if (params.exact !== undefined) return lines.length === params.exact
    if (params.min !== undefined && lines.length < params.min) return false
    if (params.max !== undefined && lines.length > params.max) return false
    return true
  },

  /**
   * Check word count in output
   */
  wordCount: (output, params: { min?: number; max?: number; exact?: number }) => {
    const words = output.split(/\s+/).filter(w => w.length > 0)
    if (params.exact !== undefined) return words.length === params.exact
    if (params.min !== undefined && words.length < params.min) return false
    if (params.max !== undefined && words.length > params.max) return false
    return true
  },

  /**
   * PHASE 2 VALIDATORS: Sudo Commands
   */

  /**
   * Check if output indicates sudo command was executed
   */
  sudoExecuted: (output) => {
    // Sudo typically shows the command output, not "sudo" itself
    // So we check for absence of sudo-related errors
    return !output.includes('sudo: command not found') &&
           !output.includes('not in the sudoers file') &&
           !output.includes('incorrect password')
  },

  /**
   * Check if sudo password prompt appeared
   */
  sudoPasswordPrompt: (output) => {
    return output.includes('[sudo] password') ||
           output.includes('Password:') ||
           output.includes('Enter password')
  },

  /**
   * PHASE 2 VALIDATORS: SSH/SCP Commands
   */

  /**
   * Check if SSH connection was established
   */
  sshConnected: (output) => {
    return output.includes('Connected to') ||
           output.includes('connection established') ||
           (output.includes('ssh') && !output.includes('connection refused') && !output.includes('No route to host'))
  },

  /**
   * Check if SSH connection failed
   */
  sshFailed: (output) => {
    return output.includes('connection refused') ||
           output.includes('Connection refused') ||
           output.includes('No route to host') ||
           output.includes('Host key verification failed')
  },

  /**
   * Check if SCP transfer succeeded
   */
  scpSuccess: (output) => {
    return (output.includes('100%') || output.includes('uploaded') || output.includes('transferred')) &&
           !output.includes('error') &&
           !output.includes('failed')
  },

  /**
   * Check if file was transferred to remote
   */
  scpToRemote: (output, params: string) => {
    return output.includes('uploaded') || 
           output.includes(`copied to`) ||
           output.includes(params) // params = filename
  },

  /**
   * Check if file was downloaded from remote
   */
  scpFromRemote: (output, params: string) => {
    return output.includes('downloaded') ||
           output.includes(`copied from`) ||
           output.includes(params) // params = filename
  },

  /**
   * PHASE 2 VALIDATORS: Environment Variables
   */

  /**
   * Check if environment variable is set
   */
  envVarSet: (output, params: { name: string; value?: string }) => {
    const regex = new RegExp(`${params.name}=(.+)`, 'i')
    const match = output.match(regex)
    if (!match) return false
    if (params.value) {
      return match[1].trim() === params.value
    }
    return true
  },

  /**
   * Check if environment variable was exported
   */
  envVarExported: (output, params: string) => {
    return output.includes(`declare -x ${params}=`) ||
           output.includes(`export ${params}=`) ||
           new RegExp(`${params}=.*\\[exported\\]`).test(output)
  },

  /**
   * Check if env command output is valid
   */
  validEnvOutput: (output) => {
    // Should have VAR=value format lines
    const lines = output.split('\n').filter(l => l.trim())
    return lines.length > 0 && lines.every(line => /^[A-Z_][A-Z0-9_]*=/.test(line))
  },

  /**
   * PHASE 2 VALIDATORS: I/O Redirection
   */

  /**
   * Check if output redirection succeeded (typically silent)
   */
  redirectionSuccess: (output) => {
    return output.includes('✓') ||
           output.includes('Output redirected') ||
           output.includes('redirected to') ||
           output.trim().length === 0 // Silent success
  },

  /**
   * Check if heredoc was captured
   */
  heredocCaptured: (output) => {
    return output.includes('Heredoc input captured') ||
           output.includes('lines') ||
           output.trim().length === 0 // Silent success
  },

  /**
   * PHASE 2 VALIDATORS: Network Commands
   */

  /**
   * Check if ping succeeded
   */
  pingSuccess: (output) => {
    return (output.includes('bytes from') ||
            output.includes('packets transmitted') ||
            output.includes('0% packet loss')) &&
           !output.includes('100% packet loss') &&
           !output.includes('Network unreachable')
  },

  /**
   * Check if ping failed
   */
  pingFailed: (output) => {
    return output.includes('100% packet loss') ||
           output.includes('Network unreachable') ||
           output.includes('Destination Host Unreachable') ||
           output.includes('Name or service not known')
  },

  /**
   * Check if curl/wget succeeded
   */
  httpSuccess: (output) => {
    return (output.includes('200 OK') ||
            output.includes('HTTP/1.1 200') ||
            output.includes('saved') ||
            output.length > 0) &&
           !output.includes('error') &&
           !output.includes('failed')
  },

  /**
   * Check if netstat shows listening ports
   */
  netstatListening: (output) => {
    return output.includes('LISTEN') ||
           output.includes('tcp') ||
           output.includes('udp')
  },

  /**
   * Check if dig resolved domain
   */
  digResolved: (output, params?: string) => {
    // Should contain IP address
    const hasIP = /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(output)
    if (params) {
      // Check for specific domain
      return hasIP && output.includes(params)
    }
    return hasIP
  },

  /**
   * Check if ifconfig/ip shows network interfaces
   */
  networkInterfaces: (output) => {
    return (output.includes('eth0') ||
            output.includes('wlan0') ||
            output.includes('lo') ||
            output.includes('inet ') ||
            output.includes('inet6')) &&
           !output.includes('not found')
  },

  /**
   * ADVANCED VALIDATORS: Pattern Matching
   */

  /**
   * Check if output matches a regex pattern
   */
  matchesPattern: (output, params: string | RegExp) => {
    const pattern = typeof params === 'string' ? new RegExp(params) : params
    return pattern.test(output)
  },

  /**
   * Check if output matches ALL patterns
   */
  matchesAllPatterns: (output, params: (string | RegExp)[]) => {
    return params.every(p => {
      const pattern = typeof p === 'string' ? new RegExp(p) : p
      return pattern.test(output)
    })
  },

  /**
   * Check if output matches ANY pattern
   */
  matchesAnyPattern: (output, params: (string | RegExp)[]) => {
    return params.some(p => {
      const pattern = typeof p === 'string' ? new RegExp(p) : p
      return pattern.test(output)
    })
  },

  /**
   * Check if output contains IP address
   */
  containsIP: (output) => {
    return /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(output)
  },

  /**
   * Check if output contains domain name
   */
  containsDomain: (output) => {
    return /[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/.test(output)
  },

  /**
   * Check if output contains timestamp
   */
  containsTimestamp: (output) => {
    return /\d{4}-\d{2}-\d{2}/.test(output) ||
           /\d{2}:\d{2}:\d{2}/.test(output)
  },

  /**
   * Check if output contains file path
   */
  containsFilePath: (output) => {
    return /\/[\w\-./]+/.test(output)
  },

  /**
   * COMPOSITE VALIDATORS
   */

  /**
   * Check if command succeeded (exit code 0, no errors)
   */
  commandSuccess: (output) => {
    return !validationRegistry.hasError(output, undefined) &&
           output.trim().length > 0
  },

  /**
   * Check if file listing contains specific file
   */
  listingContainsFile: (output, params: string | string[]) => {
    const files = Array.isArray(params) ? params : [params]
    const lines = output.split('\n')
    return files.every(file => 
      lines.some(line => line.includes(file))
    )
  },

  /**
   * Check if less command was used (for file viewing)
   */
  lessUsed: (output) => {
    // Less typically shows file content or opens viewer
    return output.length > 0 || 
           output.includes('✓') // May show success message
  },
}

/**
 * Filesystem Validators
 * Validate file system state directly
 */
export const fileSystemValidators: Record<string, FileSystemValidator> = {
  /**
   * Check if file exists
   */
  fileExists: (fs, params: string) => {
    try {
      return fs.exists(params)
    } catch {
      return false
    }
  },

  /**
   * Check if directory exists
   */
  dirExists: (fs, params: string) => {
    try {
      return fs.exists(params) && fs.stat(params).isDirectory()
    } catch {
      return false
    }
  },

  /**
   * Check if file contains text
   */
  fileContains: (fs, params: { path: string; text: string | string[] }) => {
    try {
      if (!fs.exists(params.path)) return false
      const content = fs.readFile(params.path, { encoding: 'utf8' }) as string
      const searches = Array.isArray(params.text) ? params.text : [params.text]
      return searches.every(text => content.includes(text))
    } catch {
      return false
    }
  },

  /**
   * Check file size
   */
  fileSize: (fs, params: { path: string; min?: number; max?: number; exact?: number }) => {
    try {
      if (!fs.exists(params.path)) return false
      const content = fs.readFile(params.path, { encoding: 'utf8' }) as string
      const size = content.length
      if (params.exact !== undefined) return size === params.exact
      if (params.min !== undefined && size < params.min) return false
      if (params.max !== undefined && size > params.max) return false
      return true
    } catch {
      return false
    }
  },

  /**
   * Check if file was modified (exists and has content)
   */
  fileModified: (fs, params: string) => {
    try {
      if (!fs.exists(params)) return false
      const content = fs.readFile(params, { encoding: 'utf8' }) as string
      return content.length > 0
    } catch {
      return false
    }
  },

  /**
   * Check if directory has files
   */
  dirHasFiles: (fs, params: { path: string; count?: number; files?: string[] }) => {
    try {
      if (!fs.exists(params.path)) return false
      const contents = fs.readdir(params.path)
      if (params.count !== undefined && contents.length !== params.count) return false
      if (params.files) {
        return params.files.every(file => contents.includes(file))
      }
      return contents.length > 0
    } catch {
      return false
    }
  },

  /**
   * Check if file was created (exists)
   */
  fileCreated: (fs, params: string) => {
    return fileSystemValidators.fileExists(fs, params)
  },

  /**
   * Check if file was deleted (doesn't exist)
   */
  fileDeleted: (fs, params: string) => {
    return !fs.exists(params)
  },

  /**
   * Check if file or directory doesn't exist (alias for fileDeleted)
   */
  fileNotExists: (fs, params: string) => {
    return !fs.exists(params)
  },

  /**
   * Check if path doesn't exist (alias for fileDeleted)
   */
  pathNotExists: (fs, params: string) => {
    return !fs.exists(params)
  },

  /**
   * Check if directory is empty
   */
  dirIsEmpty: (fs, params: string) => {
    try {
      if (!fs.exists(params)) return false
      return fs.readdir(params).length === 0
    } catch {
      return false
    }
  },

  /**
   * Check if remote file exists (SCP validation)
   */
  remoteFileExists: (fs, params: { user: string; path: string }) => {
    try {
      const remotePath = `/remotes/${params.user}/filesystem${params.path}`
      return fs.exists(remotePath)
    } catch {
      return false
    }
  },

  /**
   * Check if file was copied successfully
   */
  fileCopied: (fs, params: { source: string; dest: string }) => {
    try {
      if (!fs.exists(params.source) || !fs.exists(params.dest)) return false
      const sourceContent = fs.readFile(params.source, { encoding: 'utf8' }) as string
      const destContent = fs.readFile(params.dest, { encoding: 'utf8' }) as string
      return sourceContent === destContent
    } catch {
      return false
    }
  },

  /**
   * Check if file permissions allow read
   */
  fileReadable: (fs, params: string) => {
    try {
      if (!fs.exists(params)) return false
      fs.readFile(params, { encoding: 'utf8' })
      return true
    } catch {
      return false
    }
  },
}

/**
 * Advanced Validators
 * Validate using full context (output + fs + command + env)
 */
export const advancedValidators: Record<string, AdvancedValidator> = {
  /**
   * Validate sudo command execution with filesystem check
   */
  sudoAndFileCheck: (context) => {
    const sudoSuccess = !context.output.includes('permission denied') &&
                       !context.output.includes('not in the sudoers')
    const fileCheck = context.fs.exists('/restricted') ||
                     validationRegistry.noError(context.output, undefined)
    return sudoSuccess && fileCheck
  },

  /**
   * Validate SCP transfer with remote filesystem check
   */
  scpWithRemoteCheck: (context) => {
    const scpSuccess = validationRegistry.scpSuccess(context.output, undefined)
    // Extract user and path from command if possible
    const match = context.command?.match(/scp\s+(\S+)\s+(\w+)@([^:]+):(.+)/)
    if (match) {
      const [, localFile, user, , remotePath] = match
      return scpSuccess && fileSystemValidators.remoteFileExists(context.fs, { user, path: remotePath })
    }
    return scpSuccess
  },

  /**
   * Validate environment variable with actual env check
   */
  envVarSetAndExported: (context) => {
    if (context.env) {
      // Check if variable exists in environment
      const varMatch = context.command?.match(/export\s+([A-Z_]+)=/)
      if (varMatch) {
        const varName = varMatch[1]
        return context.env[varName] !== undefined
      }
    }
    return validationRegistry.envVarExported(context.output, '')
  },

  /**
   * Validate redirection with file content check
   */
  redirectionWithFileCheck: (context) => {
    const redirectMatch = context.command?.match(/>\s*(\S+)/)
    if (redirectMatch) {
      const targetFile = redirectMatch[1]
      return fileSystemValidators.fileExists(context.fs, targetFile) &&
             fileSystemValidators.fileModified(context.fs, targetFile)
    }
    return validationRegistry.redirectionSuccess(context.output, undefined)
  },

  /**
   * Validate complex command chain
   */
  commandChainSuccess: (context) => {
    return context.exitCode === 0 &&
           validationRegistry.noError(context.output, undefined) &&
           context.output.length > 0
  },

  /**
   * Validate mission-critical file operation
   */
  criticalFileOperation: (context) => {
    // Check both output success and filesystem state
    const outputSuccess = validationRegistry.noError(context.output, undefined)
    const filesystemOk = context.fs.exists('/home/agent/work')
    return outputSuccess && filesystemOk
  },
}

