# AGENTS.md - React Renderer

> **Parent**: [`../../AGENTS.md`](../../AGENTS.md)

## Overview

React frontend for the Electron app. Uses Zustand for state, Tailwind for styling, and Radix UI for primitives.

## Structure

```
renderer/
├── App.tsx           # Main app component, routing
├── main.tsx          # Entry point
├── components/       # UI components
├── stores/           # Zustand state stores
├── hooks/            # Custom React hooks
├── lib/              # Utilities
└── styles/           # Global styles
```

## Components (`components/`)

| Component | Purpose |
|-----------|---------|
| `KanbanBoard.tsx` | Task Kanban view |
| `TaskCard.tsx` | Individual task card |
| `TaskCreationWizard.tsx` | Multi-step task creation |
| `Terminal.tsx` | xterm.js terminal |
| `TerminalGrid.tsx` | Multi-terminal layout |
| `Sidebar.tsx` | Navigation sidebar |
| `Insights.tsx` | AI insights chat |
| `Roadmap.tsx` | Project roadmap |

### Component Subdirectories

| Directory | Components |
|-----------|------------|
| `ui/` | Base UI primitives (Button, Input, etc.) |
| `settings/` | Settings panels |
| `project-settings/` | Project configuration |
| `task-detail/` | Task detail views |
| `terminal/` | Terminal components |
| `changelog/` | Changelog features |
| `ideation/` | Ideation features |
| `roadmap/` | Roadmap features |
| `context/` | Context display |
| `onboarding/` | Onboarding flow |

## Stores (`stores/`)

Zustand state management:

| Store | State |
|-------|-------|
| `project-store.ts` | Current project, projects list |
| `task-store.ts` | Tasks, task status |
| `terminal-store.ts` | Terminal sessions |
| `settings-store.ts` | App settings |
| `ui-store.ts` | UI state (modals, panels) |

### Store Pattern

```typescript
// stores/task-store.ts
import { create } from 'zustand'

interface TaskState {
  tasks: Task[]
  selectedTask: Task | null
  setTasks: (tasks: Task[]) => void
  selectTask: (task: Task) => void
}

export const useTaskStore = create<TaskState>((set) => ({
  tasks: [],
  selectedTask: null,
  setTasks: (tasks) => set({ tasks }),
  selectTask: (task) => set({ selectedTask: task }),
}))
```

## Hooks (`hooks/`)

| Hook | Purpose |
|------|---------|
| `useProject.ts` | Project operations |
| `useTask.ts` | Task operations |
| `useTerminal.ts` | Terminal control |
| `useIpc.ts` | IPC communication |

### IPC Hook Pattern

```typescript
// hooks/useIpc.ts
export function useIpc() {
  const invoke = async <T>(channel: string, ...args: unknown[]): Promise<T> => {
    return await window.electron.invoke(channel, ...args)
  }

  return { invoke }
}

// Usage
const { invoke } = useIpc()
const projects = await invoke<Project[]>('project:list')
```

## Styling

### Tailwind CSS
```tsx
// Use cn() for conditional classes
import { cn } from '@/lib/utils'

<button className={cn(
  'px-4 py-2 rounded',
  isActive && 'bg-blue-500',
  isDisabled && 'opacity-50'
)}>
```

### UI Components
```tsx
// Import from components/ui/
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog } from '@/components/ui/dialog'
```

## Testing

```bash
# Component tests
pnpm test src/renderer/__tests__/

# Watch mode
pnpm test:watch
```

## Conventions

- Functional components only
- Props interface per component
- `use` prefix for hooks
- `Store` suffix for Zustand stores
- Tailwind for all styling
- Radix UI for accessible primitives
