# AGENTS.md - Python Backend

> **Parent**: [`../AGENTS.md`](../AGENTS.md) | **Detailed docs**: [`agents/AGENTS.md`](agents/AGENTS.md), [`prompts/AGENTS.md`](prompts/AGENTS.md)

## Quick Reference

| Subsystem | Path | Description |
|-----------|------|-------------|
| Agents | [`agents/`](agents/AGENTS.md) | Agent implementations (coder, planner, reviewer) |
| Prompts | [`prompts/`](prompts/AGENTS.md) | Markdown prompt templates |
| Security | [`security/`](security/AGENTS.md) | Command validators, hooks |
| Memory | [`memory/`](memory/AGENTS.md) | File + graph memory layer |
| Merge | [`merge/`](merge/AGENTS.md) | AI conflict resolution |
| Core | [`core/`](core/AGENTS.md) | Engine, workspace, worktree |
| Spec | `spec/` | Spec creation pipeline |
| QA | `qa/` | QA loop, reviewer, fixer |

## Commands

```bash
# Setup
uv venv && uv pip install -r requirements.txt

# Lint & format
ruff check . --fix
ruff format .

# Run tests
../.venv/bin/pytest ../tests/ -v

# Run specific test
../.venv/bin/pytest ../tests/test_security.py -v

# Skip slow tests
../.venv/bin/pytest ../tests/ -m "not slow"
```

## Architecture

### Agent Pipeline

```
Spec Creation → Planner → Coder → QA Reviewer → QA Fixer
     ↓            ↓         ↓          ↓            ↓
  spec.md   plan.json   commits    qa_report   fixes loop
```

### Key Entry Points

| File | Purpose |
|------|---------|
| `run.py` | CLI entry point for builds |
| `agents/orchestrator.py` | Multi-agent orchestration |
| `agents/coder.py` | Code implementation agent |
| `core/engine.py` | Claude SDK engine wrapper |
| `core/client.py` | API client with auth |

## Coding Conventions

### Python Style
- Python 3.9+ syntax
- Type hints required for public functions
- Docstrings for classes and public methods
- `ruff` for linting/formatting (see `../ruff.toml`)

### Import Order
```python
# 1. Standard library
import os
from pathlib import Path

# 2. Third-party
from claude_sdk import Client

# 3. Local
from auto_claude.agents import CoderAgent
```

### Error Handling Pattern
```python
try:
    result = await client.run(prompt)
except APIError as e:
    logger.error(f"API error: {e}")
    raise AgentError(f"Failed: {e}") from e
```

## Key Patterns

### Agent Creation
```python
# All agents inherit from base patterns in agents/base.py
# Use agents/models.py for data models
# Use agents/utils.py for shared utilities
```

### Memory Access
```python
from auto_claude.memory import get_session_memory, save_insight
# File-based memory is always available
# Graphiti (graph) memory is optional, check GRAPHITI_ENABLED
```

### Security Validation
```python
from auto_claude.security import validate_command
# All bash commands must pass through validators
# See security/__init__.py for validator registry
```

## Environment Variables

```bash
# Required
CLAUDE_CODE_OAUTH_TOKEN=...

# Optional
AUTO_BUILD_MODEL=claude-opus-4-5-20251101
GRAPHITI_ENABLED=true
GRAPHITI_LLM_PROVIDER=openai|anthropic|azure_openai|ollama
```

## File Discovery

```bash
# Find all agent implementations
rg "class.*Agent" agents/

# Find prompt templates
ls prompts/*.md

# Find security validators
rg "def validate" security/

# Find memory operations
rg "def save|def load|def get" memory/
```
