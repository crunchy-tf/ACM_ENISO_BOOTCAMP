/**
 * Network and Remote System Simulation
 * Simulates ssh, scp, ping, curl, wget and other network commands
 */

export interface NetworkResponse {
  success: boolean
  output: string
  error?: string
}

export interface RemoteServer {
  hostname: string
  ip: string
  username: string
  files: Record<string, string>
}

type NetworkCommandHandler = (args: string[], context?: any) => NetworkResponse

/**
 * Network simulator for fake network commands
 */
export class NetworkSimulator {
  private servers: Map<string, RemoteServer>
  private currentConnection: string | null = null
  private commandRegistry: Map<string, NetworkCommandHandler>

  constructor() {
    this.servers = new Map()
    this.commandRegistry = new Map()
    this.initializeServers()
    this.registerCommands()
  }

  /**
   * Register all network commands
   */
  private registerCommands(): void {
    this.commandRegistry.set('ping', (args) => this.ping(args[0] || 'localhost'))
    this.commandRegistry.set('curl', (args) => this.curl(args[0] || ''))
    this.commandRegistry.set('wget', (args, context) => this.wget(args[0] || '', context?.fs, context?.currentPath))
    this.commandRegistry.set('ssh', (args) => this.ssh(args[0] || ''))
    this.commandRegistry.set('scp', (args, context) => this.scp(args[0] || '', args[1] || '', context?.fs, context?.currentPath))
    this.commandRegistry.set('ifconfig', () => this.ifconfig())
    this.commandRegistry.set('netstat', (args) => this.netstat(args))
    this.commandRegistry.set('dig', (args) => this.dig(args))
    this.commandRegistry.set('nslookup', (args) => this.nslookup(args[0] || ''))
    this.commandRegistry.set('ip', (args) => this.ipAddr(args))
  }

  /**
   * Check if a command is a network command
   */
  isNetworkCommand(command: string): boolean {
    return this.commandRegistry.has(command)
  }

  /**
   * Execute a network command
   */
  execute(command: string, args: string[], context?: any): NetworkResponse {
    const handler = this.commandRegistry.get(command)
    if (!handler) {
      return {
        success: false,
        output: '',
        error: `Network command not found: ${command}`
      }
    }
    return handler(args, context)
  }

  /**
   * Register a custom network command
   */
  registerCommand(name: string, handler: NetworkCommandHandler): void {
    this.commandRegistry.set(name, handler)
  }

  /**
   * Get all registered network commands
   */
  getCommands(): string[] {
    return Array.from(this.commandRegistry.keys())
  }

  /**
   * Initialize mock remote servers
   */
  private initializeServers(): void {
    // Localhost
    this.servers.set('localhost', {
      hostname: 'localhost',
      ip: '127.0.0.1',
      username: 'student',
      files: {},
    })

    this.servers.set('127.0.0.1', {
      hostname: 'localhost',
      ip: '127.0.0.1',
      username: 'student',
      files: {},
    })

    // Remote agent server
    this.servers.set('remote-server', {
      hostname: 'remote-server',
      ip: '10.0.0.50',
      username: 'omega_agent',
      files: {
        '/home/omega/incoming/README.txt': 'Place evidence files here for secure transfer to headquarters.',
        '/home/omega/incoming/.gitkeep': '',
      },
    })

    // Agency local network
    this.servers.set('agency.local', {
      hostname: 'agency.local',
      ip: '192.168.1.100',
      username: 'agent',
      files: {
        '/var/www/briefing': JSON.stringify({
          status: 'ACTIVE',
          mission: 'PROJECT_ALPHA',
          clearance: 'TOP_SECRET',
          agent: 'GHOST',
          message: 'Evidence collection authorized. Proceed with caution.',
        }),
        '/resources/briefing.txt': 'Mission briefing downloaded successfully.',
      },
    })

    // Omega Corp server
    this.servers.set('omega-corp.com', {
      hostname: 'omega-corp.com',
      ip: '192.168.50.10',
      username: 'admin',
      files: {
        '/index.html': '<html><body>Omega Corp - Authorized Access Only</body></html>',
      },
    })
  }

