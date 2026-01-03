"""
Pipeline Configuration Reader
==============================

Reads pipeline configuration from .auto-claude/config.json
"""

import json
from pathlib import Path
from typing import TypedDict


class QASettings(TypedDict):
    maxIterations: int
    simpleTaskMaxIterations: int


class ComplexitySettings(TypedDict):
    mode: str  # 'auto' | 'heuristics' | 'simple' | 'standard' | 'complex'
    useAiAssessment: bool
    aiProvider: str  # 'droid' | 'claude' | 'openai' | 'gemini' | 'ollama'


class PhaseSettings(TypedDict):
    skipResearch: bool
    skipSelfCritique: bool
    skipHistoricalContext: bool


class ApprovalSettings(TypedDict):
    autoApproveSpecs: bool


class PipelineConfig(TypedDict):
    qa: QASettings
    complexity: ComplexitySettings
    phases: PhaseSettings
    approval: ApprovalSettings


# Default configuration values
DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
    "qa": {
        "maxIterations": 10,
        "simpleTaskMaxIterations": 3,
    },
    "complexity": {
        "mode": "heuristics",
        "useAiAssessment": False,
        "aiProvider": "droid",
    },
    "phases": {
        "skipResearch": True,
        "skipSelfCritique": True,
        "skipHistoricalContext": True,
    },
    "approval": {
        "autoApproveSpecs": True,
    },
}


def get_pipeline_config(project_dir: Path) -> PipelineConfig:
    """
    Load pipeline configuration from .auto-claude/config.json.

    Falls back to defaults if file doesn't exist or is invalid.

    Args:
        project_dir: Project root directory

    Returns:
        PipelineConfig with merged values
    """
    config_path = project_dir / ".auto-claude" / "config.json"

    if not config_path.exists():
        return DEFAULT_PIPELINE_CONFIG.copy()

    try:
        with open(config_path) as f:
            config = json.load(f)

        pipeline = config.get("pipeline", {})

        # Merge with defaults
        return {
            "qa": {
                **DEFAULT_PIPELINE_CONFIG["qa"],
                **pipeline.get("qa", {}),
            },
            "complexity": {
                **DEFAULT_PIPELINE_CONFIG["complexity"],
                **pipeline.get("complexity", {}),
            },
            "phases": {
                **DEFAULT_PIPELINE_CONFIG["phases"],
                **pipeline.get("phases", {}),
            },
            "approval": {
                **DEFAULT_PIPELINE_CONFIG["approval"],
                **pipeline.get("approval", {}),
            },
        }
    except (json.JSONDecodeError, OSError) as e:
        print(f"Warning: Failed to load pipeline config: {e}")
        return DEFAULT_PIPELINE_CONFIG.copy()


def get_max_qa_iterations(project_dir: Path, is_simple_task: bool = False) -> int:
    """
    Get the maximum QA iterations for a project.

    Args:
        project_dir: Project root directory
        is_simple_task: Whether this is a simple task

    Returns:
        Maximum number of QA iterations
    """
    config = get_pipeline_config(project_dir)

    if is_simple_task:
        return config["qa"]["simpleTaskMaxIterations"]
    return config["qa"]["maxIterations"]


def get_complexity_mode(project_dir: Path) -> str:
    """
    Get the complexity detection mode.

    Args:
        project_dir: Project root directory

    Returns:
        Complexity mode string
    """
    config = get_pipeline_config(project_dir)
    return config["complexity"]["mode"]


def should_use_ai_assessment(project_dir: Path) -> bool:
    """
    Check if AI assessment should be used for complexity.

    Args:
        project_dir: Project root directory

    Returns:
        True if AI assessment should be used
    """
    config = get_pipeline_config(project_dir)
    return config["complexity"]["useAiAssessment"]


def get_ai_provider(project_dir: Path) -> str:
    """
    Get the AI provider for complexity assessment.

    Args:
        project_dir: Project root directory

    Returns:
        AI provider string ('claude', 'openai', 'gemini', 'ollama')
    """
    config = get_pipeline_config(project_dir)
    return config["complexity"].get("aiProvider", "claude")


def should_skip_research(project_dir: Path) -> bool:
    """Check if research phase should be skipped."""
    config = get_pipeline_config(project_dir)
    return config["phases"]["skipResearch"]


def should_skip_self_critique(project_dir: Path) -> bool:
    """Check if self-critique phase should be skipped."""
    config = get_pipeline_config(project_dir)
    return config["phases"]["skipSelfCritique"]


def should_skip_historical_context(project_dir: Path) -> bool:
    """Check if historical context phase should be skipped."""
    config = get_pipeline_config(project_dir)
    return config["phases"]["skipHistoricalContext"]


def should_auto_approve_specs(project_dir: Path) -> bool:
    """Check if specs should be auto-approved."""
    config = get_pipeline_config(project_dir)
    return config["approval"]["autoApproveSpecs"]
