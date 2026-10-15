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
  confidence: string;
  method: string;
  is_suggestion: boolean;
}
