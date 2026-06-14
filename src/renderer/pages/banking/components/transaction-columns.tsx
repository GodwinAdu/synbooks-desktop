import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, CheckCircle } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export interface BankTransaction {
  id: string;
  date: string;
  description: string;
  type: "deposit" | "withdrawal" | "transfer" | "fee" | "interest";
  amount: number;
  reconciled?: boolean;
}

const typeConfig: Record<string, { label: string; className: string }> = {
  deposit: { label: "Deposit", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  withdrawal: { label: "Withdrawal", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  transfer: { label: "Transfer", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  fee: { label: "Fee", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  interest: { label: "Interest", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
};

export function getTransactionColumns(actions: {
  onView?: (tx: BankTransaction) => void;
  onReconcile?: (tx: BankTransaction) => void;
}): ColumnDef<BankTransaction>[] {
  return [
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => <span className="text-muted-foreground">{formatDate(row.getValue("date"))}</span>,
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => <span className="font-medium">{row.getValue("description") || "—"}</span>,
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => {
        const type = row.getValue("type") as string;
        const cfg = typeConfig[type] || typeConfig.deposit;
        return <Badge className={cfg.className}>{cfg.label}</Badge>;
      },
    },
    {
      accessorKey: "amount",
      header: () => <div className="text-right">Amount</div>,
      cell: ({ row }) => {
        const type = row.original.type;
        const amount = row.getValue("amount") as number;
        const isPositive = type === "deposit" || type === "interest";
        return (
          <div className={`text-right font-medium ${isPositive ? "text-emerald-600" : "text-red-600"}`}>
            {isPositive ? "+" : "-"}{formatCurrency(Math.abs(amount))}
          </div>
        );
      },
    },
    {
      accessorKey: "reconciled",
      header: "Reconciled",
      cell: ({ row }) => {
        const reconciled = row.getValue("reconciled") as boolean;
        return (
          <Badge variant="outline" className={reconciled ? "border-emerald-600 text-emerald-600" : "border-gray-400 text-gray-500"}>
            {reconciled ? "Yes" : "No"}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const tx = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => actions.onView?.(tx)}>
                <Eye className="h-4 w-4 mr-2" />View Details
              </DropdownMenuItem>
              {!tx.reconciled && (
                <DropdownMenuItem onClick={() => actions.onReconcile?.(tx)}>
                  <CheckCircle className="h-4 w-4 mr-2" />Reconcile
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}
