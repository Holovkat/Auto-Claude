# Folder Layout (relevant areas)

- `auto-claude-ui/src/renderer/components/settings/**` — settings UI
- `auto-claude-ui/src/renderer/stores/settings-store.ts` (and related) — global settings state
- `auto-claude-ui/src/main/ipc-handlers/**` — IPC handlers for settings/task control
- `auto-claude-ui/src/main/agent/agent-process.ts` — spawn configuration (python/CLI, env)
- `auto-claude-ui/src/main/rate-limit-detector.ts` — provider-related rate-limit hooks
- `auto-claude/core/client.py`, `auto-claude/core/engine.py` — backend provider engines (for contract reference)
