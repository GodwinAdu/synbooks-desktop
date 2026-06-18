/**
 * Financial Ratios Report
 * Key performance indicators and financial health metrics.
 */

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportHeader } from "./report-header";
import { formatCurrency } from "@/lib/utils";

export function FinancialRatiosReport() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/reports/financial-ratios")
      .then((res: any) => setData(res))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="p-6 space-y-6">
      <ReportHeader title="Financial Ratios" subtitle="Key performance indicators" showDateRange={false} />
      <Skeleton className="h-96 w-full" />
    </div>
  );

  if (!data) return null;

  return (
    <div className="p-6 space-y-6">
      <ReportHeader title="Financial Ratios" subtitle="Key performance indicators for the current fiscal year" showDateRange={false} onPrint={() => window.print()} />

      {/* P&L Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="Revenue" value={formatCurrency(data.revenue)} color="text-emerald-600" />
        <SummaryCard label="Expenses" value={formatCurrency(data.expenses)} color="text-red-600" />
        <SummaryCard label="Net Income" value={formatCurrency(data.netIncome)} color={data.netIncome >= 0 ? "text-emerald-600" : "text-red-600"} />
        <SummaryCard label="Total Assets" value={formatCurrency(data.totalAssets)} color="text-blue-600" />
      </div>

      {/* Liquidity Ratios */}
      <Card>
        <CardHeader>
          <CardTitle className="text-blue-700 text-base">Liquidity Ratios</CardTitle>
          <p className="text-xs text-muted-foreground">Ability to meet short-term obligations</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <RatioRow label="Current Ratio" value={data.currentRatio.toFixed(2)} benchmark="≥ 1.5" status={data.currentRatio >= 1.5 ? "good" : data.currentRatio >= 1 ? "warning" : "bad"} description="Current Assets ÷ Current Liabilities" />
          <RatioRow label="Quick Ratio" value={data.quickRatio.toFixed(2)} benchmark="≥ 1.0" status={data.quickRatio >= 1 ? "good" : data.quickRatio >= 0.5 ? "warning" : "bad"} description="(Current Assets - Inventory) ÷ Current Liabilities" />
          <RatioRow label="Cash Ratio" value={data.cashRatio.toFixed(2)} benchmark="≥ 0.5" status={data.cashRatio >= 0.5 ? "good" : data.cashRatio >= 0.2 ? "warning" : "bad"} description="Cash & Bank ÷ Current Liabilities" />
        </CardContent>
      </Card>

      {/* Profitability Ratios */}
      <Card>
        <CardHeader>
          <CardTitle className="text-emerald-700 text-base">Profitability Ratios</CardTitle>
          <p className="text-xs text-muted-foreground">Efficiency in generating profit</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <RatioRow label="Gross Profit Margin" value={`${data.grossProfitMargin.toFixed(1)}%`} benchmark="≥ 40%" status={data.grossProfitMargin >= 40 ? "good" : data.grossProfitMargin >= 20 ? "warning" : "bad"} description="Gross Profit ÷ Revenue" />
          <RatioRow label="Net Profit Margin" value={`${data.netProfitMargin.toFixed(1)}%`} benchmark="≥ 10%" status={data.netProfitMargin >= 10 ? "good" : data.netProfitMargin >= 0 ? "warning" : "bad"} description="Net Income ÷ Revenue" />
          <RatioRow label="Return on Assets (ROA)" value={`${data.returnOnAssets.toFixed(1)}%`} benchmark="≥ 5%" status={data.returnOnAssets >= 5 ? "good" : data.returnOnAssets >= 0 ? "warning" : "bad"} description="Net Income ÷ Total Assets" />
          <RatioRow label="Return on Equity (ROE)" value={`${data.returnOnEquity.toFixed(1)}%`} benchmark="≥ 15%" status={data.returnOnEquity >= 15 ? "good" : data.returnOnEquity >= 0 ? "warning" : "bad"} description="Net Income ÷ Total Equity" />
        </CardContent>
      </Card>

      {/* Leverage Ratios */}
      <Card>
        <CardHeader>
          <CardTitle className="text-orange-700 text-base">Leverage Ratios</CardTitle>
          <p className="text-xs text-muted-foreground">Debt and capital structure</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <RatioRow label="Debt-to-Equity" value={data.debtToEquity.toFixed(2)} benchmark="≤ 2.0" status={data.debtToEquity <= 2 ? "good" : data.debtToEquity <= 3 ? "warning" : "bad"} description="Total Liabilities ÷ Total Equity" />
          <RatioRow label="Debt Ratio" value={`${(data.debtRatio * 100).toFixed(1)}%`} benchmark="≤ 60%" status={data.debtRatio <= 0.6 ? "good" : data.debtRatio <= 0.8 ? "warning" : "bad"} description="Total Liabilities ÷ Total Assets" />
        </CardContent>
      </Card>

      {/* Efficiency Ratios */}
      <Card>
        <CardHeader>
          <CardTitle className="text-purple-700 text-base">Efficiency Ratios</CardTitle>
          <p className="text-xs text-muted-foreground">How effectively assets are used</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <RatioRow label="Receivables Turnover" value={`${data.receivablesTurnover.toFixed(1)}x`} benchmark="≥ 6x" status={data.receivablesTurnover >= 6 ? "good" : data.receivablesTurnover >= 3 ? "warning" : "bad"} description="Revenue ÷ Accounts Receivable" />
          <RatioRow label="Days Sales Outstanding" value={`${data.daysReceivablesOutstanding.toFixed(0)} days`} benchmark="≤ 45 days" status={data.daysReceivablesOutstanding <= 45 ? "good" : data.daysReceivablesOutstanding <= 90 ? "warning" : "bad"} description="Average days to collect receivables" />
        </CardContent>
      </Card>
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

function RatioRow({ label, value, benchmark, status, description }: { label: string; value: string; benchmark: string; status: "good" | "warning" | "bad"; description: string }) {
  const statusColors = { good: "bg-emerald-100 text-emerald-700", warning: "bg-amber-100 text-amber-700", bad: "bg-red-100 text-red-700" };
  const statusLabels = { good: "Healthy", warning: "Monitor", bad: "Concern" };
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-xs text-muted-foreground">{benchmark}</span>
        <span className="text-base font-bold tabular-nums min-w-[60px] text-right">{value}</span>
        <Badge className={`text-[10px] min-w-[60px] justify-center ${statusColors[status]}`}>{statusLabels[status]}</Badge>
      </div>
    </div>
  );
}
