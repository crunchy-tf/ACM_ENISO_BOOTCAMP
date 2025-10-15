import { TerminalState, CommandResult, FileSystem } from "./types"
import {
  resolvePath,
  getNode,
  listDirectory,
  readFile,
  createDirectory,
  removeDirectory,
  removeNode,
  writeFile,
  copyNode,
  moveNode,
  findFiles,
  searchInFiles,
  normalizePath,
  getBasename,
} from "./filesystem"

/**
 * Mock network responses for simulation
 */
const networkMocks: Record<string, string> = {
  "ping google.com": `PING google.com (142.250.185.46): 56 data bytes
64 bytes from 142.250.185.46: icmp_seq=0 ttl=117 time=12.4 ms
64 bytes from 142.250.185.46: icmp_seq=1 ttl=117 time=11.8 ms
64 bytes from 142.250.185.46: icmp_seq=2 ttl=117 time=13.2 ms

--- google.com ping statistics ---
3 packets transmitted, 3 packets received, 0.0% packet loss
round-trip min/avg/max/stddev = 11.8/12.5/13.2/0.6 ms`,
  
  "ping localhost": `PING localhost (127.0.0.1): 56 data bytes
64 bytes from 127.0.0.1: icmp_seq=0 ttl=64 time=0.043 ms
64 bytes from 127.0.0.1: icmp_seq=1 ttl=64 time=0.062 ms
64 bytes from 127.0.0.1: icmp_seq=2 ttl=64 time=0.054 ms

--- localhost ping statistics ---
3 packets transmitted, 3 packets received, 0.0% packet loss
round-trip min/avg/max/stddev = 0.043/0.053/0.062/0.000 ms`,

  "ping agency.local": `PING agency.local (192.168.1.100): 56 data bytes
64 bytes from 192.168.1.100: icmp_seq=0 ttl=64 time=1.2 ms
64 bytes from 192.168.1.100: icmp_seq=1 ttl=64 time=1.4 ms
64 bytes from 192.168.1.100: icmp_seq=2 ttl=64 time=1.1 ms
64 bytes from 192.168.1.100: icmp_seq=3 ttl=64 time=1.3 ms

--- agency.local ping statistics ---
4 packets transmitted, 4 packets received, 0.0% packet loss
round-trip min/avg/max/stddev = 1.1/1.25/1.4/0.1 ms`,

  "ifconfig": `eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500
        inet 192.168.1.100  netmask 255.255.255.0  broadcast 192.168.1.255
        inet6 fe80::a00:27ff:fe4e:66a1  prefixlen 64  scopeid 0x20<link>
        ether 08:00:27:4e:66:a1  txqueuelen 1000  (Ethernet)
        RX packets 1234  bytes 987654 (963.5 KiB)
        TX packets 567  bytes 234567 (229.0 KiB)

lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536
        inet 127.0.0.1  netmask 255.0.0.0
        inet6 ::1  prefixlen 128  scopeid 0x10<host>
        loop  txqueuelen 1000  (Local Loopback)`,

  "ip addr": `1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
    inet6 ::1/128 scope host
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc pfifo_fast state UP
    link/ether 08:00:27:4e:66:a1 brd ff:ff:ff:ff:ff:ff
    inet 192.168.1.100/24 brd 192.168.1.255 scope global eth0
    inet6 fe80::a00:27ff:fe4e:66a1/64 scope link`,

  "netstat -tuln": `Active Internet connections (only servers)
Proto Recv-Q Send-Q Local Address           Foreign Address         State
tcp        0      0 0.0.0.0:22              0.0.0.0:*               LISTEN
tcp        0      0 127.0.0.1:3000          0.0.0.0:*               LISTEN
tcp6       0      0 :::80                   :::*                    LISTEN
tcp6       0      0 :::22                   :::*                    LISTEN`,

  "curl http://agency.local/briefing": `{
  "status": "ACTIVE",
  "mission": "PROJECT_ALPHA",
  "clearance": "TOP_SECRET",
  "agent": "GHOST",
  "message": "Evidence collection authorized. Proceed with caution."
}`,

  "wget http://agency.local/resources/briefing.txt": `--2024-10-15 14:32:01--  http://agency.local/resources/briefing.txt
Resolving agency.local... 192.168.1.100
Connecting to agency.local|192.168.1.100|:80... connected.
HTTP request sent, awaiting response... 200 OK
Length: 256 [text/plain]
Saving to: 'briefing.txt'

briefing.txt        100%[===================>]     256  --.-KB/s    in 0s

2024-10-15 14:32:01 (12.3 MB/s) - 'briefing.txt' saved [256/256]`,

  "dig omega-corp.com": `; <<>> DiG 9.10.6 <<>> omega-corp.com
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 54321
;; ANSWER SECTION:
omega-corp.com.    3600    IN    A    192.168.50.10

;; Query time: 18 msec
;; SERVER: 8.8.8.8#53(8.8.8.8)
;; WHEN: ${new Date().toUTCString()}
;; MSG SIZE  rcvd: 58`,

  "nslookup omega-corp.com": `Server:		8.8.8.8
Address:	8.8.8.8#53

Non-authoritative answer:
Name:	omega-corp.com
Address: 192.168.50.10`,
}

