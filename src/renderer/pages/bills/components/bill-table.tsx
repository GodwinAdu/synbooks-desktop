/**
 * Bill Table
 * Uses the shared DataTable component with TanStack React Table for sorting, search, and pagination.
 */

import { DataTable } from "@/components/table";
import { CreditCard } from "lucide-react";
import { getBillColumns, type Bill } from "./bill-columns";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api-client";
import { toast } from "sonner";

interface Props {
  bills: Bill[];
  loading: boolean;
  onRefresh: () => void;
}

export function BillTable({ bills, loading, onRefresh }: Props) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  const columns = getBillColumns({
    onView: (bill) => console.log("View bill", bill.id),
    onEdit: (bill) => console.log("Edit bill", bill.id),
    onDelete: async (bill) => {
      try {
        await api.delete(`/bills/${bill.id}`);
        toast.success("Bill deleted");
        onRefresh();
      } catch (e: any) {
        toast.error(e.message || "Failed to delete bill");
      }
    },
  });

  return (
    <DataTable
      columns={columns}
      data={bills}
      searchKey="billNumber"
      searchPlaceholder="Search bills by number..."
      pageSize={20}
      emptyMessage="No bills found. Create your first bill to get started."
      emptyIcon={<CreditCard className="size-10 text-muted-foreground/50 mb-2" />}
    />
  );
}
