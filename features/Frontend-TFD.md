# Frontend Technical Functional Requirements Document (TFD)

## 1. Project Overview
- Purpose: Developer tool UI; refactor existing Electron/React/Vite app to be provider-agnostic (remove Claude-centric coupling).
- Primary goal: Enable multiple providers (Claude/OpenAI/Gemini/Custom CLI) end-to-end while preserving current UX.
- Target audience: Developers using the desktop app.

## 2. Technical Stack
- Keep existing stack: Electron main + React 19 renderer + Vite + TypeScript + Zustand + Tailwind utilities + ESLint/TS strict.
- No framework change; extend current codebase.

## 3. Design System
- Source of truth: in-repo primitives (`src/renderer/components/ui/*`) and `.design-system` sandbox.
- No external UI kit adoption.

## 4. Features & Phases (high level)
- Provider selection UI in integrations/settings: Claude, OpenAI, Gemini, Custom CLI.
- Global persistence of provider/model config; no per-project override.
- Credential/config capture:
  - OpenAI key
  - Gemini key
  - Custom CLI: command template + working directory + optional token env name
- Validation per provider: required fields must be present before save.
- Task/Kanban detail shows chosen provider/model for a run.
- Non-functional: keep existing performance; add unit tests for settings + spawn wiring.

## 5. Navigation
- Place provider selection in existing integrations/settings area.
- No new navigation section.

## 6. State Management
- Continue using existing state patterns (Zustand).
- Store provider/model and credentials in global settings store; surface via IPC to main.

## 7. Integrations
- Providers: Claude (existing), OpenAI, Gemini, Custom CLI (non-API command).
- Auth: API keys for OpenAI/Gemini; CLI token via env name for custom.
- IPC/main must pass provider/model/env to Python/CLI spawn.

## 8. Non-Functional Requirements
- Performance: no regression; minimal overhead.
- Accessibility/SEO: unchanged (desktop app).
- Testing: add unit tests for settings validation and spawn/env wiring; basic coverage acceptable.

## 9. Validation & Error Handling
- Per-provider validation in UI: block save if required fields missing.
- Show inline error states for validation failures.

## 10. Observability
- Keep current logging; ensure provider/model visible in task detail/status.
