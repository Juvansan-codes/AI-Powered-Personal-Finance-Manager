"use client";

import { formatINR } from "@/lib/utils";
import type { Budget } from "@/types";

interface BudgetOverviewProps {
  budgets: Budget[];
  loading: boolean;
}

export default function BudgetOverview({ budgets, loading }: BudgetOverviewProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Budget Overview</h3>
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (budgets.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-border p-8 text-center">
        <p className="text-muted-foreground text-sm">No budgets configured yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-border">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">
          Budget Overview
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">Current month spending vs budget</p>
      </div>
      <div className="p-5 space-y-4">
        {budgets.map((budget) => {
          const isOver = budget.percentage > 100;
          const isWarning = budget.percentage > 80 && budget.percentage <= 100;
          const barColor = isOver
            ? "bg-danger"
            : isWarning
            ? "bg-warning"
            : "bg-accent";
          const textColor = isOver
            ? "text-danger"
            : isWarning
            ? "text-warning"
            : "text-muted-foreground";

          return (
            <div key={budget.id}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-foreground">
                  {budget.category}
                </span>
                <span className={`text-xs font-medium ${textColor}`}>
                  {formatINR(budget.spent)} / {formatINR(budget.budget_limit)}
                </span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                  style={{
                    width: `${Math.min(budget.percentage, 100)}%`,
                  }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[11px] text-muted-foreground">
                  {budget.percentage.toFixed(0)}% used
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {budget.remaining >= 0
                    ? `${formatINR(budget.remaining)} remaining`
                    : `${formatINR(Math.abs(budget.remaining))} over`}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
