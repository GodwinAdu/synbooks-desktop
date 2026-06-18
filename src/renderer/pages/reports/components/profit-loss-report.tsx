/**
 * Income Statement (Profit & Loss) Report
 * Matches the Next.js app's ProfitLossClient component structure.
 */

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportHeader } from "./report-header";
import { AccountDrillDownModal } from "./account-drilldown-modal";
import { formatCurrency } from "@/lib/utils";
import type { ProfitLossData, AccountGroup } from "../types";

export function ProfitLossReport() {
  const [data, setData] = useState<ProfitLossData | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(() => new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));

  const fetchData = (start: string, end: string) => {
    setLoading(true);
    api.get("/reports/profit-loss", { startDate: start, endDate: end })
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

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!data) return;
    const rows: string[][] = [
      ["Income Statement"],
      [`Period: ${startDate} to ${endDate}`],
      [],
      ["REVENUE"],
      ["Category", "Account", "Amount"],
    ];
    data.revenueGroups.forEach((g) => {
      g.accounts.forEach((a) => rows.push([g.subType, a.name, a.amount.toFixed(2)]));
      rows.push(["", `Subtotal - ${g.subType}`, g.subtotal.toFixed(2)]);
    });
    rows.push(["", "Total Revenue", data.totalRevenue.toFixed(2)], []);
    rows.push(["EXPENSES"], ["Category", "Account", "Amount"]);
    data.expenseGroups.forEach((g) => {
      g.accounts.forEach((a) => rows.push([g.subType, a.name, a.amount.toFixed(2)]));
      rows.push(["", `Subtotal - ${g.subType}`, g.subtotal.toFixed(2)]);
    });
    rows.push(["", "Total Expenses", data.totalExpenses.toFixed(2)], []);
    rows.push(["", data.netIncome >= 0 ? "Net Income" : "Net Loss", Math.abs(data.netIncome).toFixed(2)]);

    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `income-statement-${startDate}-to-${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const periodLabel = data
    ? `${new Date(data.startDate).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" })} – ${new Date(data.endDate).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" })}`
    : "";

  // Drill-down state
  const [drillAccount, setDrillAccount] = useState<{ id: string; name: string } | null>(null);

  return (
    <div className="p-6 space-y-6">
      <ReportHeader
        title="Income Statement"
        subtitle={periodLabel}
        startDate={startDate}
        endDate={endDate}
        onDateChange={handleDateChange}
        onPrint={handlePrint}
        onExportCSV={handleExportCSV}
      />

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : data ? (
        <>
          {/* Ratio Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <RatioCard
              label="Net Margin"
              value={data.totalRevenue > 0 ? `${((data.netIncome / data.totalRevenue) * 100).toFixed(1)}%` : "—"}
              color={data.netIncome >= 0 ? "text-emerald-600" : "text-red-500"}
            />
            <RatioCard
              label="Expense Ratio"
              value={data.totalRevenue > 0 ? `${((data.totalExpenses / data.totalRevenue) * 100).toFixed(1)}%` : "—"}
              color={data.totalRevenue > 0 && data.totalExpenses / data.totalRevenue < 0.8 ? "text-emerald-600" : "text-amber-600"}
            />
            <RatioCard label="Revenue" value={formatCurrency(data.totalRevenue)} color="text-emerald-600" />
            <RatioCard label="Net Income" value={formatCurrency(data.netIncome)} color={data.netIncome >= 0 ? "text-emerald-600" : "text-red-500"} />
          </div>

          {/* Revenue Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-emerald-700">Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              {data.revenueGroups.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No revenue accounts with balances</p>
              ) : (
                <>
                  {data.revenueGroups.map((group, i) => (
                    <GroupSection key={i} group={group} color="emerald" onAccountClick={(id, name) => setDrillAccount({ id, name })} />
                  ))}
                  <Separator className="my-2" />
                  <div className="grid grid-cols-[1fr_auto] gap-4 py-2 font-bold text-lg">
                    <span>Total Revenue</span>
                    <span className="text-emerald-600 tabular-nums text-right">{formatCurrency(data.totalRevenue)}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Expenses Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              {data.expenseGroups.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No expense accounts with balances</p>
              ) : (
                <>
                  {data.expenseGroups.map((group, i) => (
                    <GroupSection key={i} group={group} color="red" onAccountClick={(id, name) => setDrillAccount({ id, name })} />
                  ))}
                  <Separator className="my-2" />
                  <div className="grid grid-cols-[1fr_auto] gap-4 py-2 font-bold text-lg">
                    <span>Total Expenses</span>
                    <span className="text-red-600 tabular-nums text-right">{formatCurrency(data.totalExpenses)}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Net Income Card */}
          <Card className={`border-2 ${data.netIncome >= 0 ? "border-emerald-600" : "border-red-500"}`}>
            <CardContent className="pt-6">
              <div className="grid grid-cols-[1fr_auto] items-center gap-4">
                <div>
                  <p className="text-2xl font-bold">Net {data.netIncome >= 0 ? "Income" : "Loss"}</p>
                  <p className="text-sm text-muted-foreground mt-1">{periodLabel}</p>
                </div>
                <span className={`text-3xl font-bold tabular-nums text-right ${data.netIncome >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {formatCurrency(Math.abs(data.netIncome))}
                </span>
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

function RatioCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={`text-xl font-bold tabular-nums mt-1 ${color}`}>{value}</p>
    </div>
  );
}

function GroupSection({ group, color, onAccountClick }: { group: AccountGroup; color: "emerald" | "red"; onAccountClick?: (id: string, name: string) => void }) {
  return (
    <div className="mb-5">
      <p className={`text-xs font-semibold uppercase tracking-wider ${color === "emerald" ? "text-emerald-600" : "text-red-500"} mb-1`}>
        {group.subType}
      </p>
      {group.accounts.map((acc) => (
        <div
          key={acc.id}
          className="grid grid-cols-[1fr_auto] gap-4 py-1.5 pl-4 text-sm hover:bg-muted/50 rounded transition-colors cursor-pointer"
          onClick={() => onAccountClick?.(acc.id, acc.name)}
        >
          <span className="text-muted-foreground hover:text-foreground hover:underline">{acc.name}</span>
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
