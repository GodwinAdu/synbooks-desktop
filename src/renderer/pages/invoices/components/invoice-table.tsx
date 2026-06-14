/**
 * Invoice Table
 * Uses the shared DataTable component with TanStack React Table for sorting, search, and pagination.
 */

import { DataTable } from "@/components/table";
import { FileText } from "lucide-react";
import { getInvoiceColumns } from "./invoice-columns";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import type { Invoice, PaginationState } from "../types";

interface Props {
  invoices: Invoice[];
  loading: boolean;
  pagination: PaginationState;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
}

export function InvoiceTable({ invoices, loading, onRefresh }: Props) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  const columns = getInvoiceColumns({
    onView: (inv) => console.log("View", inv.id),
    onDelete: async (inv) => {
      try {
        await api.delete(`/invoices/${inv.id}`);
        toast.success("Invoice deleted");
        onRefresh();
      } catch (e: any) {
        toast.error(e.message || "Failed to delete");
      }
    },
    onSend: async (inv) => {
      try {
        await api.post(`/invoices/${inv.id}/send`);
        toast.success("Invoice marked as sent");
        onRefresh();
      } catch (e: any) {
        toast.error(e.message || "Failed to send");
      }
    },
  });

  return (
    <DataTable
      columns={columns}
      data={invoices}
      searchKey="invoiceNumber"
      searchPlaceholder="Search invoices by number..."
      pageSize={20}
      emptyMessage="No invoices found. Create your first invoice to get started."
      emptyIcon={<FileText className="size-10 text-muted-foreground/50 mb-2" />}
    />
  );
}
