"""Pydantic schemas for spending anomaly detection."""
from typing import Optional, List, Dict
from pydantic import BaseModel, Field


class BaselineStats(BaseModel):
    """Statistical baseline metrics for a spending category."""
    category: str
    mean: float = Field(..., description="Mean expenditure for this category")
    median: float = Field(..., description="Median expenditure for this category")
    std_dev: float = Field(0.0, description="Standard deviation")
    count: int = Field(..., description="Number of historical transactions analyzed")
    ratio: Optional[float] = Field(None, description="Ratio of transaction amount to category mean/median")


class AnomalyItem(BaseModel):
    """Details of a single transaction flagged as unusual."""
    transaction_id: str
    description: str
    amount: float
    category: str
    date: str
    is_anomaly: bool = True
    anomaly_score: float = Field(..., description="Normalized anomaly confidence (0.0 normal to 1.0 highly unusual)")
    severity: str = Field("medium", pattern="^(low|medium|high)$", description="Relative deviation severity")
    method: str = Field(..., description="Detection method used: 'isolation_forest' or 'statistical_baseline'")
    explanation: str = Field(..., description="Neutral human-readable explanation of why this is unusual")
    baseline_stats: Optional[BaselineStats] = None


class AnomalyReport(BaseModel):
    """Aggregate anomaly scan report over all transactions."""
    total_scanned: int
    anomalies_detected: int
    method_used: str = Field(..., description="Primary method: 'isolation_forest', 'statistical_baseline', or 'insufficient_data'")
    anomalies: List[AnomalyItem]
    category_baselines: Optional[Dict[str, BaselineStats]] = None


class AnomalyCheckRequest(BaseModel):
    """Payload to evaluate a draft/new transaction for unusual spending."""
    amount: float = Field(..., gt=0)
    category: str = Field(..., min_length=1)
    type: str = Field("expense", pattern="^(income|expense)$")
    description: Optional[str] = ""


class AnomalyCheckResponse(BaseModel):
    """Instant evaluation response for a single transaction."""
    is_anomaly: bool
    anomaly_score: float
    severity: Optional[str] = None
    explanation: Optional[str] = None
    baseline_stats: Optional[BaselineStats] = None
