import { DataTable } from "@/components/table";
import { FileOutput } from "lucide-react";
import { getCreditNoteColumns } from "./credit-note-columns";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { CreditNote } from "../types";

interface Props {
  creditNotes: CreditNote[];
  loading: boolean;
  onRefresh: () => void;
  onView?: (cn: CreditNote) => void;
}

export function CreditNoteTable({ creditNotes, loading, onRefresh, onView }: Props) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  const columns = getCreditNoteColumns({
    onView: (cn) => onView?.(cn),
    onApply: async (cn) => {
      if (!cn.invoiceId) {
        toast.error("No invoice linked to this credit note. Edit to link an invoice first.");
        return;
      }
      if (!confirm(`Apply ${formatCurrency(cn.totalAmount)} credit from ${cn.creditNoteNumber} to the linked invoice?`)) return;
      try {
        await api.post(`/credit-notes/${cn.id}/apply`, { invoiceId: cn.invoiceId });
        toast.success(`Credit note ${cn.creditNoteNumber} applied to invoice`);
        onRefresh();
      } catch (e: any) {
        toast.error(e.message || "Failed to apply credit note");
      }
    },
    onVoid: async (cn) => {
      if (!confirm(`Void credit note ${cn.creditNoteNumber}? This cannot be undone.`)) return;
      try {
        await api.post(`/credit-notes/${cn.id}/void`, {});
        toast.success(`Credit note ${cn.creditNoteNumber} voided`);
        onRefresh();
      } catch (e: any) {
        toast.error(e.message || "Failed to void credit note");
      }
    },
  });

  return (
    <DataTable
      columns={columns}
      data={creditNotes}
      searchKey="creditNoteNumber"
      searchPlaceholder="Search credit notes by number..."
      pageSize={20}
      emptyMessage="No credit notes found. Issue a credit note when you need to adjust an invoice."
      emptyIcon={<FileOutput className="size-10 text-muted-foreground/50 mb-2" />}
    />
  );
}
