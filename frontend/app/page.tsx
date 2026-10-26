"use client";

import { useState, useEffect, useCallback } from "react";
import type { User } from "@supabase/supabase-js";
import { Plus, CalendarDays, RefreshCw, Mic } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import SummaryCards from "@/components/SummaryCards";
import TransactionTable from "@/components/TransactionTable";
import BudgetOverview from "@/components/BudgetOverview";
import InsightsPanel from "@/components/InsightsPanel";
import AddTransactionDialog from "@/components/AddTransactionDialog";
import AssistantChat from "@/components/AssistantChat";
import DashboardOverview from "@/components/DashboardOverview";
import AnalyticsView from "@/components/AnalyticsView";
import SettingsView from "@/components/SettingsView";
import PetCompanion from "@/components/PetCompanion";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import AuthScreen from "@/components/AuthScreen";
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
  overview: "Overview Dashboard",
  transactions: "Transactions Registry",
  budgets: "Monthly Budgets",
  analytics: "Financial Analytics & Outliers",
  assistant: "AI Financial Assistant",
  settings: "Settings & Model Quotas",
};

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState("overview");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [startWithVoice, setStartWithVoice] = useState(false);
  const [showPet, setShowPet] = useState(false);
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
    if (!user) return;
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
  }, [user]);

  useEffect(() => {
    if (!supabase) { setAuthLoading(false); return; }
    supabase.auth.getUser().then(({ data }) => { setUser(data.user); setAuthLoading(false); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => { if (user) fetchAll(); }, [user, fetchAll]);

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

  if (authLoading) return <main className="auth-shell">Loading…</main>;
  if (!user) return <AuthScreen />;

  const accountName = user.user_metadata?.full_name || user.email?.split("@")[0] || "there";
  const accountEmail = user.email || "";

  return (
    <div className="flex min-h-screen bg-[#fafafa]">
      <Sidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        showPet={showPet}
        onTogglePet={() => setShowPet((prev) => !prev)}
        user={user}
        onSignOut={() => supabase?.auth.signOut()}
      />

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
                <RefreshCw className={loading ? "w-4 h-4 animate-spin" : "w-4 h-4"} />
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
                className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-dark text-white rounded-lg text-sm font-medium transition-colors shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Add Transaction</span>
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

        {/* Main Content Area */}
        <div className="px-6 lg:px-8 py-6 space-y-6">
          {/* 1. Distinct Overview Dashboard */}
          {currentPage === "overview" && (
            <DashboardOverview
              summary={summary}
              transactions={transactions}
              budgets={budgets}
              insights={insights}
              anomalies={anomalies}
              loading={loading}
              userName={accountName}
              onNavigate={setCurrentPage}
            />
          )}

          {/* 2. Distinct Deep Analytics & Machine Learning Outliers */}
          {currentPage === "analytics" && (
            <AnalyticsView
              categorySpending={categorySpending}
              monthlyTrend={monthlyTrend}
              summary={summary}
              transactions={transactions}
              anomalies={anomalies}
              loading={loading}
            />
          )}

          {/* 3. Transactions Registry */}
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

          {/* 4. Budgets Management */}
          {currentPage === "budgets" && (
            <>
              <SummaryCards summary={summary} loading={loading} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <BudgetOverview budgets={budgets} loading={loading} />
                <InsightsPanel insights={insights} loading={loading} />
              </div>
            </>
          )}

          {/* 5. Conversational AI Assistant */}
          {currentPage === "assistant" && (
            <AssistantChat />
          )}

          {/* 6. Settings & Model Quotas (Reference-styled) */}
          {currentPage === "settings" && (
            <SettingsView
              userName={accountName}
              userEmail={accountEmail}
              onRefreshData={fetchAll}
              showPet={showPet}
              onTogglePet={() => setShowPet((prev) => !prev)}
            />
          )}
        </div>
      </main>

      {/* Floating Desktop Pet Mascot */}
      <PetCompanion
        visible={showPet}
        onClose={() => setShowPet(false)}
        savingsRate={summary?.savings_rate}
        balance={summary?.balance}
      />

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
