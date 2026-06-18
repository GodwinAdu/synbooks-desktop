/**
 * Bill Columns Definition
 * Matches the Next.js bills columns pattern with approve, record payment, mark paid, cancel, delete actions.
 */

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
import {
  MoreHorizontal, Eye, Edit, Trash2, CheckCircle, DollarSign, XCircle, CreditCard,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export interface Bill {
  id: string;
  billNumber: string;
  vendorName?: string;
  vendor?: { name: string };
  billDate: string;
  dueDate: string;
  totalAmount: number;
  paidAmount?: number;
  status: "draft" | "open" | "paid" | "overdue" | "cancelled";
}

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  open: { label: "Open", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  paid: { label: "Paid", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  overdue: { label: "Overdue", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  cancelled: { label: "Cancelled", className: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400" },
};

export function getBillColumns(actions: {
  onView?: (bill: Bill) => void;
  onEdit?: (bill: Bill) => void;
  onDelete?: (bill: Bill) => void;
  onApprove?: (bill: Bill) => void;
  onRecordPayment?: (bill: Bill) => void;
  onMarkPaid?: (bill: Bill) => void;
  onCancel?: (bill: Bill) => void;
}): ColumnDef<Bill>[] {
  return [
    {
      accessorKey: "billNumber",
      header: "Bill #",
      cell: ({ row }) => <span className="font-mono font-semibold">{row.getValue("billNumber")}</span>,
    },
    {
      accessorKey: "vendorName",
      header: "Vendor",
      cell: ({ row }) => {
        const vendorName = row.original.vendorName || row.original.vendor?.name;
        return <span className="text-muted-foreground">{vendorName || "—"}</span>;
      },
    },
    {
      accessorKey: "billDate",
      header: "Bill Date",
      cell: ({ row }) => <span className="text-muted-foreground">{formatDate(row.getValue("billDate"))}</span>,
    },
    {
      accessorKey: "dueDate",
      header: "Due Date",
      cell: ({ row }) => {
        const dueDate = row.getValue("dueDate") as string;
        const isOverdue = dueDate && new Date(dueDate) < new Date() && (row.original.status === "open");
        return (
          <span className={isOverdue ? "text-red-600 font-medium" : "text-muted-foreground"}>
            {formatDate(dueDate)}
            {isOverdue && " ⚠️"}
          </span>
        );
      },
    },
    {
      accessorKey: "totalAmount",
      header: () => <div className="text-right">Amount</div>,
      cell: ({ row }) => (
        <div className="text-right font-semibold">{formatCurrency(row.getValue("totalAmount"))}</div>
      ),
    },
    {
      accessorKey: "balance",
      header: () => <div className="text-right">Balance</div>,
      cell: ({ row }) => {
        const total = row.original.totalAmount || 0;
        const paid = row.original.paidAmount || 0;
        const balance = total - paid;
        return (
          <div className={`text-right font-medium ${balance > 0.01 ? "text-orange-600" : "text-muted-foreground"}`}>
            {formatCurrency(balance)}
          </div>
        );
      },
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
        const bill = row.original;
        const balance = (bill.totalAmount || 0) - (bill.paidAmount || 0);

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>

              <DropdownMenuItem onClick={() => actions.onView?.(bill)}>
                <Eye className="h-4 w-4 mr-2" />View Details
              </DropdownMenuItem>

              {bill.status === "draft" && (
                <DropdownMenuItem onClick={() => actions.onEdit?.(bill)}>
                  <Edit className="h-4 w-4 mr-2" />Edit
                </DropdownMenuItem>
              )}

              {bill.status === "draft" && (
                <DropdownMenuItem onClick={() => actions.onApprove?.(bill)}>
                  <CheckCircle className="h-4 w-4 mr-2" />Approve
                </DropdownMenuItem>
              )}

              {(bill.status === "open" || bill.status === "overdue") && balance > 0.01 && (
                <DropdownMenuItem onClick={() => actions.onRecordPayment?.(bill)}>
                  <DollarSign className="h-4 w-4 mr-2" />Record Payment
                </DropdownMenuItem>
              )}

              {(bill.status === "open" || bill.status === "overdue") && (
                <DropdownMenuItem onClick={() => actions.onMarkPaid?.(bill)}>
                  <CreditCard className="h-4 w-4 mr-2" />Mark as Paid
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />

              {bill.status !== "cancelled" && bill.status !== "paid" && (
                <DropdownMenuItem className="text-amber-600" onClick={() => actions.onCancel?.(bill)}>
                  <XCircle className="h-4 w-4 mr-2" />Cancel
                </DropdownMenuItem>
              )}

              {bill.status === "draft" && (
                <DropdownMenuItem className="text-red-600" onClick={() => actions.onDelete?.(bill)}>
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
