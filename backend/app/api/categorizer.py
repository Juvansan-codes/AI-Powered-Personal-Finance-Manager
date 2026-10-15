"""Categorizer API route."""
from fastapi import APIRouter
from pydantic import BaseModel, Field
from app.ai.categorizer import categorize_transaction

router = APIRouter()


class CategorizeRequest(BaseModel):
    description: str = Field(..., min_length=1)
    transaction_type: str = Field(default="expense", pattern="^(income|expense)$")


class CategorizeResponse(BaseModel):
    category: str
    confidence: str
    method: str
    is_suggestion: bool


@router.post("/", response_model=CategorizeResponse)
def categorize(req: CategorizeRequest):
    """Suggest a category for a transaction description."""
    result = categorize_transaction(req.description, req.transaction_type)
    return CategorizeResponse(**result)
