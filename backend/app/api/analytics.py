"""Analytics API routes — Supports Supabase with SQLite fallback."""
from fastapi import APIRouter
from app.db.database import get_connection
from app.db.supabase import (
    is_supabase_ready,
    supabase_get_summary,
    supabase_get_category_spending,
    supabase_get_monthly_trend,
    supabase_get_insights,
)

router = APIRouter()


@router.get("/summary")
def get_summary():
    """Financial summary: total income, expenses, balance, savings rate."""
    if is_supabase_ready():
        return supabase_get_summary()

    conn = get_connection()
    row = conn.execute("""
        SELECT
            COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END), 0) as total_income,
            COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) as total_expenses
        FROM transactions
    """).fetchone()
    conn.close()

    total_income = row["total_income"]
    total_expenses = row["total_expenses"]
    balance = total_income - total_expenses
    savings_rate = ((total_income - total_expenses) / total_income * 100) if total_income > 0 else 0

    return {
        "total_income": round(total_income, 2),
        "total_expenses": round(total_expenses, 2),
        "balance": round(balance, 2),
        "savings_rate": round(savings_rate, 1),
    }


@router.get("/category-spending")
def get_category_spending():
    """Spending breakdown by category."""
    if is_supabase_ready():
        return supabase_get_category_spending()

    conn = get_connection()
    rows = conn.execute("""
        SELECT category, SUM(amount) as total
        FROM transactions
        WHERE type = 'expense'
        GROUP BY category
        ORDER BY total DESC
    """).fetchall()
    conn.close()
    return [{"category": r["category"], "amount": round(r["total"], 2)} for r in rows]


@router.get("/monthly-trend")
def get_monthly_trend():
    """Monthly income vs expense trend."""
    if is_supabase_ready():
        return supabase_get_monthly_trend()

    conn = get_connection()
    rows = conn.execute("""
        SELECT
            strftime('%Y-%m', date) as month,
            SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as income,
            SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expenses
        FROM transactions
        GROUP BY month
        ORDER BY month ASC
    """).fetchall()
    conn.close()
    return [
        {
            "month": r["month"],
            "income": round(r["income"], 2),
            "expenses": round(r["expenses"], 2),
        }
        for r in rows
    ]


@router.get("/insights")
def get_insights():
    """AI-style insights derived from actual transaction data."""
    if is_supabase_ready():
        return supabase_get_insights()

    conn = get_connection()

    # Summary
    summary = conn.execute("""
        SELECT
            COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END), 0) as total_income,
            COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) as total_expenses
        FROM transactions
    """).fetchone()

    total_income = summary["total_income"]
    total_expenses = summary["total_expenses"]
    savings_rate = ((total_income - total_expenses) / total_income * 100) if total_income > 0 else 0

    # Top spending category
    top_cat = conn.execute("""
        SELECT category, SUM(amount) as total
        FROM transactions WHERE type='expense'
        GROUP BY category ORDER BY total DESC LIMIT 1
    """).fetchone()

    # Largest single expense
    largest = conn.execute("""
        SELECT description, amount, date
        FROM transactions WHERE type='expense'
        ORDER BY amount DESC LIMIT 1
    """).fetchone()

    # Category count
    cat_count = conn.execute("""
        SELECT COUNT(DISTINCT category) as cnt
        FROM transactions WHERE type='expense'
    """).fetchone()

    conn.close()

    insights = []

    if top_cat:
        pct = (top_cat["total"] / total_expenses * 100) if total_expenses > 0 else 0
        insights.append({
            "type": "top_category",
            "title": "Highest Spending Category",
            "message": f"{top_cat['category']} accounts for {pct:.0f}% of your expenses (₹{top_cat['total']:,.0f})",
            "severity": "info",
        })

    if savings_rate >= 0:
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
            "message": f"₹{largest['amount']:,.0f} on {largest['description']} ({largest['date']})",
            "severity": "info",
        })

    if cat_count and cat_count["cnt"] > 0:
        insights.append({
            "type": "diversity",
            "title": "Spending Diversity",
            "message": f"Your expenses span {cat_count['cnt']} categories",
            "severity": "info",
        })

    return insights
