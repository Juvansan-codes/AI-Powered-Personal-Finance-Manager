"""
AI-Powered Personal Finance Manager — FastAPI Backend
"""
import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.db.database import init_db
from app.db.seed import seed_if_empty
from app.api.transactions import router as transactions_router
from app.api.analytics import router as analytics_router
from app.api.categorizer import router as categorizer_router
from app.api.budgets import router as budgets_router
from app.api.voice import router as voice_router

load_dotenv()

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize the database and seed sample data on startup."""
    init_db()
    seeded = seed_if_empty()
    if seeded:
        logger.info("Database seeded with sample transactions.")
    yield


app = FastAPI(
    title="FinanceFlow API",
    description="AI-Powered Personal Finance Manager",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS
origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "FinanceFlow API"}


app.include_router(transactions_router, prefix="/api/transactions", tags=["Transactions"])
app.include_router(analytics_router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(categorizer_router, prefix="/api/categorize", tags=["AI Categorizer"])
app.include_router(budgets_router, prefix="/api/budgets", tags=["Budgets"])
app.include_router(voice_router, prefix="/api/voice", tags=["Voice"])
