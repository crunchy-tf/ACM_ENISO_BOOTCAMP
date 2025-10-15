# Terminal Learning Exercise - Interactive Linux Command Tutorial

## Overview

This is a fully client-side, story-driven Linux terminal learning experience integrated into your tech bootcamp website. Students can choose between two themed adventures and learn Linux commands through progressive missions and tasks.

## 🎮 Features

### Two Epic Adventures

1. **Hack the Mainframe** (Cyberpunk Theme)
   - Play as a hacker infiltrating CyberCorp
   - Uncover classified documents and expose corruption
   - Learn through a thrilling cyber-investigation storyline

2. **Time Traveler's Terminal** (Sci-Fi Theme)
   - Play as a temporal archivist
   - Fix corrupted timelines and restore historical records
   - Master commands while saving the fabric of time

### Learning System

- **Progressive Missions**: 6-7 missions per adventure, each teaching specific command sets
- **Task-Based Learning**: Complete specific objectives to advance
- **3-Level Hint System**: 
  - Level 1: General guidance
  - Level 2: Syntax help
  - Level 3: Exact example
- **Progress Tracking**: Automatic save to localStorage
- **Real-Time Feedback**: Instant validation of commands

### Technical Implementation

- ✅ **100% Client-Side**: No backend required, works on Vercel static hosting
- ✅ **xterm.js Integration**: Full terminal emulation with authentic feel
- ✅ **Virtual Filesystem**: Complete in-memory filesystem with CRUD operations
- ✅ **30+ Commands**: Comprehensive command support
- ✅ **Responsive Design**: Works on desktop and tablet
- ✅ **Animated UI**: Smooth transitions with Framer Motion

## 🛠️ Architecture

### File Structure

```
components/terminal/
├── AdventureSelection.tsx    # Choose adventure screen
├── Terminal.tsx               # xterm.js terminal implementation
├── MissionOverlay.tsx         # Story, objectives, hints display
├── TerminalExercise.tsx       # Main coordinator component
└── index.ts                   # Exports

lib/terminal/
├── types.ts                   # TypeScript definitions
├── filesystem.ts              # Virtual filesystem operations
└── commands.ts                # Command parser and executors

public/stories/
├── hack_mainframe.json        # Cyberpunk adventure data
└── time_traveler.json         # Sci-fi adventure data
```

### Key Technologies

- **xterm.js**: Terminal rendering
- **@xterm/addon-fit**: Auto-resize terminal
- **@xterm/addon-web-links**: Clickable URLs
- **Framer Motion**: Animations
- **TypeScript**: Type safety
- **Next.js**: React framework

## 📚 Supported Commands

### File Operations
- `ls` - List directory contents (with -l, -a flags)
- `cd` - Change directory
- `pwd` - Print working directory
- `cat` - Display file contents
- `touch` - Create empty file
- `mkdir` - Create directory
- `rmdir` - Remove empty directory
- `rm` - Remove files/directories (with -r flag)
- `cp` - Copy files/directories
- `mv` - Move/rename files/directories

### File Viewing
- `less` / `more` - Page through file contents
- `head` - Display first N lines (with -n flag)
- `tail` - Display last N lines (with -n flag)

### Search & Find
- `grep` - Search for patterns in files
- `find` - Search for files by name

### Network Commands (Simulated)
- `ping` - Test network connectivity
- `curl` / `wget` - Download files (mock)
- `ssh` - Secure shell connection (mock)
- `scp` - Secure copy (mock)
- `ifconfig` - Network interface configuration
- `ip addr` - IP address information
- `netstat` - Network statistics
- `dig` / `nslookup` - DNS lookup

### System Commands
- `echo` - Print text (supports > and >> redirection)
- `env` - Display environment variables
- `sudo` - Execute with elevated privileges
- `clear` - Clear terminal screen
- `help` - Show available commands
- `history` - Show command history

