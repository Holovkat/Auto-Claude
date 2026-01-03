"""
Prompt Loading Utilities
========================

Functions for loading agent prompts from markdown files.
Supports project-specific prompt overrides from .auto-claude/prompts/
"""

import json
from pathlib import Path

# Directory containing factory prompt files
PROMPTS_DIR = Path(__file__).parent / "prompts"


def get_prompt_path(prompt_name: str, project_dir: Path | None = None) -> Path:
    """
    Get the path to a prompt file, checking for project overrides first.

    Args:
        prompt_name: Name of the prompt file (without .md extension)
        project_dir: Optional project directory to check for overrides

    Returns:
        Path to the prompt file (project override if exists, otherwise factory)
    """
    # Check for project override
    if project_dir:
        override_path = project_dir / ".auto-claude" / "prompts" / f"{prompt_name}.md"
        if override_path.exists():
            return override_path

    # Fall back to factory prompt
    return PROMPTS_DIR / f"{prompt_name}.md"


def load_prompt(prompt_name: str, project_dir: Path | None = None) -> str:
    """
    Load a prompt file, checking for project overrides first.

    Args:
        prompt_name: Name of the prompt file (without .md extension)
        project_dir: Optional project directory to check for overrides

    Returns:
        The prompt content

    Raises:
        FileNotFoundError: If the prompt file doesn't exist
    """
    prompt_path = get_prompt_path(prompt_name, project_dir)

    if not prompt_path.exists():
        raise FileNotFoundError(
            f"Prompt not found at {prompt_path}\n"
            f"Make sure the auto-claude/prompts/{prompt_name}.md file exists."
        )

    return prompt_path.read_text()


def get_planner_prompt(spec_dir: Path, project_dir: Path | None = None) -> str:
    """
    Load the planner agent prompt with spec path injected.
    The planner creates subtask-based implementation plans.

    Args:
        spec_dir: Directory containing the spec.md file
        project_dir: Optional project directory to check for prompt overrides

    Returns:
        The planner prompt content with spec path
    """
    prompt = load_prompt("planner", project_dir)

    # Inject spec directory information at the beginning
    spec_context = f"""## SPEC LOCATION

Your spec file is located at: `{spec_dir}/spec.md`

Store all build artifacts in this spec directory:
- `{spec_dir}/implementation_plan.json` - Subtask-based implementation plan
- `{spec_dir}/build-progress.txt` - Progress notes
- `{spec_dir}/init.sh` - Environment setup script

The project root is the parent of auto-claude/. Implement code in the project root, not in the spec directory.

---

"""
    return spec_context + prompt


def get_coding_prompt(spec_dir: Path, project_dir: Path | None = None) -> str:
    """
    Load the coding agent prompt with spec path injected.

    Args:
        spec_dir: Directory containing the spec.md and implementation_plan.json
        project_dir: Optional project directory to check for prompt overrides

    Returns:
        The coding agent prompt content with spec path
    """
    prompt = load_prompt("coder", project_dir)

    spec_context = f"""## SPEC LOCATION

Your spec and progress files are located at:
- Spec: `{spec_dir}/spec.md`
- Implementation plan: `{spec_dir}/implementation_plan.json`
- Progress notes: `{spec_dir}/build-progress.txt`
- Recovery context: `{spec_dir}/memory/attempt_history.json`

The project root is the parent of auto-claude/. All code goes in the project root, not in the spec directory.

---

"""

    # Check for recovery context (stuck subtasks, retry hints)
    recovery_context = _get_recovery_context(spec_dir)
    if recovery_context:
        spec_context += recovery_context

    # Check for human input file
    human_input_file = spec_dir / "HUMAN_INPUT.md"
    if human_input_file.exists():
        human_input = human_input_file.read_text().strip()
        if human_input:
            spec_context += f"""## HUMAN INPUT (READ THIS FIRST!)

The human has left you instructions. READ AND FOLLOW THESE CAREFULLY:

{human_input}

After addressing this input, you may delete or clear the HUMAN_INPUT.md file.

---

"""

    return spec_context + prompt


