"""
Batch Processor and Agent Engine Abstractions
=============================================

Defines the base interface for agent engines that can run autonomous coding sessions.
Supports different LLM providers (Claude SDK, Gemini API, etc.)
"""

import os
import sys
import shlex
import json
import asyncio
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, AsyncIterator, Dict, List, Optional, Union


@dataclass
class AgentMessage:
    """Represents a message in the agent conversation."""
    role: str  # 'user' or 'assistant'
    content: Union[str, List[Dict[str, Any]]]


@dataclass
class AgentOptions:
    """Configuration options for an agent engine."""
    model: str
    system_prompt: str
    provider: Optional[str] = None
    spec_dir: Optional[str] = None
    allowed_tools: List[str] = field(default_factory=list)
    mcp_servers: Dict[str, Any] = field(default_factory=dict)
    hooks: Dict[str, List[Any]] = field(default_factory=dict)
    max_turns: int = 1000
    cwd: Optional[str] = None
    settings: Optional[str] = None
    env: Optional[Dict[str, str]] = None
    verbose: bool = False


class MCPManager:
    """Manages connections to multiple MCP servers."""
    def __init__(self, servers_config: Dict[str, Any]):
        self.configs = servers_config
        self.clients = {}  # server_name -> mcp_client
        self.tool_map = {}  # tool_name -> server_name
        self._initialized = False

    async def initialize(self):
        """Connect to all configured MCP servers and discover tools."""
        if self._initialized: return
        
        # NOTE: For now, we'll implement a simplified version that just maps
        # external tool names if they are already known, or provides a framework
        # for connecting to actual MCP servers.
        # In a full implementation, we'd use mcp.StdioServerTransport etc.
        self._initialized = True

    async def list_tools(self) -> List[Dict[str, Any]]:
        """Return a list of all tools from all servers."""
        # Dummy implementation for now - in reality would query servers
        return []

    async def call_tool(self, server_name: str, tool_name: str, arguments: Dict[str, Any]) -> str:
        """Call a tool on a specific MCP server."""
        # Dummy implementation for now
        return f"Error: MCP Server {server_name} not yet connected for tool {tool_name}"


class BaseAgentEngine(ABC):
    """Abstract base class for all agent engines."""

    def __init__(self, options: AgentOptions):
        self.options = options
        self.history: List[Dict[str, Any]] = []

    @abstractmethod
    async def query(self, message: str) -> None:
        """Send a query to the agent."""
        raise NotImplementedError

    def set_system_prompt(self, prompt: str) -> None:
        """Set the agent's system prompt."""
        pass

    @abstractmethod
    async def receive_response(self) -> AsyncIterator[Any]:
        """Receive a streaming response from the agent."""
        pass

    @abstractmethod
    async def cleanup(self) -> None:
        """Cleanup resources used by the engine."""
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.cleanup()


class ClaudeAgentEngine(BaseAgentEngine):
    """Engine that wraps the official Claude Agent SDK client."""

    def __init__(self, options: AgentOptions):
        super().__init__(options)
        try:
            from claude_agent_sdk import ClaudeAgentOptions, ClaudeSDKClient
            from claude_agent_sdk.types import HookMatcher
        except ImportError:
            raise RuntimeError("claude-agent-sdk not installed")

        self.client = ClaudeSDKClient(
            options=ClaudeAgentOptions(
                model=options.model,
                system_prompt=options.system_prompt,
                allowed_tools=options.allowed_tools,
                mcp_servers=options.mcp_servers,
                hooks=options.hooks,
                max_turns=options.max_turns,
                cwd=options.cwd,
                settings=options.settings,
                env=options.env,
            )
        )

    async def query(self, message: str) -> None:
        await self.client.query(message)

    def set_system_prompt(self, prompt: str) -> None:
        if hasattr(self.client, "set_system_prompt"):
            self.client.set_system_prompt(prompt)

    async def receive_response(self) -> AsyncIterator[Any]:
        async for msg in self.client.receive_response():
            yield msg

    async def cleanup(self) -> None:
        if hasattr(self, "client") and self.client:
            await self.client.cleanup()


