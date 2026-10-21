"""
Seed configuration and mock data management.

Mock transaction generation is disabled to ensure clean, authentic user data
stored in Supabase / local SQLite.
"""
import uuid
import logging
from app.db.database import get_connection

logger = logging.getLogger(__name__)

# Sample budgets provide initial category limits
SAMPLE_BUDGETS = [
    {"category": "Food", "budget_limit": 5000},
    {"category": "Transportation", "budget_limit": 2000},
    {"category": "Shopping", "budget_limit": 3000},
    {"category": "Entertainment", "budget_limit": 1500},
    {"category": "Utilities", "budget_limit": 2500},
    {"category": "Rent", "budget_limit": 12000},
]


def clean_mock_data() -> int:
    """Remove all sample/mock transactions from the local SQLite database."""
    conn = get_connection()
    cursor = conn.execute("DELETE FROM transactions WHERE is_sample = 1")
    deleted_count = cursor.rowcount
    conn.commit()
    conn.close()
    if deleted_count > 0:
        logger.info(f"Cleaned {deleted_count} sample mock transactions from SQLite.")
    return deleted_count


def seed_if_empty() -> bool:
    """
    Initialize budget categories if empty, but do NOT seed mock transactions.
    Real user transactions are stored directly.
    """
    clean_mock_data()

    conn = get_connection()
    budget_count = conn.execute("SELECT COUNT(*) as cnt FROM budgets").fetchone()["cnt"]

    if budget_count == 0:
        for budget in SAMPLE_BUDGETS:
            conn.execute(
                "INSERT OR IGNORE INTO budgets (id, category, budget_limit) VALUES (?, ?, ?)",
                (str(uuid.uuid4()), budget["category"], budget["budget_limit"]),
            )
        conn.commit()
        conn.close()
        return True

    conn.close()
    return False


if __name__ == "__main__":
    from app.db.database import init_db
    init_db()
    cleaned = clean_mock_data()
    print(f"Cleaned {cleaned} mock transactions.")
