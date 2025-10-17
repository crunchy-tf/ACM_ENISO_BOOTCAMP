/**
 * Test flag parsing for all commands
 */

import { executeCommand } from '../command-executor'
import { MEMFS } from '../memfs'

describe('Flag Parsing Tests', () => {
  let fs: MEMFS
  let context: any

  beforeEach(() => {
    fs = new MEMFS()
    context = {
      currentPath: '/home/student',
      username: 'student',
      isSudo: false,
    }

    // Setup test filesystem
    fs.mkdir('/home')
    fs.mkdir('/home/student')
    fs.mkdir('/home/student/testdir')
    fs.writeFile('/home/student/file1.txt', 'line1\nline2\nline3\nline4\nline5')
    fs.writeFile('/home/student/file2.txt', 'test content')
    fs.writeFile('/home/student/testdir/nested.txt', 'nested content')
  })

  describe('rm command', () => {
    it('should handle -r flag for recursive removal', () => {
      const result = executeCommand('rm -r testdir', context, fs)
      expect(result.exitCode).toBe(0)
      expect(fs.exists('/home/student/testdir')).toBe(false)
    })

    it('should handle -rf combined flags', () => {
      const result = executeCommand('rm -rf testdir', context, fs)
      expect(result.exitCode).toBe(0)
      expect(fs.exists('/home/student/testdir')).toBe(false)
    })

    it('should handle -f flag for force removal', () => {
      const result = executeCommand('rm -f nonexistent.txt', context, fs)
      expect(result.exitCode).toBe(0) // Should not error with -f
    })

    it('should not remove directory without -r flag', () => {
      const result = executeCommand('rm testdir', context, fs)
      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('Is a directory')
    })
  })

  describe('ls command', () => {
    it('should handle -l flag for long format', () => {
      const result = executeCommand('ls -l', context, fs)
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('total')
    })

    it('should handle -la combined flags', () => {
      const result = executeCommand('ls -la', context, fs)
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('.')
      expect(result.stdout).toContain('..')
    })

    it('should handle -a flag for showing hidden files', () => {
      const result = executeCommand('ls -a', context, fs)
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('.')
    })
  })

  describe('mkdir command', () => {
    it('should handle -p flag for parent directories', () => {
      const result = executeCommand('mkdir -p deep/nested/path', context, fs)
      expect(result.exitCode).toBe(0)
      expect(fs.exists('/home/student/deep/nested/path')).toBe(true)
    })

    it('should create single directory without -p', () => {
      const result = executeCommand('mkdir newdir', context, fs)
      expect(result.exitCode).toBe(0)
      expect(fs.exists('/home/student/newdir')).toBe(true)
    })
  })

  describe('cp command', () => {
    it('should handle -r flag for recursive copy', () => {
      const result = executeCommand('cp -r testdir testdir_copy', context, fs)
      expect(result.exitCode).toBe(0)
      expect(fs.exists('/home/student/testdir_copy')).toBe(true)
      expect(fs.exists('/home/student/testdir_copy/nested.txt')).toBe(true)
    })

    it('should not copy directory without -r flag', () => {
      const result = executeCommand('cp testdir testdir_copy', context, fs)
      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('-r not specified')
    })

    it('should copy file without -r flag', () => {
      const result = executeCommand('cp file1.txt file1_copy.txt', context, fs)
      expect(result.exitCode).toBe(0)
      expect(fs.exists('/home/student/file1_copy.txt')).toBe(true)
    })
  })

  describe('mv command', () => {
    it('should handle -f flag for force move', () => {
      const result = executeCommand('mv -f nonexistent.txt somewhere.txt', context, fs)
      expect(result.exitCode).toBe(0) // Should not error with -f
    })

    it('should move file', () => {
      const result = executeCommand('mv file2.txt file2_moved.txt', context, fs)
      expect(result.exitCode).toBe(0)
      expect(fs.exists('/home/student/file2.txt')).toBe(false)
      expect(fs.exists('/home/student/file2_moved.txt')).toBe(true)
    })
  })

  describe('grep command', () => {
    it('should handle -i flag for case-insensitive search', () => {
      fs.writeFile('/home/student/test.txt', 'Hello World\nhello world')
      const result = executeCommand('grep -i HELLO test.txt', context, fs)
      expect(result.exitCode).toBe(0)
      expect(result.stdout.split('\n').length).toBe(2)
    })

    it('should handle -n flag for line numbers', () => {
      const result = executeCommand('grep -n line1 file1.txt', context, fs)
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('1:')
    })

    it('should handle -v flag for inverted match', () => {
      const result = executeCommand('grep -v line1 file1.txt', context, fs)
      expect(result.exitCode).toBe(0)
      expect(result.stdout).not.toContain('line1')
    })

    it('should handle combined flags -in', () => {
      fs.writeFile('/home/student/test.txt', 'Hello\nWorld')
      const result = executeCommand('grep -in hello test.txt', context, fs)
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('1:')
    })
  })

  describe('head command', () => {
    it('should handle -n flag with value', () => {
      const result = executeCommand('head -n 3 file1.txt', context, fs)
      expect(result.exitCode).toBe(0)
      const lines = result.stdout.split('\n')
      expect(lines.length).toBe(3)
      expect(lines[0]).toBe('line1')
    })

    it('should handle -10 shorthand format', () => {
      fs.writeFile('/home/student/longfile.txt', Array(20).fill('line').join('\n'))
      const result = executeCommand('head -5 longfile.txt', context, fs)
      expect(result.exitCode).toBe(0)
      const lines = result.stdout.split('\n')
      expect(lines.length).toBe(5)
    })

    it('should default to 10 lines without flag', () => {
      fs.writeFile('/home/student/longfile.txt', Array(20).fill('line').join('\n'))
      const result = executeCommand('head longfile.txt', context, fs)
      expect(result.exitCode).toBe(0)
      const lines = result.stdout.split('\n')
      expect(lines.length).toBe(10)
    })
  })

  describe('tail command', () => {
    it('should handle -n flag with value', () => {
      const result = executeCommand('tail -n 3 file1.txt', context, fs)
      expect(result.exitCode).toBe(0)
      const lines = result.stdout.split('\n')
      expect(lines.length).toBe(3)
      expect(lines[0]).toBe('line3')
    })

    it('should handle -20 shorthand format', () => {
      fs.writeFile('/home/student/longfile.txt', Array(50).fill('line').join('\n'))
      const result = executeCommand('tail -5 longfile.txt', context, fs)
      expect(result.exitCode).toBe(0)
      const lines = result.stdout.split('\n')
      expect(lines.length).toBe(5)
    })
  })

  describe('find command', () => {
    it('should handle -name flag', () => {
      const result = executeCommand('find . -name file1.txt', context, fs)
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('file1.txt')
    })

    it('should handle -type flag', () => {
      const result = executeCommand('find . -type f', context, fs)
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('file1.txt')
      expect(result.stdout).toContain('file2.txt')
    })

    it('should handle -type d for directories', () => {
      const result = executeCommand('find . -type d', context, fs)
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('testdir')
    })

    it('should handle multiple flags -name and -type', () => {
      const result = executeCommand('find . -name *.txt -type f', context, fs)
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('.txt')
    })
  })

  describe('Complex flag combinations', () => {
    it('should handle rm -rf with multiple targets', () => {
      fs.mkdir('/home/student/dir1')
      fs.mkdir('/home/student/dir2')
      const result = executeCommand('rm -rf dir1 dir2', context, fs)
      expect(result.exitCode).toBe(0)
      expect(fs.exists('/home/student/dir1')).toBe(false)
      expect(fs.exists('/home/student/dir2')).toBe(false)
    })

    it('should handle ls -la with path', () => {
      const result = executeCommand('ls -la testdir', context, fs)
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('nested.txt')
    })

    it('should not confuse flags with filenames', () => {
      // This was the bug: rm -r temp_exfil tried to remove '-r' as a file
      fs.mkdir('/home/student/temp_exfil')
      const result = executeCommand('rm -r temp_exfil', context, fs)
      expect(result.exitCode).toBe(0)
      expect(result.stderr).not.toContain("cannot remove '-r'")
      expect(fs.exists('/home/student/temp_exfil')).toBe(false)
    })

    it('should handle multiple combined flags correctly', () => {
      const result = executeCommand('ls -lah', context, fs)
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('total')
      expect(result.stdout).toContain('.')
    })
  })
})
