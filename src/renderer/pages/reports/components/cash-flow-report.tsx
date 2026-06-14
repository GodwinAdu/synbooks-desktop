/**
 * Cash Flow Statement Report
 * Shows operating, investing, and financing activities.
 */

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportHeader } from "./report-header";
import { formatCurrency } from "@/lib/utils";
import type { CashFlowData } from "../types";

export function CashFlowReport() {
  const [data, setData] = useState<CashFlowData | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(() => new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));

  const fetchData = (start: string, end: string) => {
    setLoading(true);
    api.get("/reports/cash-flow", { startDate: start, endDate: end })
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

  const handleExportCSV = () => {
    if (!data) return;
    const rows: string[][] = [
      ["Statement of Cash Flows"],
      [`Period: ${data.startDate} to ${data.endDate}`],
      [],
      ["OPERATING ACTIVITIES"],
      ["Cash received from customers", data.operating.revenue.toFixed(2)],
      ["Cash paid for expenses", (-data.operating.expenses).toFixed(2)],
      ["Change in Accounts Receivable", data.operating.arChange.toFixed(2)],
      ["Change in Accounts Payable", data.operating.apChange.toFixed(2)],
      ["Net Cash from Operations", data.operating.netOperating.toFixed(2)],
      [],
      ["INVESTING ACTIVITIES"],
      ["Capital expenditures", (-data.investing.assetPurchases).toFixed(2)],
      ["Net Cash from Investing", data.investing.netInvesting.toFixed(2)],
      [],
      ["FINANCING ACTIVITIES"],
      ["Loan proceeds", data.financing.loanProceeds.toFixed(2)],
      ["Net Cash from Financing", data.financing.netFinancing.toFixed(2)],
      [],
      ["NET CHANGE IN CASH", data.netCashChange.toFixed(2)],
    ];

    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cash-flow-${startDate}-to-${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const periodLabel = data
    ? `${new Date(data.startDate).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" })} – ${new Date(data.endDate).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" })}`
    : "";

  return (
    <div className="p-6 space-y-6">
      <ReportHeader
        title="Statement of Cash Flows"
        subtitle={periodLabel}
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
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryCard label="Operating" value={formatCurrency(data.operating.netOperating)} color={data.operating.netOperating >= 0 ? "text-emerald-600" : "text-red-600"} />
            <SummaryCard label="Investing" value={formatCurrency(data.investing.netInvesting)} color={data.investing.netInvesting >= 0 ? "text-blue-600" : "text-red-600"} />
            <SummaryCard label="Financing" value={formatCurrency(data.financing.netFinancing)} color={data.financing.netFinancing >= 0 ? "text-purple-600" : "text-red-600"} />
            <SummaryCard label="Net Change" value={formatCurrency(data.netCashChange)} color={data.netCashChange >= 0 ? "text-emerald-600" : "text-red-600"} />
          </div>

          {/* Operating Activities */}
          <Card>
            <CardHeader>
              <CardTitle className="text-emerald-700">Operating Activities</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <LineItem label="Cash received from revenue" amount={data.operating.revenue} />
              <LineItem label="Cash paid for expenses" amount={-data.operating.expenses} />
              <LineItem label="Change in Accounts Receivable" amount={data.operating.arChange} />
              <LineItem label="Change in Accounts Payable" amount={data.operating.apChange} />
              <Separator className="my-3" />
              <div className="grid grid-cols-[1fr_auto] gap-4 font-bold text-base">
                <span>Net Cash from Operating Activities</span>
                <span className={`tabular-nums text-right ${data.operating.netOperating >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {formatCurrency(data.operating.netOperating)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Investing Activities */}
          <Card>
            <CardHeader>
              <CardTitle className="text-blue-700">Investing Activities</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <LineItem label="Capital expenditures (Fixed Assets)" amount={-data.investing.assetPurchases} />
              <Separator className="my-3" />
              <div className="grid grid-cols-[1fr_auto] gap-4 font-bold text-base">
                <span>Net Cash from Investing Activities</span>
                <span className={`tabular-nums text-right ${data.investing.netInvesting >= 0 ? "text-blue-600" : "text-red-600"}`}>
                  {formatCurrency(data.investing.netInvesting)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Financing Activities */}
          <Card>
            <CardHeader>
              <CardTitle className="text-purple-700">Financing Activities</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <LineItem label="Loan proceeds / repayments" amount={data.financing.loanProceeds} />
              <Separator className="my-3" />
              <div className="grid grid-cols-[1fr_auto] gap-4 font-bold text-base">
                <span>Net Cash from Financing Activities</span>
                <span className={`tabular-nums text-right ${data.financing.netFinancing >= 0 ? "text-purple-600" : "text-red-600"}`}>
                  {formatCurrency(data.financing.netFinancing)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Net Change */}
          <Card className={`border-2 ${data.netCashChange >= 0 ? "border-emerald-600" : "border-red-500"}`}>
            <CardContent className="pt-6">
              <div className="grid grid-cols-[1fr_auto] items-center gap-4">
                <div>
                  <p className="text-2xl font-bold">Net Change in Cash</p>
                  <p className="text-sm text-muted-foreground mt-1">{periodLabel}</p>
                </div>
                <span className={`text-3xl font-bold tabular-nums text-right ${data.netCashChange >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {formatCurrency(data.netCashChange)}
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

function LineItem({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-4 py-1.5 pl-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`tabular-nums text-right ${amount < 0 ? "text-red-500" : ""}`}>
        {amount < 0 ? `(${formatCurrency(Math.abs(amount))})` : formatCurrency(amount)}
      </span>
    </div>
  );
}
