import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, Edit, Trash2, CheckCircle, Send } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { JournalEntry } from "../types";

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  posted: { label: "Posted", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  reversed: { label: "Reversed", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  voided: { label: "Voided", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

export function getJournalEntryColumns(actions: {
  onView?: (entry: JournalEntry) => void;
  onPost?: (entry: JournalEntry) => void;
  onDelete?: (entry: JournalEntry) => void;
}): ColumnDef<JournalEntry>[] {
  return [
    {
      accessorKey: "entryNumber",
      header: "Entry #",
      cell: ({ row }) => <span className="font-medium">{row.getValue("entryNumber")}</span>,
    },
    {
      accessorKey: "entryDate",
      header: "Date",
      cell: ({ row }) => <span className="text-muted-foreground">{formatDate(row.getValue("entryDate"))}</span>,
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <span className="text-muted-foreground truncate block max-w-[250px]">{row.getValue("description") || "—"}</span>
      ),
    },
    {
      accessorKey: "totalDebit",
      header: () => <div className="text-right">Total Debit</div>,
      cell: ({ row }) => (
        <div className="text-right font-medium text-emerald-600">{formatCurrency(row.getValue("totalDebit"))}</div>
      ),
    },
    {
      accessorKey: "totalCredit",
      header: () => <div className="text-right">Total Credit</div>,
      cell: ({ row }) => (
        <div className="text-right font-medium text-blue-600">{formatCurrency(row.getValue("totalCredit"))}</div>
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
        const entry = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => actions.onView?.(entry)}>
                <Eye className="h-4 w-4 mr-2" />View Details
              </DropdownMenuItem>
              {entry.status === "draft" && (
                <DropdownMenuItem onClick={() => actions.onPost?.(entry)}>
                  <Send className="h-4 w-4 mr-2" />Post Entry
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {entry.status === "draft" && (
                <DropdownMenuItem className="text-red-600" onClick={() => actions.onDelete?.(entry)}>
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
