"""
Built-in Tools
==============

Python implementations of the core agent tools: Read, Write, Edit, Glob, Grep.
Compatible with direct LLM integrations (e.g., Gemini API).
"""

import os
import re
import fnmatch
import subprocess
from pathlib import Path
from typing import Any, Dict, List, Optional, Union


def read_file(file_path: Union[str, Path], start_line: Optional[int] = None, end_line: Optional[int] = None) -> str:
    """Read a file or a specific line range."""
    path = Path(file_path)
    if not path.exists():
        return f"Error: File not found: {file_path}"
    
    try:
        with open(path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            
        if start_line is not None or end_line is not None:
            start = (start_line - 1) if start_line else 0
            end = end_line if end_line else len(lines)
            return "".join(lines[start:end])
        
        return "".join(lines)
    except Exception as e:
        return f"Error reading file: {e}"


def write_file(file_path: Union[str, Path], content: str) -> str:
    """Create or overwrite a file."""
    path = Path(file_path)
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        return f"Successfully wrote to {file_path}"
    except Exception as e:
        return f"Error writing file: {e}"


def edit_file(file_path: Union[str, Path], target_content: str, replacement_content: str) -> str:
    """Simple find and replace edit."""
    path = Path(file_path)
    if not path.exists():
        return f"Error: File not found: {file_path}"
    
    try:
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        if target_content not in content:
            return f"Error: Target content not found in {file_path}"
            
        new_content = content.replace(target_content, replacement_content)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_content)
            
        return f"Successfully edited {file_path}"
    except Exception as e:
        return f"Error editing file: {e}"


def glob_files(pattern: str, root_dir: Union[str, Path] = ".") -> List[str]:
    """Search for files matching a pattern."""
    root = Path(root_dir)
    matches = []
    for p in root.rglob(pattern):
        if p.is_file():
            matches.append(str(p.relative_to(root)))
    return matches


def grep_files(query: str, pattern: str = "*", root_dir: Union[str, Path] = ".") -> str:
    """Search for a string in files matching a pattern."""
    root = Path(root_dir)
    results = []
    
    # Use re.escape for literal search, or pass as is for regex
    regex = re.compile(query, re.IGNORECASE)
    
    for p in root.rglob(pattern):
        if p.is_file():
            try:
                with open(p, 'r', encoding='utf-8') as f:
                    for i, line in enumerate(f, 1):
                        if regex.search(line):
                            results.append(f"{p.relative_to(root)}:{i}: {line.strip()}")
            except (UnicodeDecodeError, PermissionError):
                continue
                
    return "\n".join(results) if results else "No matches found."


def execute_bash(command: str, cwd: Optional[str] = None) -> str:
    """Execute a bash command with security validation."""
    from security.hooks import validate_command
    
    # 1. Validate security
    project_dir = Path(cwd) if cwd else Path.cwd()
    is_allowed, reason = validate_command(command, project_dir=project_dir)
    
    if not is_allowed:
        return f"Error: Command blocked by security policy: {reason}"
    
    # 2. Execute command
    try:
        result = subprocess.run(
            command,
            shell=True,
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=300 # 5 minute timeout
        )
        
        output = result.stdout
        if result.stderr:
            output += f"\nStderr:\n{result.stderr}"
            
        return output if output else "[Command executed with no output]"
    except subprocess.TimeoutExpired:
        return f"Error: Command timed out after 300 seconds."
    except Exception as e:
        return f"Error executing command: {e}"
