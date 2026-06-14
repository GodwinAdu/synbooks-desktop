import { DataTable } from "@/components/table";
import { ShoppingBag } from "lucide-react";
import { getSalesOrderColumns } from "./sales-order-columns";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import type { SalesOrder } from "../types";

interface Props {
  orders: SalesOrder[];
  loading: boolean;
  onRefresh: () => void;
}

export function SalesOrderTable({ orders, loading, onRefresh }: Props) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  const columns = getSalesOrderColumns({
    onView: (order) => toast.info(`Viewing order ${order.orderNumber}`),
    onConfirm: (order) => {
      toast.success(`Order ${order.orderNumber} confirmed`);
      onRefresh();
    },
    onConvert: (order) => toast.info(`Converting order ${order.orderNumber} to invoice`),
    onCancel: (order) => {
      toast.success(`Order ${order.orderNumber} cancelled`);
      onRefresh();
    },
  });

  return (
    <DataTable
      columns={columns}
      data={orders}
      searchKey="orderNumber"
      searchPlaceholder="Search orders by number..."
      pageSize={20}
      emptyMessage="No sales orders found. Create an order to track customer purchases before invoicing."
      emptyIcon={<ShoppingBag className="size-10 text-muted-foreground/50 mb-2" />}
    />
  );
}
