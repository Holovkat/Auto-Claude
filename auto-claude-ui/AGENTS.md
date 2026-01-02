# AGENTS.md - Electron Desktop App

> **Parent**: [`../AGENTS.md`](../AGENTS.md) | **Detailed**: [`src/main/AGENTS.md`](src/main/AGENTS.md), [`src/renderer/AGENTS.md`](src/renderer/AGENTS.md)

## Overview

Optional Electron desktop UI for Auto Claude. Provides visual task management, terminal grid, and real-time progress tracking.

## Quick Links

| Area | Path | Description |
|------|------|-------------|
| Main Process | [`src/main/AGENTS.md`](src/main/AGENTS.md) | Electron main, IPC handlers |
| Renderer | [`src/renderer/AGENTS.md`](src/renderer/AGENTS.md) | React components, stores |

## Commands

```bash
# Install dependencies
pnpm install

# Development
pnpm dev

# Build
pnpm build

# Start built app
pnpm start

# Lint
pnpm lint
pnpm lint:fix

# Type check
pnpm typecheck

# Test
pnpm test
pnpm test:watch

# E2E tests
pnpm test:e2e

# Package for distribution
pnpm package
pnpm package:mac
pnpm package:win
pnpm package:linux
```

## Project Structure

```
src/
├── main/           # Electron main process
│   ├── index.ts    # Entry point
│   ├── ipc-handlers/  # IPC handler modules
│   └── ...
├── renderer/       # React frontend
│   ├── App.tsx     # Main app component
│   ├── components/ # UI components
│   ├── stores/     # Zustand stores
│   └── hooks/      # React hooks
├── preload/        # Preload scripts
└── shared/         # Shared types/utils
```

## Tech Stack

| Technology | Purpose |
|------------|---------|
| Electron 39 | Desktop framework |
| React 19 | UI framework |
| TypeScript 5 | Type safety |
| Tailwind CSS 4 | Styling |
| Zustand | State management |
| xterm.js | Terminal emulation |
| Radix UI | UI primitives |
| Vitest | Testing |
| Playwright | E2E testing |

## Architecture

### Main Process (`src/main/`)
- Electron main process
- IPC handlers for Python backend calls
- File system access
- Terminal (node-pty) management

### Renderer Process (`src/renderer/`)
- React application
- Zustand state stores
- UI components
- No direct file system access

### IPC Bridge (`src/preload/`)
- Secure bridge between main/renderer
- Exposes typed APIs to renderer

## Conventions

### TypeScript
- Strict mode enabled
- Explicit return types for functions
- Use `interface` over `type` for objects
- Prefer `const` over `let`

### React
- Functional components only
- Custom hooks in `hooks/`
- Zustand for global state
- Props interfaces defined per-component

### Styling
- Tailwind CSS for all styling
- Design tokens in `design.json`
- Use `cn()` utility for class merging

## Testing

```bash
# Unit tests
pnpm test

# With coverage
pnpm test:coverage

# E2E tests
pnpm test:e2e
```

## Environment Variables

See `.env.example` for available options.
