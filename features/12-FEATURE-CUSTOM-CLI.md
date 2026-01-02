# Feature: Custom CLI Support (Spawn Wiring)

## Goal
Enable runs via a user-specified CLI command template + workdir + optional token env name, without Claude SDK reliance.

## Requirements
- Store custom CLI command template (e.g., `droid run --model {model}`), working directory, optional token env var name.
- When provider=custom CLI, main process spawns using the template (substitute model, project paths as needed) instead of Claude defaults.
- Do not inject Claude profile env for non-Claude providers; include provider-specific env (e.g., token env name/value) when set.
- Preserve existing spawn for Claude/OpenAI/Gemini.

## Technical Implementation
- Renderer: settings fields for CLI template/workdir/token env name; validation (template required when provider=custom CLI).
- IPC payload: include CLI config; main interprets template and resolves cwd.
- Main `agent-process.ts`: branch by provider; build args/env accordingly; keep backward compatibility default.
- Backend contract: pass provider/model/env flags to Python or external CLI entry; ensure task state events unchanged.
- Droid specifics (example template):
  - First call: `droid exec --model "<model>" --output-format json "<prompt>"` → parse `session_id` from JSON.
  - Resume: `droid exec --model "<model>" -s <session_id> "<prompt>"`.
  - Streaming mode (optional): `droid exec --input-format stream-json --output-format stream-json --auto low` then send JSONL messages over stdin; capture stdout stream.
  - Placeholders to support: `{model}`, `{projectDir}`, `{specDir}`, `{sessionId}`; allow switching between one-shot and resume/streaming.

## Verification
- Unit tests: spawn config builder for custom CLI; env injection rules (no Claude env when custom); template substitution.
- Manual: set provider=custom CLI with dummy template; ensure spawn uses template and no Claude token is required.
