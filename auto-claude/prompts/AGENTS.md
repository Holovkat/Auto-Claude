# AGENTS.md - Prompt Templates

> **Parent**: [`../AGENTS.md`](../AGENTS.md)

## Overview

Markdown prompt templates that define agent behavior. Each agent loads its corresponding prompt file.

## Prompt Files

| File | Agent | Purpose |
|------|-------|---------|
| `coder.md` | Coder | Code implementation instructions |
| `coder_recovery.md` | Coder | Recovery from stuck/failed states |
| `planner.md` | Planner | Implementation plan generation |
| `qa_reviewer.md` | QA Reviewer | Acceptance criteria validation |
| `qa_fixer.md` | QA Fixer | Issue resolution instructions |
| `spec_gatherer.md` | Spec Gatherer | Requirements collection |
| `spec_writer.md` | Spec Writer | Spec document generation |
| `spec_critic.md` | Spec Critic | Self-critique using ultrathink |
| `spec_researcher.md` | Spec Researcher | External integration validation |
| `complexity_assessor.md` | Complexity Assessor | AI-based complexity scoring |
| `insight_extractor.md` | Insight Extractor | Session learning extraction |

## Prompt Structure

All prompts follow this general structure:

```markdown
# Role / Identity

You are [Agent Name], responsible for [purpose].

## Context Variables

{{spec_content}}
{{implementation_plan}}
{{qa_report}}

## Instructions

1. Step one
2. Step two

## Output Format

Return JSON/Markdown in this format:
```

## Template Variables

Variables are injected at runtime using `{{variable}}` syntax:

| Variable | Source | Used In |
|----------|--------|---------|
| `{{spec_content}}` | spec.md | coder, planner, reviewer |
| `{{implementation_plan}}` | implementation_plan.json | coder |
| `{{qa_report}}` | qa_report.md | fixer |
| `{{subtask}}` | Current subtask JSON | coder |
| `{{codebase_context}}` | Discovered files | coder, planner |

## Modifying Prompts

1. **Test changes** with a simple spec first
2. **Preserve output format** - agents parse responses
3. **Keep sections** - Role, Context, Instructions, Output
4. **Version control** - commit with clear message

## Prompt Best Practices

- Be explicit about output format (JSON schema or Markdown structure)
- Include examples where helpful
- Use numbered instructions for clarity
- Specify what NOT to do (common mistakes)
- Reference other prompts for consistency

## Testing Prompts

Run a minimal build to validate prompt changes:

```bash
python run.py --spec 001 --dry-run  # If available
# Or create a simple test spec
```

## Related Files

- `agents/*.py` - Agents that load these prompts
- `spec_contract.json` - Schema for spec validation