/**
 * Parse and execute a command
 */
export function executeCommand(
  command: string,
  state: TerminalState,
  onStateChange: (newState: Partial<TerminalState>) => void
): CommandResult {
  const trimmedCommand = command.trim()
  if (!trimmedCommand) {
    return { output: "" }
  }

  // Add to history
  state.history.push(trimmedCommand)

  // Parse command and arguments
  const parts = parseCommand(trimmedCommand)
  const cmd = parts[0]
  const args = parts.slice(1)

  // Execute the appropriate command
  switch (cmd) {
    case "sudo":
      return handleSudo(args, state, onStateChange)
    case "cd":
      return handleCd(args, state, onStateChange)
    case "ls":
      return handleLs(args, state)
    case "pwd":
      return handlePwd(state)
    case "cat":
      return handleCat(args, state)
    case "grep":
      return handleGrep(args, state)
    case "find":
      return handleFind(args, state)
    case "mkdir":
      return handleMkdir(args, state, onStateChange)
    case "rmdir":
      return handleRmdir(args, state, onStateChange)
    case "rm":
      return handleRm(args, state, onStateChange)
    case "cp":
      return handleCp(args, state, onStateChange)
    case "mv":
      return handleMv(args, state, onStateChange)
    case "touch":
      return handleTouch(args, state, onStateChange)
    case "less":
    case "more":
      return handleLess(args, state)
    case "head":
      return handleHead(args, state)
    case "tail":
      return handleTail(args, state)
    case "echo":
      return handleEcho(args, state, onStateChange)
    case "env":
      return handleEnv(state)
    case "ping":
      return handlePing(args)
    case "curl":
    case "wget":
      return handleCurlWget(cmd, args, state, onStateChange)
    case "netstat":
      return handleNetstat(args)
    case "dig":
      return handleDig(args)
    case "nslookup":
      return handleNslookup(args)
    case "ifconfig":
      return handleIfconfig()
    case "ip":
      return handleIp(args)
    case "ssh":
      return handleSsh(args)
    case "scp":
      return handleScp(args, state, onStateChange)
    case "nano":
    case "vi":
    case "vim":
      return handleEditor(cmd, args)
    case "clear":
      return { output: "\x1b[2J\x1b[H" }
    case "help":
      return handleHelp()
    case "history":
      return { output: state.history.map((h, i) => `${i + 1}  ${h}`).join("\n") }
    default:
      return { output: "", error: `bash: ${cmd}: command not found` }
  }
}

/**
 * Parse command string into parts, respecting quotes
 */
function parseCommand(command: string): string[] {
  const parts: string[] = []
  let current = ""
  let inQuotes = false
  let quoteChar = ""

  for (let i = 0; i < command.length; i++) {
    const char = command[i]

    if ((char === '"' || char === "'") && !inQuotes) {
      inQuotes = true
      quoteChar = char
    } else if (char === quoteChar && inQuotes) {
      inQuotes = false
      quoteChar = ""
    } else if (char === " " && !inQuotes) {
      if (current) {
        parts.push(current)
        current = ""
      }
    } else {
      current += char
    }
  }

  if (current) {
    parts.push(current)
  }

  return parts
}

// Command handlers

function handleSudo(args: string[], state: TerminalState, onStateChange: (newState: Partial<TerminalState>) => void): CommandResult {
  if (args.length === 0) {
    return { output: "", error: "sudo: a command must be specified" }
  }
  
  // Simulate sudo by executing the command with elevated privileges
  const sudoCommand = args.join(" ")
  return executeCommand(sudoCommand, state, onStateChange)
}

