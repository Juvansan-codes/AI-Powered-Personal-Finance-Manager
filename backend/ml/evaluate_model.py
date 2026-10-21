"""
Model Evaluation Script — Compare ML classifier vs Rule-based categorizer.

Evaluates the trained TF-IDF + Logistic Regression model on the held-out test set
and compares its performance against the existing rule-based categorizer.

Usage:
    python -m ml.evaluate_model

Outputs evaluation metrics, confusion matrix, and a side-by-side comparison.
"""
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
)
from sklearn.model_selection import StratifiedShuffleSplit

# Paths
ML_DIR = Path(__file__).resolve().parent
DATA_PATH = ML_DIR / "data" / "transaction_categories.csv"
ARTIFACTS_DIR = ML_DIR / "artifacts"
MODEL_PATH = ARTIFACTS_DIR / "transaction_classifier.joblib"
METADATA_PATH = ARTIFACTS_DIR / "model_metadata.json"

# Add backend to path for importing rule-based categorizer
BACKEND_DIR = ML_DIR.parent
sys.path.insert(0, str(BACKEND_DIR))

RANDOM_SEED = 42


def preprocess_description(text: str) -> str:
    """Same preprocessing as in train_model.py for consistency."""
    if not isinstance(text, str):
        return ""
    text = text.lower().strip()
    text = " ".join(text.split())
    return text


def load_model():
    """Load the trained model pipeline."""
    import joblib

    if not MODEL_PATH.exists():
        print(f"ERROR: Model artifact not found at {MODEL_PATH}")
        print("       Run 'python -m ml.train_model' first.")
        sys.exit(1)

    pipeline = joblib.load(MODEL_PATH)
    print(f"[OK] Loaded model from {MODEL_PATH}")
    return pipeline


