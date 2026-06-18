/**
 * Trial Balance Report
 * Shows all account balances with debit/credit columns.
 */

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportHeader } from "./report-header";
import { AccountDrillDownModal } from "./account-drilldown-modal";
import { formatCurrency } from "@/lib/utils";
import type { TrialBalanceData } from "../types";

export function TrialBalanceReport() {
  const [data, setData] = useState<TrialBalanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(() => new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));

  const fetchData = (start: string, end: string) => {
    setLoading(true);
    api.get("/reports/trial-balance", { startDate: start, endDate: end })
      .then((res: any) => setData(res))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(startDate, endDate); }, []);

  const handleDateChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
    fetchData(start, end);
  };

  // Drill-down state
  const [drillAccount, setDrillAccount] = useState<{ id: string; name: string } | null>(null);

  const handleExportCSV = () => {
    if (!data) return;
    const rows: string[][] = [
      ["Trial Balance"],
      [`Period: ${data.startDate} to ${data.endDate}`],
      [],
      ["Code", "Account Name", "Type", "Debit", "Credit"],
    ];
    data.accounts.forEach((a) => {
      rows.push([a.code || "", a.name, a.type, a.totalDebit.toFixed(2), a.totalCredit.toFixed(2)]);
    });
    rows.push([]);
    rows.push(["", "TOTALS", "", data.totalDebit.toFixed(2), data.totalCredit.toFixed(2)]);

    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trial-balance-${startDate}-to-${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <ReportHeader
        title="Trial Balance"
        subtitle={data ? `${new Date(data.startDate).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" })} – ${new Date(data.endDate).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" })}` : ""}
        startDate={startDate}
        endDate={endDate}
        onDateChange={handleDateChange}
        onPrint={() => window.print()}
        onExportCSV={handleExportCSV}
      />

      {loading ? (
        <Skeleton className="h-96 w-full" />
      ) : data ? (
        <>
          {/* Balance status */}
          <div className="flex items-center gap-3">
            <Badge className={data.isBalanced ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}>
              {data.isBalanced ? "✓ Balanced" : "✗ Out of Balance"}
            </Badge>
            {!data.isBalanced && (
              <span className="text-sm text-red-600">
                Difference: {formatCurrency(Math.abs(data.totalDebit - data.totalCredit))}
              </span>
            )}
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left py-3 px-4 font-semibold">Code</th>
                      <th className="text-left py-3 px-4 font-semibold">Account Name</th>
                      <th className="text-left py-3 px-4 font-semibold">Type</th>
                      <th className="text-right py-3 px-4 font-semibold">Debit</th>
                      <th className="text-right py-3 px-4 font-semibold">Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.accounts.map((acc) => (
                      <tr key={acc.id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-4 font-mono text-xs text-muted-foreground">{acc.code || "—"}</td>
                        <td className="py-2.5 px-4">
                          <span
                            className="hover:text-primary hover:underline cursor-pointer"
                            onClick={() => setDrillAccount({ id: acc.id, name: acc.name })}
                          >
                            {acc.name}
                          </span>
                        </td>
                        <td className="py-2.5 px-4">
                          <Badge variant="outline" className="text-xs capitalize">{acc.type}</Badge>
                        </td>
                        <td className="py-2.5 px-4 text-right tabular-nums">
                          {acc.totalDebit > 0 ? formatCurrency(acc.totalDebit) : "—"}
                        </td>
                        <td className="py-2.5 px-4 text-right tabular-nums">
                          {acc.totalCredit > 0 ? formatCurrency(acc.totalCredit) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 font-bold bg-muted/30">
                      <td colSpan={3} className="py-3 px-4">TOTALS</td>
                      <td className="py-3 px-4 text-right tabular-nums">{formatCurrency(data.totalDebit)}</td>
                      <td className="py-3 px-4 text-right tabular-nums">{formatCurrency(data.totalCredit)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}

      {/* Account Drill-Down Modal */}
      {drillAccount && (
        <AccountDrillDownModal
          open={!!drillAccount}
          onClose={() => setDrillAccount(null)}
          accountId={drillAccount.id}
          accountName={drillAccount.name}
          startDate={startDate}
          endDate={endDate}
        />
      )}
    </div>
  );
}
