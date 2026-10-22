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

export interface AssistantChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  tools_used?: {
    tool_name: string;
    arguments: Record<string, any>;
    summary?: string;
  }[];
  timestamp: string;
}

export interface AssistantChatRequest {
  message: string;
  history?: { role: string; content: string }[];
}

export interface AssistantChatResponse {
  reply: string;
  tools_used: {
    tool_name: string;
    arguments: Record<string, any>;
    summary?: string;
  }[];
  suggestions: string[];
}

export interface AssistantSuggestionItem {
  id: string;
  label: string;
  prompt: string;
  category: string;
}

export interface UserProfile {
  name: string;
  initials: string;
  email: string;
  role: string;
  plan_tier: string;
  avatar_color?: string;
}

export interface QuotaMetricItem {
  limit: number;
  used: number;
  remaining: number;
  percent_used: number;
}

export interface AudioQuotaItem {
  limit_minutes: number;
  used_minutes: number;
  remaining_minutes: number;
  percent_used: number;
}

export interface ModelQuotaResponse {
  user_profile: UserProfile;
  groq_status: {
    connected: boolean;
    masked_key: string;
    active_llm_model: string;
    active_stt_model: string;
    provider: string;
  };
  quota_metrics: {
    plan_name: string;
    resets_in: string;
    tpm: QuotaMetricItem;
    rpm: QuotaMetricItem;
    audio: AudioQuotaItem;
    tool_calls_today: number;
    total_requests_today: number;
  };
  database: {
    type: string;
    status: string;
    sync_mode: string;
  };
  available_models: {
    id: string;
    name: string;
    context: string;
    speed: string;
  }[];
}

export interface TestConnectionResponse {
  status: string;
  latency_ms: number;
  model: string;
  message: string;
}

