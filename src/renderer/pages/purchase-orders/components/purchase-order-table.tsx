import { DataTable } from "@/components/table";
import { ShoppingBag } from "lucide-react";
import { purchaseOrderColumns } from "./purchase-order-columns";
import { Skeleton } from "@/components/ui/skeleton";
import type { PurchaseOrder } from "../types";

interface Props {
  orders: PurchaseOrder[];
  loading: boolean;
  onRefresh: () => void;
}

export function PurchaseOrderTable({ orders, loading, onRefresh }: Props) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <DataTable
      columns={purchaseOrderColumns}
      data={orders}
      searchKey="poNumber"
      searchPlaceholder="Search purchase orders..."
      pageSize={20}
      emptyMessage="No purchase orders found. Create your first PO to get started."
      emptyIcon={<ShoppingBag className="size-10 text-muted-foreground/50 mb-2" />}
    />
  );
}
