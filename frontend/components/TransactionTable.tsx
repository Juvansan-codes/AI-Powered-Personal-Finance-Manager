"use client";

import { Trash2, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { formatINR, formatDate } from "@/lib/utils";
import type { Transaction } from "@/types";

interface TransactionTableProps {
  transactions: Transaction[];
  loading: boolean;
  onDelete: (id: string) => void;
}

export default function TransactionTable({
  transactions,
  loading,
  onDelete,
}: TransactionTableProps) {
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

  return (
    <div className="bg-white rounded-xl border border-border">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">
          Recent Transactions
        </h3>
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
            {transactions.slice(0, 15).map((txn) => (
              <tr
                key={txn.id}
                className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
              >
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
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
                      <p className="text-sm font-medium text-foreground">
                        {txn.description}
                      </p>
                      {txn.is_sample && (
                        <span className="text-[10px] text-muted-foreground">
                          Sample data
                        </span>
                      )}
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
