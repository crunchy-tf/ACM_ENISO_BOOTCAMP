# Secret Commands 🎮

## 1. Mission Skip Cheat Code

**Command:** `konami`

**What it does:**
- Completes the **current task only** (not all tasks in the mission)
- Moves to the next task in the mission
- If it's the last task, completes the mission and moves to the next mission
- Useful for testing or skipping specific tasks

**How to use:**
1. Open the terminal during any mission
2. Type `konami` and press Enter
3. The current task will be marked as complete
4. You'll automatically move to the next task (or next mission if it's the last task)

**Example:**
```bash
$ konami
🎮 CHEAT_CODE_ACTIVATED:SKIP_MISSION 🎮
```

**Important Notes:**
- This only skips ONE task at a time (prevents conflicts when testing new missions)
- You may need to run it multiple times to skip an entire mission
- Perfect for testing later missions without completing earlier ones
- The command name is inspired by the classic Konami cheat code

---

## 2. Reset Task Cheat Code

**Command:** `echo "CHEAT_CODE_ACTIVATED:RESET_TASK"`

**What it does:**
- Resets the current task to an incomplete state
- Allows you to re-complete a task that was already marked as done
- Useful when testing task validation or when a cheat code accidentally marked a task complete

**How to use:**
1. Open the terminal when on a task that's already complete
2. Type `echo "CHEAT_CODE_ACTIVATED:RESET_TASK"` and press Enter
3. The current task will be reset
4. You can now complete it normally

**Example:**
```bash
$ echo "CHEAT_CODE_ACTIVATED:RESET_TASK"
🎮 CHEAT CODE DETECTED - Resetting current task!
Task task_15_1 has been reset and can be completed again

$ ls
README.md  projects
✅ Mission 15 Complete!
```

**Use Case:**
- You used `konami` to skip through missions
- You reached a mission you want to test
- The task is already marked complete from the cheat code
- Use this command to reset it so you can test it properly

---

## Technical Details

The secret commands are implemented in two places:
1. **Command Executor** (`lib/terminal/command-executor.ts`): Recognizes the `konami` command and outputs a special marker
2. **Mission Layer** (`lib/terminal/mission-layer.ts`): Detects the markers and performs the appropriate actions:
   - `SKIP_MISSION`: Completes current task and moves to next
   - `RESET_TASK`: Removes current task from completed tasks set

The implementation is clean and doesn't break any existing functionality.
