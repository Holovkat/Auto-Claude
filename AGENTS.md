# AGENTS.md - Auto Claude Repository

> **Navigation**: This is the root guidance file. Sub-folders have detailed AGENTS.md files.

## Quick Links

| Area | Path | Description |
|------|------|-------------|
| Python Backend | [`auto-claude/AGENTS.md`](auto-claude/AGENTS.md) | Core framework, agents, security |
| Electron UI | [`auto-claude-ui/AGENTS.md`](auto-claude-ui/AGENTS.md) | Desktop app, React components |
| Tests | [`tests/AGENTS.md`](tests/AGENTS.md) | pytest suite, fixtures |

## Repository Structure

```
auto-claude/          # Python backend (framework)
auto-claude-ui/       # Electron desktop app (optional)
tests/                # Python test suite
guides/               # User documentation
features/             # Feature specs (internal)
```

## Universal Commands

```bash
# Python linting
ruff check auto-claude/ --fix
ruff format auto-claude/

# TypeScript linting
cd auto-claude-ui && pnpm lint:fix && pnpm typecheck

# Run all Python tests
auto-claude/.venv/bin/pytest tests/ -v

# Run frontend tests
cd auto-claude-ui && pnpm test
```

## Branching Convention

- Feature branches: `auto-claude/{spec-name}`
- All AI work happens in git worktrees (`.worktrees/`)
- Never push without explicit user approval

## Key Principles

1. **Security First**: All commands validated through `security/` validators
2. **Isolated Workspaces**: Builds never modify main branch directly
3. **Self-Validating**: QA loop validates all acceptance criteria
4. **Memory-Aware**: Agents persist insights across sessions

## File Discovery Patterns

```bash
# Find agent implementations
rg "class.*Agent" auto-claude/agents/

# Find prompt templates
ls auto-claude/prompts/*.md

# Find IPC handlers
rg "ipcMain.handle" auto-claude-ui/src/main/

# Find React components
ls auto-claude-ui/src/renderer/components/
```
