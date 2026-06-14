import { DataTable } from "@/components/table";
import { FileOutput } from "lucide-react";
import { getCreditNoteColumns } from "./credit-note-columns";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import type { CreditNote } from "../types";

interface Props {
  creditNotes: CreditNote[];
  loading: boolean;
  onRefresh: () => void;
}

export function CreditNoteTable({ creditNotes, loading, onRefresh }: Props) {
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
    onView: (cn) => toast.info(`Viewing credit note ${cn.creditNoteNumber}`),
    onApply: (cn) => toast.info(`Applying credit note ${cn.creditNoteNumber}`),
    onVoid: (cn) => {
      toast.success(`Credit note ${cn.creditNoteNumber} voided`);
      onRefresh();
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