def load_metadata() -> dict:
    """Load model metadata."""
    if not METADATA_PATH.exists():
        return {}
    with open(METADATA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def evaluate_ml_model(pipeline, X_test, y_test) -> dict:
    """Evaluate the ML model on the test set."""
    y_pred = pipeline.predict(X_test)
    y_proba = pipeline.predict_proba(X_test)

    accuracy = accuracy_score(y_test, y_pred)
    macro_f1 = f1_score(y_test, y_pred, average="macro", zero_division=0)
    weighted_f1 = f1_score(y_test, y_pred, average="weighted", zero_division=0)

    report_text = classification_report(y_test, y_pred, zero_division=0)
    report_dict = classification_report(y_test, y_pred, output_dict=True, zero_division=0)
    cm = confusion_matrix(y_test, y_pred, labels=sorted(set(y_test)))

    return {
        "accuracy": accuracy,
        "macro_f1": macro_f1,
        "weighted_f1": weighted_f1,
        "report_text": report_text,
        "report_dict": report_dict,
        "confusion_matrix": cm,
        "labels": sorted(set(y_test)),
        "y_pred": y_pred,
        "y_proba": y_proba,
    }


def evaluate_rule_based(X_test, y_test, transaction_types) -> dict:
    """Evaluate the rule-based categorizer on the same test set."""
    from app.ai.categorizer import categorize_transaction

    y_pred_rules = []
    for desc, txn_type in zip(X_test, transaction_types):
        result = categorize_transaction(desc, txn_type)
        y_pred_rules.append(result["category"])

    y_pred_rules = np.array(y_pred_rules)

    accuracy = accuracy_score(y_test, y_pred_rules)
    macro_f1 = f1_score(y_test, y_pred_rules, average="macro", zero_division=0)
    weighted_f1 = f1_score(y_test, y_pred_rules, average="weighted", zero_division=0)

    report_text = classification_report(y_test, y_pred_rules, zero_division=0)

    return {
        "accuracy": accuracy,
        "macro_f1": macro_f1,
        "weighted_f1": weighted_f1,
        "report_text": report_text,
        "y_pred": y_pred_rules,
    }


def print_confusion_matrix(cm, labels):
    """Print a formatted confusion matrix."""
    # Abbreviate labels for display
    short_labels = []
    for label in labels:
        if len(label) > 8:
            short_labels.append(label[:7] + ".")
        else:
            short_labels.append(label)

    header = "          " + " ".join(f"{l:>8s}" for l in short_labels)
    print(header)
    print("          " + "-" * (9 * len(labels)))

    for i, (label, row) in enumerate(zip(short_labels, cm)):
        row_str = " ".join(f"{v:8d}" for v in row)
        print(f"{label:>8s} | {row_str}")


def main():
    print("=" * 70)
    print("FinanceFlow - ML Model Evaluation & Comparison")
    print("=" * 70)

    # Load dataset with same split as training
    df = pd.read_csv(DATA_PATH)
    df = df.dropna(subset=["description", "category", "transaction_type"])
    df["description_clean"] = df["description"].apply(preprocess_description)
    df = df[df["description_clean"].str.len() > 0]

    X = df["description_clean"].values
    y = df["category"].values
    txn_types = df["transaction_type"].values

    # Reproduce the same split used in training
    splitter = StratifiedShuffleSplit(n_splits=1, test_size=0.2, random_state=RANDOM_SEED)
    train_idx, test_idx = next(splitter.split(X, y))
    X_test = X[test_idx]
    y_test = y[test_idx]
    txn_types_test = txn_types[test_idx]

    print(f"\nDataset: {len(df)} total samples, {len(X_test)} test samples")
    print(f"Categories: {len(set(y_test))}")

    # Evaluate ML model
    print(f"\n{'='*70}")
    print("ML MODEL (TF-IDF + Logistic Regression)")
    print(f"{'='*70}")

    pipeline = load_model()
    ml_results = evaluate_ml_model(pipeline, X_test, y_test)

    print(f"\nAccuracy:     {ml_results['accuracy']:.4f}")
    print(f"Macro F1:     {ml_results['macro_f1']:.4f}")
    print(f"Weighted F1:  {ml_results['weighted_f1']:.4f}")
    print(f"\nPer-Category Report:\n{ml_results['report_text']}")

    print("Confusion Matrix:")
    print_confusion_matrix(ml_results['confusion_matrix'], ml_results['labels'])

    # Evaluate rule-based
    print(f"\n{'='*70}")
    print("RULE-BASED CATEGORIZER (Keyword Matching)")
    print(f"{'='*70}")

    rule_results = evaluate_rule_based(X_test, y_test, txn_types_test)

    print(f"\nAccuracy:     {rule_results['accuracy']:.4f}")
    print(f"Macro F1:     {rule_results['macro_f1']:.4f}")
    print(f"Weighted F1:  {rule_results['weighted_f1']:.4f}")
    print(f"\nPer-Category Report:\n{rule_results['report_text']}")

    # Side-by-side comparison
    print(f"\n{'='*70}")
    print("COMPARISON: ML vs Rule-Based")
    print(f"{'='*70}")
    print(f"{'Metric':<18s} {'ML Model':>12s} {'Rule-Based':>12s} {'Difference':>12s}")
    print("-" * 56)

    for metric_name, key in [("Accuracy", "accuracy"), ("Macro F1", "macro_f1"), ("Weighted F1", "weighted_f1")]:
        ml_val = ml_results[key]
        rb_val = rule_results[key]
        diff = ml_val - rb_val
        sign = "+" if diff >= 0 else ""
        print(f"{metric_name:<18s} {ml_val:>11.4f}  {rb_val:>11.4f}  {sign}{diff:>10.4f}")

    # Sample disagreements
    print(f"\n{'='*70}")
    print("SAMPLE DISAGREEMENTS (ML vs Rule-Based)")
    print(f"{'='*70}")

    ml_pred = ml_results["y_pred"]
    rb_pred = rule_results["y_pred"]

    disagree_idx = np.where(ml_pred != rb_pred)[0]
    if len(disagree_idx) > 0:
        print(f"\n{len(disagree_idx)} disagreements out of {len(X_test)} test samples:\n")
        for idx in disagree_idx[:10]:
            correct = "[OK]" if ml_pred[idx] == y_test[idx] else "[X]"
            rb_correct = "[OK]" if rb_pred[idx] == y_test[idx] else "[X]"
            print(f"  \"{X_test[idx]}\"")
            print(f"    True: {y_test[idx]}")
            print(f"    ML:   {ml_pred[idx]} {correct}  |  Rules: {rb_pred[idx]} {rb_correct}")
            print()
    else:
        print("\nNo disagreements - both methods agree on all test samples.")

    # Summary
    print(f"\n{'='*70}")
    print("EVALUATION SUMMARY")
    print(f"{'='*70}")
    metadata = load_metadata()
    print(f"  Model version:        {metadata.get('model_version', 'N/A')}")
    print(f"  Dataset size:         {len(df)} samples")
    print(f"  Test set size:        {len(X_test)} samples")
    print(f"  Number of categories: {len(set(y_test))}")
    print(f"  Confidence threshold: {metadata.get('confidence_threshold', 'N/A')}")
    print(f"\n  Limitations:")
    for lim in metadata.get("limitations", []):
        print(f"    - {lim}")

    print(f"\n{'='*70}")
    print("Evaluation complete.")
    print(f"{'='*70}")


if __name__ == "__main__":
    main()