function handleCd(args: string[], state: TerminalState, onStateChange: (newState: Partial<TerminalState>) => void): CommandResult {
  // Default to HOME if no argument provided
  const targetPath = args[0] || state.environment.HOME || "~"
  
  // Handle ~ as home directory
  const resolvedTarget = targetPath === "~" ? state.environment.HOME : targetPath
  
  const newPath = resolvePath(state.currentPath, resolvedTarget)
  const node = getNode(state.fileSystem, newPath)

  if (!node) {
    return { output: "", error: `cd: ${targetPath}: No such file or directory` }
  }

  if (node.type !== "directory") {
    return { output: "", error: `cd: ${targetPath}: Not a directory` }
  }

  onStateChange({ currentPath: newPath })
  return { output: "", modifiesState: true }
}

function handleLs(args: string[], state: TerminalState): CommandResult {
  let longFormat = false
  let showHidden = false
  let paths: string[] = []

  // Parse flags
  for (const arg of args) {
    if (arg.startsWith("-")) {
      if (arg.includes("l")) longFormat = true
      if (arg.includes("a")) showHidden = true
    } else {
      paths.push(arg)
    }
  }

  if (paths.length === 0) {
    paths = [state.currentPath]
  }

  const results: string[] = []

  paths.forEach((path) => {
    const resolvedPath = resolvePath(state.currentPath, path)
    const items = listDirectory(state.fileSystem, resolvedPath)

    if (items.length === 0 && getNode(state.fileSystem, resolvedPath) === null) {
      results.push(`ls: cannot access '${path}': No such file or directory`)
      return
    }

    let filteredItems = showHidden ? items : items.filter((item) => !item.startsWith("."))

    if (longFormat) {
      filteredItems.forEach((item) => {
        const itemPath = resolvedPath === "/" ? `/${item}` : `${resolvedPath}/${item}`
        const node = getNode(state.fileSystem, itemPath)
        if (node) {
          const type = node.type === "directory" ? "d" : "-"
          const perms = node.permissions || "rwxr-xr-x"
          const owner = node.owner || "user"
          results.push(`${type}${perms}  1 ${owner} ${owner}  4096 Oct 15 12:00 ${item}`)
        }
      })
    } else {
      results.push(filteredItems.join("  "))
    }
  })

  return { output: results.join("\n") }
}

function handlePwd(state: TerminalState): CommandResult {
  return { output: state.currentPath || "/" }
}

function handleCat(args: string[], state: TerminalState): CommandResult {
  if (args.length === 0) {
    return { output: "", error: "cat: missing file operand" }
  }

  const results: string[] = []
  const errors: string[] = []

  for (const arg of args) {
    const path = resolvePath(state.currentPath, arg)
    const content = readFile(state.fileSystem, path)

    if (content === null) {
      errors.push(`cat: ${arg}: No such file or directory`)
    } else {
      results.push(content)
    }
  }

  // If there were only errors and no successful reads, return as error
  if (results.length === 0 && errors.length > 0) {
    return { output: "", error: errors.join("\n") }
  }
  
  // If there were some successes, include any errors in the output
  const output = results.join("\n")
  if (errors.length > 0) {
    return { output, error: errors.join("\n") }
  }
  
  return { output }
}

