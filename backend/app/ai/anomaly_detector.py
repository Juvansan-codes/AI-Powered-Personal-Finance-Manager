"""
Spending Anomaly Detection Engine — AI & Statistical Outlier Identification.

According to project requirements:
- An anomaly means "unusual relative to available personal spending data", not fraud.
- Displays neutral, transparent explanations allowing users to review transactions.
- Uses a dual strategy:
    1. Statistical Baseline (Median, Robust Z-score, and Interquartile Range)
    2. Scikit-learn Isolation Forest (unsupervised tree-based anomaly scoring)
- Never accuses or implies fraud; reports objective relative multiples.
"""

import math
import logging
from typing import List, Dict, Any, Optional, Tuple
import numpy as np

from app.schemas.anomaly import (
    BaselineStats,
    AnomalyItem,
    AnomalyReport,
    AnomalyCheckResponse,
)

logger = logging.getLogger(__name__)

# Minimum transactions required to train an Isolation Forest
MIN_SAMPLES_FOR_ISOLATION_FOREST = 15


class SpendingAnomalyDetector:
    """
    Evaluates personal transactions against historical spending patterns
    to flag unusually high or erratic expenditures.
    """

    def __init__(self, contamination: float = 0.08):
        """
        Args:
            contamination: Expected fraction of anomalies in the dataset (0.01 to 0.15).
        """
        self.contamination = contamination
        self.category_baselines: Dict[str, BaselineStats] = {}
        self.global_stats: Optional[BaselineStats] = None
        self._iforest = None
        self._trained_samples_count = 0

    def calculate_baselines(self, transactions: List[Dict[str, Any]]) -> Dict[str, BaselineStats]:
        """
        Compute category-wise and global expense statistical profiles.
        """
        category_amounts: Dict[str, List[float]] = {}
        all_expense_amounts: List[float] = []

        for txn in transactions:
            # Only analyze expense transactions for spending anomalies
            if txn.get("type") != "expense":
                continue
            amt = float(txn.get("amount", 0.0))
            if amt <= 0:
                continue

            cat = str(txn.get("category", "Other")).strip() or "Other"
            category_amounts.setdefault(cat, []).append(amt)
            all_expense_amounts.append(amt)

        baselines: Dict[str, BaselineStats] = {}

        for cat, amounts in category_amounts.items():
            arr = np.array(amounts, dtype=float)
            mean_val = float(np.mean(arr))
            median_val = float(np.median(arr))
            std_val = float(np.std(arr, ddof=1)) if len(arr) > 1 else 0.0

            baselines[cat] = BaselineStats(
                category=cat,
                mean=round(mean_val, 2),
                median=round(median_val, 2),
                std_dev=round(std_val, 2),
                count=len(amounts),
                ratio=None,
            )

        if all_expense_amounts:
            global_arr = np.array(all_expense_amounts, dtype=float)
            self.global_stats = BaselineStats(
                category="All Expenses",
                mean=round(float(np.mean(global_arr)), 2),
                median=round(float(np.median(global_arr)), 2),
                std_dev=round(float(np.std(global_arr, ddof=1)) if len(global_arr) > 1 else 0.0, 2),
                count=len(all_expense_amounts),
                ratio=None,
            )

        self.category_baselines = baselines
        return baselines

    def _build_features(self, transactions: List[Dict[str, Any]]) -> Tuple[np.ndarray, List[Dict[str, Any]]]:
        """
        Extract numerical feature vectors for Isolation Forest training.
        Features per transaction:
          [amount, log(amount + 1), category_ratio, category_z_score]
        """
        feature_rows = []
        valid_txns = []

        for txn in transactions:
            if txn.get("type") != "expense":
                continue
            amt = float(txn.get("amount", 0.0))
            if amt <= 0:
                continue

            cat = str(txn.get("category", "Other")).strip() or "Other"
            stats = self.category_baselines.get(cat, self.global_stats)

            ref_val = max(stats.median, stats.mean, 1.0) if stats else 1.0
            ratio = amt / ref_val
            z_score = (amt - stats.mean) / (stats.std_dev or 1.0) if stats and stats.std_dev > 0 else 0.0

            features = [
                amt,
                math.log(amt + 1.0),
                ratio,
                z_score,
            ]
            feature_rows.append(features)
            valid_txns.append(txn)

        if not feature_rows:
            return np.empty((0, 4)), []

        return np.array(feature_rows, dtype=float), valid_txns

    def fit_isolation_forest(self, transactions: List[Dict[str, Any]]) -> bool:
        """
        Fit an IsolationForest model on available expense records if data size is sufficient.
        """
        X, valid_txns = self._build_features(transactions)
        self._trained_samples_count = len(valid_txns)

        if len(valid_txns) < MIN_SAMPLES_FOR_ISOLATION_FOREST:
            self._iforest = None
            return False

        try:
            from sklearn.ensemble import IsolationForest

            contamination = min(max(self.contamination, 0.01), 0.20)
            self._iforest = IsolationForest(
                n_estimators=100,
                contamination=contamination,
                random_state=42,
            )
            self._iforest.fit(X)
            return True
        except Exception as e:
            logger.warning(f"Failed to fit IsolationForest: {e}")
            self._iforest = None
            return False

    def _generate_explanation(
        self,
        amount: float,
        category: str,
        stats: Optional[BaselineStats],
        ratio: float,
        severity: str,
    ) -> str:
        """
        Generate a neutral, objective explanation for an unusual spending pattern.
        Adheres to engineering guidelines: never accuses of fraud or asserts guaranteed error.
        """
        ref_avg = stats.mean if stats else (self.global_stats.mean if self.global_stats else 0)
        
        if stats and stats.count >= 2:
            if severity == "high":
                return (
                    f"Noticeably higher than usual: ₹{amount:,.0f} is {ratio:.1f}× your typical "
                    f"{category} expense (average ₹{ref_avg:,.0f} across {stats.count} records)."
                )
            elif severity == "medium":
                return (
                    f"Above typical range: ₹{amount:,.0f} is {ratio:.1f}× your average {category} "
                    f"spending of ₹{ref_avg:,.0f}."
                )
            else:
                return (
                    f"Moderately elevated: ₹{amount:,.0f} is higher than your usual {category} "
                    f"spending (average ₹{ref_avg:,.0f})."
                )
        elif self.global_stats and self.global_stats.count > 0:
            return (
                f"Unusually large transaction: ₹{amount:,.0f} is {ratio:.1f}× higher than your "
                f"overall average expense of ₹{self.global_stats.mean:,.0f}."
            )
        else:
            return f"High amount of ₹{amount:,.0f} noted for {category}."

    def evaluate_single_expense(
        self,
        amount: float,
        category: str,
        description: str = "",
        date_str: str = "",
        txn_id: str = "draft",
    ) -> Optional[AnomalyItem]:
        """
        Evaluate a single expense against established baselines and (if available) Isolation Forest.
        """
        if amount <= 0:
            return None

        cat = category.strip() or "Other"
        stats = self.category_baselines.get(cat, self.global_stats)

        ref_val = max(stats.median, stats.mean, 1.0) if stats else 1.0
        ratio = amount / ref_val
        z_score = (amount - stats.mean) / (stats.std_dev or 1.0) if stats and stats.std_dev > 0 else 0.0

        # Method A: Statistical Decision
        is_stat_anomaly = False
        stat_severity = "low"
        stat_confidence = 0.0

        if stats and stats.count >= 3:
            if ratio >= 3.5 or z_score >= 3.0:
                is_stat_anomaly = True
                stat_severity = "high"
                stat_confidence = min(0.95, 0.70 + (ratio - 3.5) * 0.05)
            elif ratio >= 2.5 or z_score >= 2.2:
                is_stat_anomaly = True
                stat_severity = "medium"
                stat_confidence = min(0.85, 0.55 + (ratio - 2.5) * 0.10)
            elif ratio >= 2.0 or z_score >= 1.8:
                is_stat_anomaly = True
                stat_severity = "low"
                stat_confidence = 0.50
        elif self.global_stats and self.global_stats.count >= 5:
            # Cold-start fallback: compare against global expense distribution
            global_ratio = amount / max(self.global_stats.mean, 1.0)
            if global_ratio >= 4.0:
                is_stat_anomaly = True
                stat_severity = "high"
                stat_confidence = 0.85
                ratio = global_ratio
            elif global_ratio >= 2.8:
                is_stat_anomaly = True
                stat_severity = "medium"
                stat_confidence = 0.65
                ratio = global_ratio

        # Method B: Isolation Forest Decision (if available)
        is_ml_anomaly = False
        ml_score_norm = 0.0
        method_name = "statistical_baseline"

        if self._iforest is not None and stats:
            try:
                features = np.array([[amount, math.log(amount + 1.0), ratio, z_score]], dtype=float)
                # decision_function gives negative score for outliers, positive for inliers
                raw_score = float(self._iforest.decision_function(features)[0])
                # Convert raw_score (roughly -0.3 to +0.2) to normalized 0..1 where > 0.5 is anomalous
                ml_score_norm = max(0.0, min(1.0, 0.5 - (raw_score * 2.0)))
                
                # Flag if Isolation Forest says outlier (-1) AND category ratio is at least 1.8x
                # (Prevents flagging legitimate large expenses like Rent that are normal for their category)
                if self._iforest.predict(features)[0] == -1 and ratio >= 1.8:
                    is_ml_anomaly = True
                    method_name = "isolation_forest"
            except Exception as e:
                logger.debug(f"Isolation Forest inference error: {e}")

        # Final Decision: Combine ML and Statistical insights
        is_anomaly = is_ml_anomaly or is_stat_anomaly
        if not is_anomaly:
            return None

        # Determine consolidated severity and score
        final_severity = stat_severity
        if is_ml_anomaly and ml_score_norm > 0.75:
            final_severity = "high"
        elif is_ml_anomaly and final_severity == "low":
            final_severity = "medium"

        final_score = max(stat_confidence, ml_score_norm)
        if final_score < 0.5:
            final_score = 0.65

        explanation = self._generate_explanation(amount, cat, stats, ratio, final_severity)

        baseline_info = None
        if stats:
            baseline_info = BaselineStats(
                category=cat,
                mean=stats.mean,
                median=stats.median,
                std_dev=stats.std_dev,
                count=stats.count,
                ratio=round(ratio, 2),
            )

        return AnomalyItem(
            transaction_id=str(txn_id),
            description=description or "Expense",
            amount=round(amount, 2),
            category=cat,
            date=date_str or "",
            is_anomaly=True,
            anomaly_score=round(final_score, 2),
            severity=final_severity,
            method=method_name,
            explanation=explanation,
            baseline_stats=baseline_info,
        )

    def scan_all_transactions(self, transactions: List[Dict[str, Any]]) -> AnomalyReport:
        """
        Scan all transactions, calculate baselines, fit model if eligible,
        and return a structured AnomalyReport.
        """
        # Step 1: Calculate category baselines
        self.calculate_baselines(transactions)

        # Step 2: Fit IsolationForest if sample size allows
        has_ml = self.fit_isolation_forest(transactions)
        method_used = "isolation_forest" if has_ml else (
            "statistical_baseline" if len(self.category_baselines) > 0 else "insufficient_data"
        )

        anomalies: List[AnomalyItem] = []
        total_scanned = 0

        # Step 3: Scan each expense transaction
        for txn in transactions:
            if txn.get("type") != "expense":
                continue
            total_scanned += 1

            amt = float(txn.get("amount", 0.0))
            cat = str(txn.get("category", "Other")).strip() or "Other"
            desc = str(txn.get("description", ""))
            date_val = str(txn.get("date", ""))
            tid = str(txn.get("id", "unknown"))

            flagged = self.evaluate_single_expense(
                amount=amt,
                category=cat,
                description=desc,
                date_str=date_val,
                txn_id=tid,
            )
            if flagged:
                anomalies.append(flagged)

        # Sort anomalies by anomaly_score descending (most unusual first)
        anomalies.sort(key=lambda a: a.anomaly_score, reverse=True)

        return AnomalyReport(
            total_scanned=total_scanned,
            anomalies_detected=len(anomalies),
            method_used=method_used,
            anomalies=anomalies,
            category_baselines=self.category_baselines,
        )


def detect_spending_anomalies(transactions: List[Dict[str, Any]]) -> AnomalyReport:
    """Convenience helper to scan a transaction list for anomalies."""
    detector = SpendingAnomalyDetector()
    return detector.scan_all_transactions(transactions)


def check_transaction_anomaly(
    amount: float,
    category: str,
    historical_transactions: List[Dict[str, Any]],
    description: str = "",
) -> AnomalyCheckResponse:
    """Evaluate whether an incoming or draft expense would be unusual."""
    detector = SpendingAnomalyDetector()
    detector.calculate_baselines(historical_transactions)
    detector.fit_isolation_forest(historical_transactions)

    item = detector.evaluate_single_expense(
        amount=amount,
        category=category,
        description=description,
    )

    if not item:
        return AnomalyCheckResponse(
            is_anomaly=False,
            anomaly_score=0.0,
            severity=None,
            explanation=None,
            baseline_stats=detector.category_baselines.get(category),
        )

    return AnomalyCheckResponse(
        is_anomaly=True,
        anomaly_score=item.anomaly_score,
        severity=item.severity,
        explanation=item.explanation,
        baseline_stats=item.baseline_stats,
    )
