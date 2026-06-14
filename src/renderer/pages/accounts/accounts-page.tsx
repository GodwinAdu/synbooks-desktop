/**
 * Chart of Accounts Page
 * Matches Next.js version with summary cards, info alert, table, and full-page create form.
 * Uses internal state to toggle between list view and form view (like journal-entries).
 */

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { formatCurrency } from "@/lib/utils";
import { Heading } from "@/components/commons/heading";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Info, Plus, Download } from "lucide-react";
import { AccountTable } from "./components/account-table";
import { AccountForm } from "./components/account-form";
import type { Account } from "./types";

type View = "list" | "create" | "edit";

export function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("list");
  const [editingAccount, setEditingAccount] = useState<Account | undefined>(undefined);

  const fetchAccounts = () => {
    setLoading(true);
    api.get("/accounts", { pageSize: 500 })
      .then((res: any) => setAccounts(Array.isArray(res) ? res : res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchAccounts(); }, []);

  const handleBack = () => {
    setView("list");
    setEditingAccount(undefined);
    fetchAccounts();
  };

  // Show create form
  if (view === "create") {
    return <AccountForm allAccounts={accounts} onBack={handleBack} onSuccess={fetchAccounts} />;
  }

  // Show edit form
  if (view === "edit" && editingAccount) {
    return <AccountForm initialData={editingAccount} allAccounts={accounts} onBack={handleBack} onSuccess={fetchAccounts} />;
  }

  // Summary by type
  const sumByType = (type: string) => accounts.filter(a => a.accountType === type).reduce((sum, a) => sum + (a.currentBalance || 0), 0);

  const summaryCards = [
    { label: "Total Assets", value: sumByType("asset"), color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/20" },
    { label: "Total Liabilities", value: sumByType("liability"), color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/20" },
    { label: "Total Equity", value: sumByType("equity"), color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/20" },
    { label: "Total Revenue", value: sumByType("revenue"), color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/20" },
    { label: "Total Expenses", value: sumByType("expense"), color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950/20" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Heading title={`Chart of Accounts (${accounts.length})`} description="Manage your accounting structure and accounts" />
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Download className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Export</span></Button>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setView("create")}>
            <Plus className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Add Account</span>
          </Button>
        </div>
      </div>
      <Separator />

      {/* Summary Cards */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {summaryCards.map(card => (
          <Card key={card.label} className={card.bg}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-lg sm:text-2xl font-bold ${card.color}`}>{formatCurrency(card.value)}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info Alert */}
      <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/20">
        <Info className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
        <div className="text-sm text-blue-800 dark:text-blue-300">
          <p className="font-semibold mb-1">Chart of Accounts Guide</p>
          <ul className="list-disc list-inside space-y-1">
            <li><span className="font-semibold">Assets:</span> What you own (Cash, Inventory, Equipment)</li>
            <li><span className="font-semibold">Liabilities:</span> What you owe (Loans, Accounts Payable)</li>
            <li><span className="font-semibold">Equity:</span> Owner's stake (Capital, Retained Earnings)</li>
            <li><span className="font-semibold">Revenue:</span> Income from sales and services</li>
            <li><span className="font-semibold">Expenses:</span> Costs of running your business</li>
            <li className="text-red-700 dark:text-red-400 font-semibold mt-2">⚠️ Cannot delete accounts with transactions - deactivate instead</li>
          </ul>
        </div>
      </div>

      {/* Table */}
      <AccountTable
        accounts={accounts}
        loading={loading}
        onEdit={(account) => { setEditingAccount(account); setView("edit"); }}
        onRefresh={fetchAccounts}
      />
    </div>
  );
}
