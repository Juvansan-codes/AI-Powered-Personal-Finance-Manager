"use client";

import { TrendingUp, TrendingDown, Wallet, PiggyBank } from "lucide-react";
import { formatINR } from "@/lib/utils";
import type { FinancialSummary } from "@/types";

interface SummaryCardsProps {
  summary: FinancialSummary | null;
  loading: boolean;
}

export default function SummaryCards({ summary, loading }: SummaryCardsProps) {
  const cards = [
    {
      title: "Total Balance",
      value: summary?.balance ?? 0,
      icon: Wallet,
      color: "text-foreground",
      bgColor: "bg-muted",
      change: null,
    },
    {
      title: "Total Income",
      value: summary?.total_income ?? 0,
      icon: TrendingUp,
      color: "text-success",
      bgColor: "bg-success-light",
      change: null,
    },
    {
      title: "Total Expenses",
      value: summary?.total_expenses ?? 0,
      icon: TrendingDown,
      color: "text-danger",
      bgColor: "bg-danger-light",
      change: null,
    },
    {
      title: "Savings Rate",
      value: summary?.savings_rate ?? 0,
      icon: PiggyBank,
      color:
        (summary?.savings_rate ?? 0) >= 20
          ? "text-success"
          : (summary?.savings_rate ?? 0) >= 10
          ? "text-warning"
          : "text-danger",
      bgColor:
        (summary?.savings_rate ?? 0) >= 20
          ? "bg-success-light"
          : (summary?.savings_rate ?? 0) >= 10
          ? "bg-warning-light"
          : "bg-danger-light",
      isSavings: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.title}
            className="bg-white rounded-xl border border-border p-5 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground font-medium">
                {card.title}
              </p>
              <div className={`w-9 h-9 rounded-lg ${card.bgColor} flex items-center justify-center`}>
                <Icon className={`w-[18px] h-[18px] ${card.color}`} />
              </div>
            </div>
            {loading ? (
              <div className="h-8 bg-muted rounded animate-pulse" />
            ) : (
              <p className="text-2xl font-semibold text-foreground tracking-tight">
                {"isSavings" in card && card.isSavings
                  ? `${card.value.toFixed(1)}%`
                  : formatINR(card.value)}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
