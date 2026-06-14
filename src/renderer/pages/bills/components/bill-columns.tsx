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
import { MoreHorizontal, Eye, Edit, Trash2 } from "lucide-react";
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
  status: "draft" | "pending" | "paid" | "overdue";
}

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  pending: { label: "Pending", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  paid: { label: "Paid", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  overdue: { label: "Overdue", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

export function getBillColumns(actions: {
  onView?: (bill: Bill) => void;
  onEdit?: (bill: Bill) => void;
  onDelete?: (bill: Bill) => void;
}): ColumnDef<Bill>[] {
  return [
    {
      accessorKey: "billNumber",
      header: "Bill #",
      cell: ({ row }) => <span className="font-medium">{row.getValue("billNumber")}</span>,
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
      cell: ({ row }) => <span className="text-muted-foreground">{formatDate(row.getValue("dueDate"))}</span>,
    },
    {
      accessorKey: "totalAmount",
      header: () => <div className="text-right">Amount</div>,
      cell: ({ row }) => (
        <div className="text-right font-medium">{formatCurrency(row.getValue("totalAmount"))}</div>
      ),
    },
    {
      accessorKey: "paidAmount",
      header: () => <div className="text-right">Paid</div>,
      cell: ({ row }) => (
        <div className="text-right text-muted-foreground">{formatCurrency(row.getValue("paidAmount") || 0)}</div>
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
        const bill = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => actions.onView?.(bill)}>
                <Eye className="h-4 w-4 mr-2" />View Details
              </DropdownMenuItem>
              {bill.status === "draft" && (
                <DropdownMenuItem onClick={() => actions.onEdit?.(bill)}>
                  <Edit className="h-4 w-4 mr-2" />Edit
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
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
