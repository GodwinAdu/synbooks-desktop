/**
 * Payroll Table
 * Uses the shared DataTable component with TanStack React Table for sorting, search, and pagination.
 */

import { DataTable } from "@/components/table";
import { DollarSign } from "lucide-react";
import { getPayrollColumns, type PayrollRun } from "./payroll-columns";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api-client";
import { toast } from "sonner";

interface Props {
  payrolls: PayrollRun[];
  loading: boolean;
  onRefresh: () => void;
}

export function PayrollTable({ payrolls, loading, onRefresh }: Props) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  const columns = getPayrollColumns({
    onView: (run) => console.log("View payroll run", run.id),
    onProcess: async (run) => {
      try {
        await api.post(`/payroll/${run.id}/process`);
        toast.success("Payroll run processing started");
        onRefresh();
      } catch (e: any) {
        toast.error(e.message || "Failed to process payroll");
      }
    },
    onCancel: async (run) => {
      try {
        await api.post(`/payroll/${run.id}/cancel`);
        toast.success("Payroll run cancelled");
        onRefresh();
      } catch (e: any) {
        toast.error(e.message || "Failed to cancel payroll");
      }
    },
  });

  return (
    <DataTable
      columns={columns}
      data={payrolls}
      searchKey="runNumber"
      searchPlaceholder="Search payroll runs..."
      pageSize={20}
      emptyMessage="No payroll runs found. Create your first payroll run to get started."
      emptyIcon={<DollarSign className="size-10 text-muted-foreground/50 mb-2" />}
    />
  );
}
