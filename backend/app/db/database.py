"""
SQLite database layer for the local prototype.
Designed so it can be swapped to PostgreSQL (via SQLAlchemy) later.
"""
import sqlite3
import os
from pathlib import Path
from typing import Optional

DB_DIR = Path(__file__).resolve().parent.parent.parent / "data"
DB_PATH = DB_DIR / "financeflow.db"


def get_connection() -> sqlite3.Connection:
    """Return a connection to the SQLite database."""
    DB_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    """Create tables if they do not exist."""
    conn = get_connection()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS transactions (
            id TEXT PRIMARY KEY,
            description TEXT NOT NULL,
            amount REAL NOT NULL CHECK(amount > 0),
            type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
            category TEXT NOT NULL,
            date TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            is_sample INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS budgets (
            id TEXT PRIMARY KEY,
            category TEXT NOT NULL UNIQUE,
            budget_limit REAL NOT NULL CHECK(budget_limit > 0),
            period TEXT NOT NULL DEFAULT 'monthly'
        );
    """)
    conn.commit()
    conn.close()
