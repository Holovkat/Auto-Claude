# AGENTS.md - Electron Main Process

> **Parent**: [`../../AGENTS.md`](../../AGENTS.md)

## Overview

Electron main process: window management, IPC handlers, Python backend integration, and system services.

## Key Files

| File | Purpose |
|------|---------|
| `index.ts` | Main entry point, window creation |
| `ipc-setup.ts` | IPC handler registration |
| `project-store.ts` | Project data persistence |
| `docker-service.ts` | Docker/FalkorDB management |
| `falkordb-service.ts` | FalkorDB connection |
| `python-env-manager.ts` | Python environment setup |
| `log-service.ts` | Logging service |
| `notification-service.ts` | System notifications |
| `rate-limit-detector.ts` | API rate limit detection |
| `file-watcher.ts` | File system watching |

## IPC Handlers (`ipc-handlers/`)

Modular IPC handlers organized by domain:

| File | Handles |
|------|---------|
| `project-handlers.ts` | Project CRUD |
| `task-handlers.ts` | Task management |
| `terminal-handlers.ts` | Terminal operations |
| `build-handlers.ts` | Build orchestration |
| `settings-handlers.ts` | App settings |
| `file-handlers.ts` | File operations |
| `git-handlers.ts` | Git operations |
| `docker-handlers.ts` | Docker control |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `agent/` | Agent session management |
| `changelog/` | Changelog generation |
| `claude-profile/` | Claude profile management |
| `insights/` | Insights service |
| `terminal/` | Terminal management |
| `updater/` | App auto-updater |

## IPC Pattern

```typescript
// Handler registration (ipc-setup.ts)
import { registerProjectHandlers } from './ipc-handlers/project-handlers'

export function setupIpc() {
  registerProjectHandlers()
  registerTaskHandlers()
  // ...
}

// Handler implementation (ipc-handlers/project-handlers.ts)
import { ipcMain } from 'electron'

export function registerProjectHandlers() {
  ipcMain.handle('project:list', async () => {
    return await projectStore.getAll()
  })

  ipcMain.handle('project:create', async (_, data) => {
    return await projectStore.create(data)
  })
}
```

## Service Pattern

```typescript
// Services are singletons
class DockerService {
  private static instance: DockerService

  static getInstance(): DockerService {
    if (!this.instance) {
      this.instance = new DockerService()
    }
    return this.instance
  }

  async checkStatus(): Promise<DockerStatus> { /* ... */ }
  async startFalkorDB(): Promise<void> { /* ... */ }
}
```

## Python Backend Integration

```typescript
// python-env-manager.ts handles Python setup
const pythonManager = PythonEnvManager.getInstance()
await pythonManager.ensureVenv()
await pythonManager.runScript('run.py', ['--spec', '001'])
```

## Terminal Management

Uses `node-pty` for terminal emulation:

```typescript
// terminal/terminal-service.ts
const terminal = new Terminal({
  shell: process.env.SHELL,
  cwd: projectPath,
})

terminal.onData((data) => {
  mainWindow.webContents.send('terminal:data', data)
})
```

## Testing

```bash
# Main process tests
pnpm test src/main/__tests__/
```

## Conventions

- One IPC channel = one handler file
- Services are singletons via `getInstance()`
- Use `ipcMain.handle` for request/response
- Use `webContents.send` for push to renderer
- Log all errors with `log-service.ts`
