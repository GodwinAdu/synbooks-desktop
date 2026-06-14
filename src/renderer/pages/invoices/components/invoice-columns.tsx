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
import { MoreHorizontal, Eye, Edit, Trash2, Send, DollarSign } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Invoice } from "../types";

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  sent: { label: "Sent", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  paid: { label: "Paid", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  overdue: { label: "Overdue", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  cancelled: { label: "Cancelled", className: "bg-gray-100 text-gray-500" },
};

export function getInvoiceColumns(actions: {
  onView?: (invoice: Invoice) => void;
  onEdit?: (invoice: Invoice) => void;
  onDelete?: (invoice: Invoice) => void;
  onSend?: (invoice: Invoice) => void;
  onRecordPayment?: (invoice: Invoice) => void;
}): ColumnDef<Invoice>[] {
  return [
    {
      accessorKey: "invoiceNumber",
      header: "Invoice #",
      cell: ({ row }) => <span className="font-medium">{row.getValue("invoiceNumber")}</span>,
    },
    {
      accessorKey: "customerName",
      header: "Customer",
      cell: ({ row }) => {
        const customer = (row.original as any).customer;
        return <span className="text-muted-foreground">{customer?.name || "—"}</span>;
      },
    },
    {
      accessorKey: "invoiceDate",
      header: "Date",
      cell: ({ row }) => <span className="text-muted-foreground">{formatDate(row.getValue("invoiceDate"))}</span>,
    },
    {
      accessorKey: "dueDate",
      header: "Due Date",
      cell: ({ row }) => <span className="text-muted-foreground">{formatDate(row.getValue("dueDate"))}</span>,
    },
    {
      accessorKey: "totalAmount",
      header: () => <div className="text-right">Amount</div>,
      cell: ({ row }) => <div className="text-right font-medium">{formatCurrency(row.getValue("totalAmount"))}</div>,
    },
    {
      accessorKey: "paidAmount",
      header: () => <div className="text-right">Paid</div>,
      cell: ({ row }) => <div className="text-right text-muted-foreground">{formatCurrency(row.getValue("paidAmount"))}</div>,
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
        const invoice = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => actions.onView?.(invoice)}>
                <Eye className="h-4 w-4 mr-2" />View Details
              </DropdownMenuItem>
              {invoice.status === "draft" && (
                <DropdownMenuItem onClick={() => actions.onEdit?.(invoice)}>
                  <Edit className="h-4 w-4 mr-2" />Edit
                </DropdownMenuItem>
              )}
              {invoice.status === "draft" && (
                <DropdownMenuItem onClick={() => actions.onSend?.(invoice)}>
                  <Send className="h-4 w-4 mr-2" />Mark as Sent
                </DropdownMenuItem>
              )}
              {(invoice.status === "sent" || invoice.status === "overdue") && (
                <DropdownMenuItem onClick={() => actions.onRecordPayment?.(invoice)}>
                  <DollarSign className="h-4 w-4 mr-2" />Record Payment
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {invoice.status === "draft" && (
                <DropdownMenuItem className="text-red-600" onClick={() => actions.onDelete?.(invoice)}>
                  <Trash2 className="h-4 w-4 mr-2" />Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}
