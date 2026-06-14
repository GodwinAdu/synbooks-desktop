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
import { MoreHorizontal, Eye, Pause, Play, Trash2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import type { RecurringInvoice } from "../types";

const frequencyConfig: Record<string, { label: string; className: string }> = {
  daily: { label: "Daily", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  weekly: { label: "Weekly", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  monthly: { label: "Monthly", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  quarterly: { label: "Quarterly", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  yearly: { label: "Yearly", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

export function getRecurringInvoiceColumns(actions: {
  onView?: (template: RecurringInvoice) => void;
  onToggle?: (template: RecurringInvoice) => void;
  onDelete?: (template: RecurringInvoice) => void;
}): ColumnDef<RecurringInvoice>[] {
  return [
    {
      accessorKey: "templateName",
      header: "Template Name",
      cell: ({ row }) => <span className="font-medium">{row.getValue("templateName")}</span>,
    },
    {
      accessorKey: "customerName",
      header: "Customer",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.getValue("customerName") || "—"}</span>
      ),
    },
    {
      accessorKey: "frequency",
      header: "Frequency",
      cell: ({ row }) => {
        const frequency = row.getValue("frequency") as string;
        const cfg = frequencyConfig[frequency] || frequencyConfig.monthly;
        return <Badge className={cfg.className}>{cfg.label}</Badge>;
      },
    },
    {
      accessorKey: "nextInvoiceDate",
      header: "Next Invoice",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{formatDate(row.getValue("nextInvoiceDate"))}</span>
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
      accessorKey: "invoicesGenerated",
      header: () => <div className="text-center">Generated</div>,
      cell: ({ row }) => (
        <div className="text-center text-muted-foreground">{row.getValue("invoicesGenerated")}</div>
      ),
    },
    {
      accessorKey: "isActive",
      header: "Active",
      cell: ({ row }) => {
        const isActive = row.getValue("isActive") as boolean;
        return (
          <Button
            variant="ghost"
            size="sm"
            className={isActive ? "text-emerald-600" : "text-muted-foreground"}
            onClick={() => {
              toast.info(`Template ${isActive ? "paused" : "resumed"}`);
              actions.onToggle?.(row.original);
            }}
          >
            {isActive ? "Active" : "Paused"}
          </Button>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const template = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => actions.onView?.(template)}>
                <Eye className="h-4 w-4 mr-2" />View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => actions.onToggle?.(template)}>
                {template.isActive ? (
                  <><Pause className="h-4 w-4 mr-2" />Pause</>
                ) : (
                  <><Play className="h-4 w-4 mr-2" />Resume</>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600" onClick={() => actions.onDelete?.(template)}>
                <Trash2 className="h-4 w-4 mr-2" />Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}
