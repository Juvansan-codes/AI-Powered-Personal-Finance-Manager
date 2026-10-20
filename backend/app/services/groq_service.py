"""Groq AI Service for Speech-to-Text and NLP Transaction Extraction."""
import os
import json
import logging
from datetime import datetime, date
from typing import Optional
from dotenv import load_dotenv

from app.ai.categorizer import CATEGORIES, EXPENSE_CATEGORIES, INCOME_CATEGORIES
from app.services.ml_categorizer import categorize_with_ml

load_dotenv()
logger = logging.getLogger(__name__)

# Constants
DEFAULT_STT_MODEL = os.getenv("GROQ_STT_MODEL", "whisper-large-v3-turbo")
DEFAULT_LLM_MODEL = os.getenv("GROQ_LLM_MODEL", "openai/gpt-oss-20b")
MAX_AUDIO_SIZE_BYTES = 25 * 1024 * 1024  # 25 MB


class GroqServiceError(Exception):
    """Base exception for Groq service errors."""
    def __init__(self, message: str, status_code: int = 500):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class GroqConfigError(GroqServiceError):
    """Raised when Groq API key is not configured."""
    def __init__(self, message: str = "GROQ_API_KEY is not configured on the server."):
        super().__init__(message, status_code=503)


class GroqRateLimitError(GroqServiceError):
    """Raised when Groq API rate limit is exceeded."""
    def __init__(self, message: str = "Groq API rate limit exceeded. Please try again shortly."):
        super().__init__(message, status_code=429)


def get_groq_client():
    """Retrieve an authenticated Groq client safely."""
    api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not api_key:
        logger.error("GROQ_API_KEY environment variable is missing or empty.")
        raise GroqConfigError()

    try:
        from groq import Groq
        return Groq(api_key=api_key)
    except ImportError:
        logger.error("groq package is not installed.")
        raise GroqServiceError("Groq SDK is not installed on the server.", status_code=500)


def transcribe_audio(
    file_bytes: bytes,
    filename: str = "audio.webm",
    content_type: Optional[str] = None,
) -> str:
    """
    Transcribe audio bytes using Groq Whisper model.

    Args:
        file_bytes: Raw audio data
        filename: Name of the audio file (helps determine container format)
        content_type: MIME type of audio (e.g., audio/webm, audio/wav)

    Returns:
        Transcribed text
    """
    if not file_bytes or len(file_bytes) == 0:
        raise GroqServiceError("Uploaded audio file is empty.", status_code=400)

    if len(file_bytes) > MAX_AUDIO_SIZE_BYTES:
        raise GroqServiceError("Audio file exceeds maximum allowed size of 25MB.", status_code=413)

    client = get_groq_client()
    stt_model = os.getenv("GROQ_STT_MODEL", DEFAULT_STT_MODEL)

    try:
        # Pass file tuple: (filename, bytes, content_type)
        file_payload = (filename, file_bytes) if not content_type else (filename, file_bytes, content_type)
        response = client.audio.transcriptions.create(
            file=file_payload,
            model=stt_model,
            response_format="json",
        )
        text = response.text.strip() if hasattr(response, "text") else str(response).strip()
        return text
    except Exception as e:
        err_str = str(e).lower()
        if "rate limit" in err_str or "429" in err_str:
            raise GroqRateLimitError()
        elif "authentication" in err_str or "unauthorized" in err_str or "401" in err_str:
            raise GroqConfigError("Invalid GROQ_API_KEY configured.")
        logger.error(f"Groq transcription error: {type(e).__name__}")
        raise GroqServiceError(f"Transcription failed: {str(e)}", status_code=502)


