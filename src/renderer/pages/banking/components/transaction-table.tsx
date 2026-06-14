/**
 * Transaction Table
 * Uses the shared DataTable component with TanStack React Table for sorting, search, and pagination.
 */

import { DataTable } from "@/components/table";
import { ArrowRightLeft } from "lucide-react";
import { getTransactionColumns, type BankTransaction } from "./transaction-columns";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api-client";
import { toast } from "sonner";

interface Props {
  transactions: BankTransaction[];
  loading: boolean;
  onRefresh: () => void;
}

export function TransactionTable({ transactions, loading, onRefresh }: Props) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  const columns = getTransactionColumns({
    onView: (tx) => console.log("View transaction", tx.id),
    onReconcile: async (tx) => {
      try {
        await api.post(`/banking/transactions/${tx.id}/reconcile`);
        toast.success("Transaction reconciled");
        onRefresh();
      } catch (e: any) {
        toast.error(e.message || "Failed to reconcile transaction");
      }
    },
  });

  return (
    <DataTable
      columns={columns}
      data={transactions}
      searchKey="description"
      searchPlaceholder="Search transactions..."
      pageSize={15}
      emptyMessage="No transactions found."
      emptyIcon={<ArrowRightLeft className="size-10 text-muted-foreground/50 mb-2" />}
    />
  );
}
