/**
 * Recurring Expenses Page - Main container
 * Automate repetitive expense generation.
 */

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api-client";
import { Heading } from "@/components/commons/heading";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Repeat, CheckCircle, CalendarClock, Info } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { RecurringExpenseTable } from "./components/recurring-expense-table";
import { RecurringExpenseCreateForm } from "./components/recurring-expense-create-form";
import { RecurringExpenseDetail } from "./components/recurring-expense-detail";
import type { RecurringExpense } from "./types";

export function RecurringExpensesPage() {
  const [expenses, setExpenses] = useState<RecurringExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "create" | "detail">("list");
  const [selectedExpense, setSelectedExpense] = useState<RecurringExpense | null>(null);

  const loadExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.get("/recurring-expenses", { pageSize: 100 }).catch(() => ({ data: [] }));
      setExpenses(result.data || []);
    } catch {
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadExpenses(); }, [loadExpenses]);

  if (view === "create") {
    return <RecurringExpenseCreateForm onBack={() => { setView("list"); loadExpenses(); }} />;
  }

  if (view === "detail" && selectedExpense) {
    return (
      <RecurringExpenseDetail
        expense={selectedExpense}
        onBack={() => { setView("list"); loadExpenses(); }}
      />
    );
  }

  const totalExpenses = expenses.length;
  const active = expenses.filter(e => e.isActive).length;
  const totalMonthly = expenses
    .filter(e => e.isActive)
    .reduce((sum, e) => {
      const amount = e.amount || 0;
      switch (e.frequency) {
        case "daily": return sum + amount * 30;
        case "weekly": return sum + amount * 4.33;
        case "monthly": return sum + amount;
        case "quarterly": return sum + amount / 3;
        case "yearly": return sum + amount / 12;
        default: return sum + amount;
      }
    }, 0);
  const nextDue = expenses
    .filter(e => e.isActive && e.nextExpenseDate)
    .sort((a, b) => new Date(a.nextExpenseDate).getTime() - new Date(b.nextExpenseDate).getTime())[0];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <Heading title="Recurring Expenses" description="Automate repetitive expense generation" />
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setView("create")}>
          <Plus className="h-4 w-4 mr-2" />
          New Recurring Expense
        </Button>
      </div>
      <Separator />

      {/* Info Alert */}
      <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
        <Info className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
        <p className="text-sm text-emerald-800 dark:text-emerald-300">
          Recurring expenses are automatically created at the scheduled frequency.
          Set up regular payments like rent, utilities, or subscriptions and they'll be recorded automatically.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Templates</CardTitle>
            <Repeat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalExpenses}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Est. Monthly</CardTitle>
            <span className="text-muted-foreground text-xs font-normal">$</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalMonthly)}</div>
            <p className="text-xs text-muted-foreground">Estimated monthly outflow</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Due</CardTitle>
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {nextDue ? formatDate(nextDue.nextExpenseDate) : "—"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <RecurringExpenseTable
        expenses={expenses}
        loading={loading}
        onRefresh={loadExpenses}
        onView={(e) => { setSelectedExpense(e); setView("detail"); }}
      />
    </div>
  );
}
