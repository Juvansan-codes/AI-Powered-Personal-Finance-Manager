export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  date: string;
  created_at: string;
  is_sample: boolean;
}

export interface TransactionCreate {
  description: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  date: string;
}

export interface FinancialSummary {
  total_income: number;
  total_expenses: number;
  balance: number;
  savings_rate: number;
}

export interface CategorySpending {
  category: string;
  amount: number;
}

export interface MonthlyTrend {
  month: string;
  income: number;
  expenses: number;
}

export interface Insight {
  type: string;
  title: string;
  message: string;
  severity: "info" | "success" | "warning" | "danger";
}

export interface Budget {
  id: string;
  category: string;
  budget_limit: number;
  spent: number;
  remaining: number;
  percentage: number;
}

export interface CategorizeResult {
  category: string;
  confidence: string | number;
  method: string;
  is_suggestion: boolean;
  requires_review?: boolean;
}

export interface TranscriptionResponse {
  text: string;
  filename?: string;
}

export interface TransactionDraft {
  description?: string;
  amount?: number;
  type?: "income" | "expense";
  category?: string;
  date?: string;
  confidence?: string;
}

export interface VoiceExtractResponse {
  is_complete: boolean;
  missing_fields: string[];
  clarification_needed?: string;
  draft?: TransactionDraft;
  raw_text: string;
}

export interface AnomalyItem {
  transaction_id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  is_anomaly: boolean;
  anomaly_score: number;
  severity: "low" | "medium" | "high";
  method: string;
  explanation: string;
}

export interface AnomalyReport {
  total_scanned: number;
  anomalies_detected: number;
  method_used: string;
  anomalies: AnomalyItem[];
}

export interface AnomalyCheckResponse {
  is_anomaly: boolean;
  anomaly_score: number;
  severity?: "low" | "medium" | "high";
  explanation?: string;
}
