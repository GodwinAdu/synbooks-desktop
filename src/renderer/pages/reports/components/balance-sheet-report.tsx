/**
 * Balance Sheet (Statement of Financial Position) Report
 */

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportHeader } from "./report-header";
import { formatCurrency } from "@/lib/utils";
import type { BalanceSheetData, AccountGroup } from "../types";

export function BalanceSheetReport() {
  const [data, setData] = useState<BalanceSheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [asOfDate, setAsOfDate] = useState(() => new Date().toISOString().slice(0, 10));

  const fetchData = (date: string) => {
    setLoading(true);
    api.get("/reports/balance-sheet", { asOfDate: date })
      .then((res: any) => setData(res))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(asOfDate); }, []);

  const handleDateChange = (date: string) => {
    setAsOfDate(date);
    fetchData(date);
  };

  const handleExportCSV = () => {
    if (!data) return;
    const rows: string[][] = [
      ["Balance Sheet"],
      [`As of: ${data.asOfDate}`],
      [],
      ["ASSETS"],
      ["Category", "Account", "Amount"],
    ];
    data.assetGroups.forEach((g) => {
      g.accounts.forEach((a) => rows.push([g.subType, a.name, a.amount.toFixed(2)]));
      rows.push(["", `Subtotal - ${g.subType}`, g.subtotal.toFixed(2)]);
    });
    rows.push(["", "Total Assets", data.totalAssets.toFixed(2)], []);
    rows.push(["LIABILITIES"], ["Category", "Account", "Amount"]);
    data.liabilityGroups.forEach((g) => {
      g.accounts.forEach((a) => rows.push([g.subType, a.name, a.amount.toFixed(2)]));
      rows.push(["", `Subtotal - ${g.subType}`, g.subtotal.toFixed(2)]);
    });
    rows.push(["", "Total Liabilities", data.totalLiabilities.toFixed(2)], []);
    rows.push(["EQUITY"], ["Category", "Account", "Amount"]);
    data.equityGroups.forEach((g) => {
      g.accounts.forEach((a) => rows.push([g.subType, a.name, a.amount.toFixed(2)]));
      rows.push(["", `Subtotal - ${g.subType}`, g.subtotal.toFixed(2)]);
    });
    rows.push(["", "Retained Earnings", data.retainedEarnings.toFixed(2)]);
    rows.push(["", "Total Equity", (data.totalEquity + data.retainedEarnings).toFixed(2)], []);
    rows.push(["", "Total Liabilities & Equity", data.totalLiabilitiesAndEquity.toFixed(2)]);

    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `balance-sheet-${data.asOfDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <ReportHeader
        title="Statement of Financial Position"
        subtitle={data ? `As of ${new Date(data.asOfDate).toLocaleDateString("en-GH", { day: "numeric", month: "long", year: "numeric" })}` : ""}
        showDateRange={false}
        asOfDate={asOfDate}
        onAsOfDateChange={handleDateChange}
        onPrint={() => window.print()}
        onExportCSV={handleExportCSV}
      />

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : data ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryCard label="Total Assets" value={formatCurrency(data.totalAssets)} color="text-blue-600" />
            <SummaryCard label="Total Liabilities" value={formatCurrency(data.totalLiabilities)} color="text-red-600" />
            <SummaryCard label="Total Equity" value={formatCurrency(data.totalEquity + data.retainedEarnings)} color="text-purple-600" />
            <SummaryCard
              label="Balanced"
              value={Math.abs(data.totalAssets - data.totalLiabilitiesAndEquity) < 0.01 ? "✓ Yes" : "✗ No"}
              color={Math.abs(data.totalAssets - data.totalLiabilitiesAndEquity) < 0.01 ? "text-emerald-600" : "text-red-600"}
            />
          </div>

          {/* Assets */}
          <Card>
            <CardHeader>
              <CardTitle className="text-blue-700">Assets</CardTitle>
            </CardHeader>
            <CardContent>
              {data.assetGroups.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No asset accounts with balances</p>
              ) : (
                <>
                  {data.assetGroups.map((group, i) => (
                    <GroupSection key={i} group={group} color="blue" />
                  ))}
                  <Separator className="my-2" />
                  <TotalRow label="Total Assets" amount={data.totalAssets} color="text-blue-600" />
                </>
              )}
            </CardContent>
          </Card>

          {/* Liabilities */}
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">Liabilities</CardTitle>
            </CardHeader>
            <CardContent>
              {data.liabilityGroups.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No liability accounts with balances</p>
              ) : (
                <>
                  {data.liabilityGroups.map((group, i) => (
                    <GroupSection key={i} group={group} color="red" />
                  ))}
                  <Separator className="my-2" />
                  <TotalRow label="Total Liabilities" amount={data.totalLiabilities} color="text-red-600" />
                </>
              )}
            </CardContent>
          </Card>

          {/* Equity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-purple-700">Equity</CardTitle>
            </CardHeader>
            <CardContent>
              {data.equityGroups.map((group, i) => (
                <GroupSection key={i} group={group} color="purple" />
              ))}
              {/* Retained Earnings */}
              <div className="grid grid-cols-[1fr_auto] gap-4 py-1.5 pl-4 text-sm">
                <span className="text-muted-foreground italic">Retained Earnings (Current Period)</span>
                <span className="tabular-nums text-right">{formatCurrency(data.retainedEarnings)}</span>
              </div>
              <Separator className="my-2" />
              <TotalRow label="Total Equity" amount={data.totalEquity + data.retainedEarnings} color="text-purple-600" />
            </CardContent>
          </Card>

          {/* Total L&E Card */}
          <Card className="border-2 border-blue-600">
            <CardContent className="pt-6">
              <div className="grid grid-cols-[1fr_auto] items-center gap-4">
                <div>
                  <p className="text-2xl font-bold">Total Liabilities & Equity</p>
                  <p className="text-sm text-muted-foreground mt-1">Should equal Total Assets</p>
                </div>
                <span className="text-3xl font-bold tabular-nums text-right text-blue-600">
                  {formatCurrency(data.totalLiabilitiesAndEquity)}
                </span>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={`text-xl font-bold tabular-nums mt-1 ${color}`}>{value}</p>
    </div>
  );
}

function GroupSection({ group, color }: { group: AccountGroup; color: "blue" | "red" | "purple" }) {
  const colorClass = color === "blue" ? "text-blue-600" : color === "red" ? "text-red-500" : "text-purple-600";
  return (
    <div className="mb-5">
      <p className={`text-xs font-semibold uppercase tracking-wider ${colorClass} mb-1`}>{group.subType}</p>
      {group.accounts.map((acc) => (
        <div key={acc.id} className="grid grid-cols-[1fr_auto] gap-4 py-1.5 pl-4 text-sm hover:bg-muted/50 rounded transition-colors">
          <span className="text-muted-foreground">{acc.name}</span>
          <span className="tabular-nums text-right">{formatCurrency(acc.amount)}</span>
        </div>
      ))}
      <div className="grid grid-cols-[1fr_auto] gap-4 py-1.5 pl-4 text-sm font-semibold border-t mt-1">
        <span>Subtotal — {group.subType}</span>
        <span className="tabular-nums text-right">{formatCurrency(group.subtotal)}</span>
      </div>
    </div>
  );
}

function TotalRow({ label, amount, color }: { label: string; amount: number; color: string }) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-4 py-2 font-bold text-lg">
      <span>{label}</span>
      <span className={`tabular-nums text-right ${color}`}>{formatCurrency(amount)}</span>
    </div>
  );
}
