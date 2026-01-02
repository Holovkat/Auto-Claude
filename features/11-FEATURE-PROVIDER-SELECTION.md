# Feature: Provider Selection (Global Settings)

## Goal
Allow users to choose provider/model (Claude/OpenAI/Gemini/Custom CLI) globally, with validated credentials/config, and show provider/model in task detail.

## Requirements
- UI section in integrations/settings captures: provider enum, model string, OpenAI key, Gemini key, custom CLI command template, workdir, optional token env name.
- Validation: per-provider required fields; block save on missing required input; inline errors.
- Persistence: global settings store + IPC save/load; renderer uses defaults on load.
- Display: task detail/Kanban shows provider/model used for run.

## Technical Implementation
- UI: extend existing integrations/settings components; reuse form controls; add provider selector and conditional fields.
- State: update settings store shape; add actions/selectors; ensure serialization for IPC.
- IPC: extend settings payload schema and handlers to include provider config; version if needed.
- Rendering: task/Kanban components read provider/model from task metadata; fallback to “unknown” if absent.

## Verification
- Unit tests: store validation logic; IPC handler marshalling; component-level validation rendering.
- Manual: select each provider, attempt save with/without required fields; start task and confirm provider/model shown.
