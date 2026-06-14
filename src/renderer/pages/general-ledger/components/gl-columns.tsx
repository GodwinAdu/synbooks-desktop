import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import type { GLTransaction } from "../types";

export function getGLColumns(): ColumnDef<GLTransaction>[] {
  return [
    {
      accessorKey: "transactionDate",
      header: "Date",
      cell: ({ row }) => <span className="text-muted-foreground">{formatDate(row.getValue("transactionDate"))}</span>,
    },
    {
      accessorKey: "entryNumber",
      header: "Reference",
      cell: ({ row }) => (
        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{row.getValue("entryNumber") || "—"}</span>
      ),
    },
    {
      accessorKey: "accountName",
      header: "Account",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium truncate max-w-[200px]">{row.getValue("accountName")}</span>
          <span className="text-xs text-muted-foreground">{row.original.accountCode}</span>
        </div>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <span className="text-muted-foreground truncate block max-w-[250px]">{row.getValue("description") || "—"}</span>
      ),
    },
    {
      accessorKey: "debit",
      header: () => <div className="text-right">Debit</div>,
      cell: ({ row }) => {
        const amount = row.getValue("debit") as number;
        return amount > 0
          ? <div className="text-right font-medium text-emerald-600">{formatCurrency(amount)}</div>
          : <div className="text-right text-muted-foreground/40">—</div>;
      },
    },
    {
      accessorKey: "credit",
      header: () => <div className="text-right">Credit</div>,
      cell: ({ row }) => {
        const amount = row.getValue("credit") as number;
        return amount > 0
          ? <div className="text-right font-medium text-blue-600">{formatCurrency(amount)}</div>
          : <div className="text-right text-muted-foreground/40">—</div>;
      },
    },
    {
      accessorKey: "runningBalance",
      header: () => <div className="text-right">Balance</div>,
      cell: ({ row }) => {
        const balance = row.getValue("runningBalance") as number;
        return (
          <div className={cn("text-right font-medium", balance > 0 && "text-emerald-600", balance < 0 && "text-red-600", balance === 0 && "text-muted-foreground")}>
            {formatCurrency(balance)}
          </div>
        );
      },
    },
    {
      accessorKey: "isReconciled",
      header: "Reconciled",
      cell: ({ row }) => {
        const reconciled = row.getValue("isReconciled") as boolean;
        return (
          <Badge variant="outline" className={reconciled ? "border-emerald-600 text-emerald-600" : "border-gray-300 text-gray-500"}>
            {reconciled ? "Yes" : "No"}
          </Badge>
        );
      },
    },
  ];
}
