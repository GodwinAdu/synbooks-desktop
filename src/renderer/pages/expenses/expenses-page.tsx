import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api-client";
import { Heading } from "@/components/commons/heading";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info, DollarSign, Clock, CheckCircle, CalendarDays } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { ExpenseTable } from "./components/expense-table";
import { ExpenseFilters } from "./components/expense-filters";
import { ExpenseCreateForm } from "./components/expense-create-form";
import { ExpenseDetail } from "./components/expense-detail";
import type { Expense } from "./types";

export function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: "all", search: "" });
  const [view, setView] = useState<"list" | "create" | "detail">("list");
  const [selectedExpenseId, setSelectedExpenseId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { pageSize: 200 };
      if (filters.status !== "all") params.status = filters.status;
      const result = await api.get("/expenses", params);
      setExpenses(result.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  if (view === "create") {
    return <ExpenseCreateForm onBack={() => { setView("list"); load(); }} />;
  }

  if (view === "detail" && selectedExpenseId) {
    return <ExpenseDetail expenseId={selectedExpenseId} onBack={() => { setView("list"); load(); }} />;
  }

  const totalAmount = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const paid = expenses.filter(e => e.status === "paid").length;
  const pending = expenses.filter(e => e.status === "pending").length;
  const thisMonth = expenses.filter(e => {
    const d = new Date(e.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div className="space-y-6 p-6">
      <Heading title="Expenses" description="Track and manage business expenses" />
      <Separator />

      {/* Info */}
      <div className="flex items-start gap-3 rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-950/20">
        <Info className="h-5 w-5 text-orange-600 mt-0.5 shrink-0" />
        <p className="text-sm text-orange-800 dark:text-orange-300">
          Record expenses as pending, then approve and mark as paid to post them to General Ledger. Rejected expenses don't affect your accounts.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <DollarSign className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalAmount)}</div>
            <p className="text-xs text-muted-foreground mt-1">{expenses.length} expenses</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{paid}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <CalendarDays className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{thisMonth}</div>
          </CardContent>
        </Card>
      </div>

      <ExpenseFilters filters={filters} onFilterChange={setFilters} onCreateClick={() => setView("create")} />
      <ExpenseTable
        expenses={expenses}
        loading={loading}
        onRefresh={load}
        onView={(e) => { setSelectedExpenseId(e.id); setView("detail"); }}
      />
    </div>
  );
}
