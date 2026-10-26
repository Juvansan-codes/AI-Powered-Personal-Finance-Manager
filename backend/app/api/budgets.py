"""Budget API routes — Supports Supabase with SQLite fallback."""
from fastapi import APIRouter, Depends
from app.auth import require_user
from app.db.database import get_connection
from app.db.supabase import is_supabase_ready, supabase_get_budgets

router = APIRouter()


@router.get("/")
def get_budgets(user_id: str = Depends(require_user)):
    """Get all budgets with current spending calculated from transactions."""
    if is_supabase_ready():
        return supabase_get_budgets(user_id)

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
            "id": str(b["id"]),
            "category": b["category"],
            "budget_limit": limit,
            "spent": round(spent, 2),
            "remaining": round(limit - spent, 2),
            "percentage": round((spent / limit) * 100, 1) if limit > 0 else 0,
        })

    return sorted(result, key=lambda x: x["percentage"], reverse=True)
