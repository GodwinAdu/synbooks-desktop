/**
 * Expense Table
 * Uses the shared DataTable component with TanStack React Table for sorting, search, and pagination.
 */

import { DataTable } from "@/components/table";
import { Receipt } from "lucide-react";
import { getExpenseColumns } from "./expense-columns";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import type { Expense } from "../types";

interface Props {
  expenses: Expense[];
  loading: boolean;
  onRefresh: () => void;
}

export function ExpenseTable({ expenses, loading, onRefresh }: Props) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  const columns = getExpenseColumns({
    onView: (expense) => console.log("View expense", expense.id),
    onApprove: async (expense) => {
      try {
        await api.post(`/expenses/${expense.id}/approve`);
        toast.success("Expense approved");
        onRefresh();
      } catch (e: any) {
        toast.error(e.message || "Failed to approve expense");
      }
    },
    onDelete: async (expense) => {
      try {
        await api.delete(`/expenses/${expense.id}`);
        toast.success("Expense deleted");
        onRefresh();
      } catch (e: any) {
        toast.error(e.message || "Failed to delete expense");
      }
    },
  });

  return (
    <DataTable
      columns={columns}
      data={expenses}
      searchKey="expenseNumber"
      searchPlaceholder="Search expenses..."
      pageSize={20}
      emptyMessage="No expenses found. Record your first expense to start tracking spending."
      emptyIcon={<Receipt className="size-10 text-muted-foreground/50 mb-2" />}
    />
  );
}