  /**
   * Simulate ping command
   */
  ping(target: string): NetworkResponse {
    const server = this.findServer(target)
    
    if (!server) {
      return {
        success: false,
        output: '',
        error: `ping: ${target}: Name or service not known`,
      }
    }

    // Add more realistic RTT for different servers
    let minRtt = 1.1, avgRtt = 1.23, maxRtt = 1.4
    if (target === 'localhost' || target === '127.0.0.1') {
      minRtt = 0.043
      avgRtt = 0.053
      maxRtt = 0.062
    } else if (target.includes('agency.local')) {
      minRtt = 1.1
      avgRtt = 1.25
      maxRtt = 1.4
    } else if (target.includes('omega-corp')) {
      minRtt = 2.3
      avgRtt = 2.45
      maxRtt = 2.6
    }

    const output = `PING ${server.hostname} (${server.ip}): 56 data bytes
64 bytes from ${server.ip}: icmp_seq=0 ttl=64 time=${minRtt.toFixed(1)} ms
64 bytes from ${server.ip}: icmp_seq=1 ttl=64 time=${maxRtt.toFixed(1)} ms
64 bytes from ${server.ip}: icmp_seq=2 ttl=64 time=${avgRtt.toFixed(1)} ms
64 bytes from ${server.ip}: icmp_seq=3 ttl=64 time=${(avgRtt + 0.1).toFixed(1)} ms

--- ${server.hostname} ping statistics ---
4 packets transmitted, 4 packets received, 0.0% packet loss
round-trip min/avg/max/stddev = ${minRtt.toFixed(1)}/${avgRtt.toFixed(2)}/${maxRtt.toFixed(1)}/${((maxRtt - minRtt) / 2).toFixed(2)} ms`

    return { success: true, output }
  }

  /**
   * Simulate curl command
   */
  curl(url: string): NetworkResponse {
    const match = url.match(/https?:\/\/([^\/]+)(.*)/)
    if (!match) {
      return {
        success: false,
        output: '',
        error: `curl: (6) Could not resolve host: ${url}`,
      }
    }

    const [, hostname, path] = match
    const server = this.findServer(hostname)

    if (!server) {
      return {
        success: false,
        output: '',
        error: `curl: (6) Could not resolve host: ${hostname}`,
      }
    }

    const filePath = path || '/index.html'
    const content = server.files[filePath]

    if (!content) {
      return {
        success: false,
        output: '',
        error: `curl: (22) The requested URL returned error: 404 Not Found`,
      }
    }

    return { success: true, output: content }
  }

  /**
   * Simulate wget command
   */
  wget(url: string, fs: any, currentPath: string): NetworkResponse {
    const match = url.match(/https?:\/\/([^\/]+)(.*)/)
    if (!match) {
      return {
        success: false,
        output: '',
        error: `wget: unable to resolve host address '${url}'`,
      }
    }

    const [, hostname, path] = match
    const server = this.findServer(hostname)

    if (!server) {
      return {
        success: false,
        output: '',
        error: `wget: unable to resolve host address '${hostname}'`,
      }
    }

    const filePath = path || '/index.html'
    const content = server.files[filePath]

    if (!content) {
      return {
        success: false,
        output: '',
        error: `wget: server returned error: HTTP/1.1 404 Not Found`,
      }
    }

    // Extract filename
    const filename = filePath.split('/').pop() || 'index.html'
    const localPath = currentPath + '/' + filename

    // Write file to filesystem
    try {
      fs.writeFile(localPath, content, { encoding: 'utf8' })
    } catch (error) {
      return {
        success: false,
        output: '',
        error: `wget: cannot write to '${filename}': ${error}`,
      }
    }

    const timestamp = new Date().toISOString().replace('T', ' ').split('.')[0]
    const output = `--${timestamp}--  ${url}
Resolving ${hostname}... ${server.ip}
Connecting to ${hostname}|${server.ip}|:80... connected.
HTTP request sent, awaiting response... 200 OK
Length: ${content.length} [text/plain]
Saving to: '${filename}'

${filename}        100%[===================>]   ${content.length}  --.-KB/s    in 0s

${timestamp} (${(content.length / 1024).toFixed(1)} KB/s) - '${filename}' saved [${content.length}/${content.length}]`

    return { success: true, output }
  }

