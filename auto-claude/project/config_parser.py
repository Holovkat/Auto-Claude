"""
Config File Parser
==================

Utilities for reading and parsing project configuration files
(package.json, pyproject.toml, composer.json, etc.).
"""

import json
import sys
from pathlib import Path
from typing import Optional

# tomllib is only available in Python 3.11+, use tomli as fallback
if sys.version_info >= (3, 11):
    import tomllib
else:
    try:
        import tomli as tomllib
    except ImportError:
        tomllib = None  # type: ignore


class ConfigParser:
    """Parses project configuration files."""

    def __init__(self, project_dir: Path):
        """
        Initialize config parser.

        Args:
            project_dir: Root directory of the project
        """
        self.project_dir = Path(project_dir).resolve()

    def read_json(self, filename: str) -> Optional[dict]:
        """Read a JSON file from project root."""
        try:
            with open(self.project_dir / filename) as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return None

    def read_toml(self, filename: str) -> Optional[dict]:
        """Read a TOML file from project root."""
        if tomllib is None:
            return None
        try:
            with open(self.project_dir / filename, "rb") as f:
                return tomllib.load(f)
        except (FileNotFoundError, Exception):
            return None

    def read_text(self, filename: str) -> Optional[str]:
        """Read a text file from project root."""
        try:
            with open(self.project_dir / filename) as f:
                return f.read()
        except (OSError, FileNotFoundError):
            return None

    def file_exists(self, *paths: str) -> bool:
        """Check if any of the given files/patterns exist."""
        for p in paths:
            # Handle glob patterns
            if "*" in p:
                if list(self.project_dir.glob(p)):
                    return True
            else:
                if (self.project_dir / p).exists():
                    return True
        return False

    def glob_files(self, pattern: str) -> list[Path]:
        """Find files matching a pattern."""
        return list(self.project_dir.glob(pattern))
