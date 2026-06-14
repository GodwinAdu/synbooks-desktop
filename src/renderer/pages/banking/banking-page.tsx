import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api-client";
import { Heading } from "@/components/commons/heading";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, ArrowLeftRight, Landmark } from "lucide-react";
import { BankAccountCard } from "./components/bank-account-card";
import { TransactionTable } from "./components/transaction-table";
import { BankAccountCreate } from "./components/bank-account-create";
import { TransactionCreate } from "./components/transaction-create";
import { TransferForm } from "./components/transfer-form";
import { ReconciliationPage } from "./components/reconciliation-page";
import { BankRulesPage } from "./components/bank-rules-page";
import type { BankAccount, BankTransaction, BankingView } from "./types";

export function BankingPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<BankingView>("overview");
  const [activeTab, setActiveTab] = useState("overview");

  const loadAccounts = useCallback(() => {
    api
      .get("/banking/accounts")
      .then((res: any) => setAccounts(Array.isArray(res) ? res : res.data || []))
      .catch(console.error);
  }, []);

  const loadTransactions = useCallback(() => {
    api
      .get("/banking/transactions", { pageSize: 200 })
      .then((res: any) => setTransactions(res.data || []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    Promise.all([
      api
        .get("/banking/accounts")
        .then((res: any) => setAccounts(Array.isArray(res) ? res : res.data || [])),
      api
        .get("/banking/transactions", { pageSize: 200 })
        .then((res: any) => setTransactions(res.data || [])),
    ]).finally(() => setLoading(false));
  }, []);

  const handleBack = () => {
    setView("overview");
    loadAccounts();
    loadTransactions();
  };

  // Full-page create views
  if (view === "create-account") {
    return <BankAccountCreate onBack={handleBack} />;
  }
  if (view === "create-transaction") {
    return <TransactionCreate accounts={accounts} onBack={handleBack} />;
  }
  if (view === "transfer") {
    return <TransferForm accounts={accounts} onBack={handleBack} />;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Heading
          title="Banking"
          description="Manage bank accounts, transactions, and reconciliation"
        />
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setView("transfer")}
          >
            <ArrowLeftRight className="h-4 w-4 mr-2" />
            Transfer
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setView("create-transaction")}
          >
            <Plus className="h-4 w-4 mr-2" />
            Transaction
          </Button>
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={() => setView("create-account")}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Account
          </Button>
        </div>
      </div>
      <Separator />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
          <TabsTrigger value="rules">Bank Rules</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-4">
          {/* Bank Account Cards */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-40" />
              ))}
            </div>
          ) : accounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Landmark className="h-12 w-12 mb-4" />
              <p className="text-lg font-medium">No bank accounts</p>
              <p className="text-sm">
                Add your first bank account to get started.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {accounts.map((account) => (
                <BankAccountCard key={account.id} account={account} />
              ))}
            </div>
          )}

          {/* Recent Transactions */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Recent Transactions</h3>
            <TransactionTable
              transactions={transactions.slice(0, 20) as any}
              loading={loading}
              onRefresh={loadTransactions}
            />
          </div>
        </TabsContent>

        <TabsContent value="transactions" className="mt-4">
          <TransactionTable
            transactions={transactions as any}
            loading={loading}
            onRefresh={loadTransactions}
          />
        </TabsContent>

        <TabsContent value="reconciliation" className="mt-4">
          <ReconciliationPage
            accounts={accounts}
            transactions={transactions}
            onRefresh={loadTransactions}
          />
        </TabsContent>

        <TabsContent value="rules" className="mt-4">
          <BankRulesPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
