# Secret Commands 🎮

## Mission Skip Cheat Code

**Command:** `konami`

**What it does:**
- Instantly completes all tasks in the current mission
- Skips to the next mission
- Useful for testing or getting through missions quickly

**How to use:**
1. Open the terminal during any mission
2. Type `konami` and press Enter
3. The current mission will be marked as complete
4. You'll automatically move to the next mission

**Example:**
```bash
$ konami
🎮 CHEAT_CODE_ACTIVATED:SKIP_MISSION 🎮
```

**Notes:**
- This command can be used at any time during gameplay
- It works even if you're stuck on a task
- Perfect for testing later missions without completing earlier ones
- The command name is inspired by the classic Konami cheat code

## Technical Details

The secret command is implemented in two places:
1. **Command Executor** (`lib/terminal/command-executor.ts`): Recognizes the `konami` command and outputs a special marker
2. **Mission Layer** (`lib/terminal/mission-layer.ts`): Detects the marker and automatically completes all tasks in the current mission

The implementation is clean and doesn't break any existing functionality.
