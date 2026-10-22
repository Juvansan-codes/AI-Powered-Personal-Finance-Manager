"use client";

import { useState } from "react";
import { Trash2, ArrowUpRight, ArrowDownRight, AlertTriangle, Check } from "lucide-react";
import { formatINR, formatDate } from "@/lib/utils";
import type { Transaction, AnomalyItem } from "@/types";

interface TransactionTableProps {
  transactions: Transaction[];
  anomalies?: AnomalyItem[];
  loading: boolean;
  onDelete: (id: string) => void;
}

export default function TransactionTable({
  transactions,
  anomalies = [],
  loading,
  onDelete,
}: TransactionTableProps) {
  const [filterUnusual, setFilterUnusual] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Recent Transactions</h3>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-border p-8 text-center">
        <p className="text-muted-foreground text-sm">
          No transactions yet. Add your first transaction to get started.
        </p>
      </div>
    );
  }

  const activeAnomalies = anomalies.filter((a) => !dismissedIds.has(a.transaction_id));
  const anomalyMap = new Map(activeAnomalies.map((a) => [a.transaction_id, a]));

  const displayedTransactions = filterUnusual
    ? transactions.filter((t) => anomalyMap.has(t.id))
    : transactions;

  return (
    <div className="bg-white rounded-xl border border-border">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <h3 className="text-sm font-semibold text-foreground">
            Recent Transactions
          </h3>
          {filterUnusual && (
            <span className="text-xs px-2 py-0.5 rounded-md bg-accent/10 text-accent font-medium">
              Filtered: Unusual Only
            </span>
          )}
        </div>
        {activeAnomalies.length > 0 && (
          <button
            type="button"
            onClick={() => setFilterUnusual((prev) => !prev)}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all ${
              filterUnusual
                ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
            }`}
            title="Click to toggle filter for unusual transactions"
          >
            <AlertTriangle className={`w-3.5 h-3.5 ${filterUnusual ? "text-white" : "text-amber-600"}`} />
            <span className="font-medium">
              {activeAnomalies.length} unusual {filterUnusual ? "(showing)" : "(click to filter)"}
            </span>
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Description
              </th>
              <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Category
              </th>
              <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Date
              </th>
              <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Type
              </th>
              <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Amount
              </th>
              <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider w-12">
                &nbsp;
              </th>
            </tr>
          </thead>
          <tbody>
            {displayedTransactions.length === 0 && filterUnusual ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-xs text-muted-foreground">
                  No unusual transactions to display.
                </td>
              </tr>
            ) : (
              displayedTransactions.slice(0, 15).map((txn) => {
                const anomaly = anomalyMap.get(txn.id);
                return (
                <tr
                  key={txn.id}
                  className={`border-b border-border last:border-0 hover:bg-muted/50 transition-colors ${
                    anomaly ? "bg-amber-50/30" : ""
                  }`}
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          txn.type === "income" ? "bg-success-light" : "bg-danger-light"
                        }`}
                      >
                        {txn.type === "income" ? (
                          <ArrowUpRight className="w-4 h-4 text-success" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4 text-danger" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground">
                            {txn.description}
                          </p>
                          {anomaly && (
                            <div className="inline-flex items-center gap-1.5">
                              <span
                                title={anomaly.explanation}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-amber-100 text-amber-800 border border-amber-300 cursor-help"
                              >
                                <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                                Unusual
                              </span>
                              <button
                                type="button"
                                onClick={() => setDismissedIds((prev) => new Set(prev).add(txn.id))}
                                title="Acknowledge as expected (dismiss alert)"
                                className="text-[10px] text-muted-foreground hover:text-amber-800 underline transition-colors"
                              >
                                Dismiss
                              </button>
                            </div>
                          )}
                        </div>
                        {anomaly ? (
                          <p className="text-[11px] text-amber-700 mt-0.5 line-clamp-1" title={anomaly.explanation}>
                            {anomaly.explanation}
                          </p>
                        ) : txn.is_sample ? (
                          <span className="text-[10px] text-muted-foreground">
                            Sample data
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </td>
                <td className="px-5 py-3.5">
                  <span className="text-xs px-2 py-1 bg-muted rounded-md text-muted-foreground font-medium">
                    {txn.category}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-sm text-muted-foreground">
                  {formatDate(txn.date)}
                </td>
                <td className="px-5 py-3.5">
                  <span
                    className={`text-xs font-medium ${
                      txn.type === "income" ? "text-success" : "text-danger"
                    }`}
                  >
                    {txn.type === "income" ? "Income" : "Expense"}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <span
                    className={`text-sm font-semibold ${
                      txn.type === "income" ? "text-success" : "text-danger"
                    }`}
                  >
                    {txn.type === "income" ? "+" : "-"}
                    {formatINR(txn.amount)}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <button
                    onClick={() => onDelete(txn.id)}
                    className="p-1.5 rounded-md hover:bg-danger-light text-muted-foreground hover:text-danger transition-colors"
                    title="Delete transaction"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            );
          }))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
