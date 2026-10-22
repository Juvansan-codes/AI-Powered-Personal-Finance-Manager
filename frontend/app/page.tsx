"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, CalendarDays, RefreshCw, Mic } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import SummaryCards from "@/components/SummaryCards";
import SpendingCharts from "@/components/SpendingCharts";
import TransactionTable from "@/components/TransactionTable";
import BudgetOverview from "@/components/BudgetOverview";
import InsightsPanel from "@/components/InsightsPanel";
import AddTransactionDialog from "@/components/AddTransactionDialog";
import { api } from "@/lib/api";
import type {
  Transaction,
  FinancialSummary,
  CategorySpending,
  MonthlyTrend,
  Insight,
  Budget,
  AnomalyItem,
} from "@/types";

const PAGE_TITLES: Record<string, string> = {
  overview: "Overview",
  transactions: "Transactions",
  budgets: "Budgets",
  analytics: "Analytics",
};

export default function Dashboard() {
  const [currentPage, setCurrentPage] = useState("overview");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [startWithVoice, setStartWithVoice] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Data
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [categorySpending, setCategorySpending] = useState<CategorySpending[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyTrend[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyItem[]>([]);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [txns, sum, cats, monthly, ins, budg, anomReport] = await Promise.all([
        api.getTransactions(),
        api.getSummary(),
        api.getCategorySpending(),
        api.getMonthlyTrend(),
        api.getInsights(),
        api.getBudgets(),
        api.getAnomalies().catch(() => ({ anomalies: [] })),
      ]);
      setTransactions(txns);
      setSummary(sum);
      setCategorySpending(cats);
      setMonthlyTrend(monthly);
      setInsights(ins);
      setBudgets(budg);
      setAnomalies(anomReport?.anomalies || []);
    } catch (err: any) {
      setError(
        "Could not connect to the backend. Make sure the FastAPI server is running on http://localhost:8000"
      );
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleDelete = async (id: string) => {
    try {
      await api.deleteTransaction(id);
      fetchAll();
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const [today, setToday] = useState("");

  useEffect(() => {
    setToday(
      new Date().toLocaleDateString("en-IN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    );
  }, []);

  return (
    <div className="flex min-h-screen bg-[#fafafa]">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />

      <main className="flex-1 min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-sm border-b border-border">
          <div className="px-6 lg:px-8 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-foreground">
                {PAGE_TITLES[currentPage] || "Overview"}
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">{today}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchAll}
                className="p-2 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="Refresh data"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setStartWithVoice(true);
                  setShowAddDialog(true);
                }}
                className="flex items-center gap-2 px-3.5 py-2 border border-accent/30 bg-accent/10 hover:bg-accent/20 text-accent rounded-lg text-sm font-medium transition-colors"
                title="Speak to add transaction"
              >
                <Mic className="w-4 h-4" />
                <span>Voice Entry</span>
              </button>
              <button
                onClick={() => {
                  setStartWithVoice(false);
                  setShowAddDialog(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-dark text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Transaction
              </button>
            </div>
          </div>
        </header>

        {/* Error Banner */}
        {error && (
          <div className="mx-6 lg:mx-8 mt-4 px-4 py-3 bg-danger-light border border-danger/20 rounded-lg text-sm text-danger">
            {error}
          </div>
        )}

        {/* Content */}
        <div className="px-6 lg:px-8 py-6 space-y-6">
          {/* Overview / Analytics pages */}
          {(currentPage === "overview" || currentPage === "analytics") && (
            <>
              <SummaryCards summary={summary} loading={loading} />
              <SpendingCharts
                categorySpending={categorySpending}
                monthlyTrend={monthlyTrend}
                loading={loading}
              />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <TransactionTable
                    transactions={transactions}
                    anomalies={anomalies}
                    loading={loading}
                    onDelete={handleDelete}
                  />
                </div>
                <div className="space-y-4">
                  <InsightsPanel insights={insights} loading={loading} />
                  <BudgetOverview budgets={budgets} loading={loading} />
                </div>
              </div>
            </>
          )}

          {/* Transactions page */}
          {currentPage === "transactions" && (
            <>
              <SummaryCards summary={summary} loading={loading} />
              <TransactionTable
                transactions={transactions}
                anomalies={anomalies}
                loading={loading}
                onDelete={handleDelete}
              />
            </>
          )}

          {/* Budgets page */}
          {currentPage === "budgets" && (
            <>
              <SummaryCards summary={summary} loading={loading} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <BudgetOverview budgets={budgets} loading={loading} />
                <InsightsPanel insights={insights} loading={loading} />
              </div>
            </>
          )}
        </div>
      </main>

      {/* Add Transaction Dialog */}
      <AddTransactionDialog
        open={showAddDialog}
        onClose={() => {
          setShowAddDialog(false);
          setStartWithVoice(false);
        }}
        onAdded={fetchAll}
        startWithVoice={startWithVoice}
      />
    </div>
  );
}
