import { DataTable } from "@/components/table";
import { ShoppingBag } from "lucide-react";
import { getSalesOrderColumns } from "./sales-order-columns";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { formatCurrency } from "@/lib/utils";
import type { SalesOrder } from "../types";

interface Props {
  orders: SalesOrder[];
  loading: boolean;
  onRefresh: () => void;
  onView?: (order: SalesOrder) => void;
}

export function SalesOrderTable({ orders, loading, onRefresh, onView }: Props) {
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
    onView: (order) => onView?.(order),
    onConfirm: async (order) => {
      if (!confirm(`Confirm order ${order.orderNumber}?`)) return;
      try {
        await api.post(`/sales-orders/${order.id}/confirm`, {});
        toast.success(`Order ${order.orderNumber} confirmed`);
        onRefresh();
      } catch (e: any) {
        toast.error(e.message || "Failed to confirm order");
      }
    },
    onConvert: async (order) => {
      if (!confirm(`Convert order ${order.orderNumber} to an invoice? This will create a draft invoice with the same line items.`)) return;
      try {
        const result = await api.post(`/sales-orders/${order.id}/convert`, {});
        toast.success(result.message || `Order converted to invoice`);
        onRefresh();
      } catch (e: any) {
        toast.error(e.message || "Failed to convert order");
      }
    },
    onCancel: async (order) => {
      if (!confirm(`Cancel order ${order.orderNumber}? This cannot be undone.`)) return;
      try {
        await api.post(`/sales-orders/${order.id}/cancel`, {});
        toast.success(`Order ${order.orderNumber} cancelled`);
        onRefresh();
      } catch (e: any) {
        toast.error(e.message || "Failed to cancel order");
      }
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