  /**
   * Simulate ssh command
   */
  ssh(target: string): NetworkResponse {
    const parts = target.split('@')
    const hostname = parts.length === 2 ? parts[1] : parts[0]
    const username = parts.length === 2 ? parts[0] : 'user'

    const server = this.findServer(hostname)

    if (!server) {
      return {
        success: false,
        output: '',
        error: `ssh: Could not resolve hostname ${hostname}: Name or service not known`,
      }
    }

    // Special handling for omega_agent@remote-server
    if (username === 'omega_agent' && hostname === 'remote-server') {
      const output = `Connecting to ${hostname}...
The authenticity of host 'remote-server (${server.ip})' can't be established.
ECDSA key fingerprint is SHA256:xYz123AbC456DeF789GhI012JkL345MnO678PqR901.
Are you sure you want to continue connecting (yes/no)? yes
Warning: Permanently added 'remote-server,${server.ip}' (ECDSA) to the list of known hosts.
omega_agent@remote-server's password: ********

Last login: ${new Date().toUTCString()}

\x1b[1;36m╔════════════════════════════════════════════╗
║   ORION FIELD AGENT SECURE SERVER          ║
║   AUTHORIZED ACCESS ONLY                   ║
╚════════════════════════════════════════════╝\x1b[0m

\x1b[1;32momega_agent@remote-server:~$\x1b[0m Connection established.

[This is a simulated SSH session for training purposes]
[You can now use 'ls' to check incoming files]
[Type 'exit' to close the connection]`

      return { success: true, output }
    }

    // Simulate authentication failure for other attempts
    const output = `Connecting to ${hostname}...
${username}@${hostname}'s password: 
Permission denied, please try again.

\x1b[1;33mNote: This is a training environment. Only omega_agent@remote-server is accessible.\x1b[0m`

    return { success: false, output, error: 'Authentication failed' }
  }

  /**
   * Simulate scp command
   */
  scp(source: string, destination: string, fs: any, currentPath: string): NetworkResponse {
    // Parse source and destination
    const parseLocation = (location: string) => {
      if (location.includes(':')) {
        const [hostPart, path] = location.split(':')
        const [username, hostname] = hostPart.includes('@') 
          ? hostPart.split('@') 
          : ['user', hostPart]
        return { remote: true, hostname, username, path }
      }
      return { remote: false, path: location }
    }

    const src = parseLocation(source)
    const dest = parseLocation(destination)

    // Both can't be remote
    if (src.remote && dest.remote) {
      return {
        success: false,
        output: '',
        error: 'scp: direct remote-to-remote copying not supported',
      }
    }

    // Download from remote
    if (src.remote && !dest.remote) {
      const server = this.findServer(src.hostname!)
      if (!server) {
        return {
          success: false,
          output: '',
          error: `ssh: Could not resolve hostname ${src.hostname}: Name or service not known`,
        }
      }

      const remoteContent = server.files[src.path]
      if (!remoteContent) {
        return {
          success: false,
          output: '',
          error: `scp: ${src.path}: No such file or directory`,
        }
      }

      const localPath = dest.path.startsWith('/') ? dest.path : currentPath + '/' + dest.path

      try {
        fs.writeFile(localPath, remoteContent, { encoding: 'utf8' })
      } catch (error) {
        return {
          success: false,
          output: '',
          error: `scp: ${dest.path}: ${error}`,
        }
      }

      const filename = src.path.split('/').pop()
      return {
        success: true,
        output: `${filename}                                    100%  ${remoteContent.length}    ${(remoteContent.length / 1024).toFixed(1)}KB/s   00:00`,
      }
    }

    // Upload to remote
    if (!src.remote && dest.remote) {
      const server = this.findServer(dest.hostname!)
      if (!server) {
        return {
          success: false,
          output: '',
          error: `ssh: Could not resolve hostname ${dest.hostname}: Name or service not known`,
        }
      }

      const localPath = src.path.startsWith('/') ? src.path : currentPath + '/' + src.path

      let content: string
      try {
        content = fs.readFile(localPath, { encoding: 'utf8' })
      } catch (error) {
        return {
          success: false,
          output: '',
          error: `scp: ${src.path}: No such file or directory`,
        }
      }

      // Store in remote server (in memory)
      server.files[dest.path] = content

      const filename = src.path.split('/').pop()
      return {
        success: true,
        output: `${filename}                                    100%  ${content.length}    ${(content.length / 1024).toFixed(1)}KB/s   00:00`,
      }
    }

    return {
      success: false,
      output: '',
      error: 'scp: invalid usage',
    }
  }

  /**
   * Find server by hostname or IP
   */
  private findServer(target: string): RemoteServer | undefined {
    for (const server of this.servers.values()) {
      if (server.hostname === target || server.ip === target) {
        return server
      }
    }
    return undefined
  }

  /**
   * Simulate ifconfig
   */
  ifconfig(): NetworkResponse {
    const output = `eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500
        inet 192.168.1.100  netmask 255.255.255.0  broadcast 192.168.1.255
        inet6 fe80::a00:27ff:fe4e:66a1  prefixlen 64  scopeid 0x20<link>
        ether 08:00:27:4e:66:a1  txqueuelen 1000  (Ethernet)
        RX packets 1234  bytes 987654 (963.5 KiB)
        TX packets 567  bytes 234567 (229.0 KiB)

lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536
        inet 127.0.0.1  netmask 255.0.0.0
        inet6 ::1  prefixlen 128  scopeid 0x10<host>
        loop  txqueuelen 1000  (Local Loopback)`

    return { success: true, output }
  }