def _get_recovery_context(spec_dir: Path) -> str:
    """
    Get recovery context if there are failed attempts or stuck subtasks.

    Args:
        spec_dir: Spec directory containing memory/

    Returns:
        Recovery context string or empty string
    """
    import json

    attempt_history_file = spec_dir / "memory" / "attempt_history.json"

    if not attempt_history_file.exists():
        return ""

    try:
        with open(attempt_history_file) as f:
            history = json.load(f)

        # Check for stuck subtasks
        stuck_subtasks = history.get("stuck_subtasks", [])
        if stuck_subtasks:
            context = """## ⚠️ RECOVERY ALERT - STUCK SUBTASKS DETECTED

Some subtasks have been attempted multiple times without success. These subtasks need:
- A COMPLETELY DIFFERENT approach
- Possibly simpler implementation
- Or escalation to human if infeasible

Stuck subtasks:
"""
            for stuck in stuck_subtasks:
                context += f"- {stuck['subtask_id']}: {stuck['reason']} ({stuck['attempt_count']} attempts)\n"

            context += "\nBefore working on any subtask, check memory/attempt_history.json for previous attempts!\n\n---\n\n"
            return context

        # Check for subtasks with multiple attempts
        subtasks_with_retries = []
        for subtask_id, subtask_data in history.get("subtasks", {}).items():
            attempts = subtask_data.get("attempts", [])
            if len(attempts) > 1 and subtask_data.get("status") != "completed":
                subtasks_with_retries.append((subtask_id, len(attempts)))

        if subtasks_with_retries:
            context = """## ⚠️ RECOVERY CONTEXT - RETRY AWARENESS

Some subtasks have been attempted before. When working on these:
1. READ memory/attempt_history.json for the specific subtask
2. See what approaches were tried
3. Use a DIFFERENT approach

Subtasks with previous attempts:
"""
            for subtask_id, attempt_count in subtasks_with_retries:
                context += f"- {subtask_id}: {attempt_count} attempts\n"

            context += "\n---\n\n"
            return context

        return ""

    except (OSError, json.JSONDecodeError):
        return ""


def get_followup_planner_prompt(spec_dir: Path, project_dir: Path | None = None) -> str:
    """
    Load the follow-up planner agent prompt with spec path and key files injected.
    The follow-up planner adds new subtasks to an existing completed implementation plan.

    Args:
        spec_dir: Directory containing the completed spec and implementation_plan.json
        project_dir: Optional project directory to check for prompt overrides

    Returns:
        The follow-up planner prompt content with paths injected
    """
    prompt = load_prompt("followup_planner", project_dir)

    # Inject spec directory information at the beginning
    spec_context = f"""## SPEC LOCATION (FOLLOW-UP MODE)

You are adding follow-up work to a **completed** spec.

**Key files in this spec directory:**
- Spec: `{spec_dir}/spec.md`
- Follow-up request: `{spec_dir}/FOLLOWUP_REQUEST.md` (READ THIS FIRST!)
- Implementation plan: `{spec_dir}/implementation_plan.json` (APPEND to this, don't replace)
- Progress notes: `{spec_dir}/build-progress.txt`
- Context: `{spec_dir}/context.json`
- Memory: `{spec_dir}/memory/`

**Important paths:**
- Spec directory: `{spec_dir}`
- Project root: Parent of auto-claude/ (where code should be implemented)

**Your task:**
1. Read `{spec_dir}/FOLLOWUP_REQUEST.md` to understand what to add
2. Read `{spec_dir}/implementation_plan.json` to see existing phases/subtasks
3. ADD new phase(s) with pending subtasks to the existing plan
4. PRESERVE all existing subtasks and their statuses

---

"""
    return spec_context + prompt


def is_first_run(spec_dir: Path) -> bool:
    """
    Check if this is the first run (no valid implementation plan with subtasks exists yet).

    The spec runner may create a skeleton implementation_plan.json with empty phases.
    This function checks for actual phases with subtasks, not just file existence.

    Args:
        spec_dir: Directory containing spec files

    Returns:
        True if implementation_plan.json doesn't exist or has no subtasks
    """
    plan_file = spec_dir / "implementation_plan.json"

    if not plan_file.exists():
        return True

    try:
        with open(plan_file) as f:
            plan = json.load(f)

        # Check if there are any phases with subtasks
        phases = plan.get("phases", [])
        if not phases:
            return True

        # Check if any phase has subtasks
        total_subtasks = sum(len(phase.get("subtasks", [])) for phase in phases)
        return total_subtasks == 0
    except (OSError, json.JSONDecodeError):
        # If we can't read the file, treat as first run
        return True
