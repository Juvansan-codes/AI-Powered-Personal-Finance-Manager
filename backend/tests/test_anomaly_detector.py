"""
Unit and integration tests for Spending Anomaly Detection Engine.
"""
import pytest
from app.ai.anomaly_detector import (
    SpendingAnomalyDetector,
    detect_spending_anomalies,
    check_transaction_anomaly,
)


@pytest.fixture
def sample_transactions():
    """Representative transaction dataset with normal spending and 2 deliberate outliers."""
    txns = []

    # 10 Food transactions: typical spend ₹150 - ₹350
    for i in range(10):
        txns.append({
            "id": f"food-{i}",
            "amount": 200.0 + (i * 15),
            "category": "Food",
            "type": "expense",
            "date": f"2026-10-{10+i:02d}",
            "description": f"Food expense {i}",
        })

    # 1 Outlier Food transaction: ₹4,500 (15x typical spend)
    txns.append({
        "id": "food-outlier",
        "amount": 4500.0,
        "category": "Food",
        "type": "expense",
        "date": "2026-10-21",
        "description": "Expensive luxury buffet dinner",
    })

    # 5 Transportation transactions: typical spend ₹80 - ₹150
    for i in range(5):
        txns.append({
            "id": f"transport-{i}",
            "amount": 100.0 + (i * 10),
            "category": "Transportation",
            "type": "expense",
            "date": f"2026-10-{10+i:02d}",
            "description": f"Cab ride {i}",
        })

    # 3 Rent transactions: ₹15,000 each (Normal high expense)
    for i in range(3):
        txns.append({
            "id": f"rent-{i}",
            "amount": 15000.0,
            "category": "Rent",
            "type": "expense",
            "date": f"2026-0{8+i}-01",
            "description": "Monthly apartment rent",
        })

    # 1 Income transaction (should be ignored by expense anomaly detector)
    txns.append({
        "id": "income-1",
        "amount": 50000.0,
        "category": "Salary",
        "type": "income",
        "date": "2026-10-01",
        "description": "Monthly stipend",
    })

    return txns


def test_baseline_calculation(sample_transactions):
    """Verify statistical baseline profiles are accurately computed."""
    detector = SpendingAnomalyDetector()
    baselines = detector.calculate_baselines(sample_transactions)

    assert "Food" in baselines
    assert baselines["Food"].count == 11  # 10 normal + 1 outlier
    assert "Rent" in baselines
    assert baselines["Rent"].mean == 15000.0
    assert baselines["Rent"].median == 15000.0
    assert baselines["Transportation"].count == 5


def test_outlier_detection(sample_transactions):
    """Verify extreme expense is flagged and normal expenses are preserved."""
    report = detect_spending_anomalies(sample_transactions)

    assert report.total_scanned == 19  # 19 expenses, 1 income excluded
    assert report.anomalies_detected >= 1

    # Find the food outlier
    flagged_ids = [a.transaction_id for a in report.anomalies]
    assert "food-outlier" in flagged_ids

    # Find specific item
    outlier_item = next(a for a in report.anomalies if a.transaction_id == "food-outlier")
    assert outlier_item.category == "Food"
    assert outlier_item.amount == 4500.0
    assert outlier_item.severity in ("medium", "high")
    assert outlier_item.anomaly_score >= 0.70

    # Normal rent should NOT be flagged even though it's ₹15,000, because it's normal for Rent
    assert "rent-0" not in flagged_ids
    assert "rent-1" not in flagged_ids
    assert "rent-2" not in flagged_ids


def test_neutral_explanation_tone(sample_transactions):
    """Verify explanations comply with academic guidance (neutral, no fraud accusations)."""
    report = detect_spending_anomalies(sample_transactions)
    for anomaly in report.anomalies:
        text = anomaly.explanation.lower()
        assert "fraud" not in text
        assert "suspicious" not in text
        assert "illegal" not in text
        assert "crime" not in text
        assert "typical" in text or "average" in text or "range" in text


def test_isolation_forest_activation(sample_transactions):
    """Verify Isolation Forest activates when sample size >= 15."""
    detector = SpendingAnomalyDetector()
    report = detector.scan_all_transactions(sample_transactions)

    # 19 expense transactions > 15 sample threshold
    assert detector._iforest is not None
    assert report.method_used == "isolation_forest"


def test_check_transaction_anomaly_draft(sample_transactions):
    """Verify real-time check on incoming transaction drafts."""
    # Test 1: Normal coffee expense
    normal_res = check_transaction_anomaly(
        amount=180.0,
        category="Food",
        historical_transactions=sample_transactions,
        description="Cold coffee",
    )
    assert normal_res.is_anomaly is False

    # Test 2: Extreme food expense
    unusual_res = check_transaction_anomaly(
        amount=3800.0,
        category="Food",
        historical_transactions=sample_transactions,
        description="Fancy party dinner",
    )
    assert unusual_res.is_anomaly is True
    assert unusual_res.severity in ("medium", "high")
    assert "higher" in unusual_res.explanation.lower()


def test_cold_start_empty_transactions():
    """Verify detector handles empty or single transaction gracefully."""
    report = detect_spending_anomalies([])
    assert report.total_scanned == 0
    assert report.anomalies_detected == 0
    assert report.method_used == "insufficient_data"

    single_report = detect_spending_anomalies([
        {"id": "1", "amount": 100.0, "category": "Food", "type": "expense", "date": "2026-10-20"}
    ])
    assert single_report.total_scanned == 1
    assert single_report.anomalies_detected == 0
