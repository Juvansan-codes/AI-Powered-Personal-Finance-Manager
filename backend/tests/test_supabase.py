"""
Integration tests for Supabase data layer.
"""
import uuid
import pytest
from app.db.supabase import (
    is_supabase_ready,
    supabase_list_transactions,
    supabase_create_transaction,
    supabase_delete_transaction,
    supabase_get_budgets,
    supabase_get_summary,
)


def test_supabase_status():
    """Verify Supabase connection status."""
    ready = is_supabase_ready()
    # When Supabase is configured and tables exist, it must be ready
    assert ready is True


def test_supabase_transactions_lifecycle():
    """Verify creating, querying, and deleting a real transaction in Supabase."""
    if not is_supabase_ready():
        pytest.skip("Supabase not configured or tables not ready")

    test_id = str(uuid.uuid4())
    payload = {
        "id": test_id,
        "description": "Pytest Supabase Integration Test",
        "amount": 350.0,
        "type": "expense",
        "category": "Food",
        "date": "2026-10-21",
    }

    # 1. Create
    created = supabase_create_transaction(payload)
    assert created is not None
    assert created["description"] == payload["description"]
    assert float(created["amount"]) == 350.0

    # 2. List
    txns = supabase_list_transactions(limit=50)
    matching = [t for t in txns if str(t.get("id")) == test_id]
    assert len(matching) == 1

    # 3. Delete
    deleted = supabase_delete_transaction(test_id)
    assert deleted is True

    # 4. Verify gone
    txns_after = supabase_list_transactions(limit=50)
    assert not any(str(t.get("id")) == test_id for t in txns_after)


def test_supabase_budgets():
    """Verify budgets are fetched from Supabase."""
    if not is_supabase_ready():
        pytest.skip("Supabase not configured or tables not ready")

    budgets = supabase_get_budgets()
    assert isinstance(budgets, list)
    assert len(budgets) > 0
    categories = [b["category"] for b in budgets]
    assert "Food" in categories
