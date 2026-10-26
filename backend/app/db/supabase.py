"""
Supabase PostgreSQL database adapter for Oria.

Provides CRUD operations and analytics computations directly against Supabase
when configured, with zero mock data.
"""
import os
import logging
from typing import Optional
from datetime import datetime, date
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

_supabase_client = None
_tables_checked = False
_tables_available = False

DEFAULT_BUDGETS = (
    ("Food", 5000), ("Transportation", 2000), ("Shopping", 3000),
    ("Entertainment", 1500), ("Utilities", 2500), ("Rent", 12000),
)


def get_supabase_client():
    """Retrieve or initialize the Supabase client."""
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client

    url = os.getenv("SUPABASE_URL", "").strip()
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip() or os.getenv("SUPABASE_ANON_KEY", "").strip()

    if not url or not key:
        return None

    try:
        from supabase import create_client
        _supabase_client = create_client(url, key)
        return _supabase_client
    except Exception as e:
        logger.warning(f"Could not initialize Supabase client: {e}")
        return None


def is_supabase_ready() -> bool:
    """Check if Supabase is configured and tables exist in schema cache."""
    global _tables_checked, _tables_available

    client = get_supabase_client()
    if client is None:
        return False

    if _tables_checked:
        return _tables_available

    try:
        # Probe transactions table
        res = client.table("transactions").select("id").limit(1).execute()
        _tables_available = True
        _tables_checked = True
        logger.info("Supabase database is ready and active.")
        return True
    except Exception as e:
        logger.info(f"Supabase tables not yet created or accessible: {e}")
        _tables_available = False
        _tables_checked = True
        return False


def reset_supabase_cache():
    """Reset connection cache so newly created tables are detected."""
    global _tables_checked, _tables_available
    _tables_checked = False
    _tables_available = False


# ====================================================================
# Transaction Operations
# ====================================================================

def supabase_list_transactions(
    user_id: str,
    limit: int = 100,
    offset: int = 0,
    type_filter: Optional[str] = None,
    category_filter: Optional[str] = None,
) -> list[dict]:
    """Retrieve transactions from Supabase."""
    client = get_supabase_client()
    if not client:
        return []

    query = client.table("transactions").select("*").eq("user_id", user_id)

    if type_filter:
        query = query.eq("type", type_filter)
    if category_filter:
        query = query.eq("category", category_filter)

    query = query.order("date", desc=True).order("created_at", desc=True).range(offset, offset + limit - 1)
    response = query.execute()
    return response.data or []


def supabase_create_transaction(txn_data: dict, user_id: str) -> dict:
    """Insert a new transaction into Supabase."""
    client = get_supabase_client()
    if not client:
        raise RuntimeError("Supabase client not available")

    # Format payload
    payload = {
        "user_id": user_id,
        "description": txn_data["description"],
        "amount": float(txn_data["amount"]),
        "type": txn_data["type"],
        "category": txn_data["category"],
        "date": txn_data["date"],
        "is_sample": 0,
    }
    if "id" in txn_data and txn_data["id"]:
        payload["id"] = txn_data["id"]

    response = client.table("transactions").insert(payload).execute()
    if response.data and len(response.data) > 0:
        return response.data[0]
    return payload


def supabase_delete_transaction(txn_id: str, user_id: str) -> bool:
    """Delete a transaction from Supabase by ID."""
    client = get_supabase_client()
    if not client:
        return False

    res = client.table("transactions").delete().eq("id", txn_id).eq("user_id", user_id).execute()
    return bool(res.data and len(res.data) > 0)


# ====================================================================
# Budget Operations
# ====================================================================

def supabase_get_budgets(user_id: str) -> list[dict]:
    """Retrieve budgets and compute actual monthly spending from Supabase."""
    client = get_supabase_client()
    if not client:
        return []

    budgets_res = client.table("budgets").select("*").eq("user_id", user_id).execute()
    budgets = budgets_res.data or []
    if not budgets:
        payload = [
            {"user_id": user_id, "category": category, "budget_limit": limit, "period": "monthly"}
            for category, limit in DEFAULT_BUDGETS
        ]
        created = client.table("budgets").insert(payload).execute()
        budgets = created.data or []

    # Get current month prefix: YYYY-MM
    now_prefix = datetime.now().strftime("%Y-%m")

    # Query expense transactions for the current month
    txns_res = client.table("transactions") \
        .select("category, amount") \
        .eq("user_id", user_id) \
        .eq("type", "expense") \
        .gte("date", f"{now_prefix}-01") \
        .lte("date", f"{now_prefix}-31") \
        .execute()

    spending_map = {}
    for t in (txns_res.data or []):
        cat = t.get("category")
        amt = float(t.get("amount", 0))
        spending_map[cat] = spending_map.get(cat, 0.0) + amt

    result = []
    for b in budgets:
        cat = b["category"]
        limit = float(b["budget_limit"])
        spent = round(spending_map.get(cat, 0.0), 2)
        remaining = round(limit - spent, 2)
        pct = round((spent / limit) * 100, 1) if limit > 0 else 0.0

        result.append({
            "id": str(b.get("id")),
            "category": cat,
            "budget_limit": limit,
            "spent": spent,
            "remaining": remaining,
            "percentage": pct,
        })

    return sorted(result, key=lambda x: x["percentage"], reverse=True)


