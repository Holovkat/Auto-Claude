# Architecture Overview

## Scope
Provider-agnostic frontend changes to configure and drive backend runs (Electron main + renderer) without Claude-only assumptions.

## Key Components
- Renderer settings UI: integration/settings screens for provider selection and credentials
- Renderer state: global settings store (Zustand) to hold provider/model/keys/CLI config
- IPC bridge: settings payload to main for spawn configuration
- Main process: AgentProcessManager spawn args/env; profile env injection made provider-aware
- Backend contract: expects provider/model/env flags when launching `run.py` (future engines handle provider)

## Data Flow
UI settings → Zustand store → IPC settings sync → main process applies provider/model/env → Python/CLI spawn → backend engine selection → task status returned via existing IPC

## Provider Modes
- Claude SDK (existing)
- OpenAI / Gemini via API keys
- Custom CLI via command template + workdir + optional token env name
