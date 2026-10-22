"""Pydantic schemas for the AI Financial Assistant."""
from typing import Optional, Any, List
from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    """A single chat message in the conversation thread."""
    role: str = Field(..., pattern="^(user|assistant|system|tool)$")
    content: str = Field(default="")


class ChatRequest(BaseModel):
    """Incoming request to the AI assistant."""
    message: str = Field(..., min_length=1, description="User's query or prompt")
    history: List[ChatMessage] = Field(default_factory=list, description="Recent conversation history")


class ToolExecution(BaseModel):
    """Metadata regarding a deterministic tool invoked during the interaction."""
    tool_name: str
    arguments: dict[str, Any] = Field(default_factory=dict)
    summary: Optional[str] = None


class ChatResponse(BaseModel):
    """Response returned by the AI assistant."""
    reply: str
    tools_used: List[ToolExecution] = Field(default_factory=list)
    suggestions: List[str] = Field(default_factory=list)


class SuggestionItem(BaseModel):
    """Pre-built prompt chip for the frontend."""
    id: str
    label: str
    prompt: str
    category: str
