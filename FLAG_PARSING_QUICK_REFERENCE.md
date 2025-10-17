# Quick Reference: Flag Parsing Fix

## Commands with New Flag Support

| Command | Flags | Example |
|---------|-------|---------|
| **rm** | `-r` (recursive), `-f` (force) | `rm -rf temp_exfil` |
| **ls** | `-l` (long), `-a` (all) | `ls -la` |
| **mkdir** | `-p` (parents) | `mkdir -p deep/path` |
| **cp** | `-r` (recursive) | `cp -r src dest` |
| **mv** | `-f` (force) | `mv -f old new` |
| **rmdir** | `-p` (parents) | `rmdir -p path` |
| **grep** | `-i` (case), `-n` (line #), `-v` (invert), `-r` (recursive) | `grep -in pattern file` |
| **head** | `-n NUM` or `-NUM` | `head -n 10 file` or `head -10 file` |
| **tail** | `-n NUM` or `-NUM` | `tail -n 20 file` or `tail -20 file` |
| **find** | `-name`, `-type`, `-maxdepth`, `-mindepth` | `find . -name "*.txt"` |

## The Bug That Was Fixed

### ❌ Before (Broken)
```bash
student@terminal:~$ rm -r temp_exfil
rm: cannot remove '-r': ENOENT: no such file or directory: /home/student/-r
```

**Problem:** The system tried to delete a file named `-r` instead of treating it as a flag!

### ✅ After (Fixed)
```bash
student@terminal:~$ rm -r temp_exfil
student@terminal:~$ # Success! Directory removed
```

## How It Works Now

### New `parseArgs()` Function
```typescript
const parsed = parseArgs(args, ['n', 'name', 'type'])
// Returns:
// {
//   flags: Set(['r', 'f']),           // from -rf
//   args: ['temp_exfil'],             // actual files/dirs
//   namedArgs: Map('n' => '10')       // from -n 10
// }
```

### Example: `rm -rf temp_exfil file.txt`
1. Input: `['-rf', 'temp_exfil', 'file.txt']`
2. Parsed:
   - `flags`: Set(`'r'`, `'f'`)
   - `args`: `['temp_exfil', 'file.txt']`
3. Behavior:
   - Recursive mode ON (because `'r'` in flags)
   - Force mode ON (because `'f'` in flags)
   - Remove: `temp_exfil` and `file.txt`

### Example: `head -n 5 log.txt`
1. Input: `['-n', '5', 'log.txt']`
2. Parsed:
   - `flags`: Set()
   - `args`: `['log.txt']`
   - `namedArgs`: Map(`'n'` => `'5'`)
3. Behavior:
   - Show first 5 lines of log.txt

## Flag Combinations Supported

✅ `-rf` (r + f combined)
✅ `-la` (l + a combined)  
✅ `-rin` (r + i + n combined)
✅ `-n 10` (named argument)
✅ `-10` (shorthand for -n 10)
✅ `--option value` (long options)

## All Commands Updated

Total commands fixed: **10**
- ✅ `rm` - Recursive & force removal
- ✅ `ls` - Long format & show all
- ✅ `mkdir` - Create parent directories
- ✅ `cp` - Recursive copy
- ✅ `mv` - Force move
- ✅ `rmdir` - Remove with parents
- ✅ `grep` - Case-insensitive, line numbers, invert, recursive
- ✅ `head` - Custom line count
- ✅ `tail` - Custom line count
- ✅ `find` - Name patterns, type filters, depth limits

## Mission 15 - Now Works!

The mission that was failing:
```bash
# Mission objective: Remove temp_exfil directory
rm -r temp_exfil && ls
```

**Status:** ✅ **FIXED** - Now works perfectly!

The command properly:
1. Recognizes `-r` as a flag (not a filename)
2. Removes the directory recursively
3. Executes the `ls` command after success

## Implementation Quality

- **Zero TypeScript errors** ✅
- **Backward compatible** ✅
- **Unix-like behavior** ✅
- **Comprehensive test coverage** ✅
- **Production ready** ✅