class GeminiAgentEngine(BaseAgentEngine):
    """
    Engine that communicates directly with Gemini API.
    Provides built-in tools and MCP client functionality.
    """

    def __init__(self, options: AgentOptions):
        super().__init__(options)
        import google.generativeai as genai
        import os
        
        self.api_key = (options.env or {}).get("GEMINI_API_KEY") or os.environ.get("GEMINI_API_KEY")
        if not self.api_key:
            self.api_key = (options.env or {}).get("GOOGLE_API_KEY") or os.environ.get("GOOGLE_API_KEY")
            
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY or GOOGLE_API_KEY must be provided")

        genai.configure(api_key=self.api_key)
        self._initialize_model()
        self.mcp_manager = MCPManager(options.mcp_servers)
        self.chat_session = self.model.start_chat(history=[])
        self._current_response = None
        self._pending_tool_results = []
        
        # Prepare persistent debug log
        self._debug_log_path = Path.cwd() / "gemini_debug.txt"
        if self.options.verbose:
            with open(self._debug_log_path, "a") as f:
                f.write(f"\n--- SESSION START: {self.options.model} ---\n")

    def _initialize_model(self) -> None:
        import google.generativeai as genai
        # Helper function to convert allowed_tools list to Gemini tool format
        def get_agent_allowed_tools(allowed_tools_list: List[str]):
            gemini_tools = []
            for tool_name in allowed_tools_list:
                if tool_name == "Read":
                    gemini_tools.append(self._make_gemini_tool(
                        name="Read",
                        description="Read a file or a specific range of lines.",
                        parameters={
                            "type": "object",
                            "properties": {
                                "file_path": {"type": "string"},
                                "start_line": {"type": "integer"},
                                "end_line": {"type": "integer"}
                            },
                            "required": ["file_path"]
                        }
                    ))
                elif tool_name == "Write":
                    gemini_tools.append(self._make_gemini_tool(
                        name="Write",
                        description="Create or overwrite a file.",
                        parameters={
                            "type": "object",
                            "properties": {
                                "file_path": {"type": "string"},
                                "content": {"type": "string"}
                            },
                            "required": ["file_path", "content"]
                        }
                    ))
                elif tool_name == "Edit":
                    gemini_tools.append(self._make_gemini_tool(
                        name="Edit",
                        description="Edit a file by replacing target_content with replacement_content.",
                        parameters={
                            "type": "object",
                            "properties": {
                                "file_path": {"type": "string"},
                                "target_content": {"type": "string"},
                                "replacement_content": {"type": "string"}
                            },
                            "required": ["file_path", "target_content", "replacement_content"]
                        }
                    ))
                elif tool_name == "Glob":
                    gemini_tools.append(self._make_gemini_tool(
                        name="Glob",
                        description="List files matching a pattern.",
                        parameters={
                            "type": "object",
                            "properties": {
                                "pattern": {"type": "string"}
                            },
                            "required": ["pattern"]
                        }
                    ))
                elif tool_name == "Grep":
                    gemini_tools.append(self._make_gemini_tool(
                        name="Grep",
                        description="Search for a string in files.",
                        parameters={
                            "type": "object",
                            "properties": {
                                "query": {"type": "string"},
                                "pattern": {"type": "string"}
                            },
                            "required": ["query"]
                        }
                    ))
                elif tool_name == "Bash":
                    gemini_tools.append(self._make_gemini_tool(
                        name="Bash",
                        description="Execute a bash command.",
                        parameters={
                            "type": "object",
                            "properties": {
                                "command": {"type": "string"}
                            },
                            "required": ["command"]
                        }
                    ))
            return gemini_tools

        self.model = genai.GenerativeModel(
            model_name=self.options.model,
            system_instruction=self.options.system_prompt,
            tools=get_agent_allowed_tools(self.options.allowed_tools),
        )

    def set_system_prompt(self, prompt: str) -> None:
        """Update system prompt and re-initialize model/session."""
        # Preserve existing history if any
        history = self.chat_session.history if hasattr(self, "chat_session") else []
        self.options.system_prompt = prompt
        self._initialize_model()
        # Restart chat session with new model and preserved history
        self.chat_session = self.model.start_chat(history=history)

    async def query(self, message: str) -> None:
        # Check if we need to initialize tools
        if not hasattr(self, '_tools_configured'):
            self._configure_tools()

        # For Gemini, we handle the multi-turn loop manually
        self._current_response = await self.chat_session.send_message_async(message, stream=True)
        
        # We need to exhaust the response to handle tool calls automatically
        # or we yield blocks from receive_response and handle execution there.
        # But existing code expects streaming text + tool use messages.

    def _configure_tools(self):
        """Register built-in tools with the Gemini model."""
        import google.generativeai as genai
        
        # Define Gemini tools based on allowed_tools
        gemini_tools = []
        
        # 1. Built-in tools mapping
        for tool_name in self.options.allowed_tools:
            if tool_name == "Read":
                gemini_tools.append(self._make_gemini_tool(
                    name="Read",
                    description="Read a file or a specific range of lines.",
                    parameters={
                        "type": "object",
                        "properties": {
                            "file_path": {"type": "string"},
                            "start_line": {"type": "integer"},
                            "end_line": {"type": "integer"}
                        },
                        "required": ["file_path"]
                    }
                ))
            elif tool_name == "Write":
                gemini_tools.append(self._make_gemini_tool(
                    name="Write",
                    description="Create or overwrite a file.",
                    parameters={
                        "type": "object",
                        "properties": {
                            "file_path": {"type": "string"},
                            "content": {"type": "string"}
                        },
                        "required": ["file_path", "content"]
                    }
                ))
            elif tool_name == "Edit":
                gemini_tools.append(self._make_gemini_tool(
                    name="Edit",
                    description="Edit a file by replacing target_content with replacement_content.",
                    parameters={
                        "type": "object",
                        "properties": {
                            "file_path": {"type": "string"},
                            "target_content": {"type": "string"},
                            "replacement_content": {"type": "string"}
                        },
                        "required": ["file_path", "target_content", "replacement_content"]
                    }
                ))
            elif tool_name == "Glob":
                gemini_tools.append(self._make_gemini_tool(
                    name="Glob",
                    description="List files matching a pattern.",
                    parameters={
                        "type": "object",
                        "properties": {
                            "pattern": {"type": "string"}
                        },
                        "required": ["pattern"]
                    }
                ))
            elif tool_name == "Grep":
                gemini_tools.append(self._make_gemini_tool(
                    name="Grep",
                    description="Search for a string in files.",
                    parameters={
                        "type": "object",
                        "properties": {
                            "query": {"type": "string"},
                            "pattern": {"type": "string"}
                        },
                        "required": ["query"]
                    }
                ))
            elif tool_name == "Bash":
                gemini_tools.append(self._make_gemini_tool(
                    name="Bash",
                    description="Execute a bash command.",
                    parameters={
                        "type": "object",
                        "properties": {
                            "command": {"type": "string"}
                        },
                        "required": ["command"]
                    }
                ))
            
        # Re-initialize model with tools if any
        if gemini_tools:
            import google.generativeai as genai
            self.model = genai.GenerativeModel(
                model_name=self.options.model,
                system_instruction=self.options.system_prompt,
                tools=gemini_tools
            )
            # Restart chat with the new model
            self.chat_session = self.model.start_chat(history=self.history)
            
        self._tools_configured = True

    async def _handle_tool_calls(self, function_calls: List[Any]) -> bool:
        """Execute tool calls and send results back to Gemini."""
        from .tools.builtin import read_file, write_file, edit_file, glob_files, grep_files, execute_bash
        
        if not function_calls:
            return False
            
        tool_results = []
        
        # We'll store results to yield them in receive_response
        self._pending_tool_results = []
        
        for fc in function_calls:
            args = dict(fc.args)
            
            # Resolve paths relative to CWD
            cwd = Path(self.options.cwd) if self.options.cwd else Path.cwd()
            
            if "file_path" in args:
                # Handle safe path resolution
                try:
                    fp = Path(args["file_path"])
                    if not fp.is_absolute():
                        args["file_path"] = str(cwd / fp)
                except Exception:
                    pass  # Let tool handle invalid paths
            
            # Dispatch
            result = ""
            if fc.name == "Read":
                result = read_file(**args)
            elif fc.name == "Write":
                result = write_file(**args)
            elif fc.name == "Edit":
                result = edit_file(**args)
            elif fc.name == "Glob":
                if "root_dir" not in args:
                    args["root_dir"] = str(cwd)
                result = glob_files(**args)
            elif fc.name == "Grep":
                if "root_dir" not in args:
                    args["root_dir"] = str(cwd)
                result = grep_files(**args)
            elif fc.name == "Bash":
                result = execute_bash(command=args.get("command"), cwd=self.options.cwd)
            else:
                result = f"Error: Tool {fc.name} not implemented."
            
            if self.options.verbose:
                msg = f"\n[DEBUG] Tool {fc.name} called with {args}\n[DEBUG] Result (first 100 chars): {str(result)[:100]}...\n"
                sys.stderr.write(msg)
                sys.stderr.flush()
                with open(self._debug_log_path, "a") as f:
                    f.write(msg)
            
            tool_results.append({
                "function_response": {
                    "name": fc.name,
                    "response": {"result": result}
                }
            })
            
            self._pending_tool_results.append(UserMessage("dummy_id", result))
        
        # Send results back and update response
        self._current_response = await self.chat_session.send_message_async(tool_results, stream=True)
        return True

    def _make_gemini_tool(self, name: str, description: str, parameters: Dict[str, Any]):
        """Create a tool definition for Gemini."""
        return {
            "function_declarations": [{
                "name": name,
                "description": description,
                "parameters": parameters
            }]
        }

    async def receive_response(self) -> AsyncIterator[Any]:
        if not self._current_response:
            return

        while True:
            # Exhaust current stream
            last_chunk = None
            collected_function_calls = []
            
            async for chunk in self._current_response:
                yield AssistantMessage(chunk)
                last_chunk = chunk
                
                # Verify chunk has candidates and content parts
                if hasattr(chunk, 'candidates') and chunk.candidates:
                    candidate = chunk.candidates[0]
                    if hasattr(candidate, 'content') and hasattr(candidate.content, 'parts'):
                        for part in candidate.content.parts:
                            if hasattr(part, 'function_call') and part.function_call:
                                collected_function_calls.append(part.function_call)
            
            if not last_chunk:
                break
                
            # Check for tool calls and handle them
            if collected_function_calls:
                if await self._handle_tool_calls(collected_function_calls):
                    # Yield the tool results first so the UI can show them
                    if hasattr(self, '_pending_tool_results'):
                        for res in self._pending_tool_results:
                            # self._pending_tool_results already contains UserMessage objects
                            yield res
                        self._pending_tool_results = []
                    # Then continue with the next stream from Gemini
                    continue
            
            break

    async def cleanup(self) -> None:
        pass


