"""
KBA Memory Client
=================

Client for interacting with the kba-memory server to provide
project-specific knowledge context to AI agents.
"""

import json
import os
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

KBA_API_URL = os.environ.get("KBA_API_URL", "http://localhost:3002")


def _api_call(endpoint: str, method: str = "GET", data: dict | None = None) -> dict:
    """Make a synchronous API call to kba-memory server."""
    url = f"{KBA_API_URL}{endpoint}"
    headers = {"Content-Type": "application/json"}
    
    body = json.dumps(data).encode() if data else None
    req = Request(url, data=body, headers=headers, method=method)
    
    try:
        with urlopen(req, timeout=10) as response:
            return json.loads(response.read().decode())
    except (URLError, HTTPError) as e:
        return {"success": False, "error": str(e)}
    except Exception as e:
        return {"success": False, "error": str(e)}


def get_or_create_collection(project_name: str) -> str | None:
    """Get collection ID for a project, creating it if it doesn't exist."""
    # Search for existing collection
    result = _api_call("/api/collections")
    
    if isinstance(result, list):
        # API returns array directly
        for col in result:
            if col.get("name", "").lower() == project_name.lower():
                return col.get("id")
    elif result.get("success") and result.get("data"):
        # API returns wrapped response
        collections = result["data"]
        for col in collections:
            if col.get("name", "").lower() == project_name.lower():
                return col.get("id")
    
    # Create new collection
    create_result = _api_call("/api/collections", method="POST", data={
        "name": project_name,
        "description": f"Knowledge base for project: {project_name}"
    })
    
    if isinstance(create_result, dict):
        # Check for direct ID or wrapped response
        if create_result.get("id"):
            return create_result.get("id")
        if create_result.get("success") and create_result.get("data"):
            return create_result["data"].get("id")
    
    return None


def search_project_knowledge(project_name: str, query: str, limit: int = 5) -> list[dict[str, Any]]:
    """Search for relevant notes in a project's collection."""
    collection_id = get_or_create_collection(project_name)
    if not collection_id:
        return []
    
    # Try semantic search first
    from urllib.parse import quote
    endpoint = f"/api/notes/search?query={quote(query)}&collectionId={collection_id}&limit={limit}"
    result = _api_call(endpoint)
    
    if isinstance(result, list) and len(result) > 0:
        return result
    elif isinstance(result, dict) and result.get("data"):
        return result["data"]
    
    # Fallback: list all notes in collection (basic filtering)
    list_endpoint = f"/api/notes?collectionId={collection_id}&limit={limit}"
    list_result = _api_call(list_endpoint)
    
    if isinstance(list_result, list):
        # Simple keyword filter on title/content
        query_lower = query.lower()
        filtered = [
            note for note in list_result
            if query_lower in note.get("title", "").lower()
            or query_lower in note.get("content", "").lower()
        ]
        return filtered[:limit] if filtered else list_result[:limit]
    
    return []


def add_project_note(project_name: str, title: str, content: str, tags: list[str] | None = None) -> bool:
    """Add a note to a project's collection."""
    collection_id = get_or_create_collection(project_name)
    if not collection_id:
        return False
    
    result = _api_call("/api/notes", method="POST", data={
        "collectionId": collection_id,
        "title": title,
        "content": content,
        "tags": tags or []
    })
    
    # Check for success in various response formats
    if isinstance(result, dict):
        if result.get("id"):
            return True
        if result.get("success"):
            return True
    
    return False


def format_context_for_prompt(notes: list[dict[str, Any]], project_name: str) -> str:
    """Format retrieved notes as context to prepend to prompts."""
    if not notes:
        return ""
    
    lines = [
        f"[Project Knowledge Base: {project_name}]",
        f"Found {len(notes)} relevant notes from previous sessions:",
        ""
    ]
    
    for i, note in enumerate(notes, 1):
        title = note.get("title", "Untitled")
        content = note.get("content", "")
        # Truncate long content
        if len(content) > 500:
            content = content[:500] + "..."
        lines.append(f"### {i}. {title}")
        lines.append(content)
        lines.append("")
    
    lines.append("[End Project Knowledge Base]")
    lines.append("")
    
    return "\n".join(lines)


def extract_insights_from_output(output: str) -> list[dict[str, str]]:
    """Extract notable insights from agent output for storage."""
    insights = []
    
    # Look for patterns that indicate learnings
    patterns = [
        ("Important:", "important"),
        ("Note:", "note"),
        ("I learned", "learning"),
        ("Key insight:", "insight"),
        ("Remember:", "reminder"),
        ("Gotcha:", "gotcha"),
        ("Pattern:", "pattern"),
    ]
    
    lines = output.split("\n")
    for i, line in enumerate(lines):
        for pattern, tag in patterns:
            if pattern.lower() in line.lower():
                # Capture this line and next few lines as context
                content = "\n".join(lines[i:i+3])
                insights.append({
                    "title": f"Auto-captured: {pattern.rstrip(':')}",
                    "content": content,
                    "tags": [tag, "auto-captured"]
                })
                break
    
    return insights