# ====================================================================
# Analytics Operations
# ====================================================================

def supabase_get_summary(user_id: str) -> dict:
    """Compute financial summary (income, expenses, balance, savings rate)."""
    client = get_supabase_client()
    if not client:
        return {"total_income": 0.0, "total_expenses": 0.0, "balance": 0.0, "savings_rate": 0.0}

    res = client.table("transactions").select("type, amount").eq("user_id", user_id).execute()
    rows = res.data or []

    total_income = sum(float(r["amount"]) for r in rows if r["type"] == "income")
    total_expenses = sum(float(r["amount"]) for r in rows if r["type"] == "expense")
    balance = total_income - total_expenses
    savings_rate = ((balance / total_income) * 100) if total_income > 0 else 0.0

    return {
        "total_income": round(total_income, 2),
        "total_expenses": round(total_expenses, 2),
        "balance": round(balance, 2),
        "savings_rate": round(savings_rate, 1),
    }


def supabase_get_category_spending(user_id: str) -> list[dict]:
    """Compute expense category breakdown."""
    client = get_supabase_client()
    if not client:
        return []

    res = client.table("transactions").select("category, amount").eq("user_id", user_id).eq("type", "expense").execute()
    rows = res.data or []

    totals = {}
    for r in rows:
        cat = r["category"]
        totals[cat] = totals.get(cat, 0.0) + float(r["amount"])

    sorted_cats = sorted(totals.items(), key=lambda x: x[1], reverse=True)
    return [{"category": cat, "amount": round(amt, 2)} for cat, amt in sorted_cats]


def supabase_get_monthly_trend(user_id: str) -> list[dict]:
    """Compute monthly trend of income and expenses."""
    client = get_supabase_client()
    if not client:
        return []

    res = client.table("transactions").select("date, type, amount").eq("user_id", user_id).execute()
    rows = res.data or []

    months = {}
    for r in rows:
        d = str(r["date"])[:7]  # YYYY-MM
        if d not in months:
            months[d] = {"income": 0.0, "expenses": 0.0}
        if r["type"] == "income":
            months[d]["income"] += float(r["amount"])
        elif r["type"] == "expense":
            months[d]["expenses"] += float(r["amount"])

    sorted_months = sorted(months.keys())
    return [
        {
            "month": m,
            "income": round(months[m]["income"], 2),
            "expenses": round(months[m]["expenses"], 2),
        }
        for m in sorted_months
    ]


def supabase_get_insights(user_id: str) -> list[dict]:
    """Compute financial health insights from Supabase transactions."""
    client = get_supabase_client()
    if not client:
        return []

    res = client.table("transactions").select("*").eq("user_id", user_id).execute()
    rows = res.data or []

    if not rows:
        return []

    total_income = sum(float(r["amount"]) for r in rows if r["type"] == "income")
    total_expenses = sum(float(r["amount"]) for r in rows if r["type"] == "expense")
    savings_rate = ((total_income - total_expenses) / total_income * 100) if total_income > 0 else 0

    # Top spending category
    cat_totals = {}
    for r in rows:
        if r["type"] == "expense":
            cat = r["category"]
            cat_totals[cat] = cat_totals.get(cat, 0.0) + float(r["amount"])

    top_cat = None
    if cat_totals:
        top_cat_name = max(cat_totals, key=cat_totals.get)
        top_cat = {"category": top_cat_name, "total": cat_totals[top_cat_name]}

    # Largest single expense
    expenses = [r for r in rows if r["type"] == "expense"]
    largest = max(expenses, key=lambda x: float(x["amount"])) if expenses else None

    # Category count
    distinct_categories = len(cat_totals)

    insights = []
    if top_cat:
        pct = (top_cat["total"] / total_expenses * 100) if total_expenses > 0 else 0
        insights.append({
            "type": "top_category",
            "title": "Highest Spending Category",
            "message": f"{top_cat['category']} accounts for {pct:.0f}% of your expenses (₹{top_cat['total']:,.0f})",
            "severity": "info",
        })

    if total_income > 0 and savings_rate >= 0:
        sev = "success" if savings_rate >= 20 else ("warning" if savings_rate >= 10 else "danger")
        insights.append({
            "type": "savings_rate",
            "title": "Savings Rate",
            "message": f"You're saving {savings_rate:.1f}% of your income",
            "severity": sev,
        })

    if largest:
        insights.append({
            "type": "largest_expense",
            "title": "Largest Expense",
            "message": f"₹{float(largest['amount']):,.0f} on {largest['description']} ({largest.get('date', '')})",
            "severity": "info",
        })

    if distinct_categories > 0:
        insights.append({
            "type": "diversity",
            "title": "Spending Diversity",
            "message": f"Your expenses span {distinct_categories} categories",
            "severity": "info",
        })

    return insights

