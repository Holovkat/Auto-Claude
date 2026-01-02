# AGENTS.md - Python Test Suite

> **Parent**: [`../AGENTS.md`](../AGENTS.md)

## Overview

pytest test suite for the Auto Claude Python backend. Tests cover agents, security, merge system, QA loop, and more.

## Commands

```bash
# Run all tests
auto-claude/.venv/bin/pytest tests/ -v

# Run single file
auto-claude/.venv/bin/pytest tests/test_security.py -v

# Run specific test
auto-claude/.venv/bin/pytest tests/test_security.py::test_bash_command_validation -v

# Skip slow tests
auto-claude/.venv/bin/pytest tests/ -m "not slow"

# Run with coverage
auto-claude/.venv/bin/pytest tests/ --cov=auto_claude --cov-report=html

# Run integration tests only
auto-claude/.venv/bin/pytest tests/ -m integration
```

## Configuration

- `pytest.ini` - pytest configuration
- `conftest.py` - Shared fixtures (35k+ lines)
- `requirements-test.txt` - Test dependencies

## Test Files

### Core Tests
| File | Tests |
|------|-------|
| `test_security.py` | Security validators |
| `test_workspace.py` | Workspace management |
| `test_worktree.py` | Git worktree isolation |
| `test_discovery.py` | Project discovery |

### Agent Tests
| File | Tests |
|------|-------|
| `test_agent_architecture.py` | Agent base classes |
| `test_recovery.py` | Agent recovery logic |

### QA Tests
| File | Tests |
|------|-------|
| `test_qa_loop.py` | QA loop behavior |
| `test_qa_criteria.py` | Acceptance criteria |
| `test_qa_report_*.py` | QA report generation |

### Merge Tests
| File | Tests |
|------|-------|
| `test_merge_conflict_detector.py` | Conflict detection |
| `test_merge_ai_resolver.py` | AI resolution |
| `test_merge_auto_merger.py` | Auto-merge logic |
| `test_merge_orchestrator.py` | Merge orchestration |

### Spec Tests
| File | Tests |
|------|-------|
| `test_spec_pipeline.py` | Spec creation pipeline |
| `test_spec_phases.py` | Spec phases |
| `test_spec_complexity.py` | Complexity assessment |

### Security Tests
| File | Tests |
|------|-------|
| `test_security.py` | Command validation |
| `test_security_scanner.py` | Security scanning |
| `test_scan_secrets.py` | Secret detection |

## Markers

```python
@pytest.mark.slow          # Long-running tests
@pytest.mark.integration   # Requires external services
@pytest.mark.asyncio       # Async tests
```

## Fixtures

Common fixtures in `conftest.py`:

```python
@pytest.fixture
def temp_project(tmp_path):
    """Creates a temporary project directory"""
    pass

@pytest.fixture
def mock_claude_client():
    """Mocked Claude SDK client"""
    pass

@pytest.fixture
def sample_spec():
    """Sample spec for testing"""
    pass
```

## Helpers

| File | Purpose |
|------|---------|
| `qa_report_helpers.py` | QA report test utilities |
| `review_fixtures.py` | Review test fixtures |
| `test_fixtures.py` | General test fixtures |

## Writing Tests

### Test Pattern
```python
import pytest
from auto_claude.security import validate_command

class TestSecurityValidation:
    def test_allows_safe_command(self):
        result = validate_command("ls -la", context={})
        assert result.allowed

    def test_blocks_dangerous_command(self):
        result = validate_command("rm -rf /", context={})
        assert not result.allowed

    @pytest.mark.asyncio
    async def test_async_operation(self):
        result = await async_function()
        assert result is not None
```

### Mocking
```python
from unittest.mock import Mock, patch, AsyncMock

def test_with_mock():
    with patch('auto_claude.core.client.Client') as mock:
        mock.return_value.send_message = AsyncMock(return_value="response")
        # test code
```

## Conventions

- One test file per module
- `test_` prefix for test files and functions
- `Test` prefix for test classes
- Use fixtures for setup/teardown
- Mark slow tests with `@pytest.mark.slow`
- Use `pytest.raises` for exception testing
