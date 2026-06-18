/**
 * Statement of Changes in Equity Report
 * Shows movements in equity: opening, net income, contributions, distributions, closing.
 */

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportHeader } from "./report-header";
import { formatCurrency } from "@/lib/utils";

export function EquityStatementReport() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(() => new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));

  const fetchData = (start: string, end: string) => {
    setLoading(true);
    api.get("/reports/equity-statement", { startDate: start, endDate: end })
      .then((res: any) => setData(res))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(startDate, endDate); }, []);

  const handleDateChange = (start: string, end: string) => {
    setStartDate(start); setEndDate(end); fetchData(start, end);
  };

  const periodLabel = data ? `${new Date(data.startDate).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" })} – ${new Date(data.endDate).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" })}` : "";

  return (
    <div className="p-6 space-y-6">
      <ReportHeader title="Statement of Changes in Equity" subtitle={periodLabel} startDate={startDate} endDate={endDate} onDateChange={handleDateChange} onPrint={() => window.print()} />

      {loading ? <Skeleton className="h-64 w-full" /> : data ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryCard label="Opening Equity" value={formatCurrency(data.openingEquity)} color="text-blue-600" />
            <SummaryCard label="Net Income" value={formatCurrency(data.netIncome)} color={data.netIncome >= 0 ? "text-emerald-600" : "text-red-600"} />
            <SummaryCard label="Other Movements" value={formatCurrency(data.totalMovements)} color="text-purple-600" />
            <SummaryCard label="Closing Equity" value={formatCurrency(data.closingEquity)} color="text-indigo-600" />
          </div>

          {/* Equity Reconciliation */}
          <Card>
            <CardHeader>
              <CardTitle>Equity Reconciliation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <LineItem label="Opening Equity (beginning of period)" amount={data.openingEquity} bold />
              <Separator className="my-3" />

              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-2">Additions</p>
              <LineItem label="Net Income for the period" amount={data.netIncome} color={data.netIncome >= 0 ? "" : "text-red-600"} />

              {data.equityMovements.length > 0 && (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-3">Other Movements</p>
                  {data.equityMovements.map((m: any) => (
                    <LineItem key={m.id} label={m.accountName} amount={m.netMovement} sub={m.accountSubType} />
                  ))}
                </>
              )}

              <Separator className="my-3" />
              <div className="grid grid-cols-[1fr_auto] gap-4 py-2 font-bold text-lg">
                <span>Closing Equity</span>
                <span className="tabular-nums text-right text-indigo-600">{formatCurrency(data.closingEquity)}</span>
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

function LineItem({ label, amount, bold, color, sub }: { label: string; amount: number; bold?: boolean; color?: string; sub?: string }) {
  return (
    <div className={`grid grid-cols-[1fr_auto] gap-4 py-1.5 pl-4 text-sm ${bold ? "font-semibold" : ""}`}>
      <div>
        <span className="text-muted-foreground">{label}</span>
        {sub && <span className="text-xs text-muted-foreground ml-2">({sub})</span>}
      </div>
      <span className={`tabular-nums text-right ${color || (amount < 0 ? "text-red-500" : "")}`}>
        {amount < 0 ? `(${formatCurrency(Math.abs(amount))})` : formatCurrency(amount)}
      </span>
    </div>
  );
}
