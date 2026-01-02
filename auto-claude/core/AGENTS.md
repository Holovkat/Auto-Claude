# AGENTS.md - Core Engine

> **Parent**: [`../AGENTS.md`](../AGENTS.md)

## Overview

Core engine components for the Auto Claude framework: SDK client, workspace management, and worktree isolation.

## Key Files

| File | Purpose |
|------|---------|
| `engine.py` | Main Claude SDK engine wrapper |
| `client.py` | API client with authentication |
| `auth.py` | OAuth token management |
| `workspace.py` | Workspace management |
| `worktree.py` | Git worktree isolation |
| `progress.py` | Progress tracking |
| `debug.py` | Debug utilities |
| `agent.py` | Base agent interface |
| `kba_memory.py` | Knowledge base memory |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `workspace/` | Workspace utilities |
| `tools/` | Custom tools for agents |

## Engine (`engine.py`)

Main entry point for Claude SDK operations:

```python
from auto_claude.core.engine import Engine

engine = Engine(
    oauth_token=os.getenv("CLAUDE_CODE_OAUTH_TOKEN"),
    model=os.getenv("AUTO_BUILD_MODEL")
)

result = await engine.run(
    prompt="Implement feature X",
    tools=["read", "write", "bash"],
    hooks=security_hooks
)
```

## Client (`client.py`)

API client wrapper with retry logic:

```python
from auto_claude.core.client import Client

client = Client()
await client.connect()
response = await client.send_message(prompt)
```

## Workspace (`workspace.py`)

Manages project workspace:

```python
from auto_claude.core.workspace import Workspace

workspace = Workspace(project_path)
spec_dir = workspace.get_spec_dir("001")
worktree = workspace.create_worktree("feature-name")
```

## Worktree (`worktree.py`)

Git worktree isolation for safe builds:

```python
from auto_claude.core.worktree import Worktree

worktree = Worktree(project_path)
branch = await worktree.create("auto-claude/feature")
# Work happens in .worktrees/feature/
await worktree.merge_to_main()
```

## Testing

```bash
pytest ../../tests/test_workspace.py -v
pytest ../../tests/test_worktree.py -v
```

## Conventions

- All SDK calls go through `engine.py`
- Worktrees are created for every build
- Never modify main branch directly
- Use `workspace.py` for path resolution