function handleGrep(args: string[], state: TerminalState): CommandResult {
  if (args.length < 2) {
    return { output: "", error: "grep: missing pattern or file" }
  }

  let showLineNumbers = false
  let pattern = ""
  let fileArgs: string[] = []
  
  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "-n") {
      showLineNumbers = true
    } else if (args[i] === "-r" || args[i] === "-R") {
      // Recursive flag (we'll handle it simply)
    } else if (!pattern) {
      pattern = args[i]
    } else {
      fileArgs.push(args[i])
    }
  }
  
  if (!pattern) {
    return { output: "", error: "grep: missing pattern" }
  }
  
  if (fileArgs.length === 0) {
    return { output: "", error: "grep: missing file operand" }
  }
  
  const results: string[] = []
  
  // Handle wildcard (*)
  if (fileArgs[0] === "*") {
    const dirPath = state.currentPath
    const files = listDirectory(state.fileSystem, dirPath)
    
    for (const fileName of files) {
      const filePath = dirPath === "/" ? `/${fileName}` : `${dirPath}/${fileName}`
      const node = getNode(state.fileSystem, filePath)
      
      if (node && node.type === "file") {
        const content = readFile(state.fileSystem, filePath)
        if (content) {
          const lines = content.split("\n")
          lines.forEach((line, index) => {
            if (line.includes(pattern)) {
              if (showLineNumbers) {
                results.push(`${fileName}:${index + 1}:${line}`)
              } else {
                results.push(`${fileName}:${line}`)
              }
            }
          })
        }
      }
    }
  } else {
    // Single file
    const filePath = resolvePath(state.currentPath, fileArgs[0])
    const content = readFile(state.fileSystem, filePath)

    if (content === null) {
      return { output: "", error: `grep: ${fileArgs[0]}: No such file or directory` }
    }

    const lines = content.split("\n")
    lines.forEach((line, index) => {
      if (line.includes(pattern)) {
        if (showLineNumbers) {
          results.push(`${index + 1}:${line}`)
        } else {
          results.push(line)
        }
      }
    })
  }

  return { output: results.join("\n") }
}

function handleFind(args: string[], state: TerminalState): CommandResult {
  const startPath = args[0] ? resolvePath(state.currentPath, args[0]) : state.currentPath
  const nameIndex = args.indexOf("-name")
  const pattern = nameIndex !== -1 && args[nameIndex + 1] ? args[nameIndex + 1] : "*"

  const results = findFiles(state.fileSystem, startPath, pattern)
  return { output: results.join("\n") }
}

function handleMkdir(args: string[], state: TerminalState, onStateChange: (newState: Partial<TerminalState>) => void): CommandResult {
  if (args.length === 0) {
    return { output: "", error: "mkdir: missing operand" }
  }

  const path = resolvePath(state.currentPath, args[0])
  const success = createDirectory(state.fileSystem, path)

  if (!success) {
    return { output: "", error: `mkdir: cannot create directory '${args[0]}': File exists or parent doesn't exist` }
  }

  onStateChange({ fileSystem: { ...state.fileSystem } })
  return { output: "", modifiesState: true }
}

function handleRmdir(args: string[], state: TerminalState, onStateChange: (newState: Partial<TerminalState>) => void): CommandResult {
  if (args.length === 0) {
    return { output: "", error: "rmdir: missing operand" }
  }

  const path = resolvePath(state.currentPath, args[0])
  const success = removeDirectory(state.fileSystem, path)

  if (!success) {
    return { output: "", error: `rmdir: failed to remove '${args[0]}': Directory not empty or doesn't exist` }
  }

  onStateChange({ fileSystem: { ...state.fileSystem } })
  return { output: "", modifiesState: true }
}

function handleRm(args: string[], state: TerminalState, onStateChange: (newState: Partial<TerminalState>) => void): CommandResult {
  let recursive = false
  const paths: string[] = []

  for (const arg of args) {
    if (arg === "-r" || arg === "-rf") {
      recursive = true
    } else if (!arg.startsWith("-")) {
      paths.push(arg)
    }
  }

  if (paths.length === 0) {
    return { output: "", error: "rm: missing operand" }
  }

  for (const pathArg of paths) {
    const path = resolvePath(state.currentPath, pathArg)
    const success = removeNode(state.fileSystem, path, recursive)

    if (!success) {
      return { output: "", error: `rm: cannot remove '${pathArg}': No such file or directory or is a directory (use -r)` }
    }
  }

  onStateChange({ fileSystem: { ...state.fileSystem } })
  return { output: "", modifiesState: true }
}

function handleCp(args: string[], state: TerminalState, onStateChange: (newState: Partial<TerminalState>) => void): CommandResult {
  if (args.length < 2) {
    return { output: "", error: "cp: missing file operand" }
  }

  const sourcePath = resolvePath(state.currentPath, args[0])
  const destPath = resolvePath(state.currentPath, args[1])
  const success = copyNode(state.fileSystem, sourcePath, destPath)

  if (!success) {
    return { output: "", error: `cp: cannot copy '${args[0]}' to '${args[1]}'` }
  }

  onStateChange({ fileSystem: { ...state.fileSystem } })
  return { output: "", modifiesState: true }
}

