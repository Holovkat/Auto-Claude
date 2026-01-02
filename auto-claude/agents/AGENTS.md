# AGENTS.md - Agent Implementations

> **Parent**: [`../AGENTS.md`](../AGENTS.md)

## Overview

This directory contains all agent implementations for the Auto Claude pipeline. Each agent has a specific role in the spec-to-code workflow.

## Agent Files

| File | Agent | Role |
|------|-------|------|
| `orchestrator.py` | Orchestrator | Coordinates multi-agent workflow |
| `planner.py` | Planner | Creates subtask-based implementation plans |
| `coder.py` | Coder | Implements individual subtasks |
| `reviewer.py` | QA Reviewer | Validates acceptance criteria |
| `fixer.py` | QA Fixer | Fixes issues from QA loop |
| `insight_extractor.py` | Insight Extractor | Extracts learnings from sessions |
| `spec_runner.py` | Spec Runner | Orchestrates spec creation phases |
| `session.py` | Session Manager | Manages agent sessions |

## Agent Lifecycle

```
1. orchestrator.py receives spec
2. planner.py creates implementation_plan.json
3. coder.py implements each subtask (loops)
4. reviewer.py validates against acceptance criteria
5. fixer.py resolves QA issues (loops up to 50x)
6. insight_extractor.py saves learnings
```

## Key Classes

### `orchestrator.py`
```python
class AgentOrchestrator:
    async def run_build(spec_dir: Path) -> BuildResult
    async def run_subtask(subtask: Subtask) -> SubtaskResult
```

### `coder.py`
```python
class CoderAgent:
    async def implement(subtask: Subtask, context: Context) -> Result
    # Uses prompts/coder.md template
```

### `session.py`
```python
class AgentSession:
    # Manages Claude SDK session lifecycle
    # Handles tool permissions and hooks
```

## Adding a New Agent

1. Create `new_agent.py` in this directory
2. Create prompt template in `../prompts/new_agent.md`
3. Register in `__init__.py` exports
4. Add to orchestrator workflow if needed

## Prompt Binding

Each agent loads its prompt from `prompts/`:
- `coder.py` → `prompts/coder.md`
- `planner.py` → `prompts/planner.md`
- `reviewer.py` → `prompts/qa_reviewer.md`
- `fixer.py` → `prompts/qa_fixer.md`

## Testing

```bash
# Test agent architecture
pytest ../tests/test_agent_architecture.py -v

# Test specific agent
pytest ../tests/ -k "coder" -v
```

## Conventions

- Agents are async (`async def`)
- Use `AgentSession` for SDK calls
- Log with `logger.info/debug/error`
- Return typed results (see `models.py`)
- Handle `APIError` and `TimeoutError` explicitly
