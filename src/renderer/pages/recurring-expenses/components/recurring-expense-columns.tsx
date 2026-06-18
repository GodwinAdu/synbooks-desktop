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
import { MoreHorizontal, Eye, Pause, Play, Trash2, Zap } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { RecurringExpense } from "../types";

const frequencyConfig: Record<string, { label: string; className: string }> = {
  daily: { label: "Daily", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  weekly: { label: "Weekly", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  monthly: { label: "Monthly", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  quarterly: { label: "Quarterly", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  yearly: { label: "Yearly", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

export function getRecurringExpenseColumns(actions: {
  onView?: (expense: RecurringExpense) => void;
  onToggle?: (expense: RecurringExpense) => void;
  onGenerateNow?: (expense: RecurringExpense) => void;
  onDelete?: (expense: RecurringExpense) => void;
}): ColumnDef<RecurringExpense>[] {
  return [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => <span className="font-medium">{row.getValue("name")}</span>,
    },
    {
      accessorKey: "vendorName",
      header: "Vendor",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.getValue("vendorName") || "—"}</span>
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
      accessorKey: "nextExpenseDate",
      header: "Next Due",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{formatDate(row.getValue("nextExpenseDate"))}</span>
      ),
    },
    {
      accessorKey: "amount",
      header: () => <div className="text-right">Amount</div>,
      cell: ({ row }) => (
        <div className="text-right font-medium">{formatCurrency(row.getValue("amount"))}</div>
      ),
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => {
        const isActive = row.getValue("isActive");
        return (
          <Badge variant="outline" className={isActive ? "border-emerald-500 text-emerald-600" : "border-gray-300 text-gray-500"}>
            {isActive ? "Active" : "Paused"}
          </Badge>
        );
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
              <DropdownMenuItem onClick={() => actions.onGenerateNow?.(expense)}>
                <Zap className="h-4 w-4 mr-2" />Generate Expense Now
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => actions.onToggle?.(expense)}>
                {expense.isActive ? (
                  <><Pause className="h-4 w-4 mr-2" />Pause</>
                ) : (
                  <><Play className="h-4 w-4 mr-2" />Resume</>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600" onClick={() => actions.onDelete?.(expense)}>
                <Trash2 className="h-4 w-4 mr-2" />Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}
