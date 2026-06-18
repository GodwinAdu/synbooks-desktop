import { DataTable } from "@/components/table";
import { Repeat } from "lucide-react";
import { getRecurringExpenseColumns } from "./recurring-expense-columns";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import type { RecurringExpense } from "../types";

interface Props {
  expenses: RecurringExpense[];
  loading: boolean;
  onRefresh: () => void;
  onView?: (expense: RecurringExpense) => void;
}

export function RecurringExpenseTable({ expenses, loading, onRefresh, onView }: Props) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  const columns = getRecurringExpenseColumns({
    onView: (e) => onView?.(e),
    onToggle: async (e) => {
      try {
        await api.put(`/recurring-expenses/${e.id}`, { isActive: e.isActive ? 0 : 1 });
        toast.success(`"${e.name}" ${e.isActive ? "paused" : "resumed"}`);
        onRefresh();
      } catch (err: any) {
        toast.error(err.message || "Failed to update");
      }
    },
    onGenerateNow: async (e) => {
      try {
        await api.post(`/recurring-expenses/${e.id}/generate`);
        toast.success(`Draft expense generated from "${e.name}"`);
        onRefresh();
      } catch (err: any) {
        toast.error(err.message || "Failed to generate expense");
      }
    },
    onDelete: async (e) => {
      if (!confirm(`Delete recurring expense "${e.name}"?`)) return;
      try {
        await api.delete(`/recurring-expenses/${e.id}`);
        toast.success(`"${e.name}" deleted`);
        onRefresh();
      } catch (err: any) {
        toast.error(err.message || "Failed to delete");
      }
    },
  });

  return (
    <DataTable
      columns={columns}
      data={expenses}
      searchKey="name"
      searchPlaceholder="Search recurring expenses by name..."
      pageSize={20}
      emptyMessage="No recurring expenses. Create one to automate regular payments."
      emptyIcon={<Repeat className="size-10 text-muted-foreground/50 mb-2" />}
    />
  );
}
