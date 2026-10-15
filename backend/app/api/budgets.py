"""Budget API routes."""
from fastapi import APIRouter
from app.db.database import get_connection

router = APIRouter()


@router.get("/")
def get_budgets():
    """Get all budgets with current spending calculated from transactions."""
    conn = get_connection()

    budgets = conn.execute("SELECT * FROM budgets").fetchall()

    # Get current month's spending per category
    spending = conn.execute("""
        SELECT category, SUM(amount) as spent
        FROM transactions
        WHERE type = 'expense'
          AND strftime('%Y-%m', date) = strftime('%Y-%m', 'now')
        GROUP BY category
    """).fetchall()
    conn.close()

    spending_map = {r["category"]: r["spent"] for r in spending}

    result = []
    for b in budgets:
        spent = spending_map.get(b["category"], 0)
        limit = b["budget_limit"]
        result.append({
            "id": b["id"],
            "category": b["category"],
            "budget_limit": limit,
            "spent": round(spent, 2),
            "remaining": round(limit - spent, 2),
            "percentage": round((spent / limit) * 100, 1) if limit > 0 else 0,
        })

    return sorted(result, key=lambda x: x["percentage"], reverse=True)
