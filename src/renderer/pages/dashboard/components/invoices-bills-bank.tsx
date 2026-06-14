/**
 * Invoices / Bills / Bank Balance - Secondary stats row
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Receipt, Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { DashboardStats } from "../types";

interface Props {
  stats: DashboardStats;
}

export function InvoicesBillsBank({ stats }: Props) {
  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium">Pending Invoices</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground hidden sm:block" />
        </CardHeader>
        <CardContent>
          <div className="text-lg sm:text-2xl font-bold">{stats.pendingInvoices.count}</div>
          <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
            {formatCurrency(stats.pendingInvoices.amount)} outstanding
          </p>
          <Badge variant="outline" className="mt-2 text-[10px] sm:text-xs">Action Required</Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium">Unpaid Bills</CardTitle>
          <Receipt className="h-4 w-4 text-muted-foreground hidden sm:block" />
        </CardHeader>
        <CardContent>
          <div className="text-lg sm:text-2xl font-bold">{stats.unpaidBills.count}</div>
          <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
            {formatCurrency(stats.unpaidBills.amount)} due
          </p>
          <Badge variant="destructive" className="mt-2 text-[10px] sm:text-xs">Due Soon</Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium">Bank Balance</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground hidden sm:block" />
        </CardHeader>
        <CardContent>
          <div className="text-lg sm:text-2xl font-bold truncate">{formatCurrency(stats.bankBalance.total)}</div>
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            Across {stats.bankBalance.accounts} accounts
          </p>
          <Badge variant="secondary" className="mt-2 text-[10px] sm:text-xs bg-emerald-100 text-emerald-700">Healthy</Badge>
        </CardContent>
      </Card>
    </div>
  );
}