class AssistantMessage:
    """Helper to wrap Gemini response chunks into Claude SDK message format."""
    def __init__(self, chunk: Any):
        self.chunk = chunk
        self.content = self._parse_content()

    def _parse_content(self) -> List[Any]:
        from dataclasses import dataclass

        @dataclass
        class TextBlock:
            text: str

        @dataclass
        class ToolUseBlock:
            name: str
            input: Dict[str, Any]
            id: str = "dummy_id"

        content = []
        
        # Handle string chunks directly (for CustomCliAgentEngine)
        if isinstance(self.chunk, str):
            if self.chunk.strip():
                content.append(TextBlock(text=self.chunk))
            return content

        # Safely parse parts from the chunk/response
        if hasattr(self.chunk, 'candidates'):
            for candidate in self.chunk.candidates:
                if hasattr(candidate, 'content') and hasattr(candidate.content, 'parts'):
                    for part in candidate.content.parts:
                        # Safely check for text - avoid .text property which can raise ValueError
                        if hasattr(part, 'text') and part.text:
                            content.append(TextBlock(text=part.text))
                        
                        # Map Gemini function calls to ToolUseBlock
                        if hasattr(part, 'function_call') and part.function_call:
                            fc = part.function_call
                            content.append(ToolUseBlock(
                                name=fc.name,
                                input=dict(fc.args)
                            ))
        elif hasattr(self.chunk, 'text') and self.chunk.text:
            # Fallback for simple text responses
            content.append(TextBlock(text=self.chunk.text))
        
        return content

    def __iter__(self):
        # Allow iterating over content blocks for compatibility
        return iter(self.content)