function handleMv(args: string[], state: TerminalState, onStateChange: (newState: Partial<TerminalState>) => void): CommandResult {
  if (args.length < 2) {
    return { output: "", error: "mv: missing file operand" }
  }

  const sourcePath = resolvePath(state.currentPath, args[0])
  const destPath = resolvePath(state.currentPath, args[1])
  const success = moveNode(state.fileSystem, sourcePath, destPath)

  if (!success) {
    return { output: "", error: `mv: cannot move '${args[0]}' to '${args[1]}'` }
  }

  onStateChange({ fileSystem: { ...state.fileSystem } })
  return { output: "", modifiesState: true }
}

function handleTouch(args: string[], state: TerminalState, onStateChange: (newState: Partial<TerminalState>) => void): CommandResult {
  if (args.length === 0) {
    return { output: "", error: "touch: missing file operand" }
  }

  const path = resolvePath(state.currentPath, args[0])
  const success = writeFile(state.fileSystem, path, "")

  if (!success) {
    return { output: "", error: `touch: cannot touch '${args[0]}'` }
  }

  onStateChange({ fileSystem: { ...state.fileSystem } })
  return { output: "", modifiesState: true }
}

function handleLess(args: string[], state: TerminalState): CommandResult {
  if (args.length === 0) {
    return { output: "", error: "less: missing file operand" }
  }

  // For simplicity, just show the content like cat
  return handleCat(args, state)
}

function handleHead(args: string[], state: TerminalState): CommandResult {
  let lines = 10
  let filePath = ""

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "-n" && args[i + 1]) {
      lines = parseInt(args[i + 1])
      i++
    } else {
      filePath = args[i]
    }
  }

  if (!filePath) {
    return { output: "", error: "head: missing file operand" }
  }

  const path = resolvePath(state.currentPath, filePath)
  const content = readFile(state.fileSystem, path)

  if (content === null) {
    return { output: "", error: `head: ${filePath}: No such file or directory` }
  }

  const contentLines = content.split("\n")
  return { output: contentLines.slice(0, lines).join("\n") }
}

function handleTail(args: string[], state: TerminalState): CommandResult {
  let lines = 10
  let filePath = ""

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "-n" && args[i + 1]) {
      lines = parseInt(args[i + 1])
      i++
    } else {
      filePath = args[i]
    }
  }

  if (!filePath) {
    return { output: "", error: "tail: missing file operand" }
  }

  const path = resolvePath(state.currentPath, filePath)
  const content = readFile(state.fileSystem, path)

  if (content === null) {
    return { output: "", error: `tail: ${filePath}: No such file or directory` }
  }

  const contentLines = content.split("\n")
  return { output: contentLines.slice(-lines).join("\n") }
}

function handleEcho(args: string[], state: TerminalState, onStateChange: (newState: Partial<TerminalState>) => void): CommandResult {
  const text = args.join(" ")
  
  // Handle variable substitution
  const substituted = text.replace(/\$(\w+)/g, (match, varName) => {
    return state.environment[varName] || ""
  })

  // Handle output redirection
  if (args.includes(">") || args.includes(">>")) {
    const redirectIndex = args.findIndex(arg => arg === ">" || arg === ">>")
    const append = args[redirectIndex] === ">>"
    const fileName = args[redirectIndex + 1]
    
    if (!fileName) {
      return { output: "", error: "syntax error near unexpected token `newline'" }
    }

    const content = args.slice(0, redirectIndex).join(" ")
    const path = resolvePath(state.currentPath, fileName)
    
    if (append) {
      const existing = readFile(state.fileSystem, path) || ""
      writeFile(state.fileSystem, path, existing + content + "\n")
    } else {
      writeFile(state.fileSystem, path, content + "\n")
    }
    
    onStateChange({ fileSystem: { ...state.fileSystem } })
    return { output: "", modifiesState: true }
  }

  return { output: substituted }
}

function handleEnv(state: TerminalState): CommandResult {
  const vars = Object.entries(state.environment).map(([key, value]) => `${key}=${value}`)
  return { output: vars.join("\n") }
}

