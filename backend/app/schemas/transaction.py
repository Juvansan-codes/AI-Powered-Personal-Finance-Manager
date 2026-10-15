"""Pydantic schemas for transactions."""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import date


class TransactionCreate(BaseModel):
    description: str = Field(..., min_length=1, max_length=200)
    amount: float = Field(..., gt=0)
    type: str = Field(..., pattern="^(income|expense)$")
    category: str = Field(..., min_length=1, max_length=50)
    date: str  # ISO date string YYYY-MM-DD


class TransactionResponse(BaseModel):
    id: str
    description: str
    amount: float
    type: str
    category: str
    date: str
    created_at: str
    is_sample: bool


class TransactionUpdate(BaseModel):
    description: Optional[str] = None
    amount: Optional[float] = Field(None, gt=0)
    type: Optional[str] = Field(None, pattern="^(income|expense)$")
    category: Optional[str] = None
    date: Optional[str] = None
