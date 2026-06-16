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
import { MoreHorizontal, Eye, Edit, Trash2, Lock, ToggleLeft, ToggleRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { Account } from "../types";

const typeColors: Record<string, string> = {
  asset: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  liability: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  equity: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  revenue: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  expense: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
};

export function getAccountColumns(actions: {
  onEdit?: (account: Account) => void;
  onDelete?: (account: Account) => void;
  onViewLedger?: (account: Account) => void;
  onToggleActive?: (account: Account) => void;
}): ColumnDef<Account>[] {
  return [
    {
      accessorKey: "accountCode",
      header: "Code",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="font-mono font-semibold">{row.getValue("accountCode")}</span>
          {row.original.isSystemAccount && <Lock className="h-3 w-3 text-muted-foreground" />}
        </div>
      ),
    },
    {
      accessorKey: "accountName",
      header: "Account Name",
      cell: ({ row }) => <span className="font-medium">{row.getValue("accountName")}</span>,
    },
    {
      accessorKey: "accountType",
      header: "Type",
      cell: ({ row }) => {
        const type = row.getValue("accountType") as string;
        return <Badge className={typeColors[type] || ""}>{type.charAt(0).toUpperCase() + type.slice(1)}</Badge>;
      },
    },
    {
      accessorKey: "accountSubType",
      header: "Sub Type",
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.getValue("accountSubType") || "—"}</span>,
    },
    {
      accessorKey: "currentBalance",
      header: () => <div className="text-right">Balance</div>,
      cell: ({ row }) => {
        const bal = row.getValue("currentBalance") as number;
        return (
          <div className={`text-right font-medium ${bal > 0 ? "text-emerald-600" : bal < 0 ? "text-red-600" : "text-muted-foreground"}`}>
            {formatCurrency(bal)}
          </div>
        );
      },
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => {
        const active = row.getValue("isActive");
        return (
          <Badge variant="outline" className={active ? "border-emerald-600 text-emerald-600" : "border-red-400 text-red-500"}>
            {active ? "Active" : "Inactive"}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const account = row.original;
        const hasBalance = Math.abs(account.currentBalance || 0) > 0.01;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => actions.onViewLedger?.(account)}>
                <Eye className="h-4 w-4 mr-2" />View Ledger
              </DropdownMenuItem>
              {!account.isSystemAccount && (
                <DropdownMenuItem onClick={() => actions.onEdit?.(account)}>
                  <Edit className="h-4 w-4 mr-2" />Edit
                </DropdownMenuItem>
              )}
              {!account.isSystemAccount && (
                <DropdownMenuItem onClick={() => actions.onToggleActive?.(account)}>
                  {account.isActive ? (
                    <><ToggleLeft className="h-4 w-4 mr-2" />Deactivate</>
                  ) : (
                    <><ToggleRight className="h-4 w-4 mr-2" />Activate</>
                  )}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {!account.isSystemAccount && !hasBalance && (
                <DropdownMenuItem className="text-red-600" onClick={() => actions.onDelete?.(account)}>
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
