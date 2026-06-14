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
import { MoreHorizontal, Eye, Play, XCircle } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export interface PayrollRun {
  id: string;
  runNumber?: string;
  period?: string;
  payDate?: string;
  employeeCount?: number;
  employees?: number;
  grossPay?: number;
  totalGrossPay?: number;
  netPay?: number;
  totalNetPay?: number;
  status: "draft" | "processing" | "completed" | "cancelled" | "reversed";
}

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  processing: { label: "Processing", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  completed: { label: "Completed", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  cancelled: { label: "Cancelled", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  reversed: { label: "Reversed", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

export function getPayrollColumns(actions: {
  onView?: (run: PayrollRun) => void;
  onProcess?: (run: PayrollRun) => void;
  onCancel?: (run: PayrollRun) => void;
}): ColumnDef<PayrollRun>[] {
  return [
    {
      accessorKey: "runNumber",
      header: "Run #",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.runNumber || row.original.id}</span>
      ),
    },
    {
      accessorKey: "period",
      header: "Period",
      cell: ({ row }) => <span className="text-muted-foreground">{row.getValue("period") || "—"}</span>,
    },
    {
      accessorKey: "payDate",
      header: "Pay Date",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.getValue("payDate") ? formatDate(row.getValue("payDate")) : "—"}
        </span>
      ),
    },
    {
      accessorKey: "employeeCount",
      header: () => <div className="text-center">Employees</div>,
      cell: ({ row }) => (
        <div className="text-center">{row.original.employeeCount || row.original.employees || 0}</div>
      ),
    },
    {
      accessorKey: "grossPay",
      header: () => <div className="text-right">Gross Pay</div>,
      cell: ({ row }) => (
        <div className="text-right">
          {formatCurrency(row.original.grossPay || row.original.totalGrossPay || 0)}
        </div>
      ),
    },
    {
      accessorKey: "netPay",
      header: () => <div className="text-right">Net Pay</div>,
      cell: ({ row }) => (
        <div className="text-right font-bold">
          {formatCurrency(row.original.netPay || row.original.totalNetPay || 0)}
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
        const run = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => actions.onView?.(run)}>
                <Eye className="h-4 w-4 mr-2" />View Details
              </DropdownMenuItem>
              {run.status === "draft" && (
                <DropdownMenuItem onClick={() => actions.onProcess?.(run)}>
                  <Play className="h-4 w-4 mr-2" />Process
                </DropdownMenuItem>
              )}
              {run.status === "draft" && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-600" onClick={() => actions.onCancel?.(run)}>
                    <XCircle className="h-4 w-4 mr-2" />Cancel
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
