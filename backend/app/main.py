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
from app.api.assistant import router as assistant_router
from app.api.settings import router as settings_router
from app.services.ml_categorizer import load_ml_model

load_dotenv()

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database and load ML model on startup."""
    init_db()
    seed_if_empty()
    from app.db.supabase import is_supabase_ready
    if is_supabase_ready():
        logger.info("Supabase PostgreSQL connected and active for transactions & budgets.")
    else:
        logger.info("Using local SQLite database.")
    # Load the ML categorization model (non-blocking — falls back to rule-based if unavailable)
    ml_loaded = load_ml_model()
    if ml_loaded:
        logger.info("ML transaction categorizer loaded successfully.")
    else:
        logger.warning("ML model not available — using rule-based categorizer as fallback.")
    yield


app = FastAPI(
    title="Oria API",
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
    return {"status": "healthy", "service": "Oria API"}


app.include_router(transactions_router, prefix="/api/transactions", tags=["Transactions"])
app.include_router(analytics_router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(categorizer_router, prefix="/api/categorize", tags=["AI Categorizer"])
app.include_router(budgets_router, prefix="/api/budgets", tags=["Budgets"])
app.include_router(voice_router, prefix="/api/voice", tags=["Voice"])
app.include_router(assistant_router, prefix="/api/assistant", tags=["AI Assistant"])
app.include_router(settings_router, prefix="/api/settings", tags=["Settings"])
