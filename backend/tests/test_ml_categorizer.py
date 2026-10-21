"""
Tests for ML-powered Transaction Categorizer.

Verifies:
  - Model loading and metadata retrieval
  - ML inference and probability estimates
  - Taxonomy adherence (all predicted categories belong to valid taxonomy)
  - Income vs expense compatibility
  - Confidence threshold and requires_review flag
  - Fallback to rule-based categorizer when appropriate
  - API endpoint responses and backward compatibility
"""
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.ai.categorizer import CATEGORIES, EXPENSE_CATEGORIES, INCOME_CATEGORIES
from app.services.ml_categorizer import (
    load_ml_model,
    is_model_loaded,
    get_model_info,
    ml_predict,
    categorize_with_ml,
)

client = TestClient(app)


@pytest.fixture(autouse=True)
def ensure_model_loaded():
    """Ensure the model is loaded before running tests."""
    load_ml_model()


def test_model_loaded_and_info():
    """Test that the trained ML model is loaded and metadata is available."""
    assert is_model_loaded() is True
    info = get_model_info()
    assert info["loaded"] is True
    assert "model_version" in info
    assert "confidence_threshold" in info
    assert isinstance(info["categories"], list)
    assert len(info["categories"]) > 0


def test_ml_predict_basic():
    """Test ML prediction on clear transaction descriptions."""
    result = ml_predict("Uber cab ride to college", "expense")
    assert result is not None
    assert result["method"] == "ml"
    assert result["is_suggestion"] is True
    assert result["category"] in EXPENSE_CATEGORIES
    assert isinstance(result["confidence"], float)
    assert 0.0 <= result["confidence"] <= 1.0
    assert isinstance(result["requires_review"], bool)


def test_ml_predict_taxonomy_validity():
    """Verify that ML predictions always conform to the category taxonomy."""
    test_descriptions = [
        ("Zomato pizza lunch", "expense"),
        ("Monthly room rent", "expense"),
        ("Electricity bill payment", "expense"),
        ("Movie tickets Netflix subscription", "expense"),
        ("Salary credit from employer", "income"),
        ("Freelance project payment", "income"),
    ]

    for desc, txn_type in test_descriptions:
        result = ml_predict(desc, txn_type)
        if result is not None:
            assert result["category"] in CATEGORIES
            if txn_type == "income":
                assert result["category"] in INCOME_CATEGORIES
            else:
                assert result["category"] in EXPENSE_CATEGORIES


def test_categorize_with_ml_fallback():
    """Test that categorize_with_ml gracefully handles ambiguous descriptions."""
    result = categorize_with_ml("completely random gibberish zzzqqq123", "expense")
    assert "category" in result
    assert result["category"] in CATEGORIES
    assert result["is_suggestion"] is True
    assert "requires_review" in result


def test_categorize_api_endpoint():
    """Test POST /api/categorize/ endpoint with ML model."""
    response = client.post(
        "/api/categorize/",
        json={"description": "Swiggy dinner order", "transaction_type": "expense"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "category" in data
    assert data["category"] in CATEGORIES
    assert "confidence" in data
    assert data["method"] in ("ml", "rule_based")
    assert data["is_suggestion"] is True
    assert "requires_review" in data


def test_model_info_endpoint():
    """Test GET /api/categorize/model-info endpoint."""
    response = client.get("/api/categorize/model-info")
    assert response.status_code == 200
    data = response.json()
    assert data["loaded"] is True
    assert "model_version" in data
    assert "confidence_threshold" in data
