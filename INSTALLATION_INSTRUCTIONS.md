# Installation Instructions

## Required Dependencies

To complete the installation of the terminal exercise, you need to install the following packages:

```bash
pnpm add xterm @xterm/addon-fit @xterm/addon-web-links framer-motion
```

Or if using npm:
```bash
npm install xterm @xterm/addon-fit @xterm/addon-web-links framer-motion
```

Or if using yarn:
```bash
yarn add xterm @xterm/addon-fit @xterm/addon-web-links framer-motion
```

## Package Descriptions

- **xterm**: Terminal emulator library for rendering an interactive terminal in the browser
- **@xterm/addon-fit**: Addon for xterm.js that automatically resizes the terminal to fit its container
- **@xterm/addon-web-links**: Addon for xterm.js that makes URLs in the terminal clickable
- **framer-motion**: Animation library for smooth transitions and interactive UI elements

## Verification

After installation, you can verify the packages are installed by checking your `package.json` file.

## Running the Application

```bash
pnpm dev
```

Then navigate to the terminal exercise slide by using your arrow keys to scroll through the presentation slides.

## Features Included

✅ Two themed adventures: "Hack the Mainframe" (cyberpunk) and "Time Traveler's Terminal" (sci-fi)
✅ Full xterm.js terminal implementation
✅ Virtual filesystem with file operations
✅ 30+ Linux commands supported
✅ Progressive hint system (3 levels per task)
✅ Mission/task tracking with localStorage persistence
✅ Animated UI with Framer Motion
✅ Fully client-side (no backend required)
✅ Works on Vercel static hosting

## Supported Commands

File Operations: ls, cd, pwd, cat, touch, mkdir, rmdir, rm, cp, mv
File Viewing: less, more, head, tail
Search: grep, find
Network: ping, curl, wget, ssh, scp, ifconfig, ip, netstat, dig, nslookup
System: echo, env, sudo, clear, help, history
