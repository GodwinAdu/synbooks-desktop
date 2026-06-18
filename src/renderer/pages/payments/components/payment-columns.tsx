import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, RotateCcw, Trash2, FileDown } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { PaymentReceived } from "../types";

const statusConfig: Record<string, { label: string; className: string }> = {
  completed: { label: "Completed", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  pending: { label: "Pending", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  refunded: { label: "Refunded", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

export function getPaymentColumns(actions: {
  onView?: (payment: PaymentReceived) => void;
  onDownload?: (payment: PaymentReceived) => void;
  onRefund?: (payment: PaymentReceived) => void;
  onDelete?: (payment: PaymentReceived) => void;
}): ColumnDef<PaymentReceived>[] {
  return [
    {
      accessorKey: "paymentNumber",
      header: "Receipt #",
      cell: ({ row }) => <span className="font-mono font-semibold">{row.getValue("paymentNumber")}</span>,
    },
    {
      accessorKey: "customerName",
      header: "Customer",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.getValue("customerName") || "Walk-in"}</span>
      ),
    },
    {
      accessorKey: "paymentDate",
      header: "Date",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{formatDate(row.getValue("paymentDate"))}</span>
      ),
    },
    {
      accessorKey: "paymentMethod",
      header: "Method",
      cell: ({ row }) => (
        <Badge variant="outline" className="capitalize text-xs">
          {(row.getValue("paymentMethod") as string || "cash").replace("_", " ")}
        </Badge>
      ),
    },
    {
      accessorKey: "invoiceNumber",
      header: "Invoice",
      cell: ({ row }) => {
        const invoiceNum = row.getValue("invoiceNumber") as string | undefined;
        return invoiceNum ? (
          <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{invoiceNum}</span>
        ) : (
          <span className="text-muted-foreground text-xs">Standalone</span>
        );
      },
    },
    {
      accessorKey: "amount",
      header: () => <div className="text-right">Amount</div>,
      cell: ({ row }) => (
        <div className="text-right font-bold text-emerald-600">
          {formatCurrency(row.getValue("amount"))}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        const cfg = statusConfig[status] || statusConfig.pending;
        return <Badge className={cfg.className}>{cfg.label}</Badge>;
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const payment = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => actions.onView?.(payment)}>
                <Eye className="h-4 w-4 mr-2" />View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => actions.onDownload?.(payment)}>
                <FileDown className="h-4 w-4 mr-2" />Download Receipt
              </DropdownMenuItem>
              {payment.status === "completed" && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-600" onClick={() => actions.onRefund?.(payment)}>
                    <RotateCcw className="h-4 w-4 mr-2" />Refund
                  </DropdownMenuItem>
                </>
              )}
              {payment.status === "pending" && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-600" onClick={() => actions.onDelete?.(payment)}>
                    <Trash2 className="h-4 w-4 mr-2" />Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}
