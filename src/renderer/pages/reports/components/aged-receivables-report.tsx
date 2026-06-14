/**
 * Aged Receivables Report
 * Shows outstanding customer invoices grouped by aging buckets.
 */

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportHeader } from "./report-header";
import { formatCurrency } from "@/lib/utils";
import type { AgingData, AgingEntry } from "../types";

export function AgedReceivablesReport() {
  const [data, setData] = useState<AgingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/reports/aged-receivables")
      .then((res: any) => setData(res))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleExportCSV = () => {
    if (!data) return;
    const rows: string[][] = [
      ["Aged Receivables Report"],
      [`Generated: ${new Date().toLocaleDateString()}`],
      [],
      ["Bucket", "Customer", "Invoice #", "Due Date", "Total", "Outstanding", "Days Overdue"],
    ];
    const addBucket = (label: string, items: AgingEntry[]) => {
      items.forEach((e) => rows.push([label, e.customerName || "", e.invoiceNumber || "", e.dueDate, e.totalAmount.toFixed(2), e.outstanding.toFixed(2), e.daysOverdue.toString()]));
    };
    addBucket("Current", data.buckets.current);
    addBucket("1-30 Days", data.buckets.days30);
    addBucket("31-60 Days", data.buckets.days60);
    addBucket("61-90 Days", data.buckets.days90);
    addBucket("Over 90 Days", data.buckets.over90);
    rows.push([]);
    rows.push(["", "", "", "TOTAL", "", data.totals.total.toFixed(2), ""]);

    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aged-receivables-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <ReportHeader
        title="Aged Receivables"
        subtitle="Outstanding customer invoices by aging bucket"
        showDateRange={false}
        onPrint={() => window.print()}
        onExportCSV={handleExportCSV}
      />

      {loading ? (
        <Skeleton className="h-96 w-full" />
      ) : data ? (
        <>
          {/* Bucket Summary */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <BucketCard label="Current" amount={data.totals.current} color="text-emerald-600" bg="bg-emerald-50" />
            <BucketCard label="1-30 Days" amount={data.totals.days30} color="text-blue-600" bg="bg-blue-50" />
            <BucketCard label="31-60 Days" amount={data.totals.days60} color="text-amber-600" bg="bg-amber-50" />
            <BucketCard label="61-90 Days" amount={data.totals.days90} color="text-orange-600" bg="bg-orange-50" />
            <BucketCard label="Over 90" amount={data.totals.over90} color="text-red-600" bg="bg-red-50" />
            <BucketCard label="Total" amount={data.totals.total} color="text-foreground" bg="bg-muted" />
          </div>

          {/* Detail Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left py-3 px-4 font-semibold">Customer</th>
                      <th className="text-left py-3 px-4 font-semibold">Invoice #</th>
                      <th className="text-left py-3 px-4 font-semibold">Due Date</th>
                      <th className="text-right py-3 px-4 font-semibold">Outstanding</th>
                      <th className="text-right py-3 px-4 font-semibold">Age</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: "Current", items: data.buckets.current, color: "bg-emerald-50" },
                      { label: "1-30 Days", items: data.buckets.days30, color: "bg-blue-50" },
                      { label: "31-60 Days", items: data.buckets.days60, color: "bg-amber-50" },
                      { label: "61-90 Days", items: data.buckets.days90, color: "bg-orange-50" },
                      { label: "Over 90 Days", items: data.buckets.over90, color: "bg-red-50" },
                    ].map(({ label, items, color }) => items.length > 0 && (
                      <>
                        <tr key={label} className={color}>
                          <td colSpan={5} className="py-2 px-4 font-semibold text-xs uppercase tracking-wider">
                            {label} ({items.length})
                          </td>
                        </tr>
                        {items.map((entry) => (
                          <tr key={entry.id} className="border-b hover:bg-muted/30 transition-colors">
                            <td className="py-2.5 px-4">{entry.customerName}</td>
                            <td className="py-2.5 px-4 font-mono text-xs">{entry.invoiceNumber || "—"}</td>
                            <td className="py-2.5 px-4 text-muted-foreground">
                              {new Date(entry.dueDate).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" })}
                            </td>
                            <td className="py-2.5 px-4 text-right tabular-nums font-medium">
                              {formatCurrency(entry.outstanding)}
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <Badge variant={entry.daysOverdue > 60 ? "destructive" : entry.daysOverdue > 30 ? "secondary" : "outline"} className="text-xs">
                                {entry.daysOverdue > 0 ? `${entry.daysOverdue}d` : "Current"}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </>
                    ))}
                    {data.totals.total === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-muted-foreground">
                          No outstanding receivables
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {data.totals.total > 0 && (
                    <tfoot>
                      <tr className="border-t-2 font-bold bg-muted/30">
                        <td colSpan={3} className="py-3 px-4">TOTAL OUTSTANDING</td>
                        <td className="py-3 px-4 text-right tabular-nums">{formatCurrency(data.totals.total)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}

function BucketCard({ label, amount, color, bg }: { label: string; amount: number; color: string; bg: string }) {
  return (
    <div className={`rounded-lg border p-3 ${bg}`}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold tabular-nums mt-1 ${color}`}>{formatCurrency(amount)}</p>
    </div>
  );
}
