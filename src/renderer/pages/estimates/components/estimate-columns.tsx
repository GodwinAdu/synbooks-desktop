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
import { MoreHorizontal, Eye, FileText, Trash2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Estimate } from "../types";

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  sent: { label: "Sent", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  accepted: { label: "Accepted", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  expired: { label: "Expired", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  converted: { label: "Converted", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
};

export function getEstimateColumns(actions: {
  onView?: (estimate: Estimate) => void;
  onConvert?: (estimate: Estimate) => void;
  onDelete?: (estimate: Estimate) => void;
}): ColumnDef<Estimate>[] {
  return [
    {
      accessorKey: "estimateNumber",
      header: "Estimate #",
      cell: ({ row }) => <span className="font-medium">{row.getValue("estimateNumber")}</span>,
    },
    {
      accessorKey: "customerName",
      header: "Customer",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.getValue("customerName") || "—"}</span>
      ),
    },
    {
      accessorKey: "estimateDate",
      header: "Date",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{formatDate(row.getValue("estimateDate"))}</span>
      ),
    },
    {
      accessorKey: "expiryDate",
      header: "Expiry",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.getValue("expiryDate") ? formatDate(row.getValue("expiryDate")) : "—"}
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
        const estimate = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => actions.onView?.(estimate)}>
                <Eye className="h-4 w-4 mr-2" />View Details
              </DropdownMenuItem>
              {estimate.status === "accepted" && (
                <DropdownMenuItem onClick={() => actions.onConvert?.(estimate)}>
                  <FileText className="h-4 w-4 mr-2" />Convert to Invoice
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {estimate.status === "draft" && (
                <DropdownMenuItem className="text-red-600" onClick={() => actions.onDelete?.(estimate)}>
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
