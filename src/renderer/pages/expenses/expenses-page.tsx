import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api-client";
import { Heading } from "@/components/commons/heading";
import { Separator } from "@/components/ui/separator";
import { ExpenseTable } from "./components/expense-table";
import { ExpenseFilters } from "./components/expense-filters";
import { ExpenseCreateForm } from "./components/expense-create-form";

export function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: "all", search: "" });
  const [view, setView] = useState<"list" | "create">("list");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { pageSize: 50 };
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

  return (
    <div className="space-y-6 p-6">
      <Heading title="Expenses" description="Track and manage business expenses" />
      <Separator />
      <ExpenseFilters filters={filters} onFilterChange={setFilters} onCreateClick={() => setView("create")} />
      <ExpenseTable expenses={expenses} loading={loading} onRefresh={load} />
    </div>
  );
}
