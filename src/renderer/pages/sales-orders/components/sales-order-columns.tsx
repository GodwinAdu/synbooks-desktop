import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, CheckCircle, FileText, XCircle } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { SalesOrder } from "../types";

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  confirmed: { label: "Confirmed", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  fulfilled: { label: "Fulfilled", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  cancelled: { label: "Cancelled", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

export function getSalesOrderColumns(actions: {
  onView?: (order: SalesOrder) => void;
  onConfirm?: (order: SalesOrder) => void;
  onConvert?: (order: SalesOrder) => void;
  onCancel?: (order: SalesOrder) => void;
}): ColumnDef<SalesOrder>[] {
  return [
    {
      accessorKey: "orderNumber",
      header: "Order #",
      cell: ({ row }) => <span className="font-medium">{row.getValue("orderNumber")}</span>,
    },
    {
      accessorKey: "customerName",
      header: "Customer",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.getValue("customerName") || "—"}</span>
      ),
    },
    {
      accessorKey: "orderDate",
      header: "Order Date",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{formatDate(row.getValue("orderDate"))}</span>
      ),
    },
    {
      accessorKey: "deliveryDate",
      header: "Delivery Date",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.getValue("deliveryDate") ? formatDate(row.getValue("deliveryDate")) : "—"}
        </span>
      ),
    },
    {
      accessorKey: "totalAmount",
      header: () => <div className="text-right">Amount</div>,
      cell: ({ row }) => (
        <div className="text-right font-medium">{formatCurrency(row.getValue("totalAmount"))}</div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        const cfg = statusConfig[status] || statusConfig.draft;
        return <Badge className={cfg.className}>{cfg.label}</Badge>;
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const order = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => actions.onView?.(order)}>
                <Eye className="h-4 w-4 mr-2" />View Details
              </DropdownMenuItem>
              {order.status === "draft" && (
                <DropdownMenuItem onClick={() => actions.onConfirm?.(order)}>
                  <CheckCircle className="h-4 w-4 mr-2" />Confirm Order
                </DropdownMenuItem>
              )}
              {order.status === "confirmed" && (
                <DropdownMenuItem onClick={() => actions.onConvert?.(order)}>
                  <FileText className="h-4 w-4 mr-2" />Convert to Invoice
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {(order.status === "draft" || order.status === "confirmed") && (
                <DropdownMenuItem className="text-red-600" onClick={() => actions.onCancel?.(order)}>
                  <XCircle className="h-4 w-4 mr-2" />Cancel
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}
