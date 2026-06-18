/**
 * Account Drill-Down Modal
 * Click any account in a report to see all its transactions.
 * Matches the Next.js AccountDrillDownModal with green gradient header.
 */

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";
import {
  Activity, X, ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, User,
} from "lucide-react";

interface Transaction {
  id: string;
  transactionDate: string;
  description: string;
  referenceType: string;
  referenceNumber: string;
  debit: number;
  credit: number;
  runningBalance: number;
  createdBy?: string;
}

interface AccountDrillDownProps {
  open: boolean;
  onClose: () => void;
  accountId: string;
  accountName: string;
  startDate?: string;
  endDate?: string;
}

const refTypeColors: Record<string, string> = {
  invoice: "bg-blue-50 text-blue-700 border-blue-200",
  bill: "bg-orange-50 text-orange-700 border-orange-200",
  payment: "bg-emerald-50 text-emerald-700 border-emerald-200",
  expense: "bg-red-50 text-red-700 border-red-200",
  payroll: "bg-purple-50 text-purple-700 border-purple-200",
  pos_sale: "bg-teal-50 text-teal-700 border-teal-200",
  manual: "bg-gray-50 text-gray-700 border-gray-200",
  period_close: "bg-indigo-50 text-indigo-700 border-indigo-200",
};

export function AccountDrillDownModal({ open, onClose, accountId, accountName, startDate, endDate }: AccountDrillDownProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !accountId) return;
    setLoading(true);
    const params: any = { accountId };
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    api.get("/reports/account-transactions", params)
      .then((res: any) => setTransactions(res.data || res || []))
      .catch(() => setTransactions([]))
      .finally(() => setLoading(false));
  }, [open, accountId, startDate, endDate]);

  const totalDebits = transactions.reduce((s, t) => s + (t.debit || 0), 0);
  const totalCredits = transactions.reduce((s, t) => s + (t.credit || 0), 0);
  const closingBalance = transactions.length > 0 ? transactions[transactions.length - 1].runningBalance || 0 : 0;

  const periodLabel = startDate && endDate
    ? `${new Date(startDate).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" })} – ${new Date(endDate).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" })}`
    : endDate ? `As of ${new Date(endDate).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" })}`
    : "All time";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="md:max-w-5xl w-[95vw] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Green gradient header */}
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-5 text-white">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Activity className="h-4 w-4 opacity-80" />
                <span className="text-xs font-medium uppercase tracking-widest opacity-80">Account Transactions</span>
              </div>
              <h2 className="text-xl font-bold">{accountName}</h2>
              <p className="text-sm opacity-75 mt-0.5">{periodLabel}</p>
            </div>
            <button onClick={onClose} className="rounded-full p-1.5 hover:bg-white/20 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Summary cards */}
          {!loading && transactions.length > 0 && (
            <div className="grid grid-cols-4 gap-3 mt-5">
              <div className="bg-white/10 backdrop-blur rounded-xl px-4 py-3">
                <p className="text-xs opacity-70 mb-1">Transactions</p>
                <p className="text-xl font-bold">{transactions.length}</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl px-4 py-3">
                <div className="flex items-center gap-1 text-xs opacity-70 mb-1">
                  <ArrowUpRight className="h-3 w-3" /> Total Debits
                </div>
                <p className="text-xl font-bold tabular-nums">{formatCurrency(totalDebits)}</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl px-4 py-3">
                <div className="flex items-center gap-1 text-xs opacity-70 mb-1">
                  <ArrowDownRight className="h-3 w-3" /> Total Credits
                </div>
                <p className="text-xl font-bold tabular-nums">{formatCurrency(totalCredits)}</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl px-4 py-3">
                <div className="flex items-center gap-1 text-xs opacity-70 mb-1">
                  {closingBalance >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  Closing Balance
                </div>
                <p className="text-xl font-bold tabular-nums">{formatCurrency(closingBalance)}</p>
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="h-8 w-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
              <p className="text-sm text-muted-foreground">Loading transactions...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <Activity className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">No transactions found</p>
              <p className="text-xs text-muted-foreground">No activity for this account in the selected period.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 sticky top-0">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Description</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Reference</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Debit</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Credit</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Balance</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t, idx) => {
                  const refColor = refTypeColors[t.referenceType?.toLowerCase()] ?? "bg-gray-50 text-gray-700 border-gray-200";
                  return (
                    <tr key={t.id || idx} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-xs text-muted-foreground">{idx + 1}</td>
                      <td className="px-4 py-3 whitespace-nowrap font-medium">
                        {new Date(t.transactionDate).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3 max-w-[220px]">
                        <p className="truncate" title={t.description}>{t.description}</p>
                      </td>
                      <td className="px-4 py-3">
                        {t.referenceType ? (
                          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${refColor}`}>
                            {t.referenceType.replace("_", " ")}
                            {t.referenceNumber && <span className="opacity-70">#{t.referenceNumber}</span>}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {t.debit > 0 ? (
                          <span className="font-semibold text-emerald-600">{formatCurrency(t.debit)}</span>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {t.credit > 0 ? (
                          <span className="font-semibold text-blue-600">{formatCurrency(t.credit)}</span>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        <span className={`font-semibold ${(t.runningBalance || 0) >= 0 ? "text-gray-800 dark:text-gray-200" : "text-red-600"}`}>
                          {formatCurrency(t.runningBalance || 0)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        {!loading && transactions.length > 0 && (
          <>
            <Separator />
            <div className="px-6 py-3 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">{transactions.length} transaction{transactions.length !== 1 ? "s" : ""}</span>
              <div className="flex items-center gap-6">
                <span className="text-muted-foreground">
                  Net: <span className={`font-semibold ${totalDebits - totalCredits >= 0 ? "text-emerald-600" : "text-blue-600"}`}>
                    {formatCurrency(Math.abs(totalDebits - totalCredits))}
                    {totalDebits - totalCredits >= 0 ? " Dr" : " Cr"}
                  </span>
                </span>
                <span className="text-muted-foreground">
                  Closing: <span className="font-semibold">{formatCurrency(closingBalance)}</span>
                </span>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
