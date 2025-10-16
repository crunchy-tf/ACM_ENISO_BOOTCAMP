# ACM ENISO Bootcamp - Terminal Adventure Game 🎮

An interactive terminal-based adventure game built with Next.js, xterm.js, and WASM BusyBox. Learn Linux commands through immersive storytelling and hands-on practice.

## 🌟 Features

### Core Gameplay
- **16 Story-Driven Missions**: Progress through "Hack the Mainframe" adventure
- **37 Interactive Tasks**: Hands-on challenges with validation
- **111 Contextual Hints**: 3-level hint system for guidance
- **Real Terminal Emulation**: Powered by xterm.js + WASM BusyBox
- **In-Memory Filesystem**: Full MEMFS with Unix-like operations

### Phase 1: Story & Content ✅
- Complete mission storyline with lore
- Task-based progression system
- Multi-level hint system (3 hints per task)
- Mission overlay UI with progress tracking

### Phase 2: Command Extensions ✅
- **Sudo Simulation**: Privilege escalation with password prompt
- **SSH/SCP Support**: Remote server connections and file transfers
- **I/O Redirection**: `>`, `>>`, `<<EOF` heredoc support
- **Environment Variables**: `export`, `env` command simulation
- **Network Commands**: `ping`, `curl`, `wget`, `netstat`, `dig`, `nslookup`

### Phase 3: Interactive UI ✅
- **Story Overlay**: Full-screen mission briefings with fade animations
- **Less Viewer**: Paginated file viewing with keyboard navigation
- **Nano Editor**: In-terminal file editing with syntax highlighting
- **SSH Modal**: Connection status indicator with session timer
- **Confirm Dialog**: User confirmation for destructive operations

### Phase 4: Validation & Polish ✅
- **47 Validators**: Output, filesystem, and advanced validation
- **Destructive Command Detection**: 3-level warning system (warning/danger/critical)
- **Error Recovery**: Contextual suggestions for 13+ error patterns
- **Success Animations**: Confetti effects for task/mission completion
- **Safer Alternatives**: Auto-suggest less destructive commands

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ or Bun
- pnpm (recommended) or npm

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd acm_eniso

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

### Access the Game
Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📚 Documentation

### Implementation Guides
- [Phase 1 Complete](./PHASE_1_COMPLETE.md) - Story & Content Implementation
- [Phase 2 Complete](./PHASE_2_COMPLETE.md) - Command Extensions
- [Phase 3 Complete](./PHASE_3_COMPLETE.md) - Interactive UI Components
- [Phase 4 Complete](./PHASE_4_COMPLETE.md) - Validation & Polish
- [Phase 4 Testing Guide](./PHASE_4_TESTING_GUIDE.md) - Comprehensive Testing

### Architecture Guides
- [Mission Structure](./MISSION_STRUCTURE.md) - Mission system design
- [Terminal Dev Guide](./TERMINAL_DEV_GUIDE.md) - Terminal internals
- [MEMFS Quick Start](./MEMFS_QUICK_START.md) - Filesystem usage
- [Validation Quick Reference](./VALIDATION_QUICK_REFERENCE.md) - Validator API

## 🎯 Game Structure

### Adventures
- **Hack the Mainframe**: 16 missions, cybersecurity theme
- **Time Traveler**: Coming soon

### Mission Categories
1. **Basics (Missions 1-3)**: Navigation, file operations, permissions
2. **Investigation (Missions 4-8)**: grep, find, data analysis
3. **Network (Missions 9-11)**: ping, curl, netstat, DNS
4. **Remote (Mission 12)**: SSH, SCP, remote operations
5. **Advanced (Missions 13-16)**: I/O redirection, environment, cleanup

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js 14 with App Router
- **UI**: React 18, Tailwind CSS, shadcn/ui
- **Terminal**: xterm.js 5.x with addons
- **Animations**: Framer Motion, CSS keyframes

### Backend (Client-Side)
- **Shell**: WASM BusyBox (WebAssembly)
- **Filesystem**: MEMFS (in-memory)
- **Validation**: Custom validation registry
- **State**: React hooks + localStorage

## 📖 Command Reference

### Basic Commands
```bash
ls, cd, pwd, cat, mkdir, touch, rm, rmdir, cp, mv
echo, env, export, clear, help
```

### Advanced Commands
```bash
sudo <command>                    # Run with elevated privileges
ssh user@host                     # Connect to remote server
scp file user@host:/path         # Copy files to/from remote
less <file>                      # View file with pagination
nano <file>                      # Edit file in terminal
grep "pattern" <file>            # Search in files
find / -name "*.txt"             # Find files by name
```

### Network Commands
```bash
ping <host>                      # Test network connectivity
curl <url>                       # Make HTTP requests
wget <url>                       # Download files
netstat -tuln                    # Show network connections
dig <domain>                     # DNS lookup
nslookup <domain>                # DNS query
ifconfig / ip addr               # Show network interfaces
```

