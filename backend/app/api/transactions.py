"""Transaction API routes."""
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app.db.database import get_connection
from app.schemas.transaction import TransactionCreate, TransactionResponse

router = APIRouter()


@router.get("/", response_model=list[TransactionResponse])
def list_transactions(
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    type: Optional[str] = Query(None, pattern="^(income|expense)$"),
    category: Optional[str] = None,
):
    """List transactions with optional filtering."""
    conn = get_connection()
    query = "SELECT * FROM transactions WHERE 1=1"
    params: list = []

    if type:
        query += " AND type = ?"
        params.append(type)
    if category:
        query += " AND category = ?"
        params.append(category)

    query += " ORDER BY date DESC, created_at DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    rows = conn.execute(query, params).fetchall()
    conn.close()
    return [
        TransactionResponse(
            id=r["id"],
            description=r["description"],
            amount=r["amount"],
            type=r["type"],
            category=r["category"],
            date=r["date"],
            created_at=r["created_at"],
            is_sample=bool(r["is_sample"]),
        )
        for r in rows
    ]


@router.post("/", response_model=TransactionResponse, status_code=201)
def create_transaction(txn: TransactionCreate):
    """Create a new transaction."""
    txn_id = str(uuid.uuid4())
    created_at = datetime.utcnow().isoformat()
    conn = get_connection()
    conn.execute(
        """INSERT INTO transactions (id, description, amount, type, category, date, created_at, is_sample)
           VALUES (?, ?, ?, ?, ?, ?, ?, 0)""",
        (txn_id, txn.description, txn.amount, txn.type, txn.category, txn.date, created_at),
    )
    conn.commit()
    conn.close()
    return TransactionResponse(
        id=txn_id,
        description=txn.description,
        amount=txn.amount,
        type=txn.type,
        category=txn.category,
        date=txn.date,
        created_at=created_at,
        is_sample=False,
    )


@router.delete("/{transaction_id}", status_code=204)
def delete_transaction(transaction_id: str):
    """Delete a transaction by ID."""
    conn = get_connection()
    result = conn.execute("DELETE FROM transactions WHERE id = ?", (transaction_id,))
    conn.commit()
    if result.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Transaction not found")
    conn.close()
    return None
