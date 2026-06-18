import { DataTable } from "@/components/table";
import { Repeat } from "lucide-react";
import { getRecurringInvoiceColumns } from "./recurring-invoice-columns";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import type { RecurringInvoice } from "../types";

interface Props {
  templates: RecurringInvoice[];
  loading: boolean;
  onRefresh: () => void;
  onView?: (template: RecurringInvoice) => void;
}

export function RecurringInvoiceTable({ templates, loading, onRefresh, onView }: Props) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  const columns = getRecurringInvoiceColumns({
    onView: (t) => onView?.(t),
    onToggle: async (t) => {
      try {
        await api.put(`/recurring-invoices/${t.id}`, { isActive: t.isActive ? 0 : 1 });
        toast.success(`Template "${t.templateName}" ${t.isActive ? "paused" : "resumed"}`);
        onRefresh();
      } catch (e: any) {
        toast.error(e.message || "Failed to update");
      }
    },
    onGenerateNow: async (t) => {
      try {
        await api.post(`/recurring-invoices/${t.id}/generate`);
        toast.success(`Draft invoice generated from "${t.templateName}"`);
        onRefresh();
      } catch (e: any) {
        toast.error(e.message || "Failed to generate invoice");
      }
    },
    onDelete: async (t) => {
      if (!confirm(`Delete template "${t.templateName}"?`)) return;
      try {
        await api.delete(`/recurring-invoices/${t.id}`);
        toast.success(`Template "${t.templateName}" deleted`);
        onRefresh();
      } catch (e: any) {
        toast.error(e.message || "Failed to delete");
      }
    },
  });

  return (
    <DataTable
      columns={columns}
      data={templates}
      searchKey="templateName"
      searchPlaceholder="Search templates by name..."
      pageSize={20}
      emptyMessage="No recurring invoice templates. Create one to automate repetitive invoicing."
      emptyIcon={<Repeat className="size-10 text-muted-foreground/50 mb-2" />}
    />
  );
}