function handlePing(args: string[]): CommandResult {
  const target = args[0] || "localhost"
  // Check for count flag
  const countIndex = args.indexOf("-c")
  const count = countIndex !== -1 && args[countIndex + 1] ? parseInt(args[countIndex + 1]) : 3
  
  // Remove -c flag and count from target if present
  const cleanTarget = args.filter((arg, idx) => arg !== "-c" && (idx === 0 || args[idx - 1] !== "-c"))[0] || "localhost"
  
  const key = `ping ${cleanTarget}`
  let response = networkMocks[key]
  
  if (!response) {
    // Generate generic ping response for unknown hosts
    response = `PING ${cleanTarget} (192.168.1.1): 56 data bytes
64 bytes from 192.168.1.1: icmp_seq=0 ttl=64 time=1.2 ms
64 bytes from 192.168.1.1: icmp_seq=1 ttl=64 time=1.4 ms
64 bytes from 192.168.1.1: icmp_seq=2 ttl=64 time=1.1 ms

--- ${cleanTarget} ping statistics ---
${count} packets transmitted, ${count} packets received, 0.0% packet loss
round-trip min/avg/max/stddev = 1.1/1.23/1.4/0.1 ms`
  }
  
  return { output: response }
}

function handleCurlWget(cmd: string, args: string[], state: TerminalState, onStateChange: (newState: Partial<TerminalState>) => void): CommandResult {
  const url = args[args.length - 1] || "example.com"
  
  // Check for specific URLs
  const key = cmd === "curl" ? url : url
  const mockResponse = networkMocks[key]
  
  if (mockResponse) {
    // For wget, also create the file
    if (cmd === "wget") {
      const fileName = url.split("/").pop() || "index.html"
      const filePath = resolvePath(state.currentPath, fileName)
      writeFile(state.fileSystem, filePath, "Mock briefing content\nOperation: Ghost\nStatus: Active\n")
      onStateChange({ fileSystem: { ...state.fileSystem } })
    }
    return { output: mockResponse, modifiesState: cmd === "wget" }
  }
  
  // For wget, simulate file download
  if (cmd === "wget") {
    const fileName = url.split("/").pop() || "index.html"
    const filePath = resolvePath(state.currentPath, fileName)
    const content = `Mock content downloaded from ${url}`
    writeFile(state.fileSystem, filePath, content)
    onStateChange({ fileSystem: { ...state.fileSystem } })
    
    return {
      output: `--${new Date().toISOString().split("T")[0]} ${new Date().toTimeString().split(" ")[0]}--  ${url}
Resolving ${url.split("/")[2] || url}... 192.168.1.100
Connecting to ${url.split("/")[2] || url}|192.168.1.100|:80... connected.
HTTP request sent, awaiting response... 200 OK
Length: ${content.length} [text/html]
Saving to: '${fileName}'

${fileName}        100%[===================>]   ${(content.length / 1024).toFixed(2)}K  --.-KB/s    in 0s

${new Date().toISOString().split("T")[0]} ${new Date().toTimeString().split(" ")[0]} (5.2 MB/s) - '${fileName}' saved [${content.length}/${content.length}]`,
      modifiesState: true
    }
  }
  
  // Generic curl response
  return {
    output: `HTTP/1.1 200 OK
Content-Type: text/html
Content-Length: 1234

<!DOCTYPE html>
<html>
<head><title>Mock Response from ${url}</title></head>
<body><h1>This is a simulated response from ${url}</h1></body>
</html>`,
  }
}

function handleNetstat(args: string[]): CommandResult {
  return { output: networkMocks["netstat -tuln"] }
}

function handleDig(args: string[]): CommandResult {
  const domain = args.filter(arg => !arg.startsWith("+"))[0] || "example.com"
  const isShort = args.includes("+short")
  
  const key = `dig ${domain}`
  const mockResponse = networkMocks[key]
  
  if (mockResponse) {
    return { output: mockResponse }
  }
  
  if (isShort) {
    return { output: "93.184.216.34" }
  }
  
  return {
    output: `; <<>> DiG 9.10.6 <<>> ${domain}
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 12345
;; ANSWER SECTION:
${domain}.    3600    IN    A    93.184.216.34

;; Query time: 23 msec
;; SERVER: 8.8.8.8#53(8.8.8.8)
;; WHEN: ${new Date().toUTCString()}
;; MSG SIZE  rcvd: 56`,
  }
}

function handleNslookup(args: string[]): CommandResult {
  const domain = args[0] || "example.com"
  
  const key = `nslookup ${domain}`
  const mockResponse = networkMocks[key]
  
  if (mockResponse) {
    return { output: mockResponse }
  }
  
  return {
    output: `Server:		8.8.8.8
Address:	8.8.8.8#53

Non-authoritative answer:
Name:	${domain}
Address: 93.184.216.34`,
  }
}

