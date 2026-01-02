# AGENTS.md - Security Subsystem

> **Parent**: [`../AGENTS.md`](../AGENTS.md)

## Overview

Three-layer security model for safe autonomous coding:
1. **OS Sandbox** - Bash command isolation
2. **Filesystem Permissions** - Project directory restrictions
3. **Command Allowlist** - Dynamic allowlist from project analysis

## Key Files

| File | Purpose |
|------|---------|
| `__init__.py` | Validator registry, main entry points |
| `hooks.py` | Claude SDK permission hooks |
| `main.py` | Security profile management |
| `parser.py` | Command parsing utilities |
| `profile.py` | Security profile data model |
| `validator.py` | Base validator interface |
| `validator_registry.py` | Validator registration |

## Validators

| File | Validates |
|------|-----------|
| `database_validators.py` | Database commands (psql, mysql, etc.) |
| `filesystem_validators.py` | File operations (rm, mv, cp, etc.) |
| `git_validators.py` | Git commands (commit, push, etc.) |
| `process_validators.py` | Process commands (kill, etc.) |
| `scan_secrets.py` | Scans for leaked secrets |

## Security Profile

Cached in `.auto-claude-security.json`:

```json
{
  "allowed_commands": ["npm", "pnpm", "pytest", ...],
  "allowed_paths": ["/project/src", ...],
  "detected_stack": ["node", "python", ...]
}
```

## Validation Flow

```python
from auto_claude.security import validate_command

# Before executing any bash command:
result = validate_command(command, context)
if not result.allowed:
    raise SecurityError(result.reason)
```

## Adding a New Validator

1. Create `new_validators.py`
2. Implement `Validator` interface from `validator.py`
3. Register in `validator_registry.py`

```python
# new_validators.py
from .validator import Validator, ValidationResult

class MyValidator(Validator):
    def validate(self, command: str, context: dict) -> ValidationResult:
        # Return ValidationResult(allowed=True/False, reason="...")
        pass
```

## Testing

```bash
# Test security module
pytest ../../tests/test_security.py -v
pytest ../../tests/test_security_scanner.py -v
pytest ../../tests/test_scan_secrets.py -v
```

## Common Security Patterns

### Filesystem Restrictions
```python
# Only allow operations within project directory
allowed = is_within_project(target_path, project_root)
```

### Command Allowlisting
```python
# Commands are allowlisted based on detected project stack
if "node" in detected_stack:
    allow(["npm", "pnpm", "yarn", "npx"])
```

### Secret Scanning
```python
# Scans output for potential secrets
from auto_claude.security.scan_secrets import scan_for_secrets
findings = scan_for_secrets(command_output)
```
