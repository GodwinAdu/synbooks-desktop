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
import { MoreHorizontal, Eye, CheckCircle, XCircle } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { CreditNote } from "../types";

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  issued: { label: "Issued", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  applied: { label: "Applied", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  voided: { label: "Voided", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

export function getCreditNoteColumns(actions: {
  onView?: (creditNote: CreditNote) => void;
  onApply?: (creditNote: CreditNote) => void;
  onVoid?: (creditNote: CreditNote) => void;
}): ColumnDef<CreditNote>[] {
  return [
    {
      accessorKey: "creditNoteNumber",
      header: "Credit Note #",
      cell: ({ row }) => <span className="font-medium">{row.getValue("creditNoteNumber")}</span>,
    },
    {
      accessorKey: "customerName",
      header: "Customer",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.getValue("customerName") || "—"}</span>
      ),
    },
    {
      accessorKey: "invoiceNumber",
      header: "Invoice",
      cell: ({ row }) => {
        const invoiceNum = row.getValue("invoiceNumber") as string | undefined;
        return invoiceNum ? (
          <span className="font-mono text-xs">{invoiceNum}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
    {
      accessorKey: "creditNoteDate",
      header: "Date",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{formatDate(row.getValue("creditNoteDate"))}</span>
      ),
    },
    {
      accessorKey: "totalAmount",
      header: () => <div className="text-right">Amount</div>,
      cell: ({ row }) => (
        <div className="text-right font-medium text-red-600">
          {formatCurrency(row.getValue("totalAmount"))}
        </div>
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
        const creditNote = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => actions.onView?.(creditNote)}>
                <Eye className="h-4 w-4 mr-2" />View Details
              </DropdownMenuItem>
              {creditNote.status === "issued" && (
                <DropdownMenuItem onClick={() => actions.onApply?.(creditNote)}>
                  <CheckCircle className="h-4 w-4 mr-2" />Apply to Invoice
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {(creditNote.status === "issued" || creditNote.status === "draft") && (
                <DropdownMenuItem className="text-red-600" onClick={() => actions.onVoid?.(creditNote)}>
                  <XCircle className="h-4 w-4 mr-2" />Void
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}