function handleIfconfig(): CommandResult {
  return { output: networkMocks["ifconfig"] }
}

function handleIp(args: string[]): CommandResult {
  if (args[0] === "addr") {
    return { output: networkMocks["ip addr"] }
  }
  return { output: "Usage: ip addr" }
}

function handleSsh(args: string[]): CommandResult {
  const target = args[0] || "user@host"
  
  // Special handling for omega_agent connection
  if (target.includes("omega_agent") || target.includes("remote-server")) {
    return {
      output: `Connecting to ${target}...
The authenticity of host 'remote-server (10.0.0.50)' can't be established.
ECDSA key fingerprint is SHA256:xYz123AbC456DeF789...
Are you sure you want to continue connecting (yes/no)? yes
Warning: Permanently added 'remote-server' (ECDSA) to the list of known hosts.
omega_agent@remote-server's password: ********

Welcome to Orion Field Server
Last login: ${new Date().toUTCString()}

\x1b[1;32momega_agent@remote-server:~$\x1b[0m Connection established.
[This is a simulated SSH session. You can now transfer files via scp]
[Type 'exit' or use Ctrl+D to close connection]`,
    }
  }
  
  return {
    output: `ssh: Connecting to ${target}...
Connection established (simulated)
Welcome to the remote system!
[This is a simulated connection - use for training purposes]`,
  }
}

function handleScp(args: string[], state: TerminalState, onStateChange: (newState: Partial<TerminalState>) => void): CommandResult {
  if (args.length < 2) {
    return { output: "", error: "scp: missing file operand\nusage: scp source destination" }
  }
  
  const source = args[0]
  const destination = args[1]
  
  // Check if this is a remote transfer (contains @)
  const isRemote = destination.includes("@") || source.includes("@")
  
  if (isRemote) {
    // Parse remote destination
    let remotePath = ""
    let remoteHost = ""
    let localFile = ""
    
    if (destination.includes("@")) {
      // Local to remote
      localFile = source
      const parts = destination.split(":")
      remoteHost = parts[0]
      remotePath = parts[1] || "/home/omega/incoming/"
    }
    
    // Verify local file exists
    const fullPath = resolvePath(state.currentPath, localFile)
    const fileNode = getNode(state.fileSystem, fullPath)
    
    if (!fileNode || fileNode.type !== "file") {
      return { output: "", error: `scp: ${localFile}: No such file or directory` }
    }
    
    // Simulate transfer
    const fileName = getBasename(fullPath)
    return {
      output: `${localFile}                                    100%  ${(fileNode.content?.length || 0).toString().padStart(4)}    ${(Math.random() * 10 + 1).toFixed(1)}KB/s   00:0${Math.floor(Math.random() * 9 + 1)}
Transfer complete: ${fileName} -> ${remoteHost}:${remotePath}
[File successfully transferred to remote agent]`,
      modifiesState: true
    }
  }
  
  // Local copy
  const sourcePath = resolvePath(state.currentPath, source)
  const destPath = resolvePath(state.currentPath, destination)
  const success = copyNode(state.fileSystem, sourcePath, destPath)
  
  if (!success) {
    return { output: "", error: `scp: cannot copy '${source}' to '${destination}'` }
  }
  
  onStateChange({ fileSystem: { ...state.fileSystem } })
  return { output: `${source} copied to ${destination}`, modifiesState: true }
}

function handleEditor(cmd: string, args: string[]): CommandResult {
  const file = args[0] || "untitled"
  return {
    output: `${cmd}: Text editor simulation
Opening ${file}...
[This is a mock editor - file operations are simulated]
Use 'echo "content" > ${file}' to create files in this environment.`,
  }
}

function handleHelp(): CommandResult {
  return {
    output: `Available commands:
  File Operations: ls, cd, pwd, cat, touch, mkdir, rmdir, rm, cp, mv
  File Viewing: less, more, head, tail
  Search: grep, find
  Network: ping, curl, wget, ssh, scp, ifconfig, ip, netstat, dig, nslookup
  System: echo, env, sudo
  Other: clear, help, history

Use arrow keys to navigate command history.
This is a simulated Linux environment for learning purposes.`,
  }
}
