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
  onView?: (expense: Expense) => void;
}

export function ExpenseTable({ expenses, loading, onRefresh, onView }: Props) {
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
    onView: (expense) => onView?.(expense),
    onApprove: async (expense) => {
      try {
        await api.post(`/expenses/${expense.id}/approve`);
        toast.success("Expense approved");
        onRefresh();
      } catch (e: any) { toast.error(e.message || "Failed"); }
    },
    onMarkPaid: async (expense) => {
      try {
        await api.post(`/expenses/${expense.id}/mark-paid`);
        toast.success("Expense marked as paid & posted to GL");
        onRefresh();
      } catch (e: any) { toast.error(e.message || "Failed"); }
    },
    onReject: async (expense) => {
      if (!confirm(`Reject expense ${expense.expenseNumber}?`)) return;
      try {
        await api.post(`/expenses/${expense.id}/reject`);
        toast.success("Expense rejected");
        onRefresh();
      } catch (e: any) { toast.error(e.message || "Failed"); }
    },
    onDelete: async (expense) => {
      if (!confirm(`Delete expense ${expense.expenseNumber}?`)) return;
      try {
        await api.delete(`/expenses/${expense.id}`);
        toast.success("Expense deleted");
        onRefresh();
      } catch (e: any) { toast.error(e.message || "Failed"); }
    },
  });

  return (
    <DataTable
      columns={columns}
      data={expenses}
      searchKey="expenseNumber"
      searchPlaceholder="Search expenses..."
      pageSize={20}
      emptyMessage="No expenses found. Record your first expense."
      emptyIcon={<Receipt className="size-10 text-muted-foreground/50 mb-2" />}
    />
  );
}
