"""Unit and integration tests for the AI Financial Assistant."""
import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

from app.main import app
from app.ai.financial_assistant import (
    tool_get_financial_summary,
    tool_get_category_spending,
    tool_get_recent_transactions,
    tool_get_budget_status,
    tool_simulate_purchase,
    execute_tool,
    run_financial_assistant,
)

client = TestClient(app)


def test_get_suggestions():
    """Verify suggestions endpoint returns curated starter prompts."""
    res = client.get("/api/assistant/suggestions")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 3
    assert all("prompt" in item and "label" in item for item in data)


def test_tool_get_financial_summary():
    """Verify deterministic financial summary tool."""
    summary = tool_get_financial_summary()
    assert "total_income" in summary
    assert "total_expenses" in summary
    assert "balance" in summary
    assert "savings_rate_percent" in summary
    assert summary["balance"] == round(summary["total_income"] - summary["total_expenses"], 2)


def test_tool_get_category_spending():
    """Verify category spending breakdown tool."""
    spending = tool_get_category_spending()
    assert isinstance(spending, list)
    for item in spending:
        assert "category" in item
        assert "amount" in item
        assert item["amount"] >= 0


def test_tool_get_recent_transactions():
    """Verify transaction retrieval tool."""
    txns = tool_get_recent_transactions(limit=3)
    assert isinstance(txns, list)
    assert len(txns) <= 3
    if txns:
        assert "description" in txns[0]
        assert "amount" in txns[0]
        assert "type" in txns[0]


def test_tool_get_budget_status():
    """Verify budget status tool."""
    budgets = tool_get_budget_status()
    assert isinstance(budgets, list)
    for b in budgets:
        assert "category" in b
        assert "budget_limit" in b
        assert "spent" in b
        assert "remaining" in b
        assert "status" in b


def test_tool_simulate_purchase():
    """Verify purchase simulation tool."""
    # Test a small safe purchase
    res_safe = tool_simulate_purchase("Notebook", 150.0, "Shopping")
    assert res_safe["item_name"] == "Notebook"
    assert res_safe["purchase_amount"] == 150.0
    assert "projected_balance" in res_safe
    assert res_safe["verdict"] in ("safe", "caution", "not_recommended")

    # Test an absurdly large purchase that exceeds any reasonable balance
    res_large = tool_simulate_purchase("Luxury Yacht", 999999999.0, "Shopping")
    assert res_large["verdict"] == "not_recommended"
    assert res_large["projected_balance"] < 0


def test_execute_tool_dispatch():
    """Verify tool dispatcher."""
    summary = execute_tool("get_financial_summary", {})
    assert "balance" in summary

    unknown = execute_tool("non_existent_tool", {})
    assert "error" in unknown


def test_assistant_chat_endpoint_mocked():
    """Verify assistant chat endpoint with mocked Groq completion."""
    mock_choice = MagicMock()
    mock_choice.message.tool_calls = None
    mock_choice.message.content = "Your current financial health is strong!"

    mock_resp = MagicMock()
    mock_resp.choices = [mock_choice]

    with patch("app.ai.financial_assistant.get_groq_client") as mock_get_client:
        mock_client_instance = MagicMock()
        mock_client_instance.chat.completions.create.return_value = mock_resp
        mock_get_client.return_value = mock_client_instance

        payload = {"message": "How is my financial health?", "history": []}
        res = client.post("/api/assistant/chat", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["reply"] == "Your current financial health is strong!"
        assert isinstance(data["suggestions"], list)
