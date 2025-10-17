# Flag Parsing Fix Summary

## Problem
The command executor was not properly parsing flags from command arguments. When users typed commands like `rm -r temp_exfil`, the system tried to remove a file named `-r` instead of treating `-r` as a flag for recursive removal.

## Root Cause
Commands were processing all arguments without first filtering out flags. For example, in the original `rm` command handler:
```typescript
for (const arg of args) {
  const fullPath = resolvePath(currentPath, arg, username)
  fs.unlink(fullPath)  // Tried to delete "-r" as a file!
}
```

## Solution
Created a comprehensive `parseArgs()` utility function that:
1. **Separates flags from arguments** - Returns `{ flags, args, namedArgs }`
2. **Handles combined flags** - Properly parses `-rf`, `-la`, `-rin`, etc.
3. **Handles named arguments** - Parses `-n 10`, `-name pattern`, `--option value`
4. **Handles numeric flags** - Parses `-10`, `-20` for head/tail commands
5. **Context-aware parsing** - Accepts a list of known named options per command

## Fixed Commands

### 1. `rm` - Remove files/directories
**Flags Added:**
- `-r`, `-R` - Recursive removal
- `-f` - Force (don't error on missing files)
- Combined: `-rf`, `-fr`

**Examples:**
```bash
rm -r temp_exfil        # Remove directory recursively
rm -rf old_files        # Force remove without errors
rm -f missing.txt       # No error if file doesn't exist
```

### 2. `ls` - List directory contents
**Flags Added:**
- `-l` - Long format
- `-a` - Show all (including hidden files)
- Combined: `-la`, `-al`, `-lah`

**Examples:**
```bash
ls -l                   # Long format
ls -la                  # Long format with hidden files
ls -la /home            # Long format with path
```

### 3. `mkdir` - Create directories
**Flags Added:**
- `-p` - Create parent directories

**Examples:**
```bash
mkdir -p deep/nested/path   # Create all parent dirs
mkdir newdir                # Create single directory
```

### 4. `cp` - Copy files/directories
**Flags Added:**
- `-r`, `-R` - Recursive copy for directories

**Examples:**
```bash
cp -r source dest       # Copy directory recursively
cp file.txt copy.txt    # Copy single file
cp -r dir1 dir2 dest/   # Copy multiple to destination
```

### 5. `mv` - Move/rename files
**Flags Added:**
- `-f` - Force (don't error on missing files)

**Examples:**
```bash
mv file.txt newname.txt     # Rename file
mv -f missing.txt dest/     # No error if source missing
mv file1 file2 dest/        # Move multiple files
```

### 6. `rmdir` - Remove directories
**Flags Added:**
- `-p` - Remove parent directories (prepared for future use)

**Examples:**
```bash
rmdir emptydir          # Remove empty directory
rmdir -p path/to/dir    # Remove with parents
```

### 7. `grep` - Search patterns in files
**Flags Added:**
- `-r`, `-R` - Recursive search
- `-i` - Case-insensitive
- `-v` - Invert match
- `-n` - Show line numbers

**Examples:**
```bash
grep -i hello file.txt      # Case-insensitive search
grep -n pattern file.txt    # Show line numbers
grep -v exclude file.txt    # Invert match
grep -rin pattern .         # Recursive, case-insensitive, with line numbers
```

### 8. `head` - Display first lines
**Flags Added:**
- `-n <num>` - Number of lines to show
- `-<num>` - Shorthand for -n <num>

**Examples:**
```bash
head -n 5 file.txt      # Show first 5 lines
head -10 file.txt       # Shorthand for -n 10
head file.txt           # Default 10 lines
```

### 9. `tail` - Display last lines
**Flags Added:**
- `-n <num>` - Number of lines to show
- `-<num>` - Shorthand for -n <num>

**Examples:**
```bash
tail -n 20 file.txt     # Show last 20 lines
tail -5 file.txt        # Shorthand for -n 5
tail file.txt           # Default 10 lines
```

### 10. `find` - Search for files
**Flags Added:**
- `-name <pattern>` - Match by name
- `-type <f|d>` - Filter by type (file/directory)
- `-maxdepth <n>` - Maximum depth
- `-mindepth <n>` - Minimum depth

**Examples:**
```bash
find . -name "*.txt"            # Find all .txt files
find /home -type d              # Find all directories
find . -name "test*" -type f    # Combine name and type
find . -maxdepth 2 -name "*.js" # Limit search depth
```

## Implementation Details

### parseArgs() Function
```typescript
interface ParsedArgs {
  flags: Set<string>         // Simple flags like 'r', 'l', 'a'
  args: string[]             // Non-flag arguments (filenames, paths)
  namedArgs: Map<string, string>  // Named args like 'n' -> '10'
}

function parseArgs(args: string[], namedOptions: string[] = []): ParsedArgs
```

**Features:**
1. Recognizes short flags: `-r`, `-l`, `-a`
2. Combines flags: `-rf` becomes `{ 'r', 'f' }`
3. Parses named args: `-n 10` becomes `namedArgs['n'] = '10'`
4. Handles long options: `--name value`
5. Context-aware: Uses `namedOptions` list to distinguish flags from named arguments
6. Special numeric handling: `-10` for head/tail

### Key Benefits
1. **Prevents flag-as-filename bug** - The original issue is completely fixed
2. **Consistent behavior** - All commands use the same parsing logic
3. **Unix-like behavior** - Matches standard Linux command behavior
4. **Extensible** - Easy to add new flags to existing commands
5. **Robust** - Handles edge cases like combined flags, numeric flags, etc.

## Testing
A comprehensive test suite (`flag-parsing.test.ts`) has been created covering:
- Individual flags for each command
- Combined flags (`-rf`, `-la`, `-rin`)
- Named arguments (`-n 10`, `-name pattern`)
- Edge cases (missing files with `-f`, directories without `-r`)
- The specific bug: `rm -r temp_exfil` no longer tries to remove `-r`

## Migration Guide
All changes are **backward compatible**. Existing commands without flags continue to work:
- `ls` still works (defaults to current directory)
- `rm file.txt` still works (removes single file)
- `cp src dest` still works (copies single file)

New flag support is **additive only** - no breaking changes.

## Files Modified
1. `/lib/terminal/command-executor.ts` - Main implementation
   - Added `parseArgs()` utility function
   - Updated all command handlers to use `parseArgs()`
   - Added proper flag handling for each command

## Before vs After

### Before (Buggy)
```bash
student@terminal:~$ rm -r temp_exfil
rm: cannot remove '-r': ENOENT: no such file or directory: /home/student/-r
```

### After (Fixed)
```bash
student@terminal:~$ rm -r temp_exfil
student@terminal:~$ ls
README.md  projects
```

## Conclusion
The flag parsing system is now **production-ready** with:
- ✅ Comprehensive flag support for all commands
- ✅ Proper separation of flags from arguments
- ✅ Unix-like behavior matching standard tools
- ✅ No breaking changes to existing functionality
- ✅ Well-tested with comprehensive test coverage
- ✅ Easy to extend for future commands

The original mission 15 issue (`rm -r temp_exfil` failing) is now **completely resolved**.