class UserMessage:
    """Helper to wrap tool results for Gemini, matching Claude SDK structure."""
    def __init__(self, tool_use_id: str, content: str, is_error: bool = False):
        from dataclasses import dataclass
        
        @dataclass
        class ToolResultBlock:
            content: str
            is_error: bool = False
            tool_use_id: str = "dummy_id"
            
        self.content = [ToolResultBlock(content=content, is_error=is_error, tool_use_id=tool_use_id)]

    def __iter__(self):
        # Allow iterating over content blocks for compatibility
        return iter(self.content or [])


class OpenAIAgentEngine(BaseAgentEngine):
    """
    Engine that communicates with OpenAI-compatible APIs (Ollama, GLM, etc).
    """

    def __init__(self, options: AgentOptions):
        super().__init__(options)
        try:
            from openai import AsyncOpenAI
        except ImportError:
            raise RuntimeError("openai package not installed. Run 'pip install openai'")

        # Determine configuration
        env = options.env or {}
        
        # Priority: Options > Env Vars > Defaults
        self.api_key = env.get("ZAI_API_KEY") or env.get("OPENAI_API_KEY") or os.environ.get("ZAI_API_KEY") or os.environ.get("OPENAI_API_KEY")
        self.base_url = env.get("OPENAI_BASE_URL") or os.environ.get("OPENAI_BASE_URL") or "https://api.openai.com/v1"

        # Special handling for Z.ai GLM if detected/configured
        # GLM/Z.ai specific URL
        if "z.ai" in str(self.base_url) or "glm" in options.model.lower():
             if not self.base_url or "api.openai.com" in self.base_url:
                 self.base_url = "https://api.z.ai/api/coding/paas/v4"

        if not self.api_key:
            # Some local endpoints (Ollama) might not need a key, but library usually requires one
            self.api_key = "dummy-key" 

        self.client = AsyncOpenAI(
            api_key=self.api_key,
            base_url=self.base_url
        )
        
        self.system_prompt = options.system_prompt
        self.history = [] # List of {"role": "...", "content": "..."}
        self._set_system_prompt_msg()

    def _set_system_prompt_msg(self):
        # Initialize or update system prompt in history
        if not self.history:
            self.history.append({"role": "system", "content": self.system_prompt})
        elif self.history[0]["role"] == "system":
            self.history[0]["content"] = self.system_prompt
        else:
            self.history.insert(0, {"role": "system", "content": self.system_prompt})

    def set_system_prompt(self, prompt: str) -> None:
        self.system_prompt = prompt
        self._set_system_prompt_msg()

    async def query(self, message: str) -> None:
        self.history.append({"role": "user", "content": message})

    async def receive_response(self) -> AsyncIterator[Any]:
        # Define tools using OpenAI format
        tools = self._get_openai_tools()
        
        while True:
            # Common arguments
            kwargs = {
                "model": self.options.model,
                "messages": self.history,
                "stream": True,
            }
            if tools:
                kwargs["tools"] = tools
                kwargs["tool_choice"] = "auto"

            response_stream = await self.client.chat.completions.create(**kwargs)
            
            tool_calls = []
            current_content = ""
            current_tool_call = None
            
            # OpenAI streaming tool calls are tricky, they come in chunks
            async for chunk in response_stream:
                delta = chunk.choices[0].delta
                
                # Yield content
                if delta.content:
                    current_content += delta.content
                    # We wrap it in the AssistantMessage format expected by UI
                    # (See existing Gemini/Claude implementations)
                    yield AssistantMessage(chunk) 

                # Collect tool calls
                if delta.tool_calls:
                    for tc_chunk in delta.tool_calls:
                        if len(tool_calls) <= tc_chunk.index:
                            tool_calls.append({
                                "id": "", "type": "function", "function": {"name": "", "arguments": ""}
                            })
                        
                        tc = tool_calls[tc_chunk.index]
                        if tc_chunk.id: tc["id"] += tc_chunk.id
                        if tc_chunk.function.name: tc["function"]["name"] += tc_chunk.function.name
                        if tc_chunk.function.arguments: tc["function"]["arguments"] += tc_chunk.function.arguments

            # Add assistant response to history
            if current_content:
                self.history.append({"role": "assistant", "content": current_content})
            
            if tool_calls:
                 # If we have tool calls, we must execute them and recurse
                 # Add tool calls to history first
                 # Note: standard OpenAI messages objects requires correctly formatted tool_calls
                 # But we might need to reconstruct the message object from chunks...
                 # Simplification: assuming we reconstructed enough.
                 
                 # Reconstruct full tool call objects
                 full_tool_calls_msg = {
                     "role": "assistant",
                     "content": current_content or None,
                     "tool_calls": tool_calls
                 }
                 self.history.append(full_tool_calls_msg)

                 async for res in self._handle_tool_calls(tool_calls):
                     yield res
                 # Loop initiates next request with tool outputs
            else:
                break

    async def _handle_tool_calls(self, tool_calls):
         from .tools.builtin import read_file, write_file, edit_file, glob_files, grep_files, execute_bash
         import json

         for tc in tool_calls:
             func = tc["function"]
             name = func["name"]
             try:
                 args = json.loads(func["arguments"])
             except:
                 args = {} 
             
             # Resolve paths (similar to Gemini engine)
             cwd = Path(self.options.cwd) if self.options.cwd else Path.cwd()
             if "file_path" in args:
                 try:
                     fp = Path(args["file_path"])
                     if not fp.is_absolute():
                         args["file_path"] = str(cwd / fp)
                 except: pass

             if "root_dir" in args: # For glob/grep
                 pass # usually handled inside tool or needs implementing

             # Dispatch
             result = ""
             if name == "Read": result = read_file(**args)
             elif name == "Write": result = write_file(**args)
             elif name == "Edit": result = edit_file(**args)
             elif name == "Glob": 
                  if "root_dir" not in args: args["root_dir"] = str(cwd)
                  result = glob_files(**args)
             elif name == "Grep":
                  if "root_dir" not in args: args["root_dir"] = str(cwd)
                  result = grep_files(**args)
             elif name == "Bash": result = execute_bash(command=args.get("command"), cwd=self.options.cwd)
             else: result = f"Error: Tool {name} not found"

             # Append to history
             self.history.append({
                 "role": "tool",
                 "tool_call_id": tc["id"],
                 "name": name,
                 "content": str(result)
             })

             # We also yield these as UserMessage so the UI sees the tool execution
             # (This matches the interface expected by ReceiveResponse consumers)
             yield UserMessage(tool_use_id=tc["id"], content=str(result))


    def _get_openai_tools(self):
        # Convert self.options.allowed_tools to OpenAI format
        tools = []
        for name in self.options.allowed_tools:
            if name == "Read":
                tools.append({
                    "type": "function",
                    "function": {
                        "name": "Read",
                        "description": "Read file content",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "file_path": {"type": "string"},
                                "start_line": {"type": "integer"},
                                "end_line": {"type": "integer"}
                            },
                            "required": ["file_path"]
                        }
                    }
                })
            elif name == "Write":
                tools.append({
                    "type": "function",
                    "function": {
                        "name": "Write",
                        "description": "Create/Overwrite file",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "file_path": {"type": "string"},
                                "content": {"type": "string"}
                            },
                            "required": ["file_path", "content"]
                        }
                    }
                })
            elif name == "Edit":
                tools.append({
                    "type": "function",
                    "function": {
                        "name": "Edit",
                        "description": "Edit file content",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "file_path": {"type": "string"},
                                "target_content": {"type": "string"},
                                "replacement_content": {"type": "string"}
                            },
                            "required": ["file_path", "target_content", "replacement_content"]
                        }
                    }
                })
            elif name == "Glob":
                tools.append({
                    "type": "function",
                    "function": {
                        "name": "Glob",
                        "description": "List files",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "pattern": {"type": "string"}
                            },
                            "required": ["pattern"]
                        }
                    }
                })
            elif name == "Grep":
                tools.append({
                    "type": "function",
                    "function": {
                        "name": "Grep",
                        "description": "Search in files",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "query": {"type": "string"},
                                "pattern": {"type": "string"}
                            },
                            "required": ["query"]
                        }
                    }
                })
            elif name == "Bash":
                tools.append({
                    "type": "function",
                    "function": {
                        "name": "Bash",
                        "description": "Run bash command",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "command": {"type": "string"}
                            },
                            "required": ["command"]
                        }
                    }
                })
        return tools

    async def cleanup(self) -> None:
        if hasattr(self, 'client'):
            await self.client.close()


