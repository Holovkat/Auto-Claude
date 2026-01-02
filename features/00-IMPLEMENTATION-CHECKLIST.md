# Implementation Checklist

## Phase 1: Backend plumbing (run.py/create_client/provider enum)
- [x] Align provider abstraction across backend engines and UI spawn flow
  - Expected: Provider flag consistently routed UI → IPC → main → backend/CLI; engines selected per provider without Claude-only assumptions.
  - Status: DONE (provider flag added to CLI, threaded through build/QA/followup, create_client accepts provider)
- [x] Backend: provider enum + auth gating + custom CLI engine stub + tool allowlist sharing
  - Expected: Claude token gated; engines selectable; CLI engine runs without Claude deps; tool lists shared/disabled appropriately.
  - Status: DONE (Claude auth gated; CustomCliAgentEngine placeholder added)
- [x] Support custom CLI session flow (capture session_id, resume with -s) and model arg templating
  - Expected: First CLI call yields session_id; subsequent calls resume; model passed via provider-specific arg.
  - Status: DONE (CustomCliAgentEngine handles templates, session ID persistence, and resume)
- [x] Implement Droid CLI integration specifics: model arg, session resume (-s), stream-json input/output mode
  - Expected: Droid CLI callable with model `custom:GLM-4.7-[Z.AI-Coding-Plan]-7`, resume supported, optional stream-json usable.
  - Status: DONE (Implemented in CustomCliAgentEngine with stream-json and session resume support)

## Phase 2: UI/IPC/settings
- [x] Add provider/model global settings UI with validation
  - Expected: Users can select provider/model; invalid saves blocked per provider rules.
  - Status: DONE (Added to IntegrationSettings with conditional fields for custom CLI)
- [x] Persist provider settings and expose via IPC to main
  - Expected: Settings stored outside repo, round-trip through IPC without loss.
  - Status: DONE (Uses existing settings IPC, loaded by AgentManager)
- [x] Store settings outside repo (hidden path), plain JSON for now
  - Expected: Settings path not under repo; not copied unless user opts in.
  - Status: DONE (Settings stored in app's userData directory)

## Phase 3: Spawn/metadata/tests
- [x] Wire provider/env into spawn args for task/spec runs
  - Expected: Spawn builds correct args/env per provider (Claude/OpenAI/Gemini/custom CLI) with model arg templating.
  - Status: DONE (AgentManager passes --provider/--model; CustomCliAgentEngine handles templating)
- [x] Show provider/model in task detail/Kanban
  - Expected: UI displays stamped provider/model from spawn; errors surfaced if backend rejects config.
  - Status: DONE (Added to TaskCard footer)
- [x] Stamp provider/model into task metadata at spawn; surface errors on mismatch
  - Expected: Task metadata matches UI config; backend/CLI errors bubble to UI for correction.
  - Status: DONE (ProjectStore.stampTaskProvider called before spawn)
- [ ] Add unit tests: settings validation, IPC payload, spawn args/env
  - Expected: Tests cover validation rules and arg/env assembly for each provider mode.
- [x] Smoke run with non-Claude provider selection
  - Expected: Manual run succeeds with non-Claude provider (e.g., custom CLI/Droid) using session resume.
  - Status: DONE (Verified with mock_droid.py and custom provider run)
