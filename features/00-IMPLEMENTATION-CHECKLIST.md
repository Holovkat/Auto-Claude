# Implementation Checklist

## Phase 1: Backend plumbing (run.py/create_client/provider enum)
- [ ] Align provider abstraction across backend engines and UI spawn flow
  - Expected: Provider flag consistently routed UI → IPC → main → backend/CLI; engines selected per provider without Claude-only assumptions.
- [ ] Backend: provider enum + auth gating + custom CLI engine stub + tool allowlist sharing
  - Expected: Claude token gated; engines selectable; CLI engine runs without Claude deps; tool lists shared/disabled appropriately.
- [ ] Support custom CLI session flow (capture session_id, resume with -s) and model arg templating
  - Expected: First CLI call yields session_id; subsequent calls resume; model passed via provider-specific arg.
- [ ] Implement Droid CLI integration specifics: model arg, session resume (-s), stream-json input/output mode
  - Expected: Droid CLI callable with model `custom:GLM-4.7-[Z.AI-Coding-Plan]-7`, resume supported, optional stream-json usable.

## Phase 2: UI/IPC/settings
- [ ] Add provider/model global settings UI with validation
  - Expected: Users can select provider/model; invalid saves blocked per provider rules.
- [ ] Persist provider settings and expose via IPC to main
  - Expected: Settings stored outside repo, round-trip through IPC without loss.
- [ ] Store settings outside repo (hidden path), plain JSON for now
  - Expected: Settings path not under repo; not copied unless user opts in.

## Phase 3: Spawn/metadata/tests
- [ ] Wire provider/env into spawn args for task/spec runs
  - Expected: Spawn builds correct args/env per provider (Claude/OpenAI/Gemini/custom CLI) with model arg templating.
- [ ] Show provider/model in task detail/Kanban
  - Expected: UI displays stamped provider/model from spawn; errors surfaced if backend rejects config.
- [ ] Stamp provider/model into task metadata at spawn; surface errors on mismatch
  - Expected: Task metadata matches UI config; backend/CLI errors bubble to UI for correction.
- [ ] Add unit tests: settings validation, IPC payload, spawn args/env
  - Expected: Tests cover validation rules and arg/env assembly for each provider mode.
- [ ] Smoke run with non-Claude provider selection
  - Expected: Manual run succeeds with non-Claude provider (e.g., custom CLI/Droid) using session resume.
# Implementation Checklist

- [ ] Align provider abstraction across backend engines and UI spawn flow
- Expected: Provider flag consistently routed UI → IPC → main → backend/CLI; engines selected per provider without Claude-only assumptions.
- [ ] Add provider/model global settings UI with validation
- Expected: Users can select provider/model; invalid saves blocked per provider rules.
- [ ] Persist provider settings and expose via IPC to main
- Expected: Settings stored outside repo, round-trip through IPC without loss.
- [ ] Wire provider/env into spawn args for task/spec runs
- Expected: Spawn builds correct args/env per provider (Claude/OpenAI/Gemini/custom CLI) with model arg templating.
- [ ] Show provider/model in task detail/Kanban
- Expected: UI displays stamped provider/model from spawn; errors surfaced if backend rejects config.
- [ ] Add unit tests: settings validation, IPC payload, spawn args/env
- Expected: Tests cover validation rules and arg/env assembly for each provider mode.
- [ ] Smoke run with non-Claude provider selection
- Expected: Manual run succeeds with non-Claude provider (e.g., custom CLI/Droid) using session resume.
- [ ] Backend: provider enum + auth gating + custom CLI engine stub + tool allowlist sharing
- Expected: Claude token gated; engines selectable; CLI engine runs without Claude deps; tool lists shared/disabled appropriately.
- [ ] Support custom CLI session flow (capture session_id, resume with -s) and model arg templating
- Expected: First CLI call yields session_id; subsequent calls resume; model passed via provider-specific arg.
- [ ] Store settings outside repo (hidden path), plain JSON for now
- [ ] Implement Droid CLI integration specifics: model arg, session resume (-s), stream-json input/output mode
- Expected: Settings path not under repo; not copied unless user opts in.
- [ ] Stamp provider/model into task metadata at spawn; surface errors on mismatch
- Expected: Task metadata matches UI config; backend/CLI errors bubble to UI for correction.