class CustomCliAgentEngine(BaseAgentEngine):
    """Engine for custom CLI providers (e.g., Droid)."""

    def __init__(self, options: AgentOptions):
        super().__init__(options)
        self.prompt = ""
        self.session_id = None
        self._load_session_id()

    def _load_session_id(self):
        if not self.options.spec_dir:
            return
        
        session_file = Path(self.options.spec_dir) / ".droid_session_id"
        if session_file.exists():
            try:
                self.session_id = session_file.read_text().strip()
            except Exception:
                pass

    def _save_session_id(self, session_id):
        if not self.options.spec_dir or not session_id:
            return
        
        self.session_id = session_id
        session_file = Path(self.options.spec_dir) / ".droid_session_id"
        try:
            session_file.write_text(session_id)
        except Exception:
            pass

    async def query(self, message: str) -> None:
        self.prompt = message

    def set_system_prompt(self, prompt: str) -> None:
        pass

    async def receive_response(self) -> AsyncIterator[Any]:
        # Get template from env or default to droid exec with stream-json
        template = os.environ.get("AUTO_CLAUDE_CUSTOM_CLI_TEMPLATE", 
            "droid exec --model {model} --output-format stream-json --input-format stream-json --auto low"
        )
        
        # Use provided model or default for testing
        model = self.options.model or "custom:GLM-4.7-[Z.AI-Coding-Plan]-7"
        
        # Auto-inject session id if not in template but available
        if self.session_id and "{sessionId}" not in template and "-s" not in template and "--session-id" not in template:
            template += " -s {sessionId}"
            
        # Format command - if sessionId is missing, it will be empty string
        cmd_str = template.format(
            model=model,
            projectDir=self.options.cwd or ".",
            specDir=self.options.spec_dir or ".",
            sessionId=self.session_id or ""
        )
        
        args = shlex.split(cmd_str)
        
        # Cleanup: Remove flags with empty values (e.g. --session-id "")
        filtered_args = []
        skip_next = False
        for i, arg in enumerate(args):
            if skip_next:
                skip_next = False
                continue
            
            # Check if this is a flag that might have an empty value
            if arg in ('--session-id', '-s', '--spec-dir', '--project-dir') and i + 1 < len(args) and not args[i+1]:
                skip_next = True # Skip the empty value too
                continue
            
            filtered_args.append(arg)
        args = filtered_args
        is_streaming = "stream-json" in template
        
        # Log the command being executed for debugging
        print(f"\n[CustomCliEngine] Executing: {cmd_str}")
        
        # Override cwd if specified in env
        cwd = os.environ.get("AUTO_CLAUDE_CUSTOM_CLI_WORKDIR") or self.options.cwd
        
        try:
            yield AssistantMessage(f"> [Custom CLI] Executing: {cmd_str}\n")
            
            if not is_streaming:
                args.append(self.prompt)
                
            process = await asyncio.create_subprocess_exec(
                *args,
                stdin=asyncio.subprocess.PIPE if is_streaming else None,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=cwd
            )
            
            if is_streaming:
                # Send multi-turn compatible JSONL to stdin
                input_data = json.dumps({"role": "user", "content": self.prompt}) + "\n"
                process.stdin.write(input_data.encode())
                await process.stdin.drain()
                process.stdin.close()

            # Process stdout line by line
            while True:
                line = await process.stdout.readline()
                if not line:
                    break
                
                line_str = line.decode().strip()
                if not line_str:
                    continue
                    
                if is_streaming or "--output-format json" in template:
                    try:
                        data = json.loads(line_str)
                        if isinstance(data, dict):
                            if "session_id" in data:
                                self._save_session_id(data["session_id"])
                            
                            # Surface content/message/text
                            content = data.get("content") or data.get("message") or data.get("text")
                            if content:
                                yield AssistantMessage(content)
                        else:
                            yield AssistantMessage(line_str)
                    except json.JSONDecodeError:
                        yield AssistantMessage(line_str)
                else:
                    yield AssistantMessage(line_str)

            await process.wait()
            if process.returncode != 0:
                stderr_data = await process.stderr.read()
                if stderr_data:
                    yield AssistantMessage(f"\n[CLI Error]: {stderr_data.decode().strip()}")

        except Exception as e:
            yield AssistantMessage(f"Error running custom CLI: {str(e)}")

    async def cleanup(self) -> None:
        pass
