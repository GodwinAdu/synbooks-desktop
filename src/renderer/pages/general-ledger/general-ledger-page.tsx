import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { formatCurrency } from "@/lib/utils";
import { Heading } from "@/components/commons/heading";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info, BookOpen } from "lucide-react";
import { GLTable } from "./components/gl-table";
import type { GLTransaction } from "./types";

export function GeneralLedgerPage() {
  const [transactions, setTransactions] = useState<GLTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [accountFilter, setAccountFilter] = useState("");
  const [accounts, setAccounts] = useState<any[]>([]);

  useEffect(() => {
    // Load GL transactions
    api.get("/general-ledger", { pageSize: 500 })
      .then((res: any) => setTransactions(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));

    // Load accounts for filter
    api.get("/accounts", { pageSize: 500 })
      .then((res: any) => setAccounts(Array.isArray(res) ? res : res.data || []))
      .catch(console.error);
  }, []);

  // Filter by account if selected
  const filteredTransactions = accountFilter
    ? transactions.filter(t => t.accountId === accountFilter)
    : transactions;

  const totalDebits = filteredTransactions.reduce((sum, t) => sum + (t.debit || 0), 0);
  const totalCredits = filteredTransactions.reduce((sum, t) => sum + (t.credit || 0), 0);

  return (
    <div className="p-6 space-y-6">
      <Heading title="General Ledger" description="View all posted transactions across all accounts" />
      <Separator />

      {/* Summary Cards */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total Transactions</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{filteredTransactions.length.toLocaleString()}</div></CardContent>
        </Card>
        <Card className="bg-emerald-50 dark:bg-emerald-950/20">
          <CardHeader className="pb-2"><CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total Debits</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-emerald-600">{formatCurrency(totalDebits)}</div></CardContent>
        </Card>
        <Card className="bg-blue-50 dark:bg-blue-950/20">
          <CardHeader className="pb-2"><CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total Credits</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-blue-600">{formatCurrency(totalCredits)}</div></CardContent>
        </Card>
      </div>

      {/* Info Alert */}
      <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/20">
        <BookOpen className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
        <div className="text-sm text-green-800 dark:text-green-300">
          <p className="font-semibold mb-1">General Ledger Guide</p>
          <p><span className="font-medium">What is it?</span> The master record of every financial transaction, organised by account.</p>
          <p className="mt-1"><span className="font-medium">Debits & Credits:</span> Every transaction has equal debits and credits. If totals don't match, there's a data integrity issue.</p>
          <p className="mt-1 text-amber-700 dark:text-amber-400 font-medium">⚠️ The General Ledger is read-only — to correct entries, create a reversal journal entry.</p>
        </div>
      </div>

      {/* Account Filter */}
      <div className="flex items-center gap-3">
        <select value={accountFilter} onChange={e => setAccountFilter(e.target.value)}
          className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] min-w-[250px]">
          <option value="">All Accounts</option>
          {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.accountCode} - {a.accountName}</option>)}
        </select>
        {accountFilter && (
          <button onClick={() => setAccountFilter("")} className="text-xs text-muted-foreground hover:text-foreground underline">Clear filter</button>
        )}
      </div>

      {/* Table */}
      <GLTable transactions={filteredTransactions} loading={loading} />
    </div>
  );
}
