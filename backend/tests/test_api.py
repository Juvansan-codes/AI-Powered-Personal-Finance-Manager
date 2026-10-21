"""
Unit and integration tests for FinanceFlow API.
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.database import init_db
from app.db.seed import seed_if_empty
from app.ai.categorizer import categorize_transaction

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_database():
    """Ensure database tables exist and sample data is seeded before testing."""
    init_db()
    seed_if_empty()


def test_health_check():
    """Test health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "FinanceFlow API" in data["service"]


def test_get_transactions():
    """Test retrieving transactions."""
    response = client.get("/api/transactions/")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 0


def test_create_and_delete_transaction():
    """Test creating a transaction and then deleting it."""
    payload = {
        "description": "Semester Book Purchase",
        "amount": 850.0,
        "type": "expense",
        "category": "Education",
        "date": "2026-10-15",
    }
    response = client.post("/api/transactions/", json=payload)
    assert response.status_code == 201
    created = response.json()
    assert created["description"] == payload["description"]
    assert created["amount"] == 850.0
    assert created["type"] == "expense"
    assert created["category"] == "Education"
    assert "id" in created

    txn_id = created["id"]

    # Verify it exists in list
    list_res = client.get("/api/transactions/")
    assert any(t["id"] == txn_id for t in list_res.json())

    # Delete transaction
    del_res = client.delete(f"/api/transactions/{txn_id}")
    assert del_res.status_code == 204

    # Verify it is gone
    list_after = client.get("/api/transactions/")
    assert not any(t["id"] == txn_id for t in list_after.json())


def test_transaction_validation_errors():
    """Test server-side validation rules."""
    # Negative amount
    bad_payload = {
        "description": "Invalid Negative",
        "amount": -50.0,
        "type": "expense",
        "category": "Food",
        "date": "2026-10-15",
    }
    res = client.post("/api/transactions/", json=bad_payload)
    assert res.status_code == 422

    # Zero amount
    bad_payload["amount"] = 0.0
    res = client.post("/api/transactions/", json=bad_payload)
    assert res.status_code == 422

    # Invalid type
    bad_payload["amount"] = 100.0
    bad_payload["type"] = "investment_gamble"
    res = client.post("/api/transactions/", json=bad_payload)
    assert res.status_code == 422


def test_ai_categorizer_rules():
    """Test AI categorizer rule-based responses and confidence levels."""
    # High confidence food
    res_food = categorize_transaction("swiggy biryani dinner", "expense")
    assert res_food["category"] == "Food"
    assert res_food["confidence"] == "high"
    assert res_food["method"] == "rule_based"

    # Transportation
    res_transport = categorize_transaction("uber cab to airport", "expense")
    assert res_transport["category"] == "Transportation"
    assert res_transport["confidence"] in ("high", "medium")

    # Shopping
    res_shop = categorize_transaction("amazon electronics order", "expense")
    assert res_shop["category"] == "Shopping"

    # Income salary
    res_income = categorize_transaction("monthly stipend paycheck", "income")
    assert res_income["category"] == "Salary"

    # Ambiguous / Unknown description falls back safely
    res_unknown = categorize_transaction("xyzabc random thing", "expense")
    assert res_unknown["category"] == "Other"
    assert res_unknown["confidence"] == "low"


def test_ai_categorizer_endpoint():
    """Test the categorizer HTTP API endpoint."""
    response = client.post(
        "/api/categorize/",
        json={"description": "zomato pizza lunch", "transaction_type": "expense"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["category"] == "Food"
    assert data["confidence"] in ("high", "medium") or (isinstance(data["confidence"], (int, float)) and data["confidence"] >= 0.3)
    assert data["is_suggestion"] is True


def test_analytics_summary():
    """Test financial analytics calculations."""
    res = client.get("/api/analytics/summary")
    assert res.status_code == 200
    summary = res.json()
    assert "total_income" in summary
    assert "total_expenses" in summary
    assert "balance" in summary
    assert "savings_rate" in summary
    # Net balance check
    expected_balance = round(summary["total_income"] - summary["total_expenses"], 2)
    assert round(summary["balance"], 2) == expected_balance


def test_budgets_endpoint():
    """Test budgets retrieval."""
    res = client.get("/api/budgets/")
    assert res.status_code == 200
    budgets = res.json()
    assert isinstance(budgets, list)
    assert len(budgets) > 0
    first = budgets[0]
    assert "category" in first
    assert "budget_limit" in first
    assert "spent" in first
    assert "percentage" in first
