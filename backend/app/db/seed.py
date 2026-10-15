"""
Seed the database with realistic sample transactions.
Only seeds if the database is empty. Never overwrites user data.
All sample transactions are marked with is_sample=1.
"""
import uuid
from datetime import datetime, timedelta
from app.db.database import get_connection

SAMPLE_TRANSACTIONS = [
    # October 2026 — Expenses
    {"description": "Monthly Rent", "amount": 12000, "type": "expense", "category": "Rent", "days_ago": 14},
    {"description": "Grocery shopping at BigBasket", "amount": 2350, "type": "expense", "category": "Food", "days_ago": 13},
    {"description": "Uber cab to college", "amount": 185, "type": "expense", "category": "Transportation", "days_ago": 12},
    {"description": "Lunch at college canteen", "amount": 120, "type": "expense", "category": "Food", "days_ago": 12},
    {"description": "Electricity bill", "amount": 1450, "type": "expense", "category": "Utilities", "days_ago": 11},
    {"description": "Amazon order - headphones", "amount": 1999, "type": "expense", "category": "Shopping", "days_ago": 10},
    {"description": "Netflix subscription", "amount": 649, "type": "expense", "category": "Entertainment", "days_ago": 9},
    {"description": "Dinner at restaurant", "amount": 850, "type": "expense", "category": "Food", "days_ago": 8},
    {"description": "Bus pass renewal", "amount": 500, "type": "expense", "category": "Transportation", "days_ago": 7},
    {"description": "Medical checkup", "amount": 1200, "type": "expense", "category": "Healthcare", "days_ago": 6},
    {"description": "Textbooks for AI course", "amount": 780, "type": "expense", "category": "Education", "days_ago": 5},
    {"description": "Mobile recharge", "amount": 299, "type": "expense", "category": "Utilities", "days_ago": 4},
    {"description": "Coffee with friends", "amount": 320, "type": "expense", "category": "Food", "days_ago": 3},
    {"description": "Movie tickets - PVR", "amount": 450, "type": "expense", "category": "Entertainment", "days_ago": 2},
    {"description": "Swiggy food delivery", "amount": 385, "type": "expense", "category": "Food", "days_ago": 1},

    # September 2026 — Expenses
    {"description": "Monthly Rent", "amount": 12000, "type": "expense", "category": "Rent", "days_ago": 44},
    {"description": "Grocery shopping", "amount": 2100, "type": "expense", "category": "Food", "days_ago": 42},
    {"description": "Ola cab ride", "amount": 210, "type": "expense", "category": "Transportation", "days_ago": 40},
    {"description": "Internet bill", "amount": 799, "type": "expense", "category": "Utilities", "days_ago": 38},
    {"description": "Flipkart order - shoes", "amount": 2499, "type": "expense", "category": "Shopping", "days_ago": 36},
    {"description": "Dinner at Biryani House", "amount": 560, "type": "expense", "category": "Food", "days_ago": 34},
    {"description": "College semester fees", "amount": 45000, "type": "expense", "category": "Education", "days_ago": 32},
    {"description": "Pharmacy medicines", "amount": 650, "type": "expense", "category": "Healthcare", "days_ago": 30},
    {"description": "Spotify subscription", "amount": 119, "type": "expense", "category": "Entertainment", "days_ago": 28},

    # Income
    {"description": "Monthly salary", "amount": 35000, "type": "income", "category": "Salary", "days_ago": 15},
    {"description": "Freelance web project", "amount": 8000, "type": "income", "category": "Other Income", "days_ago": 10},
    {"description": "Monthly salary", "amount": 35000, "type": "income", "category": "Salary", "days_ago": 45},
    {"description": "Cashback reward", "amount": 500, "type": "income", "category": "Other Income", "days_ago": 25},

    # August 2026
    {"description": "Monthly Rent", "amount": 12000, "type": "expense", "category": "Rent", "days_ago": 74},
    {"description": "Grocery shopping", "amount": 1980, "type": "expense", "category": "Food", "days_ago": 70},
    {"description": "Auto rickshaw rides", "amount": 350, "type": "expense", "category": "Transportation", "days_ago": 65},
    {"description": "Electricity bill", "amount": 1320, "type": "expense", "category": "Utilities", "days_ago": 62},
    {"description": "Weekend trip to Coorg", "amount": 3500, "type": "expense", "category": "Entertainment", "days_ago": 58},
    {"description": "Monthly salary", "amount": 35000, "type": "income", "category": "Salary", "days_ago": 75},
]


SAMPLE_BUDGETS = [
    {"category": "Food", "budget_limit": 6000},
    {"category": "Transportation", "budget_limit": 2000},
    {"category": "Shopping", "budget_limit": 5000},
    {"category": "Education", "budget_limit": 50000},
    {"category": "Healthcare", "budget_limit": 3000},
    {"category": "Utilities", "budget_limit": 3000},
    {"category": "Entertainment", "budget_limit": 2000},
    {"category": "Rent", "budget_limit": 12000},
]


def seed_if_empty():
    """Insert sample data only if the transactions table is empty."""
    conn = get_connection()
    count = conn.execute("SELECT COUNT(*) as cnt FROM transactions").fetchone()["cnt"]
    if count > 0:
        conn.close()
        return False

    today = datetime.now()
    for txn in SAMPLE_TRANSACTIONS:
        txn_date = (today - timedelta(days=txn["days_ago"])).strftime("%Y-%m-%d")
        conn.execute(
            """INSERT INTO transactions (id, description, amount, type, category, date, created_at, is_sample)
               VALUES (?, ?, ?, ?, ?, ?, ?, 1)""",
            (
                str(uuid.uuid4()),
                txn["description"],
                txn["amount"],
                txn["type"],
                txn["category"],
                txn_date,
                datetime.utcnow().isoformat(),
            ),
        )

    for budget in SAMPLE_BUDGETS:
        conn.execute(
            "INSERT OR IGNORE INTO budgets (id, category, budget_limit) VALUES (?, ?, ?)",
            (str(uuid.uuid4()), budget["category"], budget["budget_limit"]),
        )

    conn.commit()
    conn.close()
    return True


if __name__ == "__main__":
    from app.db.database import init_db
    init_db()
    seeded = seed_if_empty()
    print("Seeded!" if seeded else "Database already has data.")
