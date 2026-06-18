import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, CheckCircle, XCircle, Trash2, DollarSign } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Expense } from "../types";

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  approved: { label: "Approved", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  paid: { label: "Paid", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

export function getExpenseColumns(actions: {
  onView?: (expense: Expense) => void;
  onApprove?: (expense: Expense) => void;
  onMarkPaid?: (expense: Expense) => void;
  onReject?: (expense: Expense) => void;
  onDelete?: (expense: Expense) => void;
}): ColumnDef<Expense>[] {
  return [
    {
      accessorKey: "expenseNumber",
      header: "Expense #",
      cell: ({ row }) => <span className="font-mono font-semibold">{row.getValue("expenseNumber")}</span>,
    },
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => <span className="text-muted-foreground">{formatDate(row.getValue("date"))}</span>,
    },
    {
      accessorKey: "vendorName",
      header: "Vendor",
      cell: ({ row }) => <span className="text-muted-foreground">{row.getValue("vendorName") || "—"}</span>,
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <span className="text-muted-foreground max-w-[180px] truncate block">{row.getValue("description") || "—"}</span>
      ),
    },
    {
      accessorKey: "paymentMethod",
      header: "Method",
      cell: ({ row }) => (
        <Badge variant="outline" className="capitalize text-xs">
          {(row.getValue("paymentMethod") as string || "cash").replace(/_/g, " ")}
        </Badge>
      ),
    },
    {
      accessorKey: "amount",
      header: () => <div className="text-right">Amount</div>,
      cell: ({ row }) => (
        <div className="text-right font-semibold">{formatCurrency(row.getValue("amount"))}</div>
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
        const expense = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => actions.onView?.(expense)}>
                <Eye className="h-4 w-4 mr-2" />View Details
              </DropdownMenuItem>
              {expense.status === "pending" && (
                <DropdownMenuItem onClick={() => actions.onApprove?.(expense)}>
                  <CheckCircle className="h-4 w-4 mr-2" />Approve
                </DropdownMenuItem>
              )}
              {expense.status === "approved" && (
                <DropdownMenuItem onClick={() => actions.onMarkPaid?.(expense)}>
                  <DollarSign className="h-4 w-4 mr-2" />Mark as Paid
                </DropdownMenuItem>
              )}
              {expense.status === "pending" && (
                <DropdownMenuItem className="text-red-600" onClick={() => actions.onReject?.(expense)}>
                  <XCircle className="h-4 w-4 mr-2" />Reject
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {expense.status === "pending" && (
                <DropdownMenuItem className="text-red-600" onClick={() => actions.onDelete?.(expense)}>
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
