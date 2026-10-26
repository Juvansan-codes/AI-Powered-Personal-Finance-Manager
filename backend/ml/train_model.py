"""
Model Training Script — TF-IDF + Logistic Regression Transaction Classifier.

This script trains a scikit-learn pipeline for categorizing transaction descriptions
into the Oria category taxonomy. It uses TF-IDF vectorization with word-level
n-grams (unigrams + bigrams) and Logistic Regression.

Dataset: Curated synthetic training data (not real financial data).
The model is a prototype suitable for educational demonstration.

Usage:
    python -m ml.train_model

Outputs:
    - ml/artifacts/transaction_classifier.joblib  (fitted pipeline)
    - ml/artifacts/model_metadata.json            (version, categories, metrics)
"""
import json
import sys
from pathlib import Path
from datetime import datetime

import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedShuffleSplit
from sklearn.pipeline import Pipeline
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    f1_score,
)

# Paths
ML_DIR = Path(__file__).resolve().parent
DATA_PATH = ML_DIR / "data" / "transaction_categories.csv"
ARTIFACTS_DIR = ML_DIR / "artifacts"

RANDOM_SEED = 42


def preprocess_description(text: str) -> str:
    """
    Minimal, reproducible text preprocessing.
    - Lowercase
    - Strip extra whitespace
    - Preserve meaningful financial terms, merchant names, etc.

    Avoids aggressive stemming/lemmatization that could destroy useful signals
    like brand names (Swiggy, Zomato, Uber, etc.).
    """
    if not isinstance(text, str):
        return ""
    text = text.lower().strip()
    # Collapse multiple spaces
    text = " ".join(text.split())
    return text


def load_dataset(path: Path) -> pd.DataFrame:
    """Load and validate the labeled transaction dataset."""
    if not path.exists():
        print(f"ERROR: Dataset not found at {path}")
        sys.exit(1)

    df = pd.read_csv(path)

    required_cols = {"description", "category", "transaction_type"}
    missing = required_cols - set(df.columns)
    if missing:
        print(f"ERROR: Missing columns in dataset: {missing}")
        sys.exit(1)

    # Drop rows with missing values
    initial_len = len(df)
    df = df.dropna(subset=["description", "category", "transaction_type"])
    if len(df) < initial_len:
        print(f"WARNING: Dropped {initial_len - len(df)} rows with missing values.")

    # Apply preprocessing
    df["description_clean"] = df["description"].apply(preprocess_description)

    # Remove empty descriptions after preprocessing
    df = df[df["description_clean"].str.len() > 0]

    print(f"Loaded {len(df)} samples across {df['category'].nunique()} categories.")
    print("\nSamples per category:")
    for cat, count in df["category"].value_counts().items():
        print(f"  {cat}: {count}")

    return df


