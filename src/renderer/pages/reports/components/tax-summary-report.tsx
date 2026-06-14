/**
 * Tax Summary Report
 * Shows output tax (collected) vs input tax (paid) and net liability.
 */

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportHeader } from "./report-header";
import { formatCurrency } from "@/lib/utils";
import type { TaxSummaryData } from "../types";

export function TaxSummaryReport() {
  const [data, setData] = useState<TaxSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(() => new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));

  const fetchData = (start: string, end: string) => {
    setLoading(true);
    api.get("/reports/tax-summary", { startDate: start, endDate: end })
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
      ["Tax Summary Report"],
      [`Period: ${data.startDate} to ${data.endDate}`],
      [],
      ["Description", "Amount"],
      ["Output Tax (Collected on Sales)", data.outputTax.toFixed(2)],
      ["Input Tax (Paid on Purchases)", data.inputTax.toFixed(2)],
      ["Net Tax Liability", data.netTax.toFixed(2)],
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tax-summary-${startDate}-to-${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const periodLabel = data
    ? `${new Date(data.startDate).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" })} – ${new Date(data.endDate).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" })}`
    : "";

  return (
    <div className="p-6 space-y-6">
      <ReportHeader
        title="Tax Summary"
        subtitle={periodLabel}
        startDate={startDate}
        endDate={endDate}
        onDateChange={handleDateChange}
        onPrint={() => window.print()}
        onExportCSV={handleExportCSV}
      />

      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : data ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="pt-5">
                <p className="text-sm font-medium text-muted-foreground">Output Tax (Collected)</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{formatCurrency(data.outputTax)}</p>
                <p className="text-xs text-muted-foreground mt-2">Tax collected on sales invoices</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-orange-500">
              <CardContent className="pt-5">
                <p className="text-sm font-medium text-muted-foreground">Input Tax (Paid)</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">{formatCurrency(data.inputTax)}</p>
                <p className="text-xs text-muted-foreground mt-2">Tax paid on purchases & expenses</p>
              </CardContent>
            </Card>
            <Card className={`border-l-4 ${data.netTax >= 0 ? "border-l-red-500" : "border-l-emerald-500"}`}>
              <CardContent className="pt-5">
                <p className="text-sm font-medium text-muted-foreground">Net Tax {data.netTax >= 0 ? "Liability" : "Refund"}</p>
                <p className={`text-2xl font-bold mt-1 ${data.netTax >= 0 ? "text-red-600" : "text-emerald-600"}`}>
                  {formatCurrency(Math.abs(data.netTax))}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {data.netTax >= 0 ? "Amount owed to tax authority" : "Refund claimable from tax authority"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Tax Calculation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-[1fr_auto] gap-4 py-2 text-sm">
                <span>Output Tax (VAT/NHIL/GETFund collected on sales)</span>
                <span className="tabular-nums text-right font-medium">{formatCurrency(data.outputTax)}</span>
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-4 py-2 text-sm">
                <span>Less: Input Tax (VAT/NHIL/GETFund paid on purchases)</span>
                <span className="tabular-nums text-right font-medium text-orange-600">({formatCurrency(data.inputTax)})</span>
              </div>
              <Separator />
              <div className="grid grid-cols-[1fr_auto] gap-4 py-2 font-bold text-lg">
                <span>Net Tax {data.netTax >= 0 ? "Payable" : "Receivable"}</span>
                <span className={`tabular-nums text-right ${data.netTax >= 0 ? "text-red-600" : "text-emerald-600"}`}>
                  {formatCurrency(Math.abs(data.netTax))}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Ghana-specific note */}
          <Card className="bg-muted/30">
            <CardContent className="pt-5">
              <p className="text-sm font-medium mb-2">Ghana Tax Rates Reference</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-muted-foreground">
                <div><span className="font-medium">VAT:</span> 15%</div>
                <div><span className="font-medium">NHIL:</span> 2.5%</div>
                <div><span className="font-medium">GETFund:</span> 2.5%</div>
                <div><span className="font-medium">COVID Levy:</span> 1%</div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
