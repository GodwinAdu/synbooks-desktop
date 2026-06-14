import { DataTable } from "@/components/table";
import { Calculator } from "lucide-react";
import { getEstimateColumns } from "./estimate-columns";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import type { Estimate } from "../types";

interface Props {
  estimates: Estimate[];
  loading: boolean;
  onRefresh: () => void;
}

export function EstimateTable({ estimates, loading, onRefresh }: Props) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  const columns = getEstimateColumns({
    onView: (est) => toast.info(`Viewing estimate ${est.estimateNumber}`),
    onConvert: (est) => toast.info(`Converting estimate ${est.estimateNumber} to invoice`),
    onDelete: (est) => {
      toast.success(`Estimate ${est.estimateNumber} deleted`);
      onRefresh();
    },
  });

  return (
    <DataTable
      columns={columns}
      data={estimates}
      searchKey="estimateNumber"
      searchPlaceholder="Search estimates by number..."
      pageSize={20}
      emptyMessage="No estimates found. Create your first estimate to get started."
      emptyIcon={<Calculator className="size-10 text-muted-foreground/50 mb-2" />}
    />
  );
}
