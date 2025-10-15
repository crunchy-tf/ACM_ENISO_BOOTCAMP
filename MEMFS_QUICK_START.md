# Quick Start: Using the New MEMFS Terminal System

## For Developers

The terminal has been completely refactored to use a real Emscripten-style MEMFS. Here's what you need to know:

## Key Changes

### 1. **Import from MEMFS**
```typescript
import { MEMFS } from '@/lib/terminal/memfs'
import { BusyBoxWASM } from '@/lib/terminal/wasm-busybox'
```

### 2. **Use Real Filesystem Operations**

**Creating Files:**
```typescript
const fs = busybox.getFS()
fs.writeFile('/home/student/data.txt', 'Hello World')
fs.mkdir('/home/student/projects')
```

**Reading Files:**
```typescript
const content = fs.readFile('/home/student/data.txt', { encoding: 'utf8' })
const files = fs.readdir('/home/student')
```

**File Operations:**
```typescript
fs.rename('/old/path.txt', '/new/path.txt')
fs.unlink('/home/student/data.txt')  // Delete file
fs.rmdir('/home/student/empty_dir')  // Delete empty directory
```

**Checking Files:**
```typescript
if (fs.exists('/etc/passwd')) {
  const stat = fs.stat('/etc/passwd')
  console.log('Owner:', stat.owner)
  console.log('Is directory:', stat.isDirectory())
  console.log('Size:', stat.size)
}
```

### 3. **Context Management**

The BusyBox now manages execution context:

```typescript
// Set context
busybox.setContext({
  currentPath: '/home/student',
  username: 'student',
  isSudo: false
})

// Execute command
const result = await busybox.execute('ls -la')

// Get updated context (in case cd was run)
const context = busybox.getContext()
console.log('Current path:', context.currentPath)
```

### 4. **Command Results**

All commands return a consistent result:

```typescript
interface CommandResult {
  stdout: string     // Command output
  stderr: string     // Error output
  exitCode: number   // Exit code (0 = success)
  newPath?: string   // New path if cd command
}
```

## Common Patterns

### Execute a Command and Update State

```typescript
const result = await busybox.execute(command)

// Display output
if (result.stdout) {
  console.log(result.stdout)
}

// Display errors
if (result.stderr) {
  console.error(result.stderr)
}

// Update path if cd command
if (command.startsWith('cd')) {
  const context = busybox.getContext()
  setCurrentPath(context.currentPath)
}
```

### Check Permissions

```typescript
const stat = fs.stat('/etc/secure.conf')
if (stat.owner === 'root' && !context.isSudo) {
  console.log('Permission denied')
} else {
  const content = fs.readFile('/etc/secure.conf', { encoding: 'utf8' })
}
```

### Create Directory Tree

```typescript
// Creates all intermediate directories
fs.mkdirTree('/home/student/projects/alpha/data')
```

## Adding New Commands

To add a new command, edit `lib/terminal/command-executor.ts`:

```typescript
case 'mycmd': {
  // Parse arguments
  const target = args[0]
  const fullPath = resolvePath(currentPath, target, username)
  
  // Use MEMFS operations
  if (!fs.exists(fullPath)) {
    return {
      stdout: '',
      stderr: `mycmd: ${target}: No such file or directory`,
      exitCode: 1
    }
  }
  
  // Do your command logic
  const stat = fs.stat(fullPath)
  const result = `File: ${stat.owner}`
  
  return {
    stdout: result,
    stderr: '',
    exitCode: 0
  }
}
```

## Debugging

### Enable Debug Mode

Add console.log in command-executor.ts:

```typescript
console.log('[DEBUG] Executing:', command)
console.log('[DEBUG] Context:', context)
console.log('[DEBUG] FS exists:', fs.exists(path))
```

### Inspect Filesystem

```typescript
const fs = busybox.getFS()

// List all files
function walk(path: string, indent = 0) {
  const files = fs.readdir(path)
  for (const file of files) {
    if (file === '.' || file === '..') continue
    console.log('  '.repeat(indent) + file)
    const fullPath = path === '/' ? `/${file}` : `${path}/${file}`
    const stat = fs.stat(fullPath)
    if (stat.isDirectory()) {
      walk(fullPath, indent + 1)
    }
  }
}

walk('/')
```

## Common Issues

### Path Not Found
Make sure you're using absolute paths or resolving relative paths correctly:

```typescript
const fullPath = path.startsWith('/') 
  ? path 
  : resolvePath(currentPath, path, username)
```

### Permission Denied
Check if the operation requires sudo:

```typescript
const stat = fs.stat(path)
if (stat.owner === 'root' && !context.isSudo) {
  return { stdout: '', stderr: 'Permission denied', exitCode: 1 }
}
```

### Directory Not Empty
Use recursive delete if needed:

```typescript
// Delete directory and all contents
function rmrf(path: string) {
  const stat = fs.stat(path)
  if (stat.isDirectory()) {
    const files = fs.readdir(path)
    for (const file of files) {
      if (file === '.' || file === '..') continue
      const fullPath = `${path}/${file}`
      rmrf(fullPath)
    }
    fs.rmdir(path)
  } else {
    fs.unlink(path)
  }
}
```

## Best Practices

1. **Always check if paths exist** before operating on them
2. **Use try/catch** around filesystem operations
3. **Check permissions** before reading/writing root-owned files
4. **Use absolute paths** when possible to avoid confusion
5. **Get updated context** after running commands that might change state

## Examples

### Reading Mission Files

```typescript
const fs = busybox.getFS()

// Check if mission file exists
if (fs.exists('/home/student/projects/mission.txt')) {
  const content = fs.readFile('/home/student/projects/mission.txt', { 
    encoding: 'utf8' 
  }) as string
  
  // Parse and display mission
  console.log(content)
}
```

### Copying Files

```typescript
const source = '/home/student/data.txt'
const dest = '/home/student/backup.txt'

if (fs.exists(source)) {
  const content = fs.readFile(source)
  fs.writeFile(dest, content)
  console.log('File copied successfully')
}
```

### Listing Directory with Details

```typescript
const files = fs.readdir('/home/student')

for (const file of files) {
  if (file === '.' || file === '..') continue
  
  const fullPath = `/home/student/${file}`
  const stat = fs.stat(fullPath)
  
  const type = stat.isDirectory() ? 'd' : '-'
  const perms = stat.mode.toString(8).slice(-3)
  
  console.log(`${type}${perms} ${stat.owner} ${file}`)
}
```

## Summary

The new system is:
- ✅ **Simpler** - Use real FS operations
- ✅ **More reliable** - Real POSIX semantics
- ✅ **Easier to debug** - Clear error messages
- ✅ **Better performance** - Efficient path caching
- ✅ **Type-safe** - Full TypeScript support

For more details, see `REFACTOR_COMPLETE.md`.
