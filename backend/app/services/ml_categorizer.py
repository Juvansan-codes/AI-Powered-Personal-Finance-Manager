"""
ML Categorizer Service — loads the trained TF-IDF + Logistic Regression pipeline
and provides prediction with confidence-aware fallback.

This service:
  - Loads the model artifact once (at startup or lazily on first use)
  - Predicts categories using predict_proba for confidence scoring
  - Falls back to the rule-based categorizer when confidence is low or model is unavailable
  - Validates predictions against the existing category taxonomy
"""
import json
import logging
from pathlib import Path
from typing import Optional

from app.ai.categorizer import (
    CATEGORIES,
    EXPENSE_CATEGORIES,
    INCOME_CATEGORIES,
    categorize_transaction as rule_based_categorize,
)

logger = logging.getLogger(__name__)

# Path to model artifacts (relative to backend/ directory)
ML_DIR = Path(__file__).resolve().parent.parent.parent / "ml"
MODEL_PATH = ML_DIR / "artifacts" / "transaction_classifier.joblib"
METADATA_PATH = ML_DIR / "artifacts" / "model_metadata.json"

# Module-level model cache (loaded once, reused for all requests)
_model_pipeline = None
_model_metadata: Optional[dict] = None
_model_load_attempted = False


def _preprocess_description(text: str) -> str:
    """
    Same preprocessing as in the training script.
    Must be consistent to ensure the model sees the same text format.
    """
    if not isinstance(text, str):
        return ""
    text = text.lower().strip()
    text = " ".join(text.split())
    return text


def load_ml_model() -> bool:
    """
    Load the trained ML pipeline from disk.

    Returns True if the model was loaded successfully, False otherwise.
    Designed to be called once during application startup.
    """
    global _model_pipeline, _model_metadata, _model_load_attempted

    _model_load_attempted = True

    if not MODEL_PATH.exists():
        logger.warning(
            f"ML model artifact not found at {MODEL_PATH}. "
            "ML categorization will be unavailable. "
            "Run 'python -m ml.train_model' from the backend directory to train the model."
        )
        return False

    try:
        import joblib
        _model_pipeline = joblib.load(MODEL_PATH)
        logger.info(f"ML categorization model loaded from {MODEL_PATH}")
    except Exception as e:
        logger.error(f"Failed to load ML model: {type(e).__name__}: {e}")
        _model_pipeline = None
        return False

    # Load metadata for confidence threshold and categories
    if METADATA_PATH.exists():
        try:
            with open(METADATA_PATH, "r", encoding="utf-8") as f:
                _model_metadata = json.load(f)
            logger.info(
                f"ML model metadata loaded. Version: {_model_metadata.get('model_version', 'unknown')}, "
                f"Threshold: {_model_metadata.get('confidence_threshold', 'N/A')}"
            )
        except Exception as e:
            logger.warning(f"Could not load model metadata: {e}")
            _model_metadata = {}
    else:
        _model_metadata = {}

    return True


def is_model_loaded() -> bool:
    """Check if the ML model is currently loaded and available."""
    return _model_pipeline is not None


def get_model_info() -> dict:
    """Return metadata about the loaded model, or empty dict if not loaded."""
    if _model_metadata:
        return {
            "model_version": _model_metadata.get("model_version", "unknown"),
            "confidence_threshold": _model_metadata.get("confidence_threshold", 0.5),
            "categories": _model_metadata.get("categories", []),
            "metrics": _model_metadata.get("metrics", {}),
            "loaded": is_model_loaded(),
        }
    return {"loaded": False}


def _get_confidence_threshold() -> float:
    """Get the confidence threshold from metadata, or use a sensible default."""
    if _model_metadata:
        return float(_model_metadata.get("confidence_threshold", 0.5))
    return 0.5


def ml_predict(description: str, transaction_type: str = "expense") -> Optional[dict]:
    """
    Predict a category using the ML model.

    Args:
        description: Transaction description text.
        transaction_type: "income" or "expense".

    Returns:
        A dict with {category, confidence, method, is_suggestion, requires_review}
        or None if the model is not available.
    """
    global _model_pipeline, _model_load_attempted

    # Lazy load if not attempted yet
    if not _model_load_attempted:
        load_ml_model()

    if _model_pipeline is None:
        return None

    try:
        # Preprocess the description (same as training)
        clean_desc = _preprocess_description(description)

        if not clean_desc:
            return None

        # Predict with probability estimates
        predicted_category = _model_pipeline.predict([clean_desc])[0]
        probabilities = _model_pipeline.predict_proba([clean_desc])[0]
        max_prob = float(max(probabilities))

        # Validate predicted category against existing taxonomy
        valid_categories = INCOME_CATEGORIES if transaction_type == "income" else EXPENSE_CATEGORIES

        if predicted_category not in valid_categories:
            # If the predicted category doesn't match the transaction type,
            # check if it's valid in ALL categories
            if predicted_category in CATEGORIES:
                # It's a valid category but wrong type — use it with lower confidence
                max_prob *= 0.5
            else:
                # Completely unknown category — shouldn't happen with a properly trained model
                logger.warning(f"ML model predicted unknown category: {predicted_category}")
                return None

        threshold = _get_confidence_threshold()
        requires_review = max_prob < threshold

        return {
            "category": predicted_category,
            "confidence": round(max_prob, 4),
            "method": "ml",
            "is_suggestion": True,
            "requires_review": requires_review,
        }

    except Exception as e:
        logger.error(f"ML prediction error: {type(e).__name__}: {e}")
        return None


def categorize_with_ml(
    description: str,
    transaction_type: str = "expense",
) -> dict:
    """
    Primary categorization function that tries ML first, then falls back to rule-based.

    This is the main entry point for the categorization endpoint.

    Returns a dict with:
        - category: the predicted category
        - confidence: numeric confidence (0.0 to 1.0) for ML, or string for rule-based
        - method: "ml" or "rule_based"
        - is_suggestion: True (user can always override)
        - requires_review: True if confidence is below threshold
    """
    # Try ML prediction first
    ml_result = ml_predict(description, transaction_type)

    if ml_result is not None:
        threshold = _get_confidence_threshold()

        if not ml_result["requires_review"]:
            # High confidence ML prediction
            return ml_result

        # Low confidence: try rule-based as a second opinion
        rule_result = rule_based_categorize(description, transaction_type)

        if rule_result["confidence"] == "high":
            # Rule-based is confident — use it instead
            return {
                "category": rule_result["category"],
                "confidence": rule_result["confidence"],
                "method": "rule_based",
                "is_suggestion": True,
                "requires_review": False,
            }

        # Both methods are unsure — return ML result with review flag
        return ml_result

    # ML not available — fall back entirely to rule-based
    rule_result = rule_based_categorize(description, transaction_type)
    return {
        "category": rule_result["category"],
        "confidence": rule_result["confidence"],
        "method": "rule_based",
        "is_suggestion": True,
        "requires_review": rule_result["confidence"] == "low",
    }
