"""
FastAPI router for Conversational AI Assistant.
"""
from fastapi import APIRouter, HTTPException
import logging

from app.schemas.assistant import ChatRequest, ChatResponse, SuggestionItem
from app.ai.financial_assistant import (
    run_financial_assistant,
    get_default_suggestions,
)
from app.services.groq_service import GroqConfigError, GroqRateLimitError, GroqServiceError

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
def chat_with_assistant(req: ChatRequest):
    """
    Interact with the conversational personal finance assistant.
    The assistant can inspect account summaries, category spending, recent transactions,
    budget limits, and simulate what-if purchase scenarios using Groq LLM tool calling.
    """
    try:
        history_dicts = [{"role": m.role, "content": m.content} for m in req.history]
        result = run_financial_assistant(
            user_message=req.message,
            conversation_history=history_dicts,
        )
        return ChatResponse(
            reply=result["reply"],
            tools_used=result["tools_used"],
            suggestions=result["suggestions"],
        )
    except GroqConfigError as e:
        logger.warning(f"Groq configuration issue: {e}")
        raise HTTPException(status_code=503, detail="AI Assistant is not configured on the server. Please check GROQ_API_KEY.")
    except GroqRateLimitError as e:
        logger.warning(f"Groq rate limit: {e}")
        raise HTTPException(status_code=429, detail="Groq API rate limit reached. Please wait a moment and try again.")
    except GroqServiceError as e:
        logger.error(f"Groq service error: {e}")
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.exception("Unexpected error in chat_with_assistant:")
        raise HTTPException(status_code=500, detail="An error occurred while communicating with the AI Assistant.")


@router.get("/suggestions", response_model=list[SuggestionItem])
def get_prompt_suggestions():
    """
    Return curated starter prompts categorized for user interaction.
    """
    return [
        SuggestionItem(
            id="balance",
            label="Current Balance",
            prompt="What is my current net balance and savings rate?",
            category="overview",
        ),
        SuggestionItem(
            id="spending",
            label="Top Spending",
            prompt="Which category did I spend the most money on?",
            category="insights",
        ),
        SuggestionItem(
            id="budgets",
            label="Budget Check",
            prompt="How am I doing against my monthly category budgets? Any over budget?",
            category="budgets",
        ),
        SuggestionItem(
            id="simulate",
            label="Can I afford ₹3,500?",
            prompt="Can I afford to spend ₹3,500 on new shoes right now?",
            category="simulation",
        ),
        SuggestionItem(
            id="recent",
            label="Recent Expenses",
            prompt="What are my 5 most recent transactions?",
            category="transactions",
        ),
    ]