def extract_transaction_from_text(
    text: str,
    reference_date: Optional[str] = None,
) -> dict:
    """
    Extract structured transaction details from transcribed voice text.

    Args:
        text: Transcribed voice statement (e.g. "I spent 250 rupees on dinner yesterday")
        reference_date: YYYY-MM-DD date string representing user's current date for relative dates

    Returns:
        Dictionary adhering to VoiceExtractResponse schema.
    """
    clean_text = text.strip()
    if not clean_text:
        return {
            "is_complete": False,
            "missing_fields": ["description", "amount", "type"],
            "clarification_needed": "No speech text provided.",
            "draft": None,
            "raw_text": "",
        }

    # Default to today's date if reference date is not provided or invalid
    today_iso = reference_date
    if not today_iso:
        today_iso = date.today().isoformat()
    else:
        try:
            datetime.strptime(today_iso, "%Y-%m-%d")
        except ValueError:
            today_iso = date.today().isoformat()

    client = get_groq_client()
    llm_model = os.getenv("GROQ_LLM_MODEL", DEFAULT_LLM_MODEL)

    system_prompt = f"""You are a financial entity extraction assistant.
Extract transaction details from the user's spoken utterance.
Today's reference date is: {today_iso}

Available expense categories:
{json.dumps(EXPENSE_CATEGORIES)}

Available income categories:
{json.dumps(INCOME_CATEGORIES)}

Rules:
1. Identify:
   - "type": "expense" or "income" (e.g. spent, paid, bought -> expense; earned, received, salary, stipend -> income).
   - "amount": numeric value only (float/int). Do NOT include currency symbols. If absent or ambiguous, set to null.
   - "description": concise description of the item/vendor/purpose (e.g., "Dinner", "Uber ride", "Freelance design").
   - "category": choose the most fitting category from the available categories list. If unsure, use "Other" for expense or "Other Income" for income.
   - "date": ISO format YYYY-MM-DD. Resolve relative terms ("today" -> {today_iso}, "yesterday" -> day before {today_iso}, etc.). If no date mentioned, default to {today_iso}.
2. If the user statement does not contain an amount, set "amount": null. Do NOT invent or hallucinate an amount.
3. If the user statement is too vague or not a transaction, set all fields to null and specify what is missing.

Respond STRICTLY in valid JSON with this exact schema:
{{
  "type": "expense" | "income" | null,
  "amount": number | null,
  "description": string | null,
  "category": string | null,
  "date": "YYYY-MM-DD" | null,
  "confidence": "high" | "medium" | "low",
  "missing_fields": ["amount", "description", ...],
  "clarification_needed": string | null
}}
"""

    try:
        completion = client.chat.completions.create(
            model=llm_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": clean_text},
            ],
            response_format={"type": "json_object"},
            temperature=0.1,
        )
        raw_content = completion.choices[0].message.content or "{}"
        data = json.loads(raw_content)
    except Exception as e:
        err_str = str(e).lower()
        if "rate limit" in err_str or "429" in err_str:
            raise GroqRateLimitError()
        elif "authentication" in err_str or "401" in err_str:
            raise GroqConfigError("Invalid GROQ_API_KEY configured.")
        logger.error(f"Groq LLM extraction error: {type(e).__name__}")
        # Graceful fallback: return incomplete draft with rule-based categorization
        rule_cat = categorize_with_ml(clean_text)
        return {
            "is_complete": False,
            "missing_fields": ["amount"],
            "clarification_needed": "Could not automatically parse complete transaction details.",
            "draft": {
                "description": clean_text[:100],
                "amount": None,
                "type": "expense",
                "category": rule_cat["category"],
                "date": today_iso,
                "confidence": "low",
            },
            "raw_text": clean_text,
        }

    # Extract and normalize fields
    txn_type = data.get("type")
    if txn_type not in ("income", "expense"):
        # Infer from keyword rules or default to expense
        txn_type = "expense"

    amount_raw = data.get("amount")
    amount: Optional[float] = None
    if amount_raw is not None:
        try:
            parsed_amount = float(amount_raw)
            if parsed_amount > 0:
                amount = round(parsed_amount, 2)
        except (ValueError, TypeError):
            amount = None

    desc = data.get("description")
    if desc:
        desc = str(desc).strip()
    if not desc or len(desc) == 0:
        desc = clean_text[:100]

    cat = data.get("category")
    allowed_categories = INCOME_CATEGORIES if txn_type == "income" else EXPENSE_CATEGORIES
    if not cat or cat not in allowed_categories:
        # Use our rule-based categorizer as fallback/enhancement
        suggested = categorize_with_ml(desc, txn_type)
        cat = suggested["category"]

    date_val = data.get("date")
    if date_val:
        try:
            datetime.strptime(str(date_val), "%Y-%m-%d")
            date_val = str(date_val)
        except ValueError:
            date_val = today_iso
    else:
        date_val = today_iso

    # Determine missing fields and completeness
    missing = []
    if amount is None:
        missing.append("amount")
    if not desc:
        missing.append("description")
    if not txn_type:
        missing.append("type")

    is_complete = len(missing) == 0
    clarification = data.get("clarification_needed")
    if not is_complete and not clarification:
        if "amount" in missing:
            clarification = "Could not detect a clear transaction amount. Please provide or confirm the amount."
        else:
            clarification = f"Missing required transaction details: {', '.join(missing)}."

    draft = {
        "description": desc,
        "amount": amount,
        "type": txn_type,
        "category": cat,
        "date": date_val,
        "confidence": data.get("confidence", "high" if is_complete else "medium"),
    }

    return {
        "is_complete": is_complete,
        "missing_fields": missing,
        "clarification_needed": clarification if not is_complete else None,
        "draft": draft,
        "raw_text": clean_text,
    }