def train_model(df: pd.DataFrame) -> dict:
    """
    Train a TF-IDF + Logistic Regression pipeline.

    Uses stratified split to preserve class distribution in train/test sets.
    Returns a dict with the fitted pipeline, evaluation metrics, and metadata.
    """
    X = df["description_clean"].values
    y = df["category"].values

    # Stratified train/test split (80/20)
    # Using StratifiedShuffleSplit to handle potential small classes
    splitter = StratifiedShuffleSplit(n_splits=1, test_size=0.2, random_state=RANDOM_SEED)

    train_idx, test_idx = next(splitter.split(X, y))
    X_train, X_test = X[train_idx], X[test_idx]
    y_train, y_test = y[train_idx], y[test_idx]

    print(f"\nTrain set: {len(X_train)} samples")
    print(f"Test set:  {len(X_test)} samples")

    # Build pipeline: TF-IDF (unigrams + bigrams) → Logistic Regression
    pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(
            ngram_range=(1, 2),       # Unigrams and bigrams
            max_features=5000,        # Limit vocabulary size
            sublinear_tf=True,        # Apply sublinear TF scaling
            strip_accents="unicode",
            token_pattern=r"(?u)\b\w+\b",  # Include single-char tokens
        )),
        ("clf", LogisticRegression(
            max_iter=1000,
            random_state=RANDOM_SEED,
            solver="lbfgs",
            C=2.0,
        )),
    ])

    # Fit the pipeline
    print("\nTraining TF-IDF + Logistic Regression pipeline...")
    pipeline.fit(X_train, y_train)

    # Evaluate on test set
    y_pred = pipeline.predict(X_test)
    y_proba = pipeline.predict_proba(X_test)

    accuracy = accuracy_score(y_test, y_pred)
    macro_f1 = f1_score(y_test, y_pred, average="macro")
    weighted_f1 = f1_score(y_test, y_pred, average="weighted")

    # Detailed classification report
    report_dict = classification_report(y_test, y_pred, output_dict=True, zero_division=0)
    report_text = classification_report(y_test, y_pred, zero_division=0)

    print(f"\n{'='*60}")
    print("MODEL EVALUATION RESULTS")
    print(f"{'='*60}")
    print(f"Accuracy:     {accuracy:.4f}")
    print(f"Macro F1:     {macro_f1:.4f}")
    print(f"Weighted F1:  {weighted_f1:.4f}")
    print(f"\nPer-Category Classification Report:\n")
    print(report_text)

    # Identify categories with poor performance
    poor_categories = []
    for cat, metrics in report_dict.items():
        if cat in ("accuracy", "macro avg", "weighted avg"):
            continue
        if isinstance(metrics, dict) and metrics.get("f1-score", 1.0) < 0.7:
            poor_categories.append(cat)

    if poor_categories:
        print(f"\n[!] Categories with F1 < 0.70: {poor_categories}")
    else:
        print("\n[OK] All categories have F1 >= 0.70")

    # Determine a confidence threshold from validation predictions
    # Look at the max probability for correct vs incorrect predictions
    max_probas = np.max(y_proba, axis=1)
    correct_mask = y_pred == y_test
    if correct_mask.sum() > 0:
        correct_mean = float(np.mean(max_probas[correct_mask]))
    else:
        correct_mean = 0.5
    if (~correct_mask).sum() > 0:
        incorrect_mean = float(np.mean(max_probas[~correct_mask]))
    else:
        incorrect_mean = 0.5

    # Set threshold midway between average correct and incorrect confidence
    suggested_threshold = round((correct_mean + incorrect_mean) / 2, 2)
    # Clamp to a reasonable range
    suggested_threshold = max(0.3, min(0.8, suggested_threshold))

    print(f"\nConfidence Analysis:")
    print(f"  Mean max-prob (correct):   {correct_mean:.4f}")
    print(f"  Mean max-prob (incorrect): {incorrect_mean:.4f}")
    print(f"  Suggested threshold:       {suggested_threshold}")

    categories = sorted(pipeline.classes_.tolist())

    metadata = {
        "model_version": "1.0.0",
        "trained_at": datetime.utcnow().isoformat() + "Z",
        "random_seed": RANDOM_SEED,
        "dataset_path": str(DATA_PATH.name),
        "dataset_size": len(df),
        "train_size": len(X_train),
        "test_size": len(X_test),
        "split_method": "StratifiedShuffleSplit (80/20)",
        "categories": categories,
        "num_categories": len(categories),
        "pipeline_steps": ["TfidfVectorizer(ngram_range=(1,2))", "LogisticRegression(multinomial)"],
        "metrics": {
            "accuracy": round(accuracy, 4),
            "macro_f1": round(macro_f1, 4),
            "weighted_f1": round(weighted_f1, 4),
        },
        "confidence_threshold": suggested_threshold,
        "per_category_report": {
            k: v for k, v in report_dict.items()
            if k not in ("accuracy",)
        },
        "poor_categories": poor_categories,
        "limitations": [
            "Trained on synthetic/curated data, not real financial transactions.",
            "Small dataset (~300 samples) — this is a prototype, not production-grade.",
            "May not generalize well to unseen merchant names or phrasing styles.",
            "Confidence scores are model probabilities, not calibrated probabilities of correctness.",
        ],
    }

    return {
        "pipeline": pipeline,
        "metadata": metadata,
        "X_test": X_test,
        "y_test": y_test,
        "y_pred": y_pred,
        "y_proba": y_proba,
    }


def save_artifacts(pipeline, metadata: dict):
    """Save the fitted pipeline and metadata to disk."""
    import joblib

    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

    model_path = ARTIFACTS_DIR / "transaction_classifier.joblib"
    metadata_path = ARTIFACTS_DIR / "model_metadata.json"

    joblib.dump(pipeline, model_path)
    print(f"\n[OK] Model saved: {model_path}")

    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, default=str)
    print(f"[OK] Metadata saved: {metadata_path}")


def main():
    print("=" * 60)
    print("Oria - ML Transaction Categorizer Training")
    print("=" * 60)
    print(f"Dataset: {DATA_PATH}")
    print(f"Random Seed: {RANDOM_SEED}")
    print()

    df = load_dataset(DATA_PATH)
    results = train_model(df)

    save_artifacts(results["pipeline"], results["metadata"])

    print(f"\n{'='*60}")
    print("Training complete. Model ready for integration.")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