  /**
   * Simulate netstat
   */
  netstat(args?: string[]): NetworkResponse {
    // Support netstat -tuln flag
    const flags = args?.join(' ') || ''
    const showTuln = flags.includes('-t') || flags.includes('-u') || flags.includes('-l') || flags.includes('-n')

    const output = showTuln 
      ? `Active Internet connections (only servers)
Proto Recv-Q Send-Q Local Address           Foreign Address         State
tcp        0      0 0.0.0.0:22              0.0.0.0:*               LISTEN
tcp        0      0 127.0.0.1:3000          0.0.0.0:*               LISTEN
tcp        0      0 0.0.0.0:80              0.0.0.0:*               LISTEN
tcp        0      0 0.0.0.0:443             0.0.0.0:*               LISTEN
udp        0      0 0.0.0.0:68              0.0.0.0:*
tcp6       0      0 :::80                   :::*                    LISTEN
tcp6       0      0 :::22                   :::*                    LISTEN`
      : `Active Internet connections (only servers)
Proto Recv-Q Send-Q Local Address           Foreign Address         State
tcp        0      0 0.0.0.0:22              0.0.0.0:*               LISTEN
tcp        0      0 127.0.0.1:3000          0.0.0.0:*               LISTEN
tcp6       0      0 :::80                   :::*                    LISTEN
tcp6       0      0 :::22                   :::*                    LISTEN`

    return { success: true, output }
  }

  /**
   * Simulate dig command (DNS lookup)
   */
  dig(args: string[]): NetworkResponse {
    if (args.length === 0) {
      return {
        success: false,
        output: '',
        error: 'usage: dig <domain>',
      }
    }

    const domain = args[0]
    const short = args.includes('+short')
    const server = this.findServer(domain)

    if (!server) {
      const output = `; <<>> DiG 9.10.6 <<>> ${domain}
;; global options: +cmd
;; connection timed out; no servers could be reached`

      return { success: false, output, error: 'DNS lookup failed' }
    }

    // Short output format
    if (short) {
      return { success: true, output: server.ip }
    }

    const output = `; <<>> DiG 9.10.6 <<>> ${domain}
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 12345
;; flags: qr rd ra; QUERY: 1, ANSWER: 1, AUTHORITY: 0, ADDITIONAL: 1

;; OPT PSEUDOSECTION:
; EDNS: version: 0, flags:; udp: 4096
;; QUESTION SECTION:
;${domain}.			IN	A

;; ANSWER SECTION:
${domain}.		300	IN	A	${server.ip}

;; Query time: 23 msec
;; SERVER: 8.8.8.8#53(8.8.8.8)
;; WHEN: ${new Date().toUTCString()}
;; MSG SIZE  rcvd: 56`

    return { success: true, output }
  }

  /**
   * Simulate nslookup command
   */
  nslookup(domain: string): NetworkResponse {
    const server = this.findServer(domain)

    if (!server) {
      const output = `Server:		8.8.8.8
Address:	8.8.8.8#53

** server can't find ${domain}: NXDOMAIN`

      return { success: false, output, error: 'DNS lookup failed' }
    }

    const output = `Server:		8.8.8.8
Address:	8.8.8.8#53

Non-authoritative answer:
Name:	${domain}
Address: ${server.ip}`

    return { success: true, output }
  }

  /**
   * Simulate ip addr command
   */
  ipAddr(args?: string[]): NetworkResponse {
    // Support 'ip addr show' or 'ip addr'
    const showAddr = !args || args.length === 0 || args[0] === 'addr' || args.includes('show')

    if (!showAddr) {
      return {
        success: false,
        output: '',
        error: 'usage: ip addr [show]',
      }
    }

    const output = `1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
    inet6 ::1/128 scope host 
       valid_lft forever preferred_lft forever
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc pfifo_fast state UP group default qlen 1000
    link/ether 08:00:27:4e:66:a1 brd ff:ff:ff:ff:ff:ff
    inet 192.168.1.100/24 brd 192.168.1.255 scope global dynamic eth0
       valid_lft 86394sec preferred_lft 86394sec
    inet6 fe80::a00:27ff:fe4e:66a1/64 scope link 
       valid_lft forever preferred_lft forever`

    return { success: true, output }
  }
}