## 🎓 Learning Progression

The exercises follow this command learning order:

1. Basic Navigation: `pwd`, `ls`, `cd`, `cat`
2. File System Exploration: `ls -l`, `find`, `grep`
3. File Operations: `mkdir`, `cp`, `mv`, `touch`, `rm`
4. Advanced File Ops: `head`, `tail`, `echo`, `>`, `>>`
5. Network Operations: `ping`, `ifconfig`, `netstat`
6. System Operations: `env`, `sudo`, `ssh`, `scp`

## 💾 Data Persistence

Progress is automatically saved to browser localStorage:
- Completed tasks and missions
- Hints used per task
- Current mission index
- Filesystem state (optional)

Key: `terminal_progress_<adventure_id>`

## 🎨 Theming

### Cyberpunk Theme (Hack the Mainframe)
- Green terminal text on dark background
- Green/emerald gradients
- Matrix-style aesthetic

### Sci-Fi Theme (Time Traveler)
- Cyan/blue terminal text
- Blue/purple gradients
- Futuristic design

## 🔧 Customization

### Adding New Commands

1. Add command handler in `lib/terminal/commands.ts`:
```typescript
function handleYourCommand(args: string[], state: TerminalState): CommandResult {
  // Implementation
  return { output: "result" }
}
```

2. Add to switch statement in `executeCommand()`:
```typescript
case "yourcommand":
  return handleYourCommand(args, state, onStateChange)
```

### Creating New Adventures

1. Create JSON file in `public/stories/your_adventure.json`
2. Follow the schema from existing adventures
3. Update `AdventureSelection.tsx` to include new option

### Adding New Missions

Edit adventure JSON:
```json
{
  "missions": [
    {
      "id": "mission_x",
      "title": "Mission Title",
      "story": "Story text...",
      "tasks": [
        {
          "id": "task_x_y",
          "description": "What to do",
          "command": "exact command" or "commandPattern": "regex",
          "hints": [
            { "level": 1, "text": "general hint" },
            { "level": 2, "text": "syntax hint" },
            { "level": 3, "text": "example" }
          ]
        }
      ],
      "onComplete": "Completion message"
    }
  ]
}
```

## 🚀 Integration

The terminal exercise is integrated as a slide in the main presentation:

```tsx
const slides = [
  // ... other slides ...
  { id: "terminal-exercise", component: <TerminalExercise /> },
]
```

Navigate to it using arrow keys or slide navigation dots.

## 🐛 Troubleshooting

### Terminal not rendering
- Check if xterm.js dependencies are installed
- Verify dynamic import is configured correctly
- Check browser console for errors

### Commands not working
- Ensure command is implemented in `commands.ts`
- Check filesystem state is initialized
- Verify command parser is handling input correctly

### Progress not saving
- Check browser localStorage is enabled
- Verify localStorage key format
- Check for quota exceeded errors

### Styling issues
- Ensure xterm.css is imported: `import "xterm/css/xterm.css"`
- Check Tailwind classes are applied
- Verify theme colors in xterm config

## 📝 Future Enhancements

Potential additions:
- More adventures and themes
- Multiplayer/collaborative mode
- Leaderboards and achievements
- Export certificate of completion
- More advanced commands (awk, sed, etc.)
- Custom challenge creator
- Code editor integration (nano simulation)

## 🎯 Educational Goals

This exercise teaches students:
- Linux command-line fundamentals
- File system navigation and structure
- Text processing and search
- Network concepts and tools
- Problem-solving through CLI
- Reading documentation (hints)
- Persistence and debugging

## 📄 License

Part of ACM ENISO Tech Bootcamp educational materials.

## 🤝 Contributing

To add new features:
1. Create new missions in JSON format
2. Add command implementations
3. Update type definitions
4. Test thoroughly in both adventures
5. Document changes

---

Built with ❤️ for ACM ENISO Tech Bootcamp
