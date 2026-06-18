/**
 * General Ledger Report
 * Complete transaction history by account with date filtering.
 */

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ReportHeader } from "./report-header";
import { formatCurrency } from "@/lib/utils";

export function GLReport() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(() => new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [accountId, setAccountId] = useState("");

  const fetchData = (start: string, end: string, acctId?: string) => {
    setLoading(true);
    const params: any = { startDate: start, endDate: end };
    if (acctId) params.accountId = acctId;
    api.get("/reports/general-ledger-report", params)
      .then((res: any) => setData(res))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(startDate, endDate, accountId); }, []);

  const handleDateChange = (start: string, end: string) => {
    setStartDate(start); setEndDate(end);
    fetchData(start, end, accountId);
  };

  const handleAccountChange = (val: string) => {
    const acct = val === "all" ? "" : val;
    setAccountId(acct);
    fetchData(startDate, endDate, acct);
  };

  const handleExportCSV = () => {
    if (!data) return;
    const rows = [["Date", "Account", "Description", "Reference", "Debit", "Credit"]];
    data.entries.forEach((e: any) => rows.push([e.transactionDate, e.accountName, e.description, e.referenceNumber || "", (e.debit || 0).toFixed(2), (e.credit || 0).toFixed(2)]));
    rows.push(["", "", "", "TOTALS", data.totalDebit.toFixed(2), data.totalCredit.toFixed(2)]);
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `general-ledger-${startDate}-to-${endDate}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <ReportHeader title="General Ledger Report" subtitle="Complete transaction history by account" startDate={startDate} endDate={endDate} onDateChange={handleDateChange} onPrint={() => window.print()} onExportCSV={handleExportCSV} />

      {/* Account Filter */}
      {data?.accounts && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Filter by account:</span>
          <Select value={accountId || "all"} onValueChange={handleAccountChange}>
            <SelectTrigger className="w-64"><SelectValue placeholder="All accounts" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Accounts</SelectItem>
              {data.accounts.map((a: any) => (
                <SelectItem key={a.id} value={a.id}>{a.accountCode ? `${a.accountCode} — ` : ""}{a.accountName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {loading ? <Skeleton className="h-96 w-full" /> : data ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left py-3 px-4 font-semibold">Date</th>
                    <th className="text-left py-3 px-4 font-semibold">Account</th>
                    <th className="text-left py-3 px-4 font-semibold">Description</th>
                    <th className="text-left py-3 px-4 font-semibold">Reference</th>
                    <th className="text-right py-3 px-4 font-semibold">Debit</th>
                    <th className="text-right py-3 px-4 font-semibold">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {data.entries.length === 0 ? (
                    <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No transactions found</td></tr>
                  ) : data.entries.map((entry: any, idx: number) => (
                    <tr key={idx} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-4 text-muted-foreground whitespace-nowrap">{new Date(entry.transactionDate).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" })}</td>
                      <td className="py-2.5 px-4"><span className="font-medium">{entry.accountName}</span>{entry.accountCode && <span className="text-xs text-muted-foreground ml-1">({entry.accountCode})</span>}</td>
                      <td className="py-2.5 px-4 text-muted-foreground max-w-[200px] truncate">{entry.description}</td>
                      <td className="py-2.5 px-4 font-mono text-xs text-muted-foreground">{entry.referenceNumber || "—"}</td>
                      <td className="py-2.5 px-4 text-right tabular-nums">{entry.debit > 0 ? formatCurrency(entry.debit) : "—"}</td>
                      <td className="py-2.5 px-4 text-right tabular-nums">{entry.credit > 0 ? formatCurrency(entry.credit) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 font-bold bg-muted/30">
                    <td colSpan={4} className="py-3 px-4">TOTALS ({data.entries.length} entries)</td>
                    <td className="py-3 px-4 text-right tabular-nums">{formatCurrency(data.totalDebit)}</td>
                    <td className="py-3 px-4 text-right tabular-nums">{formatCurrency(data.totalCredit)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
