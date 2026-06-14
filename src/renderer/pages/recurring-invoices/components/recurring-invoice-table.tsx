import { DataTable } from "@/components/table";
import { Repeat } from "lucide-react";
import { getRecurringInvoiceColumns } from "./recurring-invoice-columns";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import type { RecurringInvoice } from "../types";

interface Props {
  templates: RecurringInvoice[];
  loading: boolean;
  onRefresh: () => void;
}

export function RecurringInvoiceTable({ templates, loading, onRefresh }: Props) {
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
    onView: (t) => toast.info(`Viewing template "${t.templateName}"`),
    onToggle: (t) => {
      toast.success(`Template "${t.templateName}" ${t.isActive ? "paused" : "resumed"}`);
      onRefresh();
    },
    onDelete: (t) => {
      toast.success(`Template "${t.templateName}" deleted`);
      onRefresh();
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
