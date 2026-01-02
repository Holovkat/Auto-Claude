# Feature: Backend Provider Engine Decoupling

## Goal
Make backend agent engine provider-agnostic (Claude/OpenAI/Gemini/custom CLI) with gated auth, shared tooling, and preserved task/QA flow.

## Requirements
- Provider enum/config (e.g., `AUTO_CLAUDE_PROVIDER`) drives engine selection.
- Gate `require_auth_token()` to Claude-only; pass provider-specific env (e.g., `OPENAI_API_KEY`, `GEMINI_API_KEY`, custom token env).
- Introduce `CustomCliAgentEngine` wrapper using stdio spawn; map `query/receive_response/cleanup` to external CLI; support session-resume flags when provided (e.g., pass `session_id` via args like `-s`), and optional stream-json stdin/stdout mode when requested.
- Share tool allowlist/MCP wiring across providers; disable/translate MCP for CLI providers if unsupported.
- Preserve task/QA events and state machine semantics.

## Technical Implementation
- `core/client.py`: read provider flag; skip Claude token when non-Claude; set provider/env in `AgentOptions`.
- `core/engine.py`: add `CustomCliAgentEngine`; route by provider; keep existing Gemini/OpenAI/Claude logic.
- Expose provider/model/env flags to runners that call `create_client` (planner/coder/qa loops) to keep consistent options; allow model arg templating for custom CLI. Provide provider-specific arg builders (e.g., Droid: `--model`, `-s <session_id>`, optional `--input-format/--output-format stream-json`).
- Ensure settings file write (`.claude_settings.json`) is safe for non-Claude; adjust naming or conditionally write if needed.

## Verification
- Unit tests: provider routing, auth gating, env assembly for each provider.
- Manual: run backend with provider=Claude (regression), OpenAI/Gemini with API keys, and custom CLI (dummy) to confirm engine selection and no Claude token requirement.