### I/O Redirection
```bash
command > file                   # Redirect output (overwrite)
command >> file                  # Redirect output (append)
command <<EOF                    # Heredoc input
cat <<EOF > file                 # Heredoc to file
command1 | command2              # Pipe output (coming soon)
```

## 🎨 UI Components

### Terminal Features
- **Keyboard Navigation**: Full keyboard support
- **Command History**: Up/Down arrows for history
- **Tab Completion**: Coming soon
- **Copy/Paste**: Standard shortcuts work

### Mission Overlay
- **Story Display**: Full mission briefing
- **Task List**: Interactive task tracking
- **Hint System**: Progressive hint revelation
- **Progress Bar**: Visual mission progress

### Modals & Dialogs
- **Story Overlay**: Mission introduction
- **Less Viewer**: File content viewer
- **Nano Editor**: In-terminal text editor
- **SSH Modal**: Connection status
- **Confirm Dialog**: Destructive command warnings

## 🧪 Testing

### Run Tests
```bash
# Type checking
npx tsc --noEmit

# Lint
pnpm lint

# Build
pnpm build
```

### Manual Testing
Follow the [Phase 4 Testing Guide](./PHASE_4_TESTING_GUIDE.md) for comprehensive testing.

### Key Test Areas
1. **Destructive Command Detection**: Test `rm -rf`, `rmdir`, `mv`, `>` overwrite
2. **Error Recovery**: Test permission denied, file not found, typos
3. **Success Animations**: Complete tasks and missions
4. **Validators**: Test all 47 validators across missions
5. **UI/UX**: Test dialogs, animations, responsiveness

## 📊 Project Statistics

### Code Metrics
- **Total Files**: 50+ TypeScript/React files
- **Lines of Code**: ~10,000+ lines
- **Components**: 20+ React components
- **Validators**: 47 validation functions
- **Missions**: 16 story missions
- **Tasks**: 37 interactive challenges
- **Hints**: 111 contextual hints

### Implementation Phases
- **Phase 1**: 2,500+ LOC (Story & Content)
- **Phase 2**: 2,673 LOC (Command Extensions)
- **Phase 3**: 1,078 LOC (Interactive UI)
- **Phase 4**: 2,650+ LOC (Validation & Polish)

## 🤝 Contributing

### Development Workflow
1. Create feature branch
2. Implement feature with tests
3. Run type checking and linting
4. Submit pull request

### Code Style
- TypeScript strict mode
- ESLint + Prettier
- Functional React components
- Comprehensive documentation

### Adding New Features

#### Add a New Validator
```typescript
// In lib/terminal/validation-registry.ts
export const validationRegistry: Record<string, OutputValidator> = {
  // ... existing validators
  myNewValidator: (output: string, params?: any) => {
    // Your validation logic
    return output.includes(params.pattern)
  }
}
```

#### Add a New Mission
```json
// In public/stories/hack_mainframe.json
{
  "id": "mission_17",
  "title": "New Mission",
  "story": "Mission briefing...",
  "tasks": [
    {
      "id": "task_17_1",
      "description": "Complete this task",
      "outputCheck": "containsPattern",
      "outputCheckParams": { "pattern": "success" },
      "hints": [...]
    }
  ]
}
```

## 🐛 Troubleshooting

### Common Issues

**Terminal not loading**
- Check browser console for errors
- Verify WASM BusyBox loaded correctly
- Clear browser cache and reload

**Commands not working**
- Check if command is implemented
- Verify validation rules
- Check mission progress state

**Animations not showing**
- Check React DevTools
- Verify component state
- Check for console errors

**Validation not triggering**
- Check mission-layer.ts logs
- Verify validator is registered
- Test validator function in isolation

## 📝 License

[Add license information]

## 👥 Contributors

[Add contributor information]

## 🎓 Learning Resources

### Linux Command Tutorials
- [Linux Journey](https://linuxjourney.com/)
- [Command Line Crash Course](https://learnpythonthehardway.org/book/appendixa.html)
- [Bash Guide for Beginners](http://www.tldp.org/LDP/Bash-Beginners-Guide/html/)

### Terminal Emulation
- [xterm.js Documentation](https://xtermjs.org/)
- [WebAssembly Guide](https://webassembly.org/)
- [BusyBox Documentation](https://busybox.net/downloads/BusyBox.html)

## 🚧 Roadmap

### Upcoming Features
- [ ] Pipe operations (`|`)
- [ ] Background jobs (`&`, `jobs`, `fg`, `bg`)
- [ ] Tab completion
- [ ] Command history search (Ctrl+R)
- [ ] Achievement system
- [ ] Leaderboards
- [ ] More adventures (Time Traveler)
- [ ] Multiplayer mode
- [ ] AI-powered hints

### Future Enhancements
- [ ] Sound effects
- [ ] Video tutorials
- [ ] Custom validator API
- [ ] Undo system
- [ ] Export progress
- [ ] Docker integration
- [ ] VS Code extension

## 📞 Support

For issues, questions, or feature requests:
- Open an issue on GitHub
- Contact the development team
- Check documentation guides

---

**Built with ❤️ for ACM ENISO Bootcamp**

Happy Learning! 🚀
