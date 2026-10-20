"""Categorizer API route — ML-powered with rule-based fallback."""
from fastapi import APIRouter
from pydantic import BaseModel, Field
from app.services.ml_categorizer import categorize_with_ml, get_model_info

router = APIRouter()


class CategorizeRequest(BaseModel):
    description: str = Field(..., min_length=1)
    transaction_type: str = Field(default="expense", pattern="^(income|expense)$")


class CategorizeResponse(BaseModel):
    category: str
    confidence: str | float
    method: str
    is_suggestion: bool
    requires_review: bool = False


@router.post("/", response_model=CategorizeResponse)
def categorize(req: CategorizeRequest):
    """Suggest a category for a transaction description using ML or rule-based methods."""
    result = categorize_with_ml(req.description, req.transaction_type)
    return CategorizeResponse(**result)


@router.get("/model-info")
def model_info():
    """Return information about the loaded ML model (for diagnostics)."""
    return get_model_info()
