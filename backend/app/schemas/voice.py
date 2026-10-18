"""Pydantic schemas for voice transcription and transaction extraction."""
from typing import Optional
from pydantic import BaseModel, Field


class TranscriptionResponse(BaseModel):
    """Response containing transcribed audio text."""
    text: str
    filename: Optional[str] = None


class TransactionDraft(BaseModel):
    """Structured transaction data extracted from voice input."""
    description: Optional[str] = None
    amount: Optional[float] = None
    type: Optional[str] = Field(None, pattern="^(income|expense)$")
    category: Optional[str] = None
    date: Optional[str] = None  # ISO date string YYYY-MM-DD
    confidence: Optional[str] = "medium"


class VoiceExtractRequest(BaseModel):
    """Request payload for extracting structured transaction data from text."""
    text: str = Field(..., min_length=1, description="Transcribed voice text")
    current_date: Optional[str] = Field(
        None, description="Client current date in YYYY-MM-DD format for relative date resolution"
    )


class VoiceExtractResponse(BaseModel):
    """Response returned to client containing extracted draft and completion status."""
    is_complete: bool
    missing_fields: list[str] = Field(default_factory=list)
    clarification_needed: Optional[str] = None
    draft: Optional[TransactionDraft] = None
    raw_text: str
