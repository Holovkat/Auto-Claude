# AGENTS.md - AI Merge Subsystem

> **Parent**: [`../AGENTS.md`](../AGENTS.md)

## Overview

AI-powered merge conflict resolution system. Uses 3-tier approach:
1. **Git Auto-Merge** - Simple non-conflicting changes
2. **Conflict-Only AI** - AI resolves specific conflict regions (~98% prompt reduction)
3. **Full-File AI** - Fallback for complex conflicts

## Architecture

See `ARCHITECTURE.md` for detailed system design.

## Key Files

| File | Purpose |
|------|---------|
| `orchestrator.py` | Main merge orchestration |
| `conflict_detector.py` | Detects merge conflicts |
| `conflict_resolver.py` | Resolves conflicts |
| `ai_resolver.py` | AI conflict resolution |
| `auto_merger.py` | Automatic merge logic |
| `semantic_analyzer.py` | Code semantic analysis |
| `prompts.py` | AI prompts for merge |
| `models.py` | Data models |
| `types.py` | Type definitions |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `ai_resolver/` | AI resolution components |
| `auto_merger/` | Auto-merge components |
| `file_evolution/` | File change tracking |
| `semantic_analysis/` | Code analysis |
| `hooks/` | Git hooks for merge |

## Merge Flow

```
1. Detect conflicts between branches
2. For each conflict:
   a. Try git auto-merge
   b. If fails, extract conflict regions
   c. AI resolves conflict-only regions
   d. Validate syntax
   e. Apply resolution
3. Stage resolved files for review
```

## Usage

```python
from auto_claude.merge import MergeOrchestrator

orchestrator = MergeOrchestrator(project_path)
result = await orchestrator.merge(
    source_branch="auto-claude/feature",
    target_branch="main"
)
```

## Conflict Resolution Strategies

### Conflict-Only (Default)
```python
# Only sends conflict markers to AI
# <<<<<<< HEAD
# original code
# =======
# incoming code
# >>>>>>> branch
```

### Full-File (Fallback)
```python
# Sends entire file when conflict-only fails
# Used for complex semantic conflicts
```

## Testing

```bash
# Test merge components
pytest ../../tests/test_merge_*.py -v

# Specific tests
pytest ../../tests/test_merge_conflict_detector.py -v
pytest ../../tests/test_merge_ai_resolver.py -v
```

## Timeline Tracking

Files in `file_evolution/` track file changes over time:
- `timeline_tracker.py` - Tracks file modifications
- `timeline_models.py` - Timeline data models
- `timeline_git.py` - Git history analysis

## Related Documentation

- `ARCHITECTURE.md` - System architecture
- `REFACTORING_SUMMARY.md` - Refactoring history
- `REFACTORING_DETAILS.md` - Detailed refactoring notes
