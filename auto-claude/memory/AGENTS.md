# AGENTS.md - Memory Subsystem

> **Parent**: [`../AGENTS.md`](../AGENTS.md)

## Overview

Dual-layer memory architecture for cross-session context:
1. **File-Based Memory** (Primary) - Always available, human-readable
2. **Graphiti Memory** (Optional) - Graph database with semantic search

## Key Files

| File | Purpose |
|------|---------|
| `__init__.py` | Memory layer exports |
| `main.py` | Primary memory operations |
| `sessions.py` | Session-based memory storage |
| `patterns.py` | Pattern detection and storage |
| `codebase_map.py` | Codebase structure mapping |
| `paths.py` | Memory file paths |
| `summary.py` | Session summary generation |
| `graphiti_helpers.py` | Graphiti integration utilities |

## File-Based Memory

Stored in `specs/XXX/memory/`:
```
memory/
├── session_insights.json   # Learnings from sessions
├── patterns.json           # Discovered code patterns
├── gotchas.json            # Known issues/workarounds
└── codebase_map.json       # Project structure
```

## Graphiti Memory (Optional)

Requires:
- `GRAPHITI_ENABLED=true`
- FalkorDB running (`docker-compose up -d falkordb`)
- Provider credentials (OpenAI, Anthropic, etc.)

```python
# Check if Graphiti is available
from auto_claude.memory import is_graphiti_enabled
if is_graphiti_enabled():
    # Use graph memory
    pass
```

## Usage Patterns

### Save Insight
```python
from auto_claude.memory import save_insight

await save_insight(
    spec_dir=spec_path,
    insight_type="pattern",
    content="React components use Zustand for state",
    metadata={"files": ["App.tsx"]}
)
```

### Retrieve Context
```python
from auto_claude.memory import get_relevant_context

context = await get_relevant_context(
    spec_dir=spec_path,
    query="How does state management work?",
    limit=5
)
```

### Session Memory
```python
from auto_claude.memory import get_session_memory, save_session

# Load previous session
memory = await get_session_memory(spec_dir)

# Save current session
await save_session(spec_dir, session_data)
```

## Testing

```bash
# Test memory operations
pytest ../../tests/test_graphiti.py -v
```

## Configuration

Environment variables in `.env`:

```bash
GRAPHITI_ENABLED=true
GRAPHITI_LLM_PROVIDER=openai      # openai|anthropic|azure_openai|ollama
GRAPHITI_EMBEDDER_PROVIDER=openai # openai|voyage|azure_openai|ollama
OPENAI_API_KEY=sk-...             # If using OpenAI
```

## Memory Best Practices

- Always check `is_graphiti_enabled()` before graph operations
- File-based memory is the fallback - always works
- Don't store sensitive data (API keys, passwords) in memory
- Keep insights concise and actionable
